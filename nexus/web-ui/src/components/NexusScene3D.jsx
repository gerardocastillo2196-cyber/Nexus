import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Sphere, Torus, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════
   NEXUS 3D SCENE v2.1 — SILKY-SMOOTH HARDWARE ACCELERATED
   Ultra-smooth delta-based motion, zero-jitter Float containers,
   and lightweight GPU point particle buffers.
   ═══════════════════════════════════════════════════════════ */

// --- COLOR PALETTES PER ENGINE ---
const PALETTES = {
  nexus: {
    primary: '#6366f1',
    secondary: '#a78bfa',
    tertiary: '#38bdf8',
    ambient: '#1a1a2e',
    particles: ['#818cf8', '#a78bfa', '#6366f1', '#38bdf8', '#c084fc'],
  },
  escriba: {
    primary: '#f97316',
    secondary: '#fbbf24',
    tertiary: '#fb923c',
    ambient: '#1a150e',
    particles: ['#fb923c', '#f97316', '#fbbf24', '#ea580c', '#fdba74'],
  },
  jellyfish: {
    primary: '#3b82f6',
    secondary: '#60a5fa',
    tertiary: '#22d3ee',
    ambient: '#0e1a2e',
    particles: ['#60a5fa', '#3b82f6', '#22d3ee', '#2563eb', '#67e8f9'],
  },
};

// --- SILKY-SMOOTH GPU PARTICLES (ZERO MATRIX OVERHEAD) ---
function ParticleField({ count = 80, palette, compact = false }) {
  const pointsRef = useRef();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorPool = palette.particles.map(c => new THREE.Color(c));
    const spreadX = compact ? 8 : 16;
    const spreadY = compact ? 8 : 12;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spreadX;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      const c = colorPool[Math.floor(Math.random() * colorPool.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count, palette, compact]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.04;
      pointsRef.current.rotation.x += delta * 0.015;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// --- CENTRAL MORPHING ORB ---
function CentralOrb({ palette }) {
  const meshRef = useRef();

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
      meshRef.current.rotation.x += delta * 0.08;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.8}>
      <Sphere ref={meshRef} args={[1.6, 32, 32]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color={palette.primary}
          emissive={palette.secondary}
          emissiveIntensity={0.35}
          roughness={0.25}
          metalness={0.7}
          distort={0.35}
          speed={1.8}
          transparent
          opacity={0.32}
        />
      </Sphere>
    </Float>
  );
}

// --- ORBITAL RINGS ---
function OrbitalRing({ radius, color, speed, tilt }) {
  const ringRef = useRef();

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * speed;
    }
  });

  return (
    <group rotation={[tilt, 0, 0]}>
      <Torus ref={ringRef} args={[radius, 0.012, 12, 64]} position={[0, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </Torus>
    </group>
  );
}

// --- FLOATING ACCENT SHAPES (NO POSITION JITTER) ---
function FloatingShapes({ palette, compact = false }) {
  const ref1 = useRef();
  const ref2 = useRef();
  const ref3 = useRef();

  useFrame((_, delta) => {
    if (ref1.current) {
      ref1.current.rotation.x += delta * 0.25;
      ref1.current.rotation.y += delta * 0.35;
    }
    if (ref2.current) {
      ref2.current.rotation.x += delta * 0.2;
      ref2.current.rotation.z += delta * 0.28;
    }
    if (ref3.current) {
      ref3.current.rotation.y += delta * 0.22;
      ref3.current.rotation.z += delta * 0.16;
    }
  });

  const pos1 = compact ? [2.5, 1.0, -1.2] : [3.4, 1.2, -1.5];
  const pos2 = compact ? [-2.4, 1.2, -0.8] : [-3.2, 1.6, -1.0];
  const pos3 = compact ? [1.5, -1.2, -1.8] : [2.0, -1.6, -2.2];

  return (
    <>
      <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.9} position={pos1}>
        <Icosahedron ref={ref1} args={[compact ? 0.38 : 0.45, 0]}>
          <MeshWobbleMaterial
            color={palette.primary}
            emissive={palette.primary}
            emissiveIntensity={0.25}
            wireframe
            transparent
            opacity={0.35}
            factor={0.4}
            speed={1.2}
          />
        </Icosahedron>
      </Float>

      <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.8} position={pos2}>
        <Torus ref={ref2} args={[compact ? 0.42 : 0.5, 0.1, 12, 28]}>
          <MeshDistortMaterial
            color={palette.secondary}
            emissive={palette.secondary}
            emissiveIntensity={0.2}
            transparent
            opacity={0.28}
            distort={0.25}
            speed={1.5}
          />
        </Torus>
      </Float>

      <Float speed={1.0} rotationIntensity={0.25} floatIntensity={0.7} position={pos3}>
        <Sphere ref={ref3} args={[compact ? 0.26 : 0.3, 24, 24]}>
          <MeshDistortMaterial
            color={palette.tertiary}
            emissive={palette.tertiary}
            emissiveIntensity={0.4}
            transparent
            opacity={0.4}
            distort={0.4}
            speed={2}
          />
        </Sphere>
      </Float>
    </>
  );
}

// --- MAIN 3D SCENE ---
function Scene({ engine, compact = false }) {
  const palette = PALETTES[engine] || PALETTES.nexus;
  const groupScale = compact ? 0.68 : 0.88;

  return (
    <group scale={[groupScale, groupScale, groupScale]}>
      <ambientLight intensity={0.25} color={palette.ambient} />
      <directionalLight position={[5, 5, 5]} intensity={0.35} color={palette.primary} />
      <directionalLight position={[-5, -3, 3]} intensity={0.2} color={palette.secondary} />
      <pointLight position={[0, 0, 3]} intensity={0.6} color={palette.primary} distance={14} />
      <pointLight position={[3, 2, -2]} intensity={0.3} color={palette.tertiary} distance={12} />

      <ParticleField count={compact ? 50 : 80} palette={palette} compact={compact} />
      <CentralOrb palette={palette} />

      <OrbitalRing radius={2.8} color={palette.primary} speed={0.12} tilt={0.3} />
      <OrbitalRing radius={3.6} color={palette.secondary} speed={-0.09} tilt={-0.45} />
      <OrbitalRing radius={4.3} color={palette.tertiary} speed={0.07} tilt={0.7} />

      <FloatingShapes palette={palette} compact={compact} />
    </group>
  );
}

// --- EXPORTED COMPONENT ---
export default function NexusScene3D({ engine = 'nexus', compact = false, className = '', style = {} }) {
  return (
    <div
      className={`nexus-3d-scene ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, compact ? 10.2 : 8.5], fov: compact ? 44 : 48 }}
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          precision: 'mediump',
          stencil: false,
          depth: true
        }}
        performance={{ min: 0.5 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene engine={engine} compact={compact} />
        </Suspense>
      </Canvas>
    </div>
  );
}
