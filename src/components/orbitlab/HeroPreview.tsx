import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { NODE_HEIGHT, NODE_WIDTH, routeEdges } from "@/lib/orbitlab/edgeRouting";
import { componentKinds } from "@/lib/orbitlab/kinds";
import { findPathEdges, pathNodeIds } from "@/lib/orbitlab/model";
import { createWorkspaceFromTemplate, workspaceTemplates } from "@/lib/orbitlab/templates";

const TEMPLATE_ID = "three-tier";
const TRACE_FROM = "Browser";
const TRACE_TO = "Primary DB";
const VIEW_PADDING = 24;

/** The real playground rendering of a template, tracing one request (CSS-animated, no client JS). */
export function HeroPreview() {
  const template = workspaceTemplates.find((entry) => entry.id === TEMPLATE_ID)!;
  const workspace = createWorkspaceFromTemplate(template);
  const idOf = (label: string) => workspace.nodes.find((node) => node.label === label)!.id;
  const from = idOf(TRACE_FROM);
  const pathEdges = findPathEdges(workspace.edges, from, idOf(TRACE_TO)) ?? [];
  const pathNodes = pathNodeIds(workspace.edges, from, pathEdges);
  const routes = routeEdges(workspace.nodes, workspace.edges);
  const route = pathNodes.map((id) => workspace.nodes.find((node) => node.id === id)!.label);

  const xs = workspace.nodes.map((node) => node.x);
  const ys = workspace.nodes.map((node) => node.y);
  const left = Math.min(...xs) - VIEW_PADDING;
  const top = Math.min(...ys) - VIEW_PADDING;
  const width = Math.max(...xs) + NODE_WIDTH + VIEW_PADDING - left;
  const height = Math.max(...ys) + NODE_HEIGHT + VIEW_PADDING - top;

  return (
    <figure className="hero-preview">
      <div className="hero-preview__frame">
        <p className="hero-preview__bar" aria-hidden="true">
          <span />
          <span />
          <span />
          playground · trace mode
        </p>
        <svg
          className="hero-preview__canvas"
          viewBox={`${left} ${top} ${width} ${height}`}
          role="img"
          aria-label={`${template.name} diagram with a request traced from ${route.join(" to ")}.`}
        >
          <defs>
            <marker id="hero-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {workspace.edges.map((edge) => {
            const step = pathEdges.indexOf(edge.id);
            return (
              <path
                key={edge.id}
                d={routes.get(edge.id)?.d}
                className={`hero-preview__edge${step >= 0 ? " is-on-path" : ""}${edge.kind === "async" ? " is-async" : ""}`}
                markerEnd="url(#hero-arrow)"
              />
            );
          })}
          {workspace.nodes.map((node) => {
            const step = pathNodes.indexOf(node.id);
            return (
              <g
                key={node.id}
                className={`hero-preview__node${step >= 0 ? " is-on-path" : ""}`}
                style={{ ["--node-color" as string]: componentKinds[node.kind].color, ["--step" as string]: step }}
              >
                <rect x={node.x} y={node.y} width={NODE_WIDTH} height={NODE_HEIGHT} rx="14" />
                <text x={node.x + NODE_WIDTH / 2} y={node.y + NODE_HEIGHT / 2 + 8} textAnchor="middle">
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="hero-preview__caption">
        <span>{route.join(" → ")}</span>
        <Link href={`/playground?template=${TEMPLATE_ID}`} className="hero__ghost-link">
          Try this template
          <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </figcaption>
    </figure>
  );
}
