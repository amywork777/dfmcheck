import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { parseSTL } from "@/lib/geometry";
import type { DFMReport } from "@shared/schema";

interface ModelViewerProps {
  fileContent: string;
  className?: string;
  analysisReport?: DFMReport | null;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

interface IssueLabelProps {
  position: THREE.Vector3;
  text: string;
  color: string;
}

function IssueLabel({ position, text, color }: IssueLabelProps) {
  return (
    <Html position={[position.x, position.y, position.z]}>
      <div className="px-2 py-1 text-xs rounded-md shadow-lg" style={{ 
        backgroundColor: color, 
        color: 'white',
        opacity: 0.95,
        whiteSpace: 'nowrap',
        fontWeight: 'bold'
      }}>
        {text}
      </div>
    </Html>
  );
}

interface IssueHighlightProps {
  position: THREE.Vector3;
  color: string;
  type: 'point' | 'line';
  size?: number;
  measurement?: string;
}

function IssueHighlight({ position, color, type, size = 0.05, measurement }: IssueHighlightProps) {
  return (
    <>
      {type === 'line' ? (
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
          <lineBasicMaterial color={color} linewidth={3} />
        </line>
      ) : (
        <mesh position={position}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      )}
      {measurement && (
        <IssueLabel 
          position={new THREE.Vector3(
            position.x,
            position.y + (type === 'line' ? 0.1 : 0.15),
            position.z
          )}
          text={measurement} 
          color={color} 
        />
      )}
    </>
  );
}

interface ModelProps {
  geometry: THREE.BufferGeometry;
  analysisReport?: DFMReport | null;
}

function Model({ geometry, analysisReport }: ModelProps) {
  const [issuePoints, setIssuePoints] = useState<IssueHighlightProps[]>([]);

  useEffect(() => {
    if (!analysisReport || !geometry) return;

    const points: IssueHighlightProps[] = [];
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;

    // Optimized sampling rate based on model complexity
    const sampleRate = Math.max(1, Math.floor(positionAttr.count / (positionAttr.count > 10000 ? 200 : 50)));

    // Process wall thickness issues
    if (analysisReport.wallThickness.issues.length > 0) {
      for (let i = 0; i < positionAttr.count; i += sampleRate * 3) {
        const v1 = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
        const v2 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 1);
        const v3 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 2);

        const thickness = v2.distanceTo(v1);
        if (thickness < 1.2 && thickness > 0.01) { // Filter out noise
          const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
          points.push({ 
            position: center, 
            color: '#ff4444',
            type: 'line',
            size: thickness * 2,
            measurement: `${thickness.toFixed(2)}mm wall`
          });
        }
      }
    }

    // Process overhang issues
    if (analysisReport.overhangs.issues.length > 0) {
      const normalSampleRate = Math.max(1, Math.floor(normalAttr.count / (normalAttr.count > 10000 ? 150 : 75)));
      for (let i = 0; i < normalAttr.count; i += normalSampleRate) {
        const normal = new THREE.Vector3().fromBufferAttribute(normalAttr, i);
        const angle = Math.acos(normal.z) * (180 / Math.PI);

        if (angle > 45) {
          const position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
          points.push({ 
            position, 
            color: '#ffaa00',
            type: 'point',
            size: 0.08,
            measurement: `${angle.toFixed(1)}° overhang`
          });
        }
      }
    }

    // Process hole size issues
    if (analysisReport.holeSize.issues.length > 0) {
      const holePositions = findHoles(geometry, sampleRate);
      holePositions.slice(0, 15).forEach(({ position, radius }) => {
        points.push({
          position,
          color: '#4444ff',
          type: 'point',
          size: 0.06,
          measurement: `${(radius * 2).toFixed(2)}mm hole`
        });
      });
    }

    setIssuePoints(points.slice(0, 30)); // Limit total indicators for better performance
  }, [geometry, analysisReport]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <mesh geometry={geometry}>
        <meshPhongMaterial color="#666" transparent opacity={0.85} /> {/* Increased transparency for better visibility */}
      </mesh>
      {issuePoints.map((point, index) => (
        <IssueHighlight key={index} {...point} />
      ))}
      <OrbitControls />
    </>
  );
}

function findHoles(geometry: THREE.BufferGeometry, sampleRate: number): Array<{ position: THREE.Vector3; radius: number }> {
  const positions: Array<{ position: THREE.Vector3; radius: number }> = [];
  const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;

  for (let i = 0; i < positionAttr.count; i += sampleRate * 3) {
    const v1 = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
    const v2 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 1);
    const v3 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 2);

    const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
    const radius = v1.distanceTo(center);

    if (radius < 1.0) {
      positions.push({ position: center, radius });
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