import type { ComponentKind, DiagramEdge, DiagramNode, OrbitWorkspace } from "@/lib/orbitlab/types";

export type WorkspaceTemplate = {
  id: string;
  name: string;
  summary: string;
  nodes: Array<Omit<DiagramNode, "id">>;
  edges: Array<Omit<DiagramEdge, "id">>;
};

const threeTierNodes: Array<Omit<DiagramNode, "id">> = [
  { kind: "client", x: 112, y: 112, label: "Browser", note: "Public web surface." },
  { kind: "gateway", x: 424, y: 112, label: "Edge Gateway", note: "TLS and route boundaries." },
  { kind: "service", x: 736, y: 112, label: "Web App", note: "Business and session logic." },
  { kind: "database", x: 1048, y: 112, label: "Primary DB", note: "System of record." },
  { kind: "cache", x: 736, y: 376, label: "Redis", note: "Hot reads and sessions." },
  { kind: "external", x: 1048, y: 376, label: "Object Storage", note: "Media and backups." },
];

const threeTierEdges: Array<Omit<DiagramEdge, "id">> = [
  { source: "n0", target: "n1", label: "Request", note: "Public request" },
  { source: "n1", target: "n2", label: "Request", note: "Route" },
  { source: "n2", target: "n3", label: "Data", note: "Read / write" },
  { source: "n2", target: "n4", label: "Data", note: "Hot reads" },
  { source: "n2", target: "n5", label: "External", note: "Media + backups" },
];

const restFastApiNodes: Array<Omit<DiagramNode, "id">> = [
  { kind: "client", x: 112, y: 112, label: "Web / Mobile", note: "Calls public API." },
  { kind: "gateway", x: 424, y: 112, label: "API Gateway", note: "Auth and validation." },
  { kind: "fastapi", x: 736, y: 112, label: "FastAPI", note: "Domain API." },
  { kind: "database", x: 1048, y: 112, label: "PostgreSQL", note: "System of record." },
  { kind: "cache", x: 1048, y: 376, label: "Valkey", note: "Read-through hot data." },
  { kind: "external", x: 736, y: 376, label: "Email Provider", note: "Async notify." },
];

const restFastApiEdges: Array<Omit<DiagramEdge, "id">> = [
  { source: "n0", target: "n1", label: "Request", note: "REST" },
  { source: "n1", target: "n2", label: "Request", note: "Route" },
  { source: "n2", target: "n3", label: "Data", note: "Read / write" },
  { source: "n2", target: "n4", label: "Data", note: "Hot reads" },
  { source: "n2", target: "n5", label: "External", note: "Email events" },
];

const authNodes: Array<Omit<DiagramNode, "id">> = [
  { kind: "client", x: 112, y: 128, label: "Client", note: "Sign in and sessions." },
  { kind: "gateway", x: 424, y: 128, label: "Public Edge", note: "Identity boundary." },
  { kind: "fastapi", x: 736, y: 112, label: "Auth Service", note: "Passwordless and OAuth." },
  { kind: "database", x: 1048, y: 112, label: "Identity DB", note: "Accounts and credentials." },
  { kind: "cache", x: 1048, y: 376, label: "Session Cache", note: "Short-lived tokens." },
  { kind: "external", x: 736, y: 376, label: "OAuth Provider", note: "Third-party identity." },
];

const authEdges: Array<Omit<DiagramEdge, "id">> = [
  { source: "n0", target: "n1", label: "Request", note: "Sign in" },
  { source: "n1", target: "n2", label: "Request", note: "Verify / issue" },
  { source: "n2", target: "n3", label: "Data", note: "Account lookup" },
  { source: "n2", target: "n4", label: "Data", note: "Session upsert" },
  { source: "n2", target: "n5", label: "External", note: "OAuth round trip" },
];

const microServicesNodes: Array<Omit<DiagramNode, "id">> = [
  { kind: "client", x: 112, y: 296, label: "Client", note: "Consumer surface." },
  { kind: "gateway", x: 424, y: 296, label: "Service Mesh", note: "Routing and observability." },
  { kind: "service", x: 736, y: 112, label: "Ordering", note: "Order lifecycle." },
  { kind: "service", x: 736, y: 376, label: "Inventory", note: "Stock and pricing." },
  { kind: "fastapi", x: 1048, y: 296, label: "Payments", note: "Charges and refunds." },
  { kind: "queue", x: 424, y: 104, label: "Order Events", note: "Domain events." },
  { kind: "queue", x: 424, y: 472, label: "Payment Events", note: "Notification fan-out." },
  { kind: "database", x: 1048, y: 472, label: "Ledger DB", note: "Financial records." },
];

const microServicesEdges: Array<Omit<DiagramEdge, "id">> = [
  { source: "n0", target: "n1", label: "Request", note: "Public API" },
  { source: "n1", target: "n2", label: "Command", note: "Create order" },
  { source: "n1", target: "n3", label: "Query", note: "Read stock" },
  { source: "n2", target: "n4", label: "Request", note: "Payment" },
  { source: "n2", target: "n5", label: "Event", note: "Publish order event" },
  { source: "n4", target: "n6", label: "Event", note: "Payment event" },
  { source: "n4", target: "n7", label: "Data", note: "Persist ledger" },
];

export const workspaceTemplates: WorkspaceTemplate[] = [
  {
    id: "three-tier",
    name: "Three-tier web app",
    summary:
      "A small, realistic web system with clear boundaries between client, edge, application and data.",
    nodes: threeTierNodes,
    edges: threeTierEdges,
  },
  {
    id: "rest-fastapi",
    name: "REST API architecture",
    summary:
      "A common REST request path through a gateway, a FastAPI app and shared data infrastructure.",
    nodes: restFastApiNodes,
    edges: restFastApiEdges,
  },
  {
    id: "auth",
    name: "Authentication flow",
    summary:
      "Identity boundary with account storage, short-lived sessions and a third-party identity provider.",
    nodes: authNodes,
    edges: authEdges,
  },
  {
    id: "microservices",
    name: "Microservices architecture",
    summary:
      "Domain services behind a routing boundary, with async queue communication.",
    nodes: microServicesNodes,
    edges: microServicesEdges,
  },
];

function nodeIndex(ref: string) {
  return parseInt(ref.slice(1), 10);
}

function buildNodeIds(name: string, kind: ComponentKind, index: number) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${safeName}-${kind}-${index}`;
}

export function createWorkspaceFromTemplate(template: WorkspaceTemplate): OrbitWorkspace {
  return {
    name: template.name,
    nodes: template.nodes.map((node, index) => ({
      id: buildNodeIds(template.id, node.kind, index),
      ...node,
    })),
    edges: template.edges.map((edge, index) => ({
      id: `${template.id}-edge-${index}`,
      ...edge,
      source: buildNodeIds(
        template.id,
        template.nodes[nodeIndex(edge.source)].kind,
        nodeIndex(edge.source),
      ),
      target: buildNodeIds(
        template.id,
        template.nodes[nodeIndex(edge.target)].kind,
        nodeIndex(edge.target),
      ),
    })),
  };
}

export function createEmptyWorkspace(): OrbitWorkspace {
  return {
    name: "Untitled workspace",
    nodes: [],
    edges: [],
  };
}
