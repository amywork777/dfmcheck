import type { DFMReport } from "@shared/schema";
import * as THREE from 'three';

export function parseSTL(data: ArrayBuffer): { triangles: Float32Array; normals: Float32Array } {
  if (data.byteLength === 0) {
    throw new Error("Empty file provided");
  }

  console.log('Starting STL parsing...');
  const view = new DataView(data);

  // Check if binary STL
  const isBinary = !isAsciiSTL(data);
  console.log('STL Format:', isBinary ? 'Binary' : 'ASCII');

  if (!isBinary) {
    return parseAsciiSTL(data);
  }

  // Parse binary STL
  if (data.byteLength < 84) {
    throw new Error("Invalid STL file: Too small for binary format");
  }

  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + (triangleCount * 50);

  if (data.byteLength !== expectedSize) {
    throw new Error(`Invalid STL file: Incorrect file size`);
  }

  const triangles = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 9); // One normal per vertex for better rendering

  let offset = 84; // Skip header
  let vertexIndex = 0;
  let normalIndex = 0;

  for (let i = 0; i < triangleCount; i++) {
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;

    // Store vertices
    for (let j = 0; j < 3; j++) {
      triangles[vertexIndex] = view.getFloat32(offset, true);
      triangles[vertexIndex + 1] = view.getFloat32(offset + 4, true);
      triangles[vertexIndex + 2] = view.getFloat32(offset + 8, true);

      // Store normal for each vertex
      normals[normalIndex] = nx;
      normals[normalIndex + 1] = ny;
      normals[normalIndex + 2] = nz;

      vertexIndex += 3;
      normalIndex += 3;
      offset += 12;
    }

    offset += 2; // Skip attribute byte count
  }

  return { triangles, normals };
}

function isAsciiSTL(data: ArrayBuffer): boolean {
  const decoder = new TextDecoder();
  const header = decoder.decode(new Uint8Array(data, 0, 5));
  return header.toLowerCase().trim() === 'solid';
}

function parseAsciiSTL(data: ArrayBuffer): { triangles: Float32Array; normals: Float32Array } {
  const decoder = new TextDecoder();
  const text = decoder.decode(data);
  const lines = text.split('\n');

  const vertices: number[] = [];
  const normals: number[] = [];
  let normal: number[] = [0, 0, 0];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('facet normal ')) {
      const parts = trimmed.split(/\s+/);
      normal = [
        parseFloat(parts[2]),
        parseFloat(parts[3]),
        parseFloat(parts[4])
      ];
    } else if (trimmed.startsWith('vertex ')) {
      const parts = trimmed.split(/\s+/);
      vertices.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      );
      normals.push(...normal);
    }
  }

  return {
    triangles: new Float32Array(vertices),
    normals: new Float32Array(normals)
  };
}

export function analyzeGeometry(fileContent: string, process: string): DFMReport {
  if (!fileContent) {
    throw new Error("No file content provided for analysis");
  }

  const binaryString = atob(fileContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { triangles, normals } = parseSTL(bytes.buffer);

  // Cast process to ProcessType since we know it's valid from the schema
  const processType = process as ProcessType;
  const wallThickness = analyzeWallThickness(triangles, processType);
  const overhangs = analyzeOverhangs(triangles, normals);

  return {
    wallThickness,
    overhangs,
    holeSize: { issues: [], pass: true },
    draftAngles: { issues: [], pass: true }
  };
}

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

    if (avgThickness < minThickness && avgThickness > 0.01) {
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