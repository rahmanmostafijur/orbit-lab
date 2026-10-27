import type { ComponentKind } from "@/lib/orbitlab/types";

export const componentKinds: Record<
  ComponentKind,
  {
    label: string;
    description: string;
    color: string;
    tone: string;
    prefix: string;
  }
> = {
  client: {
    label: "Client",
    description: "Browser, mobile, or embedded surface.",
    color: "#7ee8ff",
    tone: "rgba(126,232,255,0.18)",
    prefix: "Client",
  },
  gateway: {
    label: "Gateway",
    description: "Routing, load balancing, or edge boundary.",
    color: "#f2bd82",
    tone: "rgba(242,189,130,0.18)",
    prefix: "Gateway",
  },
  service: {
    label: "Service",
    description: "Application or API service.",
    color: "#5f88ff",
    tone: "rgba(95,136,255,0.2)",
    prefix: "Service",
  },
  fastapi: {
    label: "FastAPI",
    description: "FastAPI application.",
    color: "#4ff5bb",
    tone: "rgba(79,245,187,0.18)",
    prefix: "FastAPI",
  },
  database: {
    label: "Database",
    description: "PostgreSQL, MySQL, or another data store.",
    color: "#b4a1ff",
    tone: "rgba(180,161,255,0.18)",
    prefix: "Database",
  },
  cache: {
    label: "Cache",
    description: "Redis, Valkey, or in-memory cache.",
    color: "#8be3f5",
    tone: "rgba(139,227,245,0.18)",
    prefix: "Cache",
  },
  queue: {
    label: "Queue",
    description: "Kafka, RabbitMQ, SQS, or other event bus.",
    color: "#efb0bb",
    tone: "rgba(239,176,187,0.18)",
    prefix: "Queue",
  },
  external: {
    label: "External",
    description: "Third-party service or external system.",
    color: "#a3aebd",
    tone: "rgba(163,174,189,0.18)",
    prefix: "External",
  },
};

export const kindIds = Object.keys(componentKinds) as ComponentKind[];
