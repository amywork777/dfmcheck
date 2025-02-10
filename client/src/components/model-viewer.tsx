import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface ModelViewerProps {
  fileContent: string;
  className?: string;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
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
      const loader = new STLLoader();

      // Convert base64 to binary
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('Loading STL...', bytes.length, 'bytes');

      const loadedGeometry = loader.parse(bytes.buffer);
      console.log('STL loaded successfully');

      // Center and normalize
      loadedGeometry.center();
      loadedGeometry.computeBoundingBox();

      if (loadedGeometry.boundingBox) {
        const size = new THREE.Vector3();
        loadedGeometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        loadedGeometry.scale(scale, scale, scale);
      }

      setGeometry(loadedGeometry);
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
    <div className={`w-full h-[400px] bg-gray-50 rounded-lg ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 5] }}
          gl={{ 
            antialias: true,
            alpha: true
          }}
        >
          <Model geometry={geometry} />
        </Canvas>
      </Suspense>
    </div>
  );
}