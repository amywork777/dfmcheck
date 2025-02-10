import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

interface ModelViewerProps {
  fileContent: string;
  className?: string;
}

export function ModelViewer({ fileContent, className = "" }: ModelViewerProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!fileContent) return;

    const loader = new STLLoader();

    // Convert base64 to binary
    const binaryString = atob(fileContent);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const geometry = loader.parse(bytes.buffer);

    // Center the geometry
    geometry.center();
    geometry.computeBoundingBox();

    setGeometry(geometry);
  }, [fileContent]);

  if (!geometry) return null;

  return (
    <div className={`w-full h-[400px] ${className}`}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <OrbitControls enablePan enableZoom enableRotate />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#666" />
        </mesh>
      </Canvas>
    </div>
  );
}