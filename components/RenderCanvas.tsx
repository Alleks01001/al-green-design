'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, SoftShadows, OrbitControls } from '@react-three/drei';
import { MovableObject } from './MovableObject';

export default function RenderCanvas() {
  const [pos, setPos] = useState<[number, number, number]>([0, 1, 0]);

  return (
    <Canvas shadows camera={{ position: [15, 15, 15], fov: 45 }}>
      <SoftShadows size={25} samples={10} focus={0} />
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 40, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <MovableObject position={pos} onUpdatePosition={setPos} />
      <OrbitControls makeDefault />
    </Canvas>
  );
}
