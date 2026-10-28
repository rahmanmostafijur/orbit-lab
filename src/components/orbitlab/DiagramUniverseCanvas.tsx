"use client";

import { Suspense, useMemo, useRef, useState, type ComponentRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
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
  quality: "high" | "low";
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

type LabelRect = { left: number; top: number; right: number; bottom: number };

/**
 * Syncs the DOM label overlay with the 3D camera by projecting node positions
 * to screen space every frame. Writes transforms directly to the DOM (no React
 * re-renders, no portals, no nested React roots). Labels are placed nearest
 * first; one that would collide with an already placed label is hidden, except
 * the selected node's, which always shows.
 */
function LabelSync({
  positions,
  labelRefs,
  selectedId,
}: {
  positions: Map<string, Vector3Tuple>;
  labelRefs: React.RefObject<Map<string, HTMLButtonElement>>;
  selectedId: string | null;
}) {
  useFrame(({ camera, size }) => {
    const refs = labelRefs.current;
    if (!refs) return;
    const visible: { el: HTMLButtonElement; x: number; y: number; z: number; w: number; h: number }[] = [];
    for (const [id, position] of positions) {
      const el = refs.get(id);
      if (!el) continue;
      projectVec.set(position[0], position[1], position[2]);
      projectVec.project(camera);
      if (projectVec.z > 1 || projectVec.z < -1) {
        el.style.visibility = "hidden";
        continue;
      }
      visible.push({
        el,
        x: (projectVec.x * 0.5 + 0.5) * size.width,
        y: (-projectVec.y * 0.5 + 0.5) * size.height,
        z: id === selectedId ? -Infinity : projectVec.z,
        w: el.offsetWidth,
        h: el.offsetHeight,
      });
    }
    visible.sort((a, b) => a.z - b.z);
    const placed: LabelRect[] = [];
    for (const label of visible) {
      const rect = {
        left: label.x - label.w / 2,
        top: label.y - label.h / 2,
        right: label.x + label.w / 2,
        bottom: label.y + label.h / 2,
      };
      const collides = placed.some(
        (other) => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top,
      );
      label.el.style.visibility = collides ? "hidden" : "visible";
      label.el.style.transform = `translate3d(${label.x}px, ${label.y}px, 0) translate(-50%, -50%)`;
      if (!collides) placed.push(rect);
    }
  });
  return null;
}

export default function DiagramUniverseCanvas({
  workspace,
  selection,
  pathEdgeIds,
  reducedMotion,
  quality,
  onSelectNode,
}: DiagramUniverseCanvasProps) {
  const labelRefs = useRef(new Map<string, HTMLButtonElement>());
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const isLowQuality = quality === "low";
  const selectedId = selection.type === "node" ? selection.id : null;
  const pathNodes = useMemo(
    () =>
      new Set(
        workspace.edges
          .filter((edge) => pathEdgeIds?.includes(edge.id))
          .flatMap((edge) => [edge.source, edge.target]),
      ),
    [workspace.edges, pathEdgeIds],
  );

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
        dpr={[1, isLowQuality ? 1.15 : 1.6]}
        gl={{
          alpha: true,
          antialias: !isLowQuality,
          powerPreference: isLowQuality ? undefined : "high-performance",
        }}
      >
        <color attach="background" args={["#03050b"]} />
        <fog attach="fog" args={["#03050b", 12, 34]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 6, 6]} intensity={26} color="#7cdfff" />
        <pointLight position={[-5, -3, 4]} intensity={14} color="#f2bd82" />

        <Suspense fallback={null}>
          <Stars
            radius={60}
            depth={40}
            count={isLowQuality ? 550 : 1300}
            factor={3.4}
            saturation={0}
            fade
            speed={0.4}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          autoRotate={autoRotate}
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
          const onPath = pathNodes.has(node.id);
          return (
            <group key={node.id} position={positions.get(node.id) ?? [0, 0, 0]}>
              <mesh
                scale={selected ? 1.34 : 0.92}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(node.id);
                }}
              >
                <sphereGeometry args={[0.34, isLowQuality ? 14 : 24, isLowQuality ? 14 : 24]} />
                <meshStandardMaterial
                  color="#0a1a2e"
                  emissive={meta.color}
                  emissiveIntensity={selected ? 1.6 : onPath ? 1.25 : 0.7}
                  metalness={0.55}
                  roughness={0.3}
                />
              </mesh>
            </group>
          );
        })}

        <LabelSync positions={positions} labelRefs={labelRefs} selectedId={selectedId} />
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
              className={`universe-node${node.id === selectedId ? " is-selected" : ""}${pathNodes.has(node.id) ? " is-on-path" : ""}`}
              style={{ ["--node-color" as string]: meta.color }}
              onClick={() => onSelectNode(node.id)}
              aria-label={`Select ${node.label}`}
              aria-pressed={node.id === selectedId}
            >
              {node.label}
            </button>
          );
        })}
      </div>

      <p className="universe-view__hint">Drag to rotate · scroll to zoom · click a node to select</p>
      <div className="universe-view__controls">
        <button
          type="button"
          className="stage-control"
          aria-pressed={autoRotate}
          aria-label={autoRotate ? "Stop auto-rotate" : "Start auto-rotate"}
          title={autoRotate ? "Stop auto-rotate" : "Start auto-rotate"}
          onClick={() => setAutoRotate((on) => !on)}
        >
          {autoRotate ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="stage-control"
          aria-label="Reset camera"
          title="Reset camera"
          onClick={() => controlsRef.current?.reset()}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
