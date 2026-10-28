"use client";

import { useRef } from "react";
import {
  ArrowDownUp,
  Boxes,
  ClipboardCopy,
  Cloud,
  Database,
  Download,
  FilePlus2,
  Globe,
  ImageDown,
  Layers,
  RotateCcw,
  Upload,
  Waypoints,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ComponentKind, OrbitWorkspace } from "@/lib/orbitlab/types";
import { componentKinds, kindIds } from "@/lib/orbitlab/kinds";
import {
  downloadWorkspaceJson,
  downloadWorkspacePng,
  downloadWorkspaceSvg,
} from "@/lib/orbitlab/model";
import { workspaceTemplates } from "@/lib/orbitlab/templates";

const KIND_ICONS: Record<ComponentKind, LucideIcon> = {
  client: Globe,
  gateway: Waypoints,
  service: Boxes,
  fastapi: Zap,
  database: Database,
  cache: Layers,
  queue: ArrowDownUp,
  external: Cloud,
};

type WorkspaceSidebarProps = {
  workspace: OrbitWorkspace;
  colorFor: (kind: ComponentKind) => string;
  accent: string;
  background: string;
  text: string;
  onUseTemplate: (templateId: string) => void;
  onAddNode: (kind: ComponentKind) => void;
  onImport: (file: File) => void;
  onShare: () => void;
  onReset: () => void;
  onClear: () => void;
  onRename: (name: string) => void;
  onNotify: (message: string) => void;
};

export function WorkspaceSidebar({
  workspace,
  colorFor,
  accent,
  background,
  text,
  onUseTemplate,
  onAddNode,
  onImport,
  onShare,
  onReset,
  onClear,
  onRename,
  onNotify,
}: WorkspaceSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside id="workspace-tools" className="workspace-side" aria-label="Workspace controls">
      <label className="field">
        <span className="field__label">Workspace name</span>
        <input
          type="text"
          value={workspace.name}
          onChange={(event) => onRename(event.target.value)}
          placeholder="Untitled workspace"
          aria-label="Workspace name"
        />
      </label>

      <details className="side-group" open>
        <summary className="micro-label">Component palette</summary>
        <div className="palette">
          {kindIds.map((kind) => {
            const Icon = KIND_ICONS[kind];
            const meta = componentKinds[kind];
            return (
              <button
                key={kind}
                type="button"
                className="palette__item"
                style={{
                  ["--node-color" as string]: meta.color,
                  ["--node-tone" as string]: meta.tone,
                }}
                onClick={() => onAddNode(kind)}
                title={meta.description}
              >
                <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </details>

      <details className="side-group" open>
        <summary className="micro-label">Start from a template</summary>
        <div className="template-gallery">
          {workspaceTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`template-gallery__item${workspace.templateId === template.id ? " is-active" : ""}`}
              onClick={() => onUseTemplate(template.id)}
              title={template.summary}
              aria-pressed={workspace.templateId === template.id}
            >
              <span className="template-gallery__name">{template.name}</span>
              <span className="template-gallery__meta">
                {template.nodes.length} components · {template.edges.length} links
              </span>
            </button>
          ))}
        </div>
      </details>

      <details className="side-group" open>
        <summary className="micro-label">File</summary>
        <div className="sidebar-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} strokeWidth={1.7} aria-hidden="true" />
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              downloadWorkspaceJson(workspace);
              onNotify("Exported JSON — keep it as a backup.");
            }}
          >
            <Download size={15} strokeWidth={1.7} aria-hidden="true" />
            Export JSON
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              downloadWorkspaceSvg(workspace, colorFor, accent, background, text);
              onNotify("Exported SVG.");
            }}
          >
            <ImageDown size={15} strokeWidth={1.7} aria-hidden="true" />
            Export SVG
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              downloadWorkspacePng(workspace, colorFor, accent, background, text);
              onNotify("Exported PNG.");
            }}
          >
            <ImageDown size={15} strokeWidth={1.7} aria-hidden="true" />
            Export PNG
          </button>
          <button type="button" className="button button--ghost" onClick={onShare}>
            <ClipboardCopy size={15} strokeWidth={1.7} aria-hidden="true" />
            Share link
          </button>
        </div>
        <p className="side-block__status">
          Autosaves on this device only. Export JSON to keep a backup.
        </p>
      </details>

      <details className="side-group side-group--danger">
        <summary className="micro-label">Danger zone</summary>
        <p className="side-group__hint">Both can be undone for a few seconds, or with Ctrl+Z.</p>
        <div className="sidebar-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={onReset}
            disabled={!workspace.templateId}
            title={workspace.templateId ? undefined : "This diagram was not started from a template"}
          >
            <RotateCcw size={15} strokeWidth={1.7} aria-hidden="true" />
            Reset to template
          </button>
          <button type="button" className="button button--ghost" onClick={onClear}>
            <FilePlus2 size={15} strokeWidth={1.7} aria-hidden="true" />
            New empty workspace
          </button>
        </div>
      </details>
    </aside>
  );
}
