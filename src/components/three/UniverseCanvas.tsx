"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Float, Stars } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

type UniverseCanvasProps = {
  quality: "high" | "low";
  onReady: () => void;
};

type SceneProps = {
  quality: "high" | "low";
};

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -modelViewPosition.xyz;
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 2.4);
    gl_FragColor = vec4(uColor, fresnel * 0.58);
  }
`;

const glowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragmentShader = `
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    float distanceFromCenter = distance(vUv, vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, distanceFromCenter);
    alpha = pow(alpha, 3.0);
    gl_FragColor = vec4(uColor, alpha * 0.45);
  }
`;

const shardData = [
  { position: [-2.35, 1.25, 0.6], scale: 0.28, shape: "octahedron" },
  { position: [2.55, 1.65, -0.9], scale: 0.19, shape: "tetrahedron" },
  { position: [-2.8, -1.4, -0.8], scale: 0.13, shape: "octahedron" },
  { position: [2.3, -1.85, 0.4], scale: 0.23, shape: "icosahedron" },
  { position: [0.2, 2.45, -1.5], scale: 0.11, shape: "tetrahedron" },
] as const;

function seededRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function Atmosphere() {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#6be8ff") },
    }),
    [],
  );

  return (
    <mesh scale={1.12}>
      <sphereGeometry args={[1.7, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function CoreGlow() {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#3ab6e8") },
    }),
    [],
  );

  return (
    <mesh position={[0.1, 0, -2.4]} scale={[8.2, 8.2, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={glowVertexShader}
        fragmentShader={glowFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function OrbitRing({
  radius,
  tube,
  color,
  opacity,
  rotation,
  speed = 0,
}: {
  radius: number;
  tube: number;
  color: string;
  opacity: number;
  rotation: [number, number, number];
  speed?: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current && speed) {
      ringRef.current.rotation.z += delta * speed;
    }
  });

  return (
    <mesh ref={ringRef} rotation={rotation}>
      <torusGeometry args={[radius, tube, 10, 220]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function OrbitingBody({
  radius,
  size,
  color,
  speed,
  tilt,
}: {
  radius: number;
  size: number;
  color: string;
  speed: number;
  tilt: [number, number, number];
}) {
  const orbitRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += delta * speed;
    }
  });

  return (
    <group ref={orbitRef} rotation={tilt}>
      <mesh position={[radius, 0, 0]}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight
        position={[radius, 0, 0]}
        intensity={2.4}
        distance={2.2}
        color={color}
      />
    </group>
  );
}

function ParticleField({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const random = seededRandom(20261027);
    const positionValues = new Float32Array(count * 3);
    const colorValues = new Float32Array(count * 3);
    const cyan = new THREE.Color("#7ceaff");
    const amber = new THREE.Color("#f4bd82");
    const blue = new THREE.Color("#547dff");

    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 2.1 + random() * 5.6;
      const spread = (random() - 0.5) * (2.2 + radius * 0.16);
      const mix = random();
      const color = mix > 0.87 ? amber : mix > 0.42 ? cyan : blue;

      positionValues[index * 3] = Math.cos(angle) * radius;
      positionValues[index * 3 + 1] = spread;
      positionValues[index * 3 + 2] = Math.sin(angle) * radius;

      colorValues[index * 3] = color.r;
      colorValues[index * 3 + 1] = color.g;
      colorValues[index * 3 + 2] = color.b;
    }

    return [positionValues, colorValues];
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.018;
      pointsRef.current.rotation.x = Math.sin(
        performance.now() * 0.00006,
      ) * 0.04;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.86}
        vertexColors
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function Shard({
  position,
  scale,
  shape,
}: {
  position: readonly [number, number, number];
  scale: number;
  shape: "octahedron" | "tetrahedron" | "icosahedron";
}) {
  return (
    <Float
      speed={1.1 + scale * 2}
      rotationIntensity={0.48}
      floatIntensity={0.9}
      floatingRange={[-0.12, 0.12]}
    >
      <mesh position={position as unknown as [number, number, number]} scale={scale}>
        {shape === "octahedron" ? <octahedronGeometry args={[1, 0]} /> : null}
        {shape === "tetrahedron" ? <tetrahedronGeometry args={[1, 0]} /> : null}
        {shape === "icosahedron" ? <icosahedronGeometry args={[1, 0]} /> : null}
        <meshStandardMaterial
          color="#0a1f35"
          emissive="#57d6ff"
          emissiveIntensity={0.6}
          metalness={0.68}
          roughness={0.25}
          flatShading
        />
      </mesh>
    </Float>
  );
}

function PlanetSystem({ quality }: { quality: "high" | "low" }) {
  const planetGroup = useRef<THREE.Group>(null);
  const coreGroup = useRef<THREE.Group>(null);
  const { size } = useThree();

  const mobile = size.width < 768;
  const desktop = size.width >= 1180;

  useFrame((state, delta) => {
    if (planetGroup.current) {
      const targetX = mobile ? 0 : desktop ? 2.85 : 2.25;
      const targetY = mobile ? -2.05 : 0.05;
      const targetScale = mobile ? 0.74 : desktop ? 1.08 : 0.94;
      planetGroup.current.position.x = THREE.MathUtils.damp(
        planetGroup.current.position.x,
        targetX,
        3,
        delta,
      );
      planetGroup.current.position.y = THREE.MathUtils.damp(
        planetGroup.current.position.y,
        targetY,
        3,
        delta,
      );
      const scale = THREE.MathUtils.damp(
        planetGroup.current.scale.x,
        targetScale,
        3,
        delta,
      );
      planetGroup.current.scale.setScalar(scale);
    }

    if (coreGroup.current) {
      coreGroup.current.rotation.y += delta * 0.075;
      coreGroup.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.12) * 0.055;
    }
  });

  return (
    <group ref={planetGroup} position={[2.85, 0.05, 0]}>
      <CoreGlow />
      <group ref={coreGroup}>
        <mesh>
          <icosahedronGeometry args={[1.62, 4]} />
          <meshStandardMaterial
            color="#07192c"
            emissive="#0c3f63"
            emissiveIntensity={0.75}
            metalness={0.72}
            roughness={0.34}
            flatShading
          />
        </mesh>
        <mesh scale={1.012}>
          <icosahedronGeometry args={[1.62, 1]} />
          <meshBasicMaterial
            color="#8befff"
            wireframe
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <Atmosphere />
      </group>

      <pointLight
        position={[2.8, 2.4, 3.8]}
        intensity={24}
        distance={12}
        decay={2}
        color="#72dfff"
      />
      <pointLight
        position={[-3.2, -2.1, 2.2]}
        intensity={16}
        distance={9}
        decay={2}
        color="#f3b36d"
      />

      <OrbitRing
        radius={2.5}
        tube={0.008}
        color="#6fe5ff"
        opacity={0.55}
        rotation={[1.28, 0.08, -0.22]}
        speed={0.025}
      />
      <OrbitRing
        radius={3.08}
        tube={0.004}
        color="#f2bd82"
        opacity={0.36}
        rotation={[1.16, -0.34, 0.58]}
        speed={-0.018}
      />
      <OrbitRing
        radius={3.72}
        tube={0.003}
        color="#6b93ff"
        opacity={0.22}
        rotation={[1.44, 0.52, 0.24]}
        speed={0.012}
      />

      <OrbitingBody
        radius={2.5}
        size={0.055}
        color="#f4bd82"
        speed={0.35}
        tilt={[1.28, 0.08, -0.22]}
      />
      <OrbitingBody
        radius={3.08}
        size={0.035}
        color="#7ceaff"
        speed={-0.22}
        tilt={[1.16, -0.34, 0.58]}
      />

      {shardData.map((shard, index) => (
        <Shard
          key={index}
          position={shard.position}
          scale={shard.scale}
          shape={shard.shape}
        />
      ))}

      <ParticleField count={quality === "high" ? 1800 : 750} />
    </group>
  );
}

function CameraRig() {
  const scroll = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateScroll = () => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      scroll.current = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    };

    const updatePointer = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("resize", updateScroll);

    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  useFrame((state, delta) => {
    const mobile = state.size.width < 768;
    const progress = scroll.current;
    const targetX =
      (mobile ? 0 : -0.28) + progress * -0.9 + pointer.current.x * 0.28;
    const targetY =
      (mobile ? 0.38 : 0.08) + progress * 0.85 + pointer.current.y * -0.14;
    const targetZ = (mobile ? 10.6 : 8.9) + progress * 1.55;
    const lookX = mobile ? 0 : 2.1 - progress * 0.35;
    const lookY = mobile ? -1.55 : 0.12 + progress * 0.15;

    state.camera.position.x = THREE.MathUtils.damp(
      state.camera.position.x,
      targetX,
      2.2,
      delta,
    );
    state.camera.position.y = THREE.MathUtils.damp(
      state.camera.position.y,
      targetY,
      2.2,
      delta,
    );
    state.camera.position.z = THREE.MathUtils.damp(
      state.camera.position.z,
      targetZ,
      2.2,
      delta,
    );
    state.camera.lookAt(lookX, lookY, 0);
  });

  return null;
}

function Scene({ quality }: SceneProps) {
  return (
    <>
      <fog attach="fog" args={["#03050b", 11, 30]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        position={[5, 6, 5]}
        intensity={2.4}
        color="#c6e8ff"
      />
      <pointLight
        position={[-4, 2, 3]}
        intensity={20}
        distance={16}
        decay={2}
        color="#2b9ed8"
      />
      <pointLight
        position={[3, -3, 4]}
        intensity={13}
        distance={14}
        decay={2}
        color="#e29b58"
      />

      <Stars
        radius={70}
        depth={38}
        count={quality === "high" ? 2400 : 1100}
        factor={4.2}
        saturation={0}
        fade
        speed={0.18}
      />
      <PlanetSystem quality={quality} />
      <CameraRig />
      <AdaptiveDpr pixelated={false} />

      {quality === "high" ? (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.85}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.8}
            mipmapBlur
            radius={0.62}
          />
          <Vignette eskil={false} offset={0.28} darkness={0.78} />
        </EffectComposer>
      ) : null}
    </>
  );
}

export default function UniverseCanvas({
  quality,
  onReady,
}: UniverseCanvasProps) {
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const onVisibilityChange = () => {
      setRunning(!document.hidden);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return (
    <Canvas
      className="universe__canvas"
      camera={{
        position: [0, 0.08, 8.9],
        fov: 42,
        near: 0.1,
        far: 90,
      }}
      dpr={quality === "high" ? [1, 1.65] : [1, 1.15]}
      frameloop={running ? "always" : "never"}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        onReady();
      }}
      resize={{ scroll: false, debounce: { scroll: 0, resize: 80 } }}
    >
      <Suspense fallback={null}>
        <Scene quality={quality} />
      </Suspense>
    </Canvas>
  );
}
