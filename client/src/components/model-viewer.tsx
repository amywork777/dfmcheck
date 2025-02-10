import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { parseSTL } from "@/lib/geometry";
import type { DFMReport } from "@shared/schema";

interface ModelViewerProps {
  fileContent: string;
  className?: string;
  analysisReport?: DFMReport;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function IssueHighlight({ 
  position, 
  color, 
  type,
  size = 0.05 
}: { 
  position: THREE.Vector3; 
  color: string;
  type: 'point' | 'line';
  size?: number;
}) {
  if (type === 'line') {
    return (
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              position.x - size, position.y, position.z,
              position.x + size, position.y, position.z
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={2} />
      </line>
    );
  }

  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

function Model({ geometry, analysisReport }: { geometry: THREE.BufferGeometry; analysisReport?: DFMReport }) {
  const [issuePoints, setIssuePoints] = useState<Array<{ 
    position: THREE.Vector3; 
    color: string;
    type: 'point' | 'line';
    size?: number;
  }>>([]);

  useEffect(() => {
    if (!analysisReport || !geometry) return;

    const points: Array<{ position: THREE.Vector3; color: string; type: 'point' | 'line'; size?: number }> = [];
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;

    // Process wall thickness issues
    if (analysisReport.wallThickness.issues.length > 0) {
      for (let i = 0; i < positionAttr.count; i += 3) {
        const v1 = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
        const v2 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 1);
        const v3 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 2);

        const thickness = v2.distanceTo(v1);
        if (thickness < 1.2) { // Using CNC machining minimum wall thickness as reference
          const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
          points.push({ 
            position: center, 
            color: '#ff4444', // Red for thin walls
            type: 'line',
            size: thickness * 2 // Make line length proportional to wall thickness
          });
        }
      }
    }

    // Process overhang issues
    if (analysisReport.overhangs.issues.length > 0) {
      for (let i = 0; i < normalAttr.count; i++) {
        const normal = new THREE.Vector3().fromBufferAttribute(normalAttr, i);
        const angle = Math.acos(normal.z) * (180 / Math.PI);

        if (angle > 45) {
          const position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
          points.push({ 
            position, 
            color: '#ffaa00', // Orange for overhangs
            type: 'point',
            size: 0.08 // Larger indicators for overhang issues
          });
        }
      }
    }

    // Process hole size issues for CNC machining
    if (analysisReport.holeSize.issues.length > 0) {
      // Add visual indicators for small holes
      const holePositions = findHoles(geometry);
      holePositions.forEach(pos => {
        points.push({
          position: pos,
          color: '#4444ff', // Blue for hole size issues
          type: 'point',
          size: 0.06
        });
      });
    }

    setIssuePoints(points);
  }, [geometry, analysisReport]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <mesh geometry={geometry}>
        <meshPhongMaterial color="#666" transparent opacity={0.9} />
      </mesh>
      {issuePoints.map((point, index) => (
        <IssueHighlight 
          key={index} 
          position={point.position} 
          color={point.color}
          type={point.type}
          size={point.size}
        />
      ))}
      <OrbitControls />
    </>
  );
}

function findHoles(geometry: THREE.BufferGeometry): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;

  // Simplified hole detection - look for circular patterns in vertices
  for (let i = 0; i < positionAttr.count; i += 3) {
    const v1 = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
    const v2 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 1);
    const v3 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 2);

    // Check if vertices form a roughly circular pattern
    const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
    const radius = v1.distanceTo(center);

    if (radius < 1.0) { // Small holes less than 2mm diameter
      positions.push(center);
    }
  }

  return positions;
}

export function ModelViewer({ fileContent, className = "", analysisReport }: ModelViewerProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileContent) {
      setError("No file content provided");
      return;
    }

    try {
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { triangles, normals } = parseSTL(bytes.buffer);
      const threeGeometry = new THREE.BufferGeometry();
      threeGeometry.setAttribute('position', new THREE.BufferAttribute(triangles, 3));
      threeGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

      threeGeometry.center();
      threeGeometry.computeBoundingBox();

      if (threeGeometry.boundingBox) {
        const size = new THREE.Vector3();
        threeGeometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        threeGeometry.scale(scale, scale, scale);
      }

      setGeometry(threeGeometry);
      setError(null);
    } catch (err) {
      console.error('Error loading STL:', err);
      setError(err instanceof Error ? err.message : "Failed to load 3D model");
    }
  }, [fileContent]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!geometry) {
    return <LoadingFallback />;
  }

  return (
    <div className="space-y-4">
      <div className="w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 75 }}
            style={{ background: '#f3f4f6' }}
          >
            <Model geometry={geometry} analysisReport={analysisReport} />
          </Canvas>
        </Suspense>
      </div>

      {analysisReport && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff4444]" />
            <span>Thin Walls (Red Lines)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ffaa00]" />
            <span>Overhangs (Orange Dots)</span>
          </div>
          {analysisReport.holeSize.issues.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#4444ff]" />
              <span>Small Holes (Blue Dots)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}