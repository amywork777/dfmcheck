import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Suspense, useEffect, useState, useCallback } from "react";
import * as THREE from 'three';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { parseSTL } from "@/lib/geometry";
import { Progress } from "@/components/ui/progress"; 
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
  highlighted?: boolean;
}

function IssueLabel({ position, text, color, highlighted }: IssueLabelProps) {
  return (
    <Html position={[position.x, position.y, position.z]}>
      <div
        className={`px-3 py-1.5 text-sm rounded-md shadow-lg transition-all duration-200 ${
          highlighted ? "scale-110 ring-2 ring-white" : ""
        }`}
        style={{
          backgroundColor: color,
          color: "white",
          opacity: highlighted ? 1 : 0.95,
          whiteSpace: "nowrap",
          fontWeight: "bold",
          border: "2px solid rgba(255,255,255,0.2)",
        }}
      >
        {text}
      </div>
    </Html>
  );
}

interface IssueHighlightProps {
  position: THREE.Vector3;
  color: string;
  type: "point" | "line";
  size?: number;
  measurement?: string;
  highlighted?: boolean;
  onClick?: () => void;
}

function IssueHighlight({
  position,
  color,
  type,
  size = 0.05,
  measurement,
  highlighted,
  onClick,
}: IssueHighlightProps) {
  const handlePointerOver = useCallback((e: any) => {
    if (e.object) {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = "default";
  }, []);

  const handleClick = useCallback((e: any) => {
    if (e.object) {
      e.stopPropagation();
      onClick?.();
    }
  }, [onClick]);

  return (
    <>
      {type === "line" ? (
        <mesh
          position={position}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <boxGeometry args={[size * 2, 0.02, 0.02]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={highlighted ? 1 : 0.8}
          />
        </mesh>
      ) : (
        <mesh
          position={position}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <sphereGeometry args={[size * (highlighted ? 1.5 : 1), 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={highlighted ? 1 : 0.95}
          />
        </mesh>
      )}
      {measurement && (
        <IssueLabel
          position={new THREE.Vector3(
            position.x,
            position.y + (type === "line" ? 0.15 : 0.2),
            position.z
          )}
          text={measurement}
          color={color}
          highlighted={highlighted}
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
  const [issuePoints, setIssuePoints] = useState<(IssueHighlightProps & { id: number })[]>([]);
  const [highlightedIssueId, setHighlightedIssueId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!analysisReport || !geometry) return;

    const points: (IssueHighlightProps & { id: number })[] = [];
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    let idCounter = 0;

    // Calculate sampling rate based on model complexity
    const totalTriangles = positionAttr.count / 3;
    const samplingRate = Math.max(5, Math.ceil(totalTriangles / 1000));

    let processedPoints = 0;
    const maxPoints = 50; // Limit visualization markers for performance

    // Process wall thickness issues
    if (analysisReport.wallThickness.issues.length > 0) {
      for (let i = 0; i < positionAttr.count && processedPoints < maxPoints; i += 3 * samplingRate) {
        const v1 = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
        const v2 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 1);
        const v3 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 2);

        const thickness = v2.distanceTo(v1);
        if (thickness < 1.2) {
          const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
          points.push({
            id: idCounter++,
            position: center,
            color: "#ff2222",
            type: "line",
            size: thickness,
            measurement: `${thickness.toFixed(2)}mm wall`,
            onClick: () => setHighlightedIssueId(idCounter - 1),
          });
          processedPoints++;
        }
        setProgress((i / positionAttr.count) * 100);
      }
    }

    // Process overhang issues with the remaining point budget
    if (analysisReport.overhangs.issues.length > 0) {
      for (let i = 0; i < positionAttr.count && processedPoints < maxPoints; i += 3 * samplingRate) {
        const v1 = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
        const v2 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 1);
        const v3 = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 2);

        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
        const upVector = new THREE.Vector3(0, 1, 0);
        const angle = Math.acos(Math.abs(normal.dot(upVector))) * (180 / Math.PI);

        const faceArea = edge1.cross(edge2).length() / 2;
        if (angle > 45 && faceArea > 0.01) {
          const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
          points.push({
            id: idCounter++,
            position: center,
            color: "#ff8800",
            type: "point",
            size: 0.05,
            measurement: `${angle.toFixed(1)}° overhang`,
            onClick: () => setHighlightedIssueId(idCounter - 1),
          });
          processedPoints++;
        }
        setProgress((i / positionAttr.count) * 100);
      }
    }

    setIssuePoints(points);
    setProgress(100);
  }, [geometry, analysisReport]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#777"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          wireframe={false}
          flatShading={true}
        />
      </mesh>
      {issuePoints.map((point) => (
        <IssueHighlight
          key={point.id}
          {...point}
          highlighted={point.id === highlightedIssueId}
        />
      ))}
      <OrbitControls
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        maxDistance={10}
        minDistance={0.5}
      />
      {progress < 100 && (
        <Html position={[0, -1.5, 0]}>
          <div className="w-64">
            <Progress value={progress} className="h-2" />
          </div>
        </Html>
      )}
    </>
  );
}

export function ModelViewer({
  fileContent,
  className = "",
  analysisReport,
}: ModelViewerProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileContent) {
      setError("No file content provided");
      return;
    }

    try {
      // Convert base64 to array buffer
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Parse STL and create geometry
      const { triangles, normals } = parseSTL(bytes.buffer);

      const threeGeometry = new THREE.BufferGeometry();
      threeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(triangles, 3));
      threeGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));

      // Center and scale the geometry
      threeGeometry.center();
      threeGeometry.computeBoundingBox();

      if (threeGeometry.boundingBox) {
        const size = new THREE.Vector3();
        threeGeometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const minDim = Math.min(size.x, size.y, size.z);

        // Enhanced scaling logic for better visibility of small models
        let scale = 2 / maxDim; // Default scale

        // If the model is very small (max dimension < 1), ensure it's scaled up significantly
        if (maxDim < 1) {
          // More aggressive scaling for tiny models
          scale = 2 / Math.min(maxDim, 0.01); // Scale up tiny models even more
        }

        // If model is extremely small, enforce minimum scale
        if (scale < 0.01) {
          scale = 0.01;
        }

        // Cap maximum scale to prevent overflow
        scale = Math.min(scale, 200); // Increased max scale for better visibility

        // Apply the calculated scale
        threeGeometry.scale(scale, scale, scale);

        console.log('Model dimensions:', {
          original: { x: size.x, y: size.y, z: size.z },
          maxDim,
          minDim,
          appliedScale: scale,
          finalSize: {
            x: size.x * scale,
            y: size.y * scale,
            z: size.z * scale
          }
        });
      }

      setGeometry(threeGeometry);
      setError(null);
    } catch (err) {
      console.error("Error loading model:", err);
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
    <div className={`w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
          style={{ background: "#f3f4f6" }}
          dpr={[1, 2]} // Limit DPR for better performance
          performance={{ min: 0.5 }} // Allow frame rate to drop for better performance
        >
          <Model geometry={geometry} analysisReport={analysisReport} />
        </Canvas>
      </Suspense>
    </div>
  );
}