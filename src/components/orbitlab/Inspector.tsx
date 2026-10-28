"use client";

import { Trash2, X } from "lucide-react";
import type {
  ComponentKind,
  DiagramSelection,
  OrbitWorkspace,
} from "@/lib/orbitlab/types";
import { componentKinds, kindIds } from "@/lib/orbitlab/kinds";

type InspectorProps = {
  workspace: OrbitWorkspace;
  selection: DiagramSelection;
  onUpdateNode: (id: string, changes: { kind?: ComponentKind; label?: string; note?: string }) => void;
  onUpdateEdge: (id: string, changes: { label?: string; note?: string }) => void;
  onDeleteSelection: () => void;
  /** Deselect; closes the bottom sheet on small screens. */
  onClose: () => void;
};

export function Inspector({
  workspace,
  selection,
  onUpdateNode,
  onUpdateEdge,
  onDeleteSelection,
  onClose,
}: InspectorProps) {
  const node =
    selection.type === "node"
      ? workspace.nodes.find((candidate) => candidate.id === selection.id) ?? null
      : null;
  const edge =
    selection.type === "edge"
      ? workspace.edges.find((candidate) => candidate.id === selection.id) ?? null
      : null;

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
