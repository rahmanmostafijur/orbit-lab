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
};

export type OrbitWorkspace = {
  name: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export type DiagramSelection =
  | { type: "none" }
  | { type: "node"; id: string }
  | { type: "edge"; id: string };

export type EditorMode = "edit" | "connect" | "flow";
