import type { DFMReport } from "@shared/schema";
import * as THREE from 'three';
import * as JSCADio from '@jscad/io';
import * as JSCADmodeling from '@jscad/modeling';

const MIN_WALL_THICKNESS = {
  '3d_printing': 0.8, // mm
  'injection_molding': 1.0, // mm
  'cnc_machining': 1.2, // mm
  'sheet_metal': 0.5 // mm
} as const;

const MAX_OVERHANG_ANGLE = 45; // degrees
const MIN_HOLE_SIZE = 2.0; // mm
const MIN_DRAFT_ANGLE = 3.0; // degrees
const MAX_ISSUES_PER_CATEGORY = 10; // Limit number of reported issues
const ANALYSIS_CHUNK_SIZE = 1000; // Number of triangles to process at once
const MAX_PROCESSING_TIME = 30000; // Maximum processing time in ms
const MAX_TRIANGLES = 5000; // Maximum number of triangles to analyze
const SAMPLING_RATE = 5; // Only analyze every Nth triangle

type ProcessType = keyof typeof MIN_WALL_THICKNESS;

interface STLParseResult {
  triangles: Float32Array;
  normals: Float32Array;
}

function isAsciiSTL(data: ArrayBuffer): boolean {
  const headerView = new Uint8Array(data, 0, 5);
  const decoder = new TextDecoder();
  const header = decoder.decode(headerView);
  return header.trim().toLowerCase() === 'solid';
}

