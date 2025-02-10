import type { DFMReport } from "@shared/schema";

const MIN_WALL_THICKNESS = {
  '3d_printing': 0.8, // mm
  'injection_molding': 1.0, // mm
  'cnc_machining': 1.2, // mm
  'sheet_metal': 0.5 // mm
};

const MAX_OVERHANG_ANGLE = 45; // degrees
const MIN_HOLE_SIZE = 2.0; // mm
const MIN_DRAFT_ANGLE = 3.0; // degrees
const MAX_ISSUES_PER_CATEGORY = 10; // Limit number of reported issues
const ANALYSIS_CHUNK_SIZE = 1000; // Number of triangles to process at once
const MAX_PROCESSING_TIME = 30000; // Maximum processing time in ms

function isAsciiSTL(buffer: ArrayBuffer): boolean {
  const headerView = new Uint8Array(buffer, 0, 5);
  const decoder = new TextDecoder();
  const header = decoder.decode(headerView);
  return header.trim().toLowerCase() === 'solid';
}

function parseAsciiSTL(text: string): { triangles: Float32Array, normals: Float32Array } {
  const lines = text.split('\n').map(line => line.trim());
  const vertices: number[] = [];
  const normals: number[] = [];
  let currentNormal: number[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.startsWith('facet normal ')) {
      const parts = line.split(/\s+/);
      currentNormal = [
        parseFloat(parts[2]),
        parseFloat(parts[3]),
        parseFloat(parts[4])
      ];
    } else if (line.startsWith('vertex ')) {
      const parts = line.split(/\s+/);
      vertices.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      );
      if (currentNormal) {
        normals.push(...currentNormal);
      }
    }
  }

  return {
    triangles: new Float32Array(vertices),
    normals: new Float32Array(normals)
  };
}

export function parseSTL(buffer: ArrayBuffer): {
  triangles: Float32Array;
  normals: Float32Array;
} {
  if (buffer.byteLength === 0) {
    throw new Error("Empty STL file provided");
  }

  const startTime = Date.now();
  console.log('Starting STL parsing...');

  try {
    const isBinary = !isAsciiSTL(buffer);
    console.log('STL Format:', isBinary ? 'Binary' : 'ASCII');

    if (!isBinary) {
      const decoder = new TextDecoder();
      const text = decoder.decode(buffer);
      return parseAsciiSTL(text);
    }

    if (buffer.byteLength < 84) {
      throw new Error("Invalid STL file: Too small for binary format");
    }

    const view = new DataView(buffer);
    const triangleCount = view.getUint32(80, true);
    const expectedSize = 84 + (triangleCount * 50);

    if (triangleCount <= 0 || triangleCount > 5000000 || buffer.byteLength !== expectedSize) {
      throw new Error(`Invalid binary STL file: Expected size ${expectedSize}, got ${buffer.byteLength}`);
    }

    console.log('Processing STL with', triangleCount, 'triangles');

    const triangles = new Float32Array(triangleCount * 9);
    const normals = new Float32Array(triangleCount * 3);

    let offset = 84; // Skip header
    for (let i = 0; i < triangleCount; i++) {
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        throw new Error("STL parsing timeout: File too complex");
      }

      // Read normal
      normals[i * 3] = view.getFloat32(offset, true);
      normals[i * 3 + 1] = view.getFloat32(offset + 4, true);
      normals[i * 3 + 2] = view.getFloat32(offset + 8, true);

      // Read vertices
      for (let j = 0; j < 3; j++) {
        const vertexOffset = offset + 12 + (j * 12);
        triangles[i * 9 + j * 3] = view.getFloat32(vertexOffset, true);
        triangles[i * 9 + j * 3 + 1] = view.getFloat32(vertexOffset + 4, true);
        triangles[i * 9 + j * 3 + 2] = view.getFloat32(vertexOffset + 8, true);
      }

      offset += 50;
    }

    console.log('STL parsing completed in', Date.now() - startTime, 'ms');
    return { triangles, normals };
  } catch (error) {
    console.error('STL parsing error:', error);
    throw error;
  }
}

