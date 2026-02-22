'use client';

import { Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Breadboard from './Breadboard';
import PinGrid from './Pin';

const CANVAS_BG = 'linear-gradient(155deg, #f9f7ff 0%, #ede8f8 55%, #e8ecf8 100%)';

// Error boundary catches silent Three.js / R3F init failures
class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8" style={{ background: CANVAS_BG }}>
          <p className="text-red-500 font-mono text-sm font-bold">3D engine failed to start</p>
          <p className="text-gray-500 font-mono text-xs max-w-md">{this.state.error.message}</p>
          <p className="text-gray-400 text-xs">Check DevTools console for details. WebGL must be enabled.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Scene() {
  return (
    <SceneErrorBoundary>
      <Canvas
        camera={{ position: [0, 13, 11], fov: 38, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%', background: CANVAS_BG }}
      >
        {/* Three-point studio lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 16, 8]} intensity={1.8} />
        <directionalLight position={[-8, 10, -5]} intensity={0.5} color="#c0d0ff" />
        <directionalLight position={[0, 5, -12]} intensity={0.3} color="#ffe8c0" />

        {/* Scene geometry */}
        <Breadboard />
        <PinGrid />

        {/* Orbit camera */}
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={3}
          maxDistance={35}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0, 0]}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </SceneErrorBoundary>
  );
}