function parseAsciiSTL(text: string): STLParseResult {
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

export function parseSTL(data: ArrayBuffer): STLParseResult {
  if (data.byteLength === 0) {
    throw new Error("Empty STL file provided");
  }

  const startTime = Date.now();
  console.log('Starting STL parsing...');

  try {
    const isBinary = !isAsciiSTL(data);
    console.log('STL Format:', isBinary ? 'Binary' : 'ASCII');

    if (!isBinary) {
      const decoder = new TextDecoder();
      const text = decoder.decode(data);
      return parseAsciiSTL(text);
    }

    if (data.byteLength < 84) {
      throw new Error("Invalid STL file: Too small for binary format");
    }

    const view = new DataView(data);
    const triangleCount = view.getUint32(80, true);
    const expectedSize = 84 + (triangleCount * 50);

    console.log('File size:', data.byteLength, 'bytes');
    console.log('Reported triangle count:', triangleCount);
    console.log('Expected size:', expectedSize, 'bytes');

    // More lenient size validation
    if (triangleCount <= 0 || triangleCount > 5000000) {
      throw new Error("Invalid STL file: Triangle count out of reasonable range");
    }

    // Allow for some padding bytes at the end of the file
    const sizeDifference = Math.abs(data.byteLength - expectedSize);
    if (sizeDifference > 512) { // Allow up to 512 bytes of difference
      throw new Error(`Invalid STL file structure: Size mismatch too large (${sizeDifference} bytes)`);
    }

    console.log('Processing STL with', triangleCount, 'triangles');

    const triangles = new Float32Array(triangleCount * 9);
    const normals = new Float32Array(triangleCount * 3);

    let offset = 84; // Skip header
    for (let i = 0; i < triangleCount; i++) {
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        throw new Error("STL parsing timeout: File too complex");
      }

      // Check if we've reached the end of the file
      if (offset + 50 > data.byteLength) {
        console.warn(`Reached end of file at triangle ${i}/${triangleCount}`);
        break;
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
    if (error instanceof Error && error.message.includes('Triangle count')) {
      throw new Error('The STL file appears to be corrupted. Please try re-exporting it from your CAD software.');
    }
    throw error;
  }
}

export function isSTEPFile(data: ArrayBuffer): boolean {
  try {
    const headerView = new Uint8Array(data, 0, 10);
    const decoder = new TextDecoder();
    const header = decoder.decode(headerView);
    return header.includes('ISO-10303') || header.includes('STEP');
  } catch (error) {
    return false;
  }
}

export async function parseSTEPFile(data: ArrayBuffer): Promise<STLParseResult> {
  try {
    const decoder = new TextDecoder();
    const stepContent = decoder.decode(data);

    console.log('Parsing STEP file content...');

    // Use JSCAD to parse STEP file
    const parsed = await JSCADio.stepDeserializer.deserialize({
      output: 'geometry',
      source: stepContent
    });

    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('No valid geometry found in STEP file');
    }

    // Convert JSCAD geometry to STL format with specific options
    const stlData = JSCADio.stlSerializer.serialize({
      geometry: parsed,
      binary: true,
      statusCallback: (status: any) => console.log('STL conversion:', status),
      decimals: 5,
      facetCount: 100000
    });

    if (!stlData || !(stlData instanceof Uint8Array)) {
      throw new Error('Failed to convert STEP geometry to STL format');
    }

    console.log('Successfully converted STEP to STL format');

    // Parse the binary STL data using our existing parser
    return parseSTL(stlData.buffer);
  } catch (error) {
    console.error('STEP parsing error:', error);
    throw new Error('Failed to parse STEP file. The file might be corrupted or in an unsupported format.');
  }
}


interface GeometryAnalysisResult {
  issues: string[];
  pass: boolean;
}

function processGeometryChunk(
  triangles: Float32Array,
  start: number,
  chunkSize: number,
  process: ProcessType
): GeometryAnalysisResult {
  const minThickness = MIN_WALL_THICKNESS[process];
  const issues: string[] = [];
  let pass = true;

  const end = Math.min(start + chunkSize * 9, triangles.length);
  for (let i = start; i < end && issues.length < MAX_ISSUES_PER_CATEGORY; i += 9) {
    // Get all three vertices of the triangle
    const v1 = [triangles[i], triangles[i + 1], triangles[i + 2]];
    const v2 = [triangles[i + 3], triangles[i + 4], triangles[i + 5]];
    const v3 = [triangles[i + 6], triangles[i + 7], triangles[i + 8]];

    // Calculate average wall thickness using all three edges
    const thickness1 = Math.sqrt(
      Math.pow(v2[0] - v1[0], 2) +
      Math.pow(v2[1] - v1[1], 2) +
      Math.pow(v2[2] - v1[2], 2)
    );
    const thickness2 = Math.sqrt(
      Math.pow(v3[0] - v2[0], 2) +
      Math.pow(v3[1] - v2[1], 2) +
      Math.pow(v3[2] - v2[2], 2)
    );
    const thickness3 = Math.sqrt(
      Math.pow(v1[0] - v3[0], 2) +
      Math.pow(v1[1] - v3[1], 2) +
      Math.pow(v1[2] - v3[2], 2)
    );

    const avgThickness = (thickness1 + thickness2 + thickness3) / 3;

    if (avgThickness < minThickness && avgThickness > 0.01) { // Filter out extremely small values that might be noise
      const recommendation = getManufacturingRecommendation(process, avgThickness, minThickness);
      issues.push(
        `${avgThickness.toFixed(2)}mm wall - ${recommendation}`
      );
      pass = false;
    }
  }

  return { issues, pass };
}

function getManufacturingRecommendation(process: ProcessType, current: number, minimum: number): string {
  const increase = minimum - current;
  switch (process) {
    case '3d_printing':
      return `Consider increasing wall thickness by ${increase.toFixed(2)}mm or using supports/reinforcement ribs`;
    case 'injection_molding':
      return `Increase wall thickness by ${increase.toFixed(2)}mm or add ribs/gussets for structural support`;
    case 'cnc_machining':
      return `Increase thickness by ${increase.toFixed(2)}mm or consider redesigning with integrated support structures`;
    case 'sheet_metal':
      return `Use thicker material gauge or add bends/flanges for rigidity`;
  }
}

function analyzeWallThickness(triangles: Float32Array, process: ProcessType): GeometryAnalysisResult {
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

function analyzeOverhangs(triangles: Float32Array, normals: Float32Array): GeometryAnalysisResult {
  console.log('Starting overhang analysis...');
  const startTime = Date.now();
  const issues: string[] = [];
  let pass = true;

  try {
    // Calculate sampling rate based on model complexity
    const totalTriangles = triangles.length / 9;
    const effectiveSamplingRate = Math.max(
      SAMPLING_RATE,
      Math.ceil(totalTriangles / MAX_TRIANGLES)
    );

    console.log(`Processing ${Math.floor(totalTriangles / effectiveSamplingRate)} triangles...`);

    // Process triangles in groups of 3 vertices (1 face)
    for (let i = 0; i < triangles.length && issues.length < MAX_ISSUES_PER_CATEGORY; i += 9 * effectiveSamplingRate) {
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        throw new Error("Overhang analysis timeout: Model too complex");
      }

      // Get vertices for the current triangle
      const v1 = new THREE.Vector3(triangles[i], triangles[i + 1], triangles[i + 2]);
      const v2 = new THREE.Vector3(triangles[i + 3], triangles[i + 4], triangles[i + 5]);
      const v3 = new THREE.Vector3(triangles[i + 6], triangles[i + 7], triangles[i + 8]);

      // Calculate face normal using cross product
      const edge1 = new THREE.Vector3().subVectors(v2, v1);
      const edge2 = new THREE.Vector3().subVectors(v3, v1);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      // Calculate angle with UP vector (y-axis)
      const upVector = new THREE.Vector3(0, 1, 0);
      const angle = Math.acos(Math.abs(normal.dot(upVector))) * (180 / Math.PI);

      // Check if angle exceeds overhang threshold and the face is large enough to matter
      const faceArea = edge1.cross(edge2).length() / 2;
      if (angle > MAX_OVERHANG_ANGLE && faceArea > 0.01) {
        const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
        issues.push(
          `${angle.toFixed(1)}° overhang - support structures required for angles over ${MAX_OVERHANG_ANGLE}°`
        );
        pass = false;
      }
    }
  } catch (error) {
    console.error('Overhang analysis error:', error);
    throw error;
  }

  console.log('Overhang analysis completed in', Date.now() - startTime, 'ms');
  console.log('Found', issues.length, 'overhang issues');
  return { issues, pass };
}

export async function analyzeGeometry(fileContent: string, process: ProcessType): Promise<DFMReport> {
  if (!fileContent) {
    throw new Error("No file content provided for analysis");
  }

  console.log('Starting geometry analysis for process:', process);
  const startTime = Date.now();

  try {
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Binary data size:', bytes.buffer.byteLength, 'bytes');

    let triangles: Float32Array;
    let normals: Float32Array;

    const isStep = isSTEPFile(bytes.buffer);
    console.log('Detected file format:', isStep ? 'STEP' : 'STL');

    try {
      if (isStep) {
        const stepResult = await parseSTEPFile(bytes.buffer);
        triangles = stepResult.triangles;
        normals = stepResult.normals;
      } else {
        const stlResult = parseSTL(bytes.buffer);
        triangles = stlResult.triangles;
        normals = stlResult.normals;
      }
    } catch (error) {
      if (isStep) {
        throw new Error('Failed to parse STEP file. Please ensure the file is a valid STEP format and try again.');
      } else {
        if (error instanceof Error && error.message.includes('Triangle count')) {
          throw new Error('The STL file appears to be corrupted. Please try re-exporting it from your CAD software.');
        }
        throw error;
      }
    }

    console.log('Successfully parsed geometry');

    const wallThickness = analyzeWallThickness(triangles, process);
    const overhangs = analyzeOverhangs(triangles, normals);

    console.log('Analysis complete:', {
      wallThicknessIssues: wallThickness.issues.length,
      overhangIssues: overhangs.issues.length,
      totalTime: Date.now() - startTime,
    });

    return {
      wallThickness,
      overhangs,
      holeSize: { issues: [], pass: true },
      draftAngles: { issues: [], pass: true }
    };
  } catch (error) {
    console.error('Geometry analysis error:', error);
    throw error;
  }
}