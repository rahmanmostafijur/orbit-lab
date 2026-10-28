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
import { Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { DiagramSelection, OrbitWorkspace } from "@/lib/orbitlab/types";
import { componentKinds } from "@/lib/orbitlab/kinds";
import { LABEL_HEIGHT, NODE_HEIGHT, NODE_WIDTH, routeEdges } from "@/lib/orbitlab/edgeRouting";

const SCENE_WIDTH = 1280;
const SCENE_HEIGHT = 760;
const DRAG_THRESHOLD = 4;
const MIN_EFFECTIVE_SCALE = 0.14;
const MAX_EFFECTIVE_SCALE = 3;
const FIT_PADDING = 36;
const FIT_CONTROL_INSET = 112;

type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
};

type PendingView =
  | { kind: "zoom"; ratio: number }
  | { kind: "center"; focusX: number; focusY: number; targetScale: number; centerX: number }
  | { kind: "origin" };

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
  const pendingViewRef = useRef<PendingView | null>(null);
  const fitToScreenRef = useRef<() => void>(() => {});
  const didAutoFitRef = useRef(false);
  const didMeasureRef = useRef(false);
  const baseScaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // baseScaleRef is updated synchronously by the ResizeObserver measure pass,
  // so zoom math never runs against a stale `scale` state closure. The `scale`
  // state mirrors it for rendering (scene size + zoom note).
  const effScale = scale * zoom;

  const applyScroll = useCallback(
    (
      kind: PendingView["kind"],
      ratio: number,
      focusX: number,
      focusY: number,
      targetScale: number,
      centerX: number,
    ) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      if (kind === "zoom") {
        wrapper.scrollLeft = Math.max(
          (wrapper.scrollLeft + wrapper.clientWidth / 2) * ratio - wrapper.clientWidth / 2,
          0,
        );
        wrapper.scrollTop = Math.max(
          (wrapper.scrollTop + wrapper.clientHeight / 2) * ratio - wrapper.clientHeight / 2,
          0,
        );
      } else if (kind === "center") {
        wrapper.scrollLeft = Math.max(focusX * targetScale - centerX, 0);
        wrapper.scrollTop = Math.max(focusY * targetScale - wrapper.clientHeight / 2, 0);
      } else {
        wrapper.scrollLeft = 0;
        wrapper.scrollTop = 0;
      }
    },
    [],
  );

  useEffect(() => {
    const pending = pendingViewRef.current;
    if (!pending) return;
    pendingViewRef.current = null;
    if (pending.kind === "zoom") {
      applyScroll("zoom", pending.ratio, 0, 0, 0, 0);
    } else if (pending.kind === "center") {
      applyScroll("center", 1, pending.focusX, pending.focusY, pending.targetScale, pending.centerX);
    } else {
      applyScroll("origin", 1, 0, 0, 0, 0);
    }
  }, [applyScroll, zoom]);

  const zoomBy = useCallback(
    (factor: number) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const base = baseScaleRef.current;
      const minZoom = MIN_EFFECTIVE_SCALE / base;
      const maxZoom = MAX_EFFECTIVE_SCALE / base;
      const nextZoom = Math.min(Math.max(zoom * factor, minZoom), maxZoom);
      const ratio = nextZoom / zoom;
      if (Math.abs(ratio - 1) < 0.001) return;
      pendingViewRef.current = { kind: "zoom", ratio };
      setZoom(nextZoom);
    },
    [zoom],
  );

  const fitToScreen = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !wrapper.clientWidth || !wrapper.clientHeight) return;
    let minX = 0;
    let minY = 0;
    let maxX = SCENE_WIDTH;
    let maxY = SCENE_HEIGHT;
    if (workspace.nodes.length > 0) {
      minX = Math.min(...workspace.nodes.map((node) => node.x));
      minY = Math.min(...workspace.nodes.map((node) => node.y));
      maxX = Math.max(...workspace.nodes.map((node) => node.x + NODE_WIDTH));
      maxY = Math.max(...workspace.nodes.map((node) => node.y + NODE_HEIGHT));
    }
    const boxWidth = maxX - minX + FIT_PADDING * 2;
    const boxHeight = maxY - minY + FIT_PADDING * 2;
    // Leave room for the floating zoom controls on narrow screens so the
    // fitted diagram does not sit underneath them.
    const narrow = wrapper.clientWidth < 700;
    const centerX = narrow ? (wrapper.clientWidth - FIT_CONTROL_INSET) / 2 : wrapper.clientWidth / 2;
    const availWidth = wrapper.clientWidth - (narrow ? FIT_CONTROL_INSET : 0);
    const target = Math.max(
      Math.min(availWidth / boxWidth, wrapper.clientHeight / boxHeight, 1),
      MIN_EFFECTIVE_SCALE,
    );
    const base = baseScaleRef.current;
    const minZoom = MIN_EFFECTIVE_SCALE / base;
    const maxZoom = MAX_EFFECTIVE_SCALE / base;
    const nextZoom = Math.min(Math.max(target / base, minZoom), maxZoom);
    const finalScale = base * nextZoom;
    const focusX = minX + (maxX - minX) / 2 + FIT_PADDING / 2;
    const focusY = minY + (maxY - minY) / 2 + FIT_PADDING / 2;
    if (Math.abs(finalScale - effScale) < 0.001) {
      applyScroll("center", 1, focusX, focusY, finalScale, centerX);
      return;
    }
    pendingViewRef.current = { kind: "center", focusX, focusY, targetScale: finalScale, centerX };
    setZoom(nextZoom);
  }, [applyScroll, effScale, workspace.nodes]);

  useEffect(() => {
    fitToScreenRef.current = fitToScreen;
  }, [fitToScreen]);

  const resetView = useCallback(() => {
    if (Math.abs(zoom - 1) < 0.001) {
      applyScroll("origin", 1, 0, 0, 0, 0);
      return;
    }
    pendingViewRef.current = { kind: "origin" };
    setZoom(1);
  }, [applyScroll, zoom]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const measure = () => {
      const width = wrapper.clientWidth;
      if (!width) return;
      didMeasureRef.current = true;
      const next = Math.max(width / SCENE_WIDTH, 0.45);
      baseScaleRef.current = next;
      setScale(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // The full diagram should be visible on load.
  // Runs on [scale, node count] so it survives StrictMode's mount → unmount →
  // mount cycle (which would otherwise cancel a scheduled fit and never retry).
  useEffect(() => {
    // Wait until the wrapper has been measured, otherwise fit math runs against
    // a stale base scale and gets batched with the first measure update.
    if (!didMeasureRef.current) return;
    if (didAutoFitRef.current) return;
    const wrapper = wrapperRef.current;
    if (!wrapper || !wrapper.clientWidth || !wrapper.clientHeight) return;
    if (workspace.nodes.length === 0) return;
    didAutoFitRef.current = true;
    // Two frames: the first scale measurement may still be batching with
    // this commit; waiting lets the ref sync and layout settle first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => fitToScreenRef.current());
    });
  }, [scale, workspace.nodes.length]);


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
    const step = event.altKey ? 1 : event.shiftKey ? 32 : 8;
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

  const routes = useMemo(
    () => routeEdges(workspace.nodes, workspace.edges),
    [workspace.nodes, workspace.edges],
  );

  const pathNodes = new Set(
    workspace.edges
      .filter((edge) => pathEdgeIds?.includes(edge.id))
      .flatMap((edge) => [edge.source, edge.target]),
  );

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
          style={{ width: SCENE_WIDTH * effScale, height: SCENE_HEIGHT * effScale }}
          role="application"
          aria-label="Diagram canvas. Drag components to arrange, or use connect mode to link them."
        >
          <div
            ref={sceneRef}
            className="stage__scene-inner"
            style={{
              width: SCENE_WIDTH,
              height: SCENE_HEIGHT,
              transform: `scale(${effScale})`,
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
              {workspace.edges.map((edge) => {
                const route = routes.get(edge.id);
                if (!route) return null;
                const isSelected =
                  selection.type === "edge" && selection.id === edge.id;
                const isPath = pathEdgeIds?.includes(edge.id) ?? false;
                const select = (event: ReactPointerEvent<SVGElement>) => {
                  event.stopPropagation();
                  onEdgeClick(edge.id);
                };
                return (
                  <g
                    key={edge.id}
                    className={`stage__edge${isSelected ? " is-selected" : ""}${isPath ? " is-path" : ""}${edge.kind === "async" ? " is-async" : ""}`}
                  >
                    <path className="stage__edge-hit" d={route.d} onPointerDown={select} />
                    <path className="stage__edge-line" d={route.d} markerEnd="url(#orbit-arrow)" />
                    {edge.label ? (
                      <g className="stage__edge-tag" onPointerDown={select}>
                        <rect
                          x={route.label.x - route.labelWidth / 2}
                          y={route.label.y - LABEL_HEIGHT / 2}
                          width={route.labelWidth}
                          height={LABEL_HEIGHT}
                          rx={LABEL_HEIGHT / 2}
                        />
                        <text
                          className={`stage__edge-label${isSelected ? " is-selected" : ""}`}
                          x={route.label.x}
                          y={route.label.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {edge.label}
                        </text>
                      </g>
                    ) : null}
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
                  className={`orbit-node${isSelected ? " is-selected" : ""}${isConnecting ? " is-connecting" : ""}${draggingId === node.id ? " is-dragging" : ""}${pathNodes.has(node.id) ? " is-on-path" : ""}`}
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

      <div className="stage-controls">
        <div className="stage-controls__group">
          <button
            type="button"
            className="stage-control"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => zoomBy(1.25)}
          >
            <ZoomIn aria-hidden="true" />
          </button>
          <button
            type="button"
            className="stage-control"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => zoomBy(1 / 1.25)}
          >
            <ZoomOut aria-hidden="true" />
          </button>
        </div>
        <div className="stage-controls__group">
          <button
            type="button"
            className="stage-control"
            aria-label="Fit diagram to screen"
            title="Fit diagram to screen"
            onClick={fitToScreen}
          >
            <Maximize aria-hidden="true" />
          </button>
          <button
            type="button"
            className="stage-control"
            aria-label="Reset diagram view"
            title="Reset view"
            onClick={resetView}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
        <span className="stage-control-note" aria-hidden="true">
          {Math.round(effScale * 100)}%
        </span>
      </div>
    </div>
  );
}
