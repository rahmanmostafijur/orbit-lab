"use client";

import { Trash2, X } from "lucide-react";
import type {
  ComponentKind,
  DiagramEdge,
  DiagramSelection,
  OrbitWorkspace,
} from "@/lib/orbitlab/types";

export type EdgeChanges = Partial<Pick<DiagramEdge, "label" | "note" | "kind" | "protocol">>;

const ALIGN_ACTIONS: { mode: AlignMode; label: string }[] = [
  { mode: "left", label: "Align left" },
  { mode: "center", label: "Align center" },
  { mode: "right", label: "Align right" },
  { mode: "top", label: "Align top" },
  { mode: "middle", label: "Align middle" },
  { mode: "bottom", label: "Align bottom" },
  { mode: "distribute-x", label: "Distribute ↔" },
  { mode: "distribute-y", label: "Distribute ↕" },
];

const PROTOCOLS = ["HTTP", "HTTPS", "gRPC", "GraphQL", "WebSocket", "SQL", "Event", "AMQP"];
import { componentKinds, edgeSuggestions, kindIds } from "@/lib/orbitlab/kinds";
import type { AlignMode } from "@/lib/orbitlab/layout";

type InspectorProps = {
  workspace: OrbitWorkspace;
  selection: DiagramSelection;
  onUpdateNode: (id: string, changes: { kind?: ComponentKind; label?: string; note?: string }) => void;
  onUpdateEdge: (id: string, changes: EdgeChanges) => void;
  onDeleteSelection: () => void;
  onAlign: (mode: AlignMode) => void;
  /** Deselect; closes the bottom sheet on small screens. */
  onClose: () => void;
};

export function Inspector({
  workspace,
  selection,
  onUpdateNode,
  onUpdateEdge,
  onDeleteSelection,
  onAlign,
  onClose,
}: InspectorProps) {
  if (selection.type === "nodes") {
    const canDistribute = selection.ids.length >= 3;
    return (
      <section className="panel panel--inspector is-open" aria-label="Inspector">
        <div className="panel__heading">
          <p className="micro-label">{selection.ids.length} components selected</p>
          <div className="panel__actions">
            <button type="button" className="button button--ghost button--sm" onClick={onDeleteSelection}>
              <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
              Delete
            </button>
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={onClose}
              aria-label="Close inspector"
            >
              <X size={14} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="align-grid" role="group" aria-label="Align and distribute">
          {ALIGN_ACTIONS.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              className="button button--ghost button--sm"
              disabled={mode.startsWith("distribute") && !canDistribute}
              onClick={() => onAlign(mode)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="panel__empty">
          Drag any selected component to move them together. Ctrl+D duplicates, Ctrl+C / Ctrl+V copy and paste.
        </p>
      </section>
    );
  }

  const node =
    selection.type === "node"
      ? workspace.nodes.find((candidate) => candidate.id === selection.id) ?? null
      : null;
  const edge =
    selection.type === "edge"
      ? workspace.edges.find((candidate) => candidate.id === selection.id) ?? null
      : null;
  const kindOf = (id: string) => workspace.nodes.find((candidate) => candidate.id === id)?.kind;

  if (!node && !edge) {
    return (
      <section className="panel panel--inspector" aria-label="Inspector">
        <p className="micro-label">Inspector</p>
        <p className="panel__empty">
          Select a component or connection on the canvas to edit its label,
          notes, or type. Use Trace mode to follow a request.
        </p>
      </section>
    );
  }

  return (
    <section className="panel panel--inspector is-open" aria-label="Inspector">
      <div className="panel__heading">
        <p className="micro-label">Inspector</p>
        <div className="panel__actions">
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={onDeleteSelection}
          >
            <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
            Delete
          </button>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={onClose}
            aria-label="Close inspector"
          >
            <X size={14} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
      </div>

      {node ? (
        <div className="inspector__form">
          <label className="field">
            <span className="field__label">Label</span>
            <input
              type="text"
              value={node.label}
              onChange={(event) => onUpdateNode(node.id, { label: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">Component type</span>
            <select
              value={node.kind}
              onChange={(event) =>
                onUpdateNode(node.id, { kind: event.target.value as ComponentKind })
              }
            >
              {kindIds.map((kind) => (
                <option key={kind} value={kind}>
                  {componentKinds[kind].label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Notes</span>
            <textarea
              rows={3}
              value={node.note}
              placeholder="What does this component do?"
              onChange={(event) => onUpdateNode(node.id, { note: event.target.value })}
            />
          </label>
        </div>
      ) : null}

      {edge ? (
        <div className="inspector__form">
          <label className="field">
            <span className="field__label">Connection label</span>
            <input
              type="text"
              value={edge.label}
              placeholder="Request, Data, Event..."
              onChange={(event) => onUpdateEdge(edge.id, { label: event.target.value })}
            />
          </label>
          <div className="label-chips" role="group" aria-label="Suggested labels">
            {edgeSuggestions(kindOf(edge.source), kindOf(edge.target)).map((label) => (
              <button
                key={label}
                type="button"
                className="label-chips__item"
                aria-pressed={edge.label === label}
                onClick={() => onUpdateEdge(edge.id, { label })}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field__label">Communication</span>
            <select
              value={edge.kind ?? "sync"}
              onChange={(event) =>
                onUpdateEdge(edge.id, { kind: event.target.value === "async" ? "async" : undefined })
              }
            >
              <option value="sync">Sync — request / response (solid)</option>
              <option value="async">Async — event / message (dashed)</option>
            </select>
          </label>

          <label className="field">
            <span className="field__label">Protocol (optional)</span>
            <input
              type="text"
              list="edge-protocols"
              value={edge.protocol ?? ""}
              placeholder="HTTP, gRPC, SQL, Event…"
              onChange={(event) =>
                onUpdateEdge(edge.id, { protocol: event.target.value || undefined })
              }
            />
            <datalist id="edge-protocols">
              {PROTOCOLS.map((protocol) => (
                <option key={protocol} value={protocol} />
              ))}
            </datalist>
          </label>

          <label className="field">
            <span className="field__label">Notes</span>
            <textarea
              rows={3}
              value={edge.note}
              placeholder="e.g. reads through cache deletes"
              onChange={(event) => onUpdateEdge(edge.id, { note: event.target.value })}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
