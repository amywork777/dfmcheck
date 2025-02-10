import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { parseSTL } from "@/lib/geometry";

interface ModelViewerProps {
  fileContent: string;
  className?: string;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function Model({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <mesh geometry={geometry}>
        <meshPhongMaterial color="#666" />
      </mesh>
      <OrbitControls />
    </>
  );
}

export function ModelViewer({ fileContent, className = "" }: ModelViewerProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileContent) {
      setError("No file content provided");
      return;
    }

    try {
      // Convert base64 to binary
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('STL buffer size:', bytes.buffer.byteLength);

      // Parse STL and create geometry
      const { triangles, normals } = parseSTL(bytes.buffer);

      // Create Three.js geometry
      const threeGeometry = new THREE.BufferGeometry();
      threeGeometry.setAttribute('position', new THREE.BufferAttribute(triangles, 3));
      threeGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

      // Center and normalize
      threeGeometry.center();
      threeGeometry.computeBoundingBox();

      if (threeGeometry.boundingBox) {
        const size = new THREE.Vector3();
        threeGeometry.boundingBox.getSize(size);
        console.log('Model size:', size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        threeGeometry.scale(scale, scale, scale);
        console.log('Applied scale:', scale);
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
    <div className="w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
          style={{ background: '#f3f4f6' }}
        >
          <Model geometry={geometry} />
        </Canvas>
      </Suspense>
    </div>
  );
}