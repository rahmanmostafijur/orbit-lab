"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Stars, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import type { DiagramNode, DiagramSelection, OrbitWorkspace } from "@/lib/orbitlab/types";
import { componentKinds } from "@/lib/orbitlab/kinds";

const SCENE_WIDTH = 1280;
const SCENE_HEIGHT = 760;

type Vector3Tuple = [number, number, number];

type DiagramUniverseCanvasProps = {
  workspace: OrbitWorkspace;
  selection: DiagramSelection;
  pathEdgeIds: string[] | null;
  reducedMotion: boolean;
  onSelectNode: (id: string) => void;
};

function mapNodePosition(node: DiagramNode, index: number): Vector3Tuple {
  const nx = (node.x / SCENE_WIDTH - 0.5) * 11;
  const ny = -(node.y / SCENE_HEIGHT - 0.5) * 6.2;
  const nz = ((Math.imul(index + 1, 2654435761) >>> 0) / 4294967296 - 0.5) * 2.4;
  return [nx, ny, nz];
}

// Shared scratch vector — allocated once, mutated in-place each frame.
const projectVec = new THREE.Vector3();

/**
 * Syncs the DOM label overlay with the 3D camera by projecting node positions
 * to screen space every frame. Writes transforms directly to the DOM (no React
 * re-renders, no portals, no nested React roots).
 */
function LabelSync({
  positions,
  labelRefs,
}: {
  positions: Map<string, Vector3Tuple>;
  labelRefs: React.RefObject<Map<string, HTMLButtonElement>>;
}) {
  useFrame(({ camera, size }) => {
    const refs = labelRefs.current;
    if (!refs) return;

    for (const [id, position] of positions) {
      const el = refs.get(id);
      if (!el) continue;

      projectVec.set(position[0], position[1], position[2]);
      projectVec.project(camera);

      const behindCamera = projectVec.z > 1 || projectVec.z < -1;
      if (behindCamera) {
        el.style.visibility = "hidden";
        continue;
      }

      const x = (projectVec.x * 0.5 + 0.5) * size.width;
      const y = (-projectVec.y * 0.5 + 0.5) * size.height;
      el.style.visibility = "visible";
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}

export default function DiagramUniverseCanvas({
  workspace,
  selection,
  pathEdgeIds,
  reducedMotion,
  onSelectNode,
}: DiagramUniverseCanvasProps) {
  const labelRefs = useRef(new Map<string, HTMLButtonElement>());

  const positions = useMemo(
    () => new Map(workspace.nodes.map((node, index) => [node.id, mapNodePosition(node, index)])),
    [workspace.nodes],
  );

  const renderedEdges = useMemo(
    () =>
      workspace.edges.flatMap((edge) => {
        const from = positions.get(edge.source);
        const to = positions.get(edge.target);
        if (!from || !to) return [];
        return [{ edge, points: [from, to] as [Vector3Tuple, Vector3Tuple] }];
      }),
    [workspace.edges, positions],
  );

  return (
    <div className="universe-view__stage">
      <Canvas
        camera={{ position: [0, 1.6, 11.5], fov: 45 }}
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#03050b"]} />
        <fog attach="fog" args={["#03050b", 12, 34]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 6, 6]} intensity={26} color="#7cdfff" />
        <pointLight position={[-5, -3, 4]} intensity={14} color="#f2bd82" />

        <Suspense fallback={null}>
          <Stars radius={60} depth={40} count={1300} factor={3.4} saturation={0} fade speed={0.4} />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.5}
          minDistance={4}
          maxDistance={26}
        />
        <AdaptiveDpr pixelated={false} />

        {renderedEdges.map(({ edge, points }) => {
          const isSelected = selection.type === "edge" && selection.id === edge.id;
          const isPath = pathEdgeIds?.includes(edge.id) ?? false;
          return (
            <Line
              key={edge.id}
              points={points}
              color={isPath ? "#6fe5ff" : isSelected ? "#f2bd82" : "#5f88ff"}
              lineWidth={isPath ? 2.6 : isSelected ? 2.2 : 1.1}
              transparent
              opacity={isPath ? 1 : 0.6}
            />
          );
        })}

        {workspace.nodes.map((node) => {
          const meta = componentKinds[node.kind];
          const selected = selection.type === "node" && selection.id === node.id;
          return (
            <group key={node.id} position={positions.get(node.id) ?? [0, 0, 0]}>
              <mesh
                scale={selected ? 1.34 : 0.92}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(node.id);
                }}
              >
                <sphereGeometry args={[0.34, 24, 24]} />
                <meshStandardMaterial
                  color="#0a1a2e"
                  emissive={meta.color}
                  emissiveIntensity={selected ? 1.6 : 0.7}
                  metalness={0.55}
                  roughness={0.3}
                />
              </mesh>
            </group>
          );
        })}

        <LabelSync positions={positions} labelRefs={labelRefs} />
      </Canvas>

      {/* DOM label overlay — plain elements, no Portal, no nested React root */}
      <div className="universe-view__labels">
        {workspace.nodes.map((node) => {
          const meta = componentKinds[node.kind];
          return (
            <button
              key={node.id}
              type="button"
              ref={(el) => {
                if (el) labelRefs.current.set(node.id, el);
                else labelRefs.current.delete(node.id);
              }}
              className="universe-node"
              style={{ ["--node-color" as string]: meta.color }}
              onClick={() => onSelectNode(node.id)}
              aria-label={`Focus ${node.label}`}
            >
              {node.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
