import type { ComponentKind, DiagramEdge, DiagramNode, OrbitWorkspace } from "@/lib/orbitlab/types";

export const STORAGE_KEY = "orbitlab.workspace.v1";

let uidCounter = 0;

export function createId(prefix: string) {
  uidCounter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${uidCounter.toString(36)}-${random}`;
}

export function cloneWorkspace(workspace: OrbitWorkspace): OrbitWorkspace {
  return {
    name: workspace.name,
    templateId: workspace.templateId,
    nodes: workspace.nodes.map((node) => ({ ...node })),
    edges: workspace.edges.map((edge) => ({ ...edge })),
  };
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asFiniteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isComponentKind(value: unknown): value is ComponentKind {
  return (
    value === "client" ||
    value === "gateway" ||
    value === "service" ||
    value === "fastapi" ||
    value === "database" ||
    value === "cache" ||
    value === "queue" ||
    value === "external"
  );
}

export function normalizeWorkspace(input: unknown): OrbitWorkspace | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Partial<OrbitWorkspace>;

  const nodes: DiagramNode[] = Array.isArray(raw.nodes)
    ? (raw.nodes as unknown[])
        .map((entry, index): DiagramNode | null => {
          if (!entry || typeof entry !== "object") return null;
          const candidate = entry as Partial<DiagramNode>;
          const kind = isComponentKind(candidate.kind) ? candidate.kind : "service";
          return {
            id: asText(candidate.id) || createId(`node-${index}`),
            kind,
            label: asText(candidate.label) || `Component ${index + 1}`,
            note: asText(candidate.note),
            x: asFiniteNumber(candidate.x) ?? 180 + (index % 4) * 260,
            y: asFiniteNumber(candidate.y) ?? 140 + Math.floor(index / 4) * 240,
          };
        })
        .filter((node): node is DiagramNode => node !== null)
    : [];

  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges: DiagramEdge[] = Array.isArray(raw.edges)
    ? (raw.edges as unknown[])
        .map((entry, index): DiagramEdge | null => {
          if (!entry || typeof entry !== "object") return null;
          const candidate = entry as Partial<DiagramEdge>;
          const source = asText(candidate.source);
          const target = asText(candidate.target);
          if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) {
            return null;
          }
          return {
            id: asText(candidate.id) || createId(`edge-${index}`),
            source,
            target,
            label: asText(candidate.label) || "Request",
            note: asText(candidate.note),
            ...(candidate.kind === "async" ? { kind: "async" as const } : {}),
            ...(asText(candidate.protocol) ? { protocol: asText(candidate.protocol) } : {}),
          };
        })
        .filter((edge): edge is DiagramEdge => edge !== null)
    : [];

  return {
    name: asText(raw.name) || "Untitled workspace",
    templateId: asText(raw.templateId) || undefined,
    nodes,
    edges,
  };
}

export function serializeWorkspace(workspace: OrbitWorkspace): string {
  return JSON.stringify(
    {
      name: workspace.name,
      templateId: workspace.templateId,
      nodes: workspace.nodes.map(({ id, kind, label, note, x, y }) => ({ id, kind, label, note, x, y })),
      edges: workspace.edges.map(({ id, source, target, label, note, kind, protocol }) => ({
        id,
        source,
        target,
        label,
        note,
        kind,
        protocol,
      })),
    },
    null,
    2,
  );
}

export function parseWorkspace(value: string): OrbitWorkspace | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return normalizeWorkspace(parsed);
  } catch {
    return null;
  }
}

export function saveWorkspace(workspace: OrbitWorkspace) {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeWorkspace(workspace));
    return true;
  } catch {
    return false;
  }
}

export function loadSavedWorkspace(): OrbitWorkspace | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    return parseWorkspace(value);
  } catch {
    return null;
  }
}

export function encodeWorkspaceForLink(workspace: OrbitWorkspace): string {
  const json = serializeWorkspace(workspace);
  return encodeURIComponent(json);
}

export function decodeWorkspaceFromLink(hash: string): OrbitWorkspace | null {
  if (!hash) return null;
  const value = hash.replace(/^#diagram=/, "");
  if (!value) return null;
  try {
    return parseWorkspace(decodeURIComponent(value));
  } catch {
    return null;
  }
}

export function buildShareUrl(workspace: OrbitWorkspace): string {
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#diagram=${encodeWorkspaceForLink(workspace)}`;
}

