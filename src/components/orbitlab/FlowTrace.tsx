"use client";

import { useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import type { OrbitWorkspace } from "@/lib/orbitlab/types";
import { findPathEdges } from "@/lib/orbitlab/model";

type FlowTraceProps = {
  workspace: OrbitWorkspace;
  pathEdgeIds: string[] | null;
  onSelectPath: (pathEdgeIds: string[] | null) => void;
};

export function FlowTrace({
  workspace,
  pathEdgeIds,
  onSelectPath,
}: FlowTraceProps) {
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");

  const resolvedFrom = fromId || workspace.nodes[0]?.id || "";
  const resolvedTo = toId || workspace.nodes[workspace.nodes.length - 1]?.id || "";

  const hops = useMemo(() => {
    if (!resolvedFrom || !resolvedTo) return null;
    const path = findPathEdges(workspace.edges, resolvedFrom, resolvedTo);
    return path?.length ?? null;
  }, [workspace.edges, resolvedFrom, resolvedTo]);

  const active = pathEdgeIds?.length ?? 0;

  return (
    <section className="panel panel--trace" aria-label="Request flow tracer">
      <div className="panel__heading">
        <p className="micro-label">Request flow</p>
        {pathEdgeIds ? (
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={() => onSelectPath(null)}
          >
            <X size={14} strokeWidth={1.7} aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>

      <div className="trace__fields">
        <label className="field">
          <span className="field__label">From</span>
          <select value={resolvedFrom} onChange={(event) => {
            setFromId(event.target.value);
            onSelectPath(null);
          }}>
            {workspace.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">To</span>
          <select value={resolvedTo} onChange={(event) => {
            setToId(event.target.value);
            onSelectPath(null);
          }}>
            {workspace.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        className="button button--primary button--block"
        disabled={!resolvedFrom || !resolvedTo || resolvedFrom === resolvedTo}
        onClick={() => {
          const path = findPathEdges(workspace.edges, resolvedFrom, resolvedTo);
          if (!path) {
            onSelectPath([]);
            return;
          }
          onSelectPath(path);
        }}
      >
        <Play size={15} strokeWidth={1.8} aria-hidden="true" />
        Trace request path
      </button>

      <p className="trace__status" aria-live="polite">
        {pathEdgeIds && pathEdgeIds.length === 0
          ? "No forward path between those components."
          : active > 0
            ? `Route found — ${active} hop${active === 1 ? "" : "s"} flowing.`
            : hops !== null
              ? `Shortest route: ${hops} hop${hops === 1 ? "" : "s"}.`
              : "Pick two components to trace an animated request route."}
      </p>
    </section>
  );
}
