'use client';

import { useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

interface GardenObjectProps {
  position: [number, number, number];
  onUpdatePosition: (newPos: [number, number, number]) => void;
}

export function MovableObject({ position, onUpdatePosition }: GardenObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const handleTransformEnd = () => {
    if (meshRef.current) {
      const pos = meshRef.current.position;
      onUpdatePosition([pos.x, pos.y, pos.z]);
    }
  };

  return (
    <TransformControls mode="translate" onMouseUp={handleTransformEnd}>
      <mesh ref={meshRef} position={position} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="white" roughness={0.4} metalness={0.1} />
      </mesh>
    </TransformControls>
  );
}