export function addNode(
  workspace: OrbitWorkspace,
  kind: ComponentKind,
  position?: { x: number; y: number },
): { node: DiagramNode; workspace: OrbitWorkspace } {
  const count = workspace.nodes.filter((node) => node.kind === kind).length;
  const node: DiagramNode = {
    id: createId(kind),
    kind,
    label: `${kind === "fastapi" ? "FastAPI" : kind} ${count + 1}`,
    note: "",
    x: position?.x ?? 240 + (workspace.nodes.length % 4) * 260,
    y: position?.y ?? 160 + Math.floor(workspace.nodes.length / 4) * 220,
  };
  return {
    node,
    workspace: { ...workspace, nodes: [...workspace.nodes, node] },
  };
}

export function duplicateNode(
  workspace: OrbitWorkspace,
  id: string,
): { node: DiagramNode | null; workspace: OrbitWorkspace } {
  const original = workspace.nodes.find((node) => node.id === id);
  if (!original) return { node: null, workspace };
  const node: DiagramNode = {
    ...original,
    id: createId(original.kind),
    label: uniqueLabel(workspace.nodes.map((entry) => entry.label), original.label),
    x: original.x + 32,
    y: original.y + 32,
  };
  return { node, workspace: { ...workspace, nodes: [...workspace.nodes, node] } };
}

export function moveNode(workspace: OrbitWorkspace, id: string, x: number, y: number): OrbitWorkspace {
  return {
    ...workspace,
    nodes: workspace.nodes.map((node) => (node.id === id ? { ...node, x: Math.round(x), y: Math.round(y) } : node)),
  };
}

export function updateNode(workspace: OrbitWorkspace, id: string, changes: Partial<Omit<DiagramNode, "id">>): OrbitWorkspace {
  return {
    ...workspace,
    nodes: workspace.nodes.map((node) => (node.id === id ? { ...node, ...changes } : node)),
  };
}

export function removeNode(workspace: OrbitWorkspace, id: string): OrbitWorkspace {
  return {
    ...workspace,
    nodes: workspace.nodes.filter((node) => node.id !== id),
    edges: workspace.edges.filter((edge) => edge.source !== id && edge.target !== id),
  };
}

export function addEdge(
  workspace: OrbitWorkspace,
  sourceId: string,
  targetId: string,
): { edge: DiagramEdge | null; workspace: OrbitWorkspace } {
  if (sourceId === targetId) return { edge: null, workspace };
  const duplicate = workspace.edges.some(
    (edge) =>
      (edge.source === sourceId && edge.target === targetId) ||
      (edge.source === targetId && edge.target === sourceId),
  );
  if (duplicate) return { edge: null, workspace };

  const edge: DiagramEdge = {
    id: createId("edge"),
    source: sourceId,
    target: targetId,
    label: "Request",
    note: "",
  };
  return { edge, workspace: { ...workspace, edges: [...workspace.edges, edge] } };
}

export function updateEdge(workspace: OrbitWorkspace, id: string, changes: Partial<Omit<DiagramEdge, "id" | "source" | "target">>): OrbitWorkspace {
  return {
    ...workspace,
    edges: workspace.edges.map((edge) => (edge.id === id ? { ...edge, ...changes } : edge)),
  };
}

export function removeEdge(workspace: OrbitWorkspace, id: string): OrbitWorkspace {
  return {
    ...workspace,
    edges: workspace.edges.filter((edge) => edge.id !== id),
  };
}

/** Shortest path (fewest hops) as edge ids. Connections are directional unless `directed` is false. */
export function findPathEdges(
  edges: DiagramEdge[],
  sourceId: string,
  targetId: string,
  directed = true,
): string[] | null {
  if (sourceId === targetId) return null;
  const adjacency = new Map<string, { target: string; edgeId: string }[]>();
  const link = (from: string, to: string, edgeId: string) => {
    const list = adjacency.get(from) ?? [];
    list.push({ target: to, edgeId });
    adjacency.set(from, list);
  };
  for (const edge of edges) {
    link(edge.source, edge.target, edge.id);
    if (!directed) link(edge.target, edge.source, edge.id);
  }

  const queue: { nodeId: string; path: string[] }[] = [{ nodeId: sourceId, path: [] }];
  const visited = new Set<string>([sourceId]);

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const neighbor of adjacency.get(current.nodeId) ?? []) {
      if (visited.has(neighbor.target)) continue;
      const nextPath = [...current.path, neighbor.edgeId];
      if (neighbor.target === targetId) return nextPath;
      visited.add(neighbor.target);
      queue.push({ nodeId: neighbor.target, path: nextPath });
    }
  }

  return null;
}

