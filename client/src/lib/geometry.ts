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

function parseBinarySTL(buffer: ArrayBuffer): {
  triangles: Float32Array;
  normals: Float32Array;
} {
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const triangles = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 3);

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    // Read normal
    normals[i * 3] = view.getFloat32(offset, true);
    normals[i * 3 + 1] = view.getFloat32(offset + 4, true);
    normals[i * 3 + 2] = view.getFloat32(offset + 8, true);

    // Read vertices
    for (let j = 0; j < 3; j++) {
      triangles[i * 9 + j * 3] = view.getFloat32(offset + 12 + j * 12, true);
      triangles[i * 9 + j * 3 + 1] = view.getFloat32(offset + 16 + j * 12, true);
      triangles[i * 9 + j * 3 + 2] = view.getFloat32(offset + 20 + j * 12, true);
    }

    offset += 50; // Skip attribute byte count
  }

  return { triangles, normals };
}

function analyzeWallThickness(triangles: Float32Array, process: string): {
  issues: string[];
  pass: boolean;
} {
  const minThickness = MIN_WALL_THICKNESS[process as keyof typeof MIN_WALL_THICKNESS];
  const issues: string[] = [];
  let pass = true;

  // Basic wall thickness analysis using triangle distances
  for (let i = 0; i < triangles.length; i += 9) {
    const thickness = Math.abs(triangles[i + 2] - triangles[i + 5]);
    if (thickness < minThickness) {
      issues.push(
        `Detected wall thickness of ${thickness.toFixed(2)}mm - minimum recommended for ${process.replace('_', ' ')} is ${minThickness}mm`
      );
      pass = false;
    }
  }

  return { issues, pass };
}

function analyzeOverhangs(normals: Float32Array): {
  issues: string[];
  pass: boolean;
} {
  const issues: string[] = [];
  let pass = true;

  // Check normals for steep overhangs
  for (let i = 0; i < normals.length; i += 3) {
    const angle = Math.acos(normals[i + 2]) * (180 / Math.PI);
    if (angle > MAX_OVERHANG_ANGLE) {
      issues.push(
        `${angle.toFixed(1)}° overhang detected - support structures required for angles over ${MAX_OVERHANG_ANGLE}°`
      );
      pass = false;
    }
  }

  return { issues, pass };
}

export function analyzeGeometry(fileContent: string, process: string): DFMReport {
  // Convert base64 string to ArrayBuffer
  const binaryString = atob(fileContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { triangles, normals } = parseBinarySTL(bytes.buffer);

  const wallThickness = analyzeWallThickness(triangles, process);
  const overhangs = analyzeOverhangs(normals);

  // Process-specific checks
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
}