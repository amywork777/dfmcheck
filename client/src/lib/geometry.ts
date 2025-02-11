import { DFMReport } from "@shared/schema";
import * as THREE from 'three';

const MIN_WALL_THICKNESS = {
  '3d_printing': 0.8, // mm
  'injection_molding': 1.0, // mm
  'cnc_machining': 1.2, // mm
  'sheet_metal': 0.5 // mm
} as const;

// Include materials directly in geometry.ts to avoid circular imports
const PROCESS_MATERIALS = {
  '3d_printing': ['PLA', 'PETG', 'ABS', 'TPU', 'Nylon'],
  'cnc_machining': ['Aluminum 6061', 'Brass', 'Steel 1018', 'Stainless Steel 304', 'PEEK'],
  'injection_molding': ['ABS', 'Polypropylene', 'Polyethylene', 'Polycarbonate', 'Nylon'],
  'sheet_metal': ['Aluminum', 'Steel', 'Stainless Steel', 'Copper', 'Brass']
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

    if (triangleCount <= 0 || triangleCount > 5000000 || data.byteLength !== expectedSize) {
      throw new Error(`Invalid binary STL file: Expected size ${expectedSize}, got ${data.byteLength}`);
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

const BASE_SETUP_COSTS = {
  '3d_printing': 50,      // USD
  'injection_molding': 5000,
  'cnc_machining': 250,
  'sheet_metal': 200
} as const;

const LABOR_RATES = {
  '3d_printing': 45,      // USD per hour
  'injection_molding': 85,
  'cnc_machining': 95,
  'sheet_metal': 75
} as const;

const MATERIAL_COSTS = {
  // 3D Printing materials (USD per kg)
  'PLA': { cost: 25, minOrder: 1, leadTime: '2-3 days' },
  'PETG': { cost: 30, minOrder: 1, leadTime: '2-3 days' },
  'ABS': { cost: 28, minOrder: 1, leadTime: '2-3 days' },
  'TPU': { cost: 45, minOrder: 1, leadTime: '3-4 days' },
  'Nylon': { cost: 50, minOrder: 1, leadTime: '3-4 days' },

  // CNC materials (USD per kg)
  'Aluminum 6061': { cost: 15, minOrder: 5, leadTime: '5-7 days' },
  'Brass': { cost: 25, minOrder: 5, leadTime: '5-7 days' },
  'Steel 1018': { cost: 10, minOrder: 5, leadTime: '5-7 days' },
  'Stainless Steel 304': { cost: 20, minOrder: 5, leadTime: '7-10 days' },
  'PEEK': { cost: 150, minOrder: 1, leadTime: '7-10 days' },

  // Sheet metal (USD per sheet)
  'Aluminum': { cost: 100, minOrder: 1, leadTime: '3-5 days' },
  'Steel': { cost: 80, minOrder: 1, leadTime: '3-5 days' },
  'Stainless Steel': { cost: 150, minOrder: 1, leadTime: '5-7 days' },
  'Copper': { cost: 200, minOrder: 1, leadTime: '5-7 days' },
  'Brass Sheet': { cost: 180, minOrder: 1, leadTime: '5-7 days' }
} as const;

interface CostEstimate {
  materialCost: number;
  laborCost: number;
  setupCost: number;
  totalCost: number;
  volumeDiscounts: { quantity: number; discountPercentage: number; pricePerUnit: number }[];
}


function estimateVolume(triangles: Float32Array): number {
  let volume = 0;
  for (let i = 0; i < triangles.length; i += 9) {
    const v1 = new THREE.Vector3(triangles[i], triangles[i + 1], triangles[i + 2]);
    const v2 = new THREE.Vector3(triangles[i + 3], triangles[i + 4], triangles[i + 5]);
    const v3 = new THREE.Vector3(triangles[i + 6], triangles[i + 7], triangles[i + 8]);

    // Calculate signed volume of tetrahedron formed by triangle and origin
    const signedVolume = v1.dot(v2.cross(v3)) / 6.0;
    volume += Math.abs(signedVolume);
  }
  return volume; // in cubic millimeters
}

function calculateCostEstimate(
  volume: number,
  process: ProcessType,
  complexity: number
): CostEstimate {
  const setupCost = BASE_SETUP_COSTS[process];
  const laborRate = LABOR_RATES[process];

  // Estimate processing time based on volume and complexity
  const processingHours = (volume / 1000) * complexity * 0.5;
  const laborCost = processingHours * laborRate;

  // Estimate material cost (assuming average material cost for the process)
  const materialCostPerUnit = 50; // USD per kg
  const materialWeight = (volume / 1000000) * 1.2; // Convert mm³ to kg (assuming average density)
  const materialCost = materialWeight * materialCostPerUnit;

  const totalCost = setupCost + laborCost + materialCost;

  // Calculate volume discounts
  const volumeDiscounts = [
    { quantity: 10, discountPercentage: 10, pricePerUnit: totalCost * 0.9 },
    { quantity: 50, discountPercentage: 20, pricePerUnit: totalCost * 0.8 },
    { quantity: 100, discountPercentage: 30, pricePerUnit: totalCost * 0.7 },
    { quantity: 500, discountPercentage: 40, pricePerUnit: totalCost * 0.6 }
  ];

  return {
    materialCost,
    laborCost,
    setupCost,
    totalCost,
    volumeDiscounts
  };
}

function generateMaterialRecommendations(
  process: ProcessType,
  wallThicknessIssues: boolean,
  overhangIssues: boolean,
  complexity: number
): {
  recommended: string[];
  notRecommended: string[];
  reasoning: string;
} {
  const availableMaterials = PROCESS_MATERIALS[process];
  const recommended: string[] = [];
  const notRecommended: string[] = [];
  let reasoning = '';

  switch (process) {
    case '3d_printing':
      if (overhangIssues) {
        recommended.push('PLA', 'PETG');
        notRecommended.push('ABS', 'Nylon');
        reasoning = 'Due to significant overhangs, materials with better bridging properties are recommended.';
      } else if (wallThicknessIssues) {
        recommended.push('PETG', 'ABS');
        notRecommended.push('TPU', 'PLA');
        reasoning = 'Thin walls require materials with higher strength and rigidity.';
      } else {
        recommended.push(...availableMaterials);
        reasoning = 'No significant geometric constraints, all materials are suitable.';
      }
      break;

    case 'cnc_machining':
      if (wallThicknessIssues) {
        recommended.push('Aluminum 6061', 'Steel 1018');
        notRecommended.push('Brass', 'PEEK');
        reasoning = 'Thin walls require materials with high machinability and strength.';
      } else {
        recommended.push(...availableMaterials);
        reasoning = 'Standard machining requirements, all materials are suitable.';
      }
      break;
  }

  return {
    recommended,
    notRecommended,
    reasoning
  };
}

export function analyzeGeometry(fileContent: string, process: ProcessType): DFMReport {
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

    const { triangles, normals } = parseSTL(bytes.buffer);
    console.log('Successfully parsed STL geometry');

    const wallThickness = analyzeWallThickness(triangles, process);
    const overhangs = analyzeOverhangs(triangles, normals);

    // Calculate volume and complexity for cost estimation
    const volume = estimateVolume(triangles);
    const complexity = 1 +
      (wallThickness.issues.length * 0.1) +
      (overhangs.issues.length * 0.15);

    // Generate material recommendations
    const materialRecommendations = generateMaterialRecommendations(
      process,
      wallThickness.issues.length > 0,
      overhangs.issues.length > 0,
      complexity
    );

    // Calculate cost estimate
    const costEstimate = calculateCostEstimate(volume, process, complexity);

    return {
      wallThickness,
      overhangs,
      holeSize: { issues: [], pass: true },
      draftAngles: { issues: [], pass: true },
      materialRecommendations,
      costEstimate
    };
  } catch (error) {
    console.error('Geometry analysis error:', error);
    throw error;
  }
}