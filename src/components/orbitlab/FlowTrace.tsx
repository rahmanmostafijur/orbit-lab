"use client";

import { X } from "lucide-react";
import type { OrbitWorkspace } from "@/lib/orbitlab/types";
import { pathNodeIds } from "@/lib/orbitlab/model";

export type TraceState = { from: string | null; to: string | null; directed: boolean };

type FlowTraceProps = {
  workspace: OrbitWorkspace;
  trace: TraceState;
  /** null = not run yet, [] = no path, otherwise the edge ids of the route. */
  pathEdgeIds: string[] | null;
  onChange: (trace: TraceState) => void;
};

export function FlowTrace({ workspace, trace, pathEdgeIds, onChange }: FlowTraceProps) {
  const labelOf = (id: string | null) =>
    workspace.nodes.find((node) => node.id === id)?.label ?? "…";

  let message: string;
  if (!trace.from) {
    message = "Click a source component.";
  } else if (!trace.to) {
    message = `From ${labelOf(trace.from)} — now click a destination.`;
  } else if (pathEdgeIds && pathEdgeIds.length > 0) {
    const route = pathNodeIds(workspace.edges, trace.from, pathEdgeIds).map(labelOf).join(" → ");
    const hops = pathEdgeIds.length;
    message = `${route} · ${hops} hop${hops === 1 ? "" : "s"}${trace.directed ? "" : " (ignoring direction)"}`;
  } else {
    message = `No forward path from ${labelOf(trace.from)} to ${labelOf(trace.to)}. Connections are one-way.`;
  }

  const noPath = Boolean(trace.from && trace.to && pathEdgeIds?.length === 0);

  return (
    <section className="trace-overlay" aria-label="Request flow tracer">
      <p className="trace-overlay__status" aria-live="polite">
        {message}
      </p>

      <div className="trace-overlay__row">
        <label className="trace-overlay__field">
          <span className="visually-hidden">From</span>
          <select
            value={trace.from ?? ""}
            onChange={(event) => onChange({ ...trace, from: event.target.value || null })}
          >
            <option value="">From…</option>
            {workspace.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
        <span aria-hidden="true">→</span>
        <label className="trace-overlay__field">
          <span className="visually-hidden">To</span>
          <select
            value={trace.to ?? ""}
            onChange={(event) => onChange({ ...trace, to: event.target.value || null })}
          >
            <option value="">To…</option>
            {workspace.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
        {trace.from ? (
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={() => onChange({ from: null, to: null, directed: true })}
          >
            <X size={14} strokeWidth={1.7} aria-hidden="true" />
            Clear trace
          </button>
        ) : null}
      </div>

      {noPath || !trace.directed ? (
        <label className="trace-overlay__toggle">
          <input
            type="checkbox"
            checked={!trace.directed}
            onChange={(event) => onChange({ ...trace, directed: !event.target.checked })}
          />
          Trace ignoring direction
        </label>
      ) : null}
    </section>
  );
}
