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

      <section className="side-block" aria-label="Component palette">
        <p className="micro-label">Component palette</p>
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
      </section>

      <section className="side-block" aria-label="Templates">
        <p className="micro-label">Starter templates</p>
        <div className="template-list">
          {workspaceTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`template-list__item${workspace.templateId === template.id ? " is-active" : ""}`}
              onClick={() => onUseTemplate(template.id)}
            >
              <span className="template-list__name">{template.name}</span>
              <span className="template-list__summary">{template.summary}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="side-block" aria-label="Save, export, and import">
        <p className="micro-label">Actions</p>
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
            onClick={() => downloadWorkspaceJson(workspace)}
          >
            <Download size={15} strokeWidth={1.7} aria-hidden="true" />
            Export JSON
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => downloadWorkspaceSvg(workspace, colorFor, accent, background, text)}
          >
            <ImageDown size={15} strokeWidth={1.7} aria-hidden="true" />
            Export SVG
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => downloadWorkspacePng(workspace, colorFor, accent, background, text)}
          >
            <ImageDown size={15} strokeWidth={1.7} aria-hidden="true" />
            Export PNG
          </button>
          <button type="button" className="button button--ghost" onClick={onShare}>
            <ClipboardCopy size={15} strokeWidth={1.7} aria-hidden="true" />
            Share link
          </button>
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
        <p className="side-block__status">
          Autosaves on this device only. Export JSON to keep a backup.
        </p>
      </section>
    </aside>
  );
}
