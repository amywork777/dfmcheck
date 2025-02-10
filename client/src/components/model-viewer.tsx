import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
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
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls enablePan enableZoom enableRotate />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#666" roughness={0.5} metalness={0.5} />
      </mesh>
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
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('Loading STL geometry...', {
        contentLength: fileContent.length,
        binaryLength: len
      });

      const geometry = loader.parse(bytes.buffer);

      // Center and normalize the geometry
      geometry.center();
      geometry.computeBoundingBox();

      if (geometry.boundingBox) {
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim; // Scale to fit in a 2x2x2 box
        geometry.scale(scale, scale, scale);
      }

      console.log('STL geometry loaded successfully');
      setGeometry(geometry);
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
    <div className={`w-full h-[400px] bg-gray-50 ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance"
          }}
          camera={{ position: [0, 0, 5], fov: 50 }}
          onCreated={({ gl }) => {
            gl.setClearColor('#f8f9fa', 1);
            gl.physicallyCorrectLights = true;
          }}
        >
          <Model geometry={geometry} />
        </Canvas>
      </Suspense>
    </div>
  );
}