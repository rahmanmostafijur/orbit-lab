"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { DiagramSelection, OrbitWorkspace } from "@/lib/orbitlab/types";
import { componentKinds } from "@/lib/orbitlab/kinds";

const SCENE_WIDTH = 1280;
const SCENE_HEIGHT = 760;
const NODE_WIDTH = 168;
const NODE_HEIGHT = 74;
const DRAG_THRESHOLD = 4;

type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
};

type GraphStageProps = {
  workspace: OrbitWorkspace;
  selection: DiagramSelection;
  connectingFrom: string | null;
  pathEdgeIds: string[] | null;
  onNodeClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onBackgroundClick: () => void;
  onMoveNode: (id: string, x: number, y: number) => void;
};

export function GraphStage({
  workspace,
  selection,
  connectingFrom,
  pathEdgeIds,
  onNodeClick,
  onEdgeClick,
  onBackgroundClick,
  onMoveNode,
}: GraphStageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [scale, setScale] = useState(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const measure = () => {
      const width = wrapper.clientWidth;
      if (!width) return;
      setScale(Math.max(width / SCENE_WIDTH, 0.55));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const nodeMap = useMemo(
    () => new Map(workspace.nodes.map((node) => [node.id, node])),
    [workspace.nodes],
  );

  const centerOf = useCallback((node: { x: number; y: number }) => ({
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2,
  }), []);

  const sceneCoords = useCallback(
    (clientX: number, clientY: number) => {
      const scene = sceneRef.current;
      if (!scene) return { x: 0, y: 0 };
      const rect = scene.getBoundingClientRect();
      const currentScale = rect.width / SCENE_WIDTH || scale;
      return {
        x: (clientX - rect.left) / currentScale,
        y: (clientY - rect.top) / currentScale,
      };
    },
    [scale],
  );

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      const point = sceneCoords(clientX, clientY);
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        drag.moved = true;
      }
      const nextX = Math.min(Math.max(drag.origX + dx, 8), SCENE_WIDTH - NODE_WIDTH - 8);
      const nextY = Math.min(Math.max(drag.origY + dy, 8), SCENE_HEIGHT - NODE_HEIGHT - 8);
      if (Math.round(nextX) !== drag.origX || Math.round(nextY) !== drag.origY) {
        onMoveNode(drag.id, nextX, nextY);
      }
    },
    [onMoveNode, sceneCoords],
  );

  useEffect(() => {
    if (!draggingId) return;

    const onPointerMove = (event: PointerEvent) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      event.preventDefault();
      moveDrag(event.clientX, event.clientY);
    };

    const onPointerUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDraggingId(null);
      if (drag && !drag.moved) {
        onNodeClick(drag.id);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [draggingId, moveDrag, onNodeClick]);

  const startNodeDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    node: { id: string; x: number; y: number },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      startX: 0,
      startY: 0,
      origX: node.x,
      origY: node.y,
      moved: false,
    };
    // start point is resolved with scene coordinates on first move
    const point = sceneCoords(event.clientX, event.clientY);
    dragRef.current.startX = point.x;
    dragRef.current.startY = point.y;
    setDraggingId(node.id);
  };

  const handleNodeKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    node: { id: string; x: number; y: number },
  ) => {
    const step = event.shiftKey ? 32 : 8;
    let nextX = node.x;
    let nextY = node.y;

    switch (event.key) {
      case "ArrowLeft":
        nextX = node.x - step;
        break;
      case "ArrowRight":
        nextX = node.x + step;
        break;
      case "ArrowUp":
        nextY = node.y - step;
        break;
      case "ArrowDown":
        nextY = node.y + step;
        break;
      default:
        return;
    }

    event.preventDefault();
    onMoveNode(
      node.id,
      Math.min(Math.max(nextX, 8), SCENE_WIDTH - NODE_WIDTH - 8),
      Math.min(Math.max(nextY, 8), SCENE_HEIGHT - NODE_HEIGHT - 8),
    );
  };

  const edges = workspace.edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return null;
      const from = centerOf(source);
      const to = centerOf(target);
      return { edge, from, to };
    })
    .filter((item): item is { edge: OrbitWorkspace["edges"][number]; from: { x: number; y: number }; to: { x: number; y: number } } => item !== null);

  const isEmpty = workspace.nodes.length === 0;

  return (
    <div className="stage">
      <div
        ref={wrapperRef}
        className={`stage__scroller${draggingId ? " is-dragging" : ""}`}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onBackgroundClick();
          }
        }}
      >
        <div
          className="stage__scene"
          style={{ width: SCENE_WIDTH * scale, height: SCENE_HEIGHT * scale }}
          role="application"
          aria-label="Diagram canvas. Drag components to arrange, or use connect mode to link them."
        >
          <div
            ref={sceneRef}
            className="stage__scene-inner"
            style={{
              width: SCENE_WIDTH,
              height: SCENE_HEIGHT,
              transform: `scale(${scale})`,
            }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                onBackgroundClick();
              }
            }}
          >
            <svg
              className="stage__edges"
              viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
              width={SCENE_WIDTH}
              height={SCENE_HEIGHT}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="orbit-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="stage__arrow" />
                </marker>
              </defs>
              {edges.map(({ edge, from, to }) => {
                const isSelected =
                  selection.type === "edge" && selection.id === edge.id;
                const isPath = pathEdgeIds?.includes(edge.id) ?? false;
                return (
                  <g
                    key={edge.id}
                    className={`stage__edge${isSelected ? " is-selected" : ""}${isPath ? " is-path" : ""}`}
                  >
                    <line
                      className="stage__edge-hit"
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        onEdgeClick(edge.id);
                      }}
                    />
                    <line
                      className="stage__edge-line"
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      markerEnd="url(#orbit-arrow)"
                    />
                    <text
                      className={`stage__edge-label${isSelected ? " is-selected" : ""}`}
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 10}
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {isEmpty ? (
              <div className="stage__empty">
                <p className="stage__empty-title">Nothing in orbit yet</p>
                <p className="stage__empty-hint">
                  Pick a component from the palette, or load a template to get
                  started.
                </p>
              </div>
            ) : null}

            {workspace.nodes.map((node) => {
              const kind = componentKinds[node.kind];
              const isSelected = selection.type === "node" && selection.id === node.id;
              const isConnecting = connectingFrom === node.id;

              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  className={`orbit-node${isSelected ? " is-selected" : ""}${isConnecting ? " is-connecting" : ""}${draggingId === node.id ? " is-dragging" : ""}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT,
                    ["--node-color" as string]: kind.color,
                    ["--node-tone" as string]: kind.tone,
                  }}
                  onPointerDown={(event) => startNodeDrag(event, node)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onNodeClick(node.id);
                      return;
                    }
                    handleNodeKeyDown(event, node);
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${kind.label}: ${node.label}`}
                >
                  <span className="orbit-node__kind" aria-hidden="true">
                    {kind.label}
                  </span>
                  <span className="orbit-node__label">{node.label}</span>
                  {node.note ? (
                    <span className="orbit-node__note" aria-hidden="true">
                      {node.note}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
