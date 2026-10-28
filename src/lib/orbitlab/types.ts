export type ComponentKind =
  | "client"
  | "gateway"
  | "service"
  | "fastapi"
  | "database"
  | "cache"
  | "queue"
  | "external";

export type DiagramNode = {
  id: string;
  kind: ComponentKind;
  label: string;
  note: string;
  x: number;
  y: number;
};

export type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  note: string;
  /** Async edges (events, queues) draw dashed. Missing = sync. */
  kind?: EdgeKind;
  protocol?: string;
};

export type EdgeKind = "sync" | "async";

export type OrbitWorkspace = {
  name: string;
  /** Template this workspace was started from; "Reset to template" restores it. */
  templateId?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export type DiagramSelection =
  | { type: "none" }
  | { type: "node"; id: string }
  /** Two or more components (shift-click or drag-box). */
  | { type: "nodes"; ids: string[] }
  | { type: "edge"; id: string };

export type EditorMode = "edit" | "connect" | "flow";
