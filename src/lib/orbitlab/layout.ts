import type { OrbitWorkspace } from "./types.ts";
import { NODE_HEIGHT, NODE_WIDTH } from "./edgeRouting.ts";

export const SCENE_WIDTH = 1280;
export const SCENE_HEIGHT = 760;
const MARGIN = 60;
const MAX_COLUMN_GAP = 250;
const MAX_ROW_GAP = 130;

/**
 * Left-to-right layered layout: each node sits one column right of its furthest predecessor
 * (cycles are broken by visit order), rows ordered by the average row of their predecessors.
 * shortcut: no crossing minimisation beyond one barycenter pass; fine for diagrams of ~30 nodes.
 */
export function autoLayout(workspace: OrbitWorkspace): OrbitWorkspace {
  const ids = workspace.nodes.map((node) => node.id);
  const preds = new Map(ids.map((id) => [id, [] as string[]]));
  const succs = new Map(ids.map((id) => [id, [] as string[]]));
  for (const edge of workspace.edges) {
    preds.get(edge.target)?.push(edge.source);
    succs.get(edge.source)?.push(edge.target);
  }

  // Kahn's algorithm; nodes left over (cycles) are released one at a time in original order.
  const layer = new Map<string, number>();
  const remaining = new Map(ids.map((id) => [id, preds.get(id)!.length]));
  const queue = ids.filter((id) => remaining.get(id) === 0);
  while (layer.size < ids.length) {
    if (!queue.length) queue.push(ids.find((id) => !layer.has(id))!);
    const id = queue.shift()!;
    if (layer.has(id)) continue;
    const placed = preds.get(id)!.filter((p) => layer.has(p));
    layer.set(id, placed.length ? Math.max(...placed.map((p) => layer.get(p)!)) + 1 : 0);
    for (const next of succs.get(id)!) {
      remaining.set(next, remaining.get(next)! - 1);
      if (remaining.get(next) === 0) queue.push(next);
    }
  }

  const columns: string[][] = [];
  for (const id of ids) (columns[layer.get(id)!] ??= []).push(id);
  const row = new Map<string, number>();
  for (const column of columns) {
    const score = (id: string) => {
      const known = preds.get(id)!.filter((p) => row.has(p)).map((p) => row.get(p)!);
      return known.length ? known.reduce((a, b) => a + b, 0) / known.length : Infinity;
    };
    column.sort((a, b) => score(a) - score(b) || ids.indexOf(a) - ids.indexOf(b));
    column.forEach((id, index) => row.set(id, index));
  }

  const tallest = Math.max(...columns.map((column) => column.length));
  const columnGap = Math.min(MAX_COLUMN_GAP, (SCENE_WIDTH - 2 * MARGIN - NODE_WIDTH) / Math.max(columns.length - 1, 1));
  const rowGap = Math.min(MAX_ROW_GAP, (SCENE_HEIGHT - 2 * MARGIN - NODE_HEIGHT) / Math.max(tallest - 1, 1));
  const position = new Map(
    columns.flatMap((column, c) =>
      column.map((id, r) => {
        const top = (SCENE_HEIGHT - (column.length - 1) * rowGap - NODE_HEIGHT) / 2;
        return [id, { x: Math.round(MARGIN + c * columnGap), y: Math.round(top + r * rowGap) }] as const;
      }),
    ),
  );

  return { ...workspace, nodes: workspace.nodes.map((node) => ({ ...node, ...position.get(node.id)! })) };
}

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom" | "distribute-x" | "distribute-y";

/** Aligns or evenly distributes the given nodes (by their edges / centers). Others are untouched. */
export function alignNodes(workspace: OrbitWorkspace, ids: string[], mode: AlignMode): OrbitWorkspace {
  const chosen = workspace.nodes.filter((node) => ids.includes(node.id));
  if (chosen.length < 2) return workspace;
  const xs = chosen.map((node) => node.x);
  const ys = chosen.map((node) => node.y);
  const next = new Map<string, { x: number; y: number }>();

  if (mode === "distribute-x" || mode === "distribute-y") {
    const axis = mode === "distribute-x" ? "x" : "y";
    const sorted = [...chosen].sort((a, b) => a[axis] - b[axis]);
    const first = sorted[0][axis];
    const step = (sorted[sorted.length - 1][axis] - first) / (sorted.length - 1);
    sorted.forEach((node, index) => next.set(node.id, { x: node.x, y: node.y, [axis]: Math.round(first + index * step) }));
  } else {
    const target = {
      left: Math.min(...xs),
      center: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
      right: Math.max(...xs),
      top: Math.min(...ys),
      middle: Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
      bottom: Math.max(...ys),
    }[mode];
    const horizontal = mode === "left" || mode === "center" || mode === "right";
    for (const node of chosen) next.set(node.id, horizontal ? { x: target, y: node.y } : { x: node.x, y: target });
  }

  return {
    ...workspace,
    nodes: workspace.nodes.map((node) => (next.has(node.id) ? { ...node, ...next.get(node.id)! } : node)),
  };
}