/** Node ids visited by a path, in order, starting at `sourceId`. */
export function pathNodeIds(edges: DiagramEdge[], sourceId: string, pathEdgeIds: string[]): string[] {
  const byId = new Map(edges.map((edge) => [edge.id, edge]));
  const nodes = [sourceId];
  for (const id of pathEdgeIds) {
    const edge = byId.get(id);
    if (!edge) break;
    const current = nodes[nodes.length - 1];
    nodes.push(edge.source === current ? edge.target : edge.source);
  }
  return nodes;
}

export function uniqueLabel(existing: string[], base: string): string {
  if (!existing.includes(base)) return base;
  let counter = 2;
  while (existing.includes(`${base} ${counter}`)) counter += 1;
  return `${base} ${counter}`;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadWorkspaceJson(workspace: OrbitWorkspace) {
  const blob = new Blob([serializeWorkspace(workspace)], { type: "application/json" });
  const slug = workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "diagram";
  downloadBlob(`${slug || "orbitlab-diagram"}.json`, blob);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildWorkspaceSvg(
  workspace: OrbitWorkspace,
  options: {
    colorFor: (kind: ComponentKind) => string;
    accent: string;
    background: string;
    text: string;
  },
): string {
  const positions = workspace.nodes.map((node) => ({ node, x: node.x, y: node.y }));
  const minX = Math.min(...positions.map((p) => p.x), 0);
  const minY = Math.min(...positions.map((p) => p.y), 0);
  const maxX = Math.max(...positions.map((p) => p.x), 900);
  const maxY = Math.max(...positions.map((p) => p.y), 500);

  const width = Math.round(maxX - minX + 220);
  const height = Math.round(maxY - minY + 240);
  const nodeMap = new Map(workspace.nodes.map((node) => [node.id, node]));

  const lines = workspace.edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return null;
      const x1 = source.x - minX + 110;
      const y1 = source.y - minY + 120;
      const x2 = target.x - minX + 110;
      const y2 = target.y - minY + 120;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${options.accent}" stroke-width="2" stroke-opacity="0.65" />${edge.label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" font-size="12" fill="${options.text}" text-anchor="middle" opacity="0.8">${escapeXml(edge.label)}</text>` : ""}`;
    })
    .filter(Boolean)
    .join("\n    ");

  const shapes = workspace.nodes
    .map(
      (node) => `<rect x="${node.x - minX + 40}" y="${node.y - minY + 90}" width="140" height="60" rx="14" fill="${options.colorFor(node.kind)}" fill-opacity="0.2" stroke="${options.colorFor(node.kind)}" stroke-width="1.5" />
      <text x="${node.x - minX + 110}" y="${node.y - minY + 126}" font-size="14" fill="${options.text}" text-anchor="middle">${escapeXml(node.label)}</text>`,
    )
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif">
  <rect width="${width}" height="${height}" fill="${options.background}" />
  <text x="40" y="52" font-size="24" font-weight="600" fill="${options.text}">${escapeXml(workspace.name)}</text>
  <text x="40" y="76" font-size="13" fill="${options.text}" opacity="0.6">Exported from OrbitLab</text>
  <g>
    ${lines}
  </g>
  <g>
    ${shapes}
  </g>
</svg>`;
}

export function downloadWorkspaceSvg(
  workspace: OrbitWorkspace,
  colorFor: (kind: ComponentKind) => string,
  accent: string,
  background: string,
  text: string,
) {
  const svg = buildWorkspaceSvg(workspace, { colorFor, accent, background, text });
  const slug = workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "diagram";
  downloadBlob(`${slug || "orbitlab-diagram"}.svg`, new Blob([svg], { type: "image/svg+xml" }));
}

export function downloadWorkspacePng(
  workspace: OrbitWorkspace,
  colorFor: (kind: ComponentKind) => string,
  accent: string,
  background: string,
  text: string,
) {
  const svg = buildWorkspaceSvg(workspace, { colorFor, accent, background, text });
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }
    context.scale(scale, scale);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const slug = workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "diagram";
      downloadBlob(`${slug || "orbitlab-diagram"}.png`, pngBlob);
    }, "image/png");
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
  };

  image.src = url;
}