function processGeometryChunk(
  triangles: Float32Array,
  start: number,
  chunkSize: number,
  process: string
): { issues: string[]; pass: boolean } {
  const minThickness = MIN_WALL_THICKNESS[process as keyof typeof MIN_WALL_THICKNESS];
  const issues: string[] = [];
  let pass = true;

  const end = Math.min(start + chunkSize * 9, triangles.length);
  for (let i = start; i < end && issues.length < MAX_ISSUES_PER_CATEGORY; i += 9) {
    const v1 = [triangles[i], triangles[i + 1], triangles[i + 2]];
    const v2 = [triangles[i + 3], triangles[i + 4], triangles[i + 5]];

    const thickness = Math.sqrt(
      Math.pow(v2[0] - v1[0], 2) +
      Math.pow(v2[1] - v1[1], 2) +
      Math.pow(v2[2] - v1[2], 2)
    );

    if (thickness < minThickness) {
      issues.push(
        `Detected wall thickness of ${thickness.toFixed(2)}mm - minimum recommended for ${process.replace('_', ' ')} is ${minThickness}mm`
      );
      pass = false;
    }
  }

  return { issues, pass };
}

function analyzeWallThickness(triangles: Float32Array, process: string): {
  issues: string[];
  pass: boolean;
} {
  console.log('Starting wall thickness analysis...');
  const startTime = Date.now();
  const issues: string[] = [];
  let pass = true;

  try {
    for (let start = 0; start < triangles.length; start += ANALYSIS_CHUNK_SIZE * 9) {
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        throw new Error("Wall thickness analysis timeout: Model too complex");
      }

      const { issues: chunkIssues, pass: chunkPass } = processGeometryChunk(
        triangles,
        start,
        ANALYSIS_CHUNK_SIZE,
        process
      );

      issues.push(...chunkIssues.slice(0, MAX_ISSUES_PER_CATEGORY - issues.length));
      pass = pass && chunkPass;

      if (issues.length >= MAX_ISSUES_PER_CATEGORY) break;
    }
  } catch (error) {
    console.error('Wall thickness analysis error:', error);
    throw error;
  }

  console.log('Wall thickness analysis completed in', Date.now() - startTime, 'ms');
  return { issues, pass };
}

function analyzeOverhangs(normals: Float32Array): {
  issues: string[];
  pass: boolean;
} {
  console.log('Starting overhang analysis...');
  const startTime = Date.now();
  const issues: string[] = [];
  let pass = true;

  try {
    const stride = Math.max(1, Math.floor(normals.length / ANALYSIS_CHUNK_SIZE));
    for (let i = 0; i < normals.length && issues.length < MAX_ISSUES_PER_CATEGORY; i += stride * 3) {
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        throw new Error("Overhang analysis timeout: Model too complex");
      }

      const normal = [normals[i], normals[i + 1], normals[i + 2]];
      const angle = Math.acos(normal[2]) * (180 / Math.PI);

      if (angle > MAX_OVERHANG_ANGLE) {
        issues.push(
          `${angle.toFixed(1)}° overhang detected - support structures required for angles over ${MAX_OVERHANG_ANGLE}°`
        );
        pass = false;
      }
    }
  } catch (error) {
    console.error('Overhang analysis error:', error);
    throw error;
  }

  console.log('Overhang analysis completed in', Date.now() - startTime, 'ms');
  return { issues, pass };
}

export function analyzeGeometry(fileContent: string, process: string): DFMReport {
  if (!fileContent) {
    throw new Error("No file content provided for analysis");
  }

  console.log('Starting geometry analysis for process:', process);
  const startTime = Date.now();

  try {
    // Convert base64 to binary
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Binary data size:', bytes.buffer.byteLength, 'bytes');

    const { triangles, normals } = parseSTL(bytes.buffer);
    console.log('Successfully parsed STL geometry');

    const wallThickness = analyzeWallThickness(triangles, process);
    const overhangs = analyzeOverhangs(normals);

    console.log('Analysis complete:', {
      wallThicknessIssues: wallThickness.issues.length,
      overhangIssues: overhangs.issues.length,
      totalTime: Date.now() - startTime,
    });

    const holeSize = {
      issues: [] as string[],
      pass: true
    };

    const draftAngles = {
      issues: [] as string[],
      pass: true
    };

    if (process === "injection_molding") {
      draftAngles.issues.push(
        "Critical: Side walls require minimum 3° draft angle for proper ejection"
      );
      draftAngles.pass = false;
    }

    if (process === "cnc_machining") {
      holeSize.issues.push(
        "Warning: Deep holes with small diameters may require specialized tooling"
      );
      holeSize.pass = false;
    }

    return {
      wallThickness,
      overhangs,
      holeSize,
      draftAngles
    };
  } catch (error) {
    console.error('Geometry analysis error:', error);
    throw error;
  }
}