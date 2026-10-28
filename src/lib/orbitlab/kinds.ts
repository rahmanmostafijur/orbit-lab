import type { ComponentKind } from "@/lib/orbitlab/types";

export const componentKinds: Record<
  ComponentKind,
  {
    label: string;
    description: string;
    color: string;
    tone: string;
    /** Label for a new component; numbered only when already taken. */
    defaultName: string;
    /** Suggested labels for a connection into this kind; the first is the default. */
    edgeLabels: string[];
  }
> = {
  client: {
    label: "Client",
    description: "Browser, mobile, or embedded surface.",
    color: "#7ee8ff",
    tone: "rgba(126,232,255,0.18)",
    defaultName: "Client",
    edgeLabels: ["Response", "Push", "Notify"],
  },
  gateway: {
    label: "Gateway",
    description: "Routing, load balancing, or edge boundary.",
    color: "#f2bd82",
    tone: "rgba(242,189,130,0.18)",
    defaultName: "API Gateway",
    edgeLabels: ["Request", "Route", "API call"],
  },
  service: {
    label: "Service",
    description: "Application or API service.",
    color: "#5f88ff",
    tone: "rgba(95,136,255,0.2)",
    defaultName: "Service",
    edgeLabels: ["Request", "Command", "Query", "Route"],
  },
  fastapi: {
    label: "FastAPI",
    description: "FastAPI application.",
    color: "#4ff5bb",
    tone: "rgba(79,245,187,0.18)",
    defaultName: "FastAPI Service",
    edgeLabels: ["Request", "Command", "Query", "Route"],
  },
  database: {
    label: "Database",
    description: "PostgreSQL, MySQL, or another data store.",
    color: "#b4a1ff",
    tone: "rgba(180,161,255,0.18)",
    defaultName: "Database",
    edgeLabels: ["Read / write", "Query", "Write", "Replication"],
  },
  cache: {
    label: "Cache",
    description: "Redis, Valkey, or in-memory cache.",
    color: "#8be3f5",
    tone: "rgba(139,227,245,0.18)",
    defaultName: "Cache",
    edgeLabels: ["Cache lookup", "Read", "Write-through", "Invalidate"],
  },
  queue: {
    label: "Queue",
    description: "Kafka, RabbitMQ, SQS, or other event bus.",
    color: "#efb0bb",
    tone: "rgba(239,176,187,0.18)",
    defaultName: "Queue",
    edgeLabels: ["Publish", "Event", "Enqueue job"],
  },
  external: {
    label: "External",
    description: "Third-party service or external system.",
    color: "#a3aebd",
    tone: "rgba(163,174,189,0.18)",
    defaultName: "External API",
    edgeLabels: ["API call", "Webhook", "Send email"],
  },
};

export const kindIds = Object.keys(componentKinds) as ComponentKind[];

/** Label suggestions for a new connection; a queue as the source means the target consumes from it. */
export function edgeSuggestions(source?: ComponentKind, target?: ComponentKind): string[] {
  const forTarget = target ? componentKinds[target].edgeLabels : ["Request"];
  return source === "queue" ? ["Consume", ...forTarget.filter((label) => label !== "Consume")] : forTarget;
}
