import type { DiagramEdge, DiagramNode } from "./types.ts";

export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 74;

// Edge labels: 12px monospace with 0.06em tracking ≈ 7.9px per character.
const LABEL_CHAR_WIDTH = 7.9;
const LABEL_PADDING_X = 16;
export const LABEL_HEIGHT = 20;
const NODE_CLEARANCE = 10;
// Perpendicular bends tried, smallest first; 0 is a straight line.
const BEND_OFFSETS = [0, 50, -50, 100, -100, 160, -160, 240, -240, 330, -330];
// Positions along the edge tried for the label, middle first.
const LABEL_POSITIONS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78];
const SAMPLES = 32;

export type Point = { x: number; y: number };
type Rect = { left: number; top: number; right: number; bottom: number };

export type EdgeRoute = {
  /** SVG path data (quadratic curve; straight when the bend is 0). */
  d: string;
  label: Point;
  labelWidth: number;
  /** False when no tried bend avoids every other node. */
  clear: boolean;
};

export function labelWidth(text: string) {
  return text.length * LABEL_CHAR_WIDTH + LABEL_PADDING_X;
}

function centerOf(node: Pick<DiagramNode, "x" | "y">): Point {
  return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT / 2 };
}

function nodeRect(node: Pick<DiagramNode, "x" | "y">, pad: number): Rect {
  return {
    left: node.x - pad,
    top: node.y - pad,
    right: node.x + NODE_WIDTH + pad,
    bottom: node.y + NODE_HEIGHT + pad,
  };
}

function contains(rect: Rect, p: Point) {
  return p.x > rect.left && p.x < rect.right && p.y > rect.top && p.y < rect.bottom;
}

function overlaps(a: Rect, b: Rect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Where the ray from a node's center toward `toward` leaves the node's rectangle. */
export function clipToNode(center: Point, toward: Point): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (!dx && !dy) return center;
  const scale = Math.min(
    dx ? NODE_WIDTH / 2 / Math.abs(dx) : Infinity,
    dy ? NODE_HEIGHT / 2 / Math.abs(dy) : Infinity,
  );
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function pointOnCurve(start: Point, control: Point, end: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
  };
}

function curveHits(start: Point, control: Point, end: Point, obstacles: Rect[]) {
  for (let i = 1; i < SAMPLES; i += 1) {
    const p = pointOnCurve(start, control, end, i / SAMPLES);
    if (obstacles.some((rect) => contains(rect, p))) return true;
  }
  return false;
}

function labelRect(p: Point, width: number): Rect {
  return {
    left: p.x - width / 2,
    top: p.y - LABEL_HEIGHT / 2,
    right: p.x + width / 2,
    bottom: p.y + LABEL_HEIGHT / 2,
  };
}

/**
 * Routes every edge: clipped to node borders, bent just enough to miss unrelated nodes,
 * with its label slid along the edge until it touches no node and no earlier label.
 */
export function routeEdges(
  nodes: Pick<DiagramNode, "id" | "x" | "y">[],
  edges: Pick<DiagramEdge, "id" | "source" | "target" | "label">[],
): Map<string, EdgeRoute> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const nodeRects = nodes.map((node) => nodeRect(node, 4));
  const placedLabels: Rect[] = [];
  const routes = new Map<string, EdgeRoute>();

  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;

    const from = centerOf(source);
    const to = centerOf(target);
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const normal = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const obstacles = nodes
      .filter((node) => node.id !== source.id && node.id !== target.id)
      .map((node) => nodeRect(node, NODE_CLEARANCE));

    let chosen: { start: Point; control: Point; end: Point } | null = null;
    for (const offset of BEND_OFFSETS) {
      const control = { x: mid.x + normal.x * offset, y: mid.y + normal.y * offset };
      // Clip toward the control point so arrowheads follow the curve's tangent.
      const start = clipToNode(from, offset === 0 ? to : control);
      const end = clipToNode(to, offset === 0 ? from : control);
      if (!curveHits(start, control, end, obstacles)) {
        chosen = { start, control, end };
        break;
      }
    }
    const { start, control, end } = chosen ?? {
      start: clipToNode(from, to),
      control: mid,
      end: clipToNode(to, from),
    };

    const width = labelWidth(edge.label);
    const fits = (p: Point) => {
      const rect = labelRect(p, width);
      return !nodeRects.some((r) => overlaps(r, rect)) && !placedLabels.some((r) => overlaps(r, rect));
    };
    const label =
      LABEL_POSITIONS.map((t) => pointOnCurve(start, control, end, t)).find(fits) ??
      pointOnCurve(start, control, end, 0.5);
    if (edge.label) placedLabels.push(labelRect(label, width));

    const round = (n: number) => Math.round(n * 10) / 10;
    routes.set(edge.id, {
      d: `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`,
      label,
      labelWidth: width,
      clear: chosen !== null,
    });
  }

  return routes;
}

/** True when the label of `route` overlaps any node. */
export function labelHitsNode(route: EdgeRoute, nodes: Pick<DiagramNode, "x" | "y">[]) {
  const rect = labelRect(route.label, route.labelWidth);
  return nodes.some((node) => overlaps(nodeRect(node, 0), rect));
}
