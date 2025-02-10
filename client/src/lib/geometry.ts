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

function validateSTLHeader(buffer: ArrayBuffer): boolean {
  // Check if buffer is at least large enough to contain header and triangle count
  if (buffer.byteLength < 84) {
    console.error('Buffer too small:', buffer.byteLength, 'bytes');
    throw new Error("Invalid STL file: File too small");
  }

  // First 80 bytes should be ASCII header
  const headerView = new Uint8Array(buffer, 0, 80);
  const decoder = new TextDecoder();
  const header = decoder.decode(headerView);
  console.log('STL Header:', header);

  return true;
}

function parseBinarySTL(buffer: ArrayBuffer): {
  triangles: Float32Array;
  normals: Float32Array;
} {
  try {
    validateSTLHeader(buffer);

    const view = new DataView(buffer);
    const triangleCount = view.getUint32(80, true);
    console.log('Triangle count:', triangleCount);
    console.log('Buffer size:', buffer.byteLength);

    // Validate expected file size
    const expectedSize = 84 + (triangleCount * 50);
    console.log('Expected size:', expectedSize);

    if (triangleCount <= 0 || triangleCount > 5000000) {
      console.error('Invalid triangle count:', triangleCount);
      throw new Error("Invalid STL file: Invalid number of triangles");
    }

    if (buffer.byteLength !== expectedSize) {
      console.error('Size mismatch:', {
        actual: buffer.byteLength,
        expected: expectedSize,
        triangles: triangleCount
      });
      throw new Error("Invalid STL file: File size doesn't match triangle count");
    }

    const triangles = new Float32Array(triangleCount * 9);
    const normals = new Float32Array(triangleCount * 3);

    let offset = 84; // Skip header
    for (let i = 0; i < triangleCount; i++) {
      // Validate we have enough data left
      if (offset + 50 > buffer.byteLength) {
        console.error('Buffer overflow at triangle:', i);
        throw new Error("Invalid STL file: Unexpected end of file");
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

      offset += 50; // Move to next triangle (includes 2 padding bytes)
    }

    console.log('Successfully parsed STL:', {
      triangleCount,
      vertexCount: triangleCount * 3
    });

    return { triangles, normals };
  } catch (error) {
    console.error('STL parsing error:', error);
    throw error;
  }
}

function analyzeWallThickness(triangles: Float32Array, process: string): {
  issues: string[];
  pass: boolean;
} {
  const minThickness = MIN_WALL_THICKNESS[process as keyof typeof MIN_WALL_THICKNESS];
  const issues: string[] = [];
  let pass = true;

  try {
    // Analyze wall thickness using triangle pairs
    for (let i = 0; i < triangles.length; i += 9) {
      const v1 = [triangles[i], triangles[i + 1], triangles[i + 2]];
      const v2 = [triangles[i + 3], triangles[i + 4], triangles[i + 5]];

      // Calculate distance between vertices
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
  } catch (error) {
    console.error('Wall thickness analysis error:', error);
    throw new Error('Failed to analyze wall thickness');
  }

  return { issues, pass };
}

function analyzeOverhangs(normals: Float32Array): {
  issues: string[];
  pass: boolean;
} {
  const issues: string[] = [];
  let pass = true;

  try {
    // Check normals for steep overhangs
    for (let i = 0; i < normals.length; i += 3) {
      const normal = [normals[i], normals[i + 1], normals[i + 2]];
      // Calculate angle with respect to build direction (Z-axis)
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
    throw new Error('Failed to analyze overhangs');
  }

  return { issues, pass };
}

export function analyzeGeometry(fileContent: string, process: string): DFMReport {
  try {
    // Convert base64 to binary
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
  } catch (error) {
    console.error('Geometry analysis error:', error);
    throw new Error(`Failed to analyze geometry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}