"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Box,
  Layers,
  MousePointerClick,
  SlidersHorizontal,
  Spline,
} from "lucide-react";
import { GraphStage } from "@/components/orbitlab/GraphStage";
import { Inspector } from "@/components/orbitlab/Inspector";
import { FlowTrace } from "@/components/orbitlab/FlowTrace";
import { WorkspaceSidebar } from "@/components/orbitlab/WorkspaceSidebar";
import { DiagramUniverse } from "@/components/orbitlab/DiagramUniverse";
import { componentKinds } from "@/lib/orbitlab/kinds";
import { workspaceTemplates, createWorkspaceFromTemplate, createEmptyWorkspace } from "@/lib/orbitlab/templates";
import {
  addEdge,
  addNode,
  buildShareUrl,
  cloneWorkspace,
  createId,
  decodeWorkspaceFromLink,
  loadSavedWorkspace,
  moveNode,
  parseWorkspace,
  removeEdge,
  removeNode,
  saveWorkspace,
  updateEdge,
  updateNode,
} from "@/lib/orbitlab/model";
import type {
  ComponentKind,
  DiagramSelection,
  EditorMode,
  OrbitWorkspace,
} from "@/lib/orbitlab/types";

const IDLE_MESSAGE_TIMEOUT = 4200;

const modes: { id: EditorMode; label: string; hint: string; icon: typeof Layers }[] = [
  { id: "edit", label: "Edit", hint: "Select and drag components", icon: MousePointerClick },
  { id: "connect", label: "Connect", hint: "Click one component, then another to link them", icon: Spline },
  { id: "flow", label: "Trace", hint: "Trace an animated request route", icon: Layers },
];

const CANVAS_ACCENT = "#6fe5ff";
const CANVAS_BACKGROUND = "#03050b";
const CANVAS_TEXT = "#eef4ff";

export function OrbitEditor() {
  const [workspace, setWorkspace] = useState<OrbitWorkspace>(() =>
    createWorkspaceFromTemplate(workspaceTemplates[0]),
  );
  const [selection, setSelection] = useState<DiagramSelection>({ type: "none" });
  const [mode, setMode] = useState<EditorMode>("edit");
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [pathEdgeIds, setPathEdgeIds] = useState<string[] | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    workspaceTemplates[0].id,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const statusTimerRef = useRef<number>(0);
  const hydratedRef = useRef(false);

  const flashStatus = useCallback((message: string) => {
    setStatus(message);
    window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatus(null), IDLE_MESSAGE_TIMEOUT);
  }, []);

  useEffect(() => () => window.clearTimeout(statusTimerRef.current), []);

  // Mobile tools drawer: Esc to close, lock page scroll while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("editor-drawer-open");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("editor-drawer-open");
    };
  }, [drawerOpen]);

  // One-time hydration from localStorage or a shared #diagram= link.
  // Deferred via timeout so state updates stay inside a callback, not the effect body.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    let cancelled = false;

    const hydrate = () => {
      if (cancelled) return;

      const hash = window.location.hash.startsWith("#diagram=")
        ? window.location.hash
        : null;
      const shared = hash ? decodeWorkspaceFromLink(hash) : null;
      if (shared) {
        setWorkspace(shared);
        setSelection({ type: "none" });
        setActiveTemplateId(null);
        window.history.replaceState(null, "", window.location.pathname);
        flashStatus("Loaded shared diagram from link.");
        return;
      }

      const saved = loadSavedWorkspace();
      if (saved) {
        setWorkspace(saved);
        setSelection({ type: "none" });
        setActiveTemplateId(null);
        flashStatus("Restored your saved workspace.");
      }
    };

    const hydrationTimer = window.setTimeout(hydrate, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(hydrationTimer);
    };
  }, [flashStatus]);

  // Debounced autosave.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = window.setTimeout(() => {
      saveWorkspace(workspace);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  const handleMoveNode = useCallback((id: string, x: number, y: number) => {
    setWorkspace((current) => moveNode(current, id, x, y));
  }, []);

  const handleNodeClick = useCallback(
    (id: string) => {
      setSelection({ type: "node", id });
      setPathEdgeIds(null);

      if (mode === "connect") {
        if (!connectingFrom) {
          setConnectingFrom(id);
          flashStatus("Source selected — now click a component to connect.");
          return;
        }

        if (connectingFrom === id) {
          setConnectingFrom(null);
          return;
        }

        const result = addEdge(cloneWorkspace(workspace), connectingFrom, id);
        if (!result.edge) {
          flashStatus("Those components are already connected.");
          setConnectingFrom(null);
          return;
        }
        setWorkspace(result.workspace);
        setSelection({ type: "edge", id: result.edge.id });
        setConnectingFrom(null);
        flashStatus(`Linked ${result.edge.label.toLowerCase()} connection.`);
        return;
      }

      if (connectingFrom) {
        setConnectingFrom(null);
      }
    },
    [mode, connectingFrom, workspace, flashStatus],
  );

  const handleEdgeClick = useCallback((id: string) => {
    setSelection({ type: "edge", id });
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelection({ type: "none" });
    setConnectingFrom(null);
  }, []);

  const handleAddNode = useCallback(
    (kind: ComponentKind) => {
      const result = addNode(cloneWorkspace(workspace), kind);
      setWorkspace(result.workspace);
      setSelection({ type: "node", id: result.node.id });
      flashStatus(`Added ${componentKinds[kind].label} component.`);
    },
    [workspace, flashStatus],
  );

  const handleUpdateNode = useCallback(
    (id: string, changes: { label?: string; note?: string; kind?: ComponentKind }) => {
      setWorkspace((current) => updateNode(current, id, changes));
    },
    [],
  );

  const handleUpdateEdge = useCallback(
    (id: string, changes: { label?: string; note?: string }) => {
      setWorkspace((current) => updateEdge(current, id, changes));
    },
    [],
  );

  const handleDeleteSelection = useCallback(() => {
    if (selection.type === "node") {
      const id = selection.id;
      setWorkspace((current) => removeNode(current, id));
      setSelection({ type: "none" });
      flashStatus("Component removed along with its connections.");
    } else if (selection.type === "edge") {
      const id = selection.id;
      setWorkspace((current) => removeEdge(current, id));
      setSelection({ type: "none" });
      flashStatus("Connection removed.");
    }
  }, [selection, flashStatus]);

  const handleUseTemplate = useCallback(
    (templateId: string) => {
      const template = workspaceTemplates.find((entry) => entry.id === templateId);
      if (!template) return;
      setWorkspace(createWorkspaceFromTemplate(template));
      setSelection({ type: "none" });
      setConnectingFrom(null);
      setPathEdgeIds(null);
      setActiveTemplateId(template.id);
      flashStatus(`Loaded template: ${template.name}.`);
    },
    [flashStatus],
  );

  const handleSave = useCallback(() => {
    const saved = saveWorkspace(workspace);
    flashStatus(saved ? "Saved to this browser." : "Saving failed — storage may be disabled.");
  }, [workspace, flashStatus]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = parseWorkspace(text);
        if (!parsed) {
          flashStatus("Import failed — that file is not a valid OrbitLab diagram.");
          return;
        }
        setWorkspace(parsed);
        setSelection({ type: "none" });
        setActiveTemplateId(null);
        flashStatus(`Imported “${parsed.name}”.`);
      } catch {
        flashStatus("Import failed — the file could not be read.");
      }
    },
    [flashStatus],
  );

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(workspace);
    if (!url) {
      flashStatus("Sharing is unavailable in this context.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flashStatus("Share link copied to clipboard.");
    } catch {
      window.history.replaceState(null, "", url);
      flashStatus("Share link built in the address bar.");
    }
  }, [workspace, flashStatus]);

  const handleReset = useCallback(() => {
    const template =
      workspaceTemplates.find((entry) => entry.id === activeTemplateId) ?? workspaceTemplates[0];
    handleUseTemplate(template.id);
  }, [activeTemplateId, handleUseTemplate]);

  const handleClear = useCallback(() => {
    setWorkspace(createEmptyWorkspace());
    setWorkspace((current) => ({ ...current, name: `Untitled workspace ${
      createId("ws").slice(-4).toUpperCase()
    }` }));
    setSelection({ type: "none" });
    setActiveTemplateId(null);
    setPathEdgeIds(null);
    flashStatus("Started an empty workspace.");
  }, [flashStatus]);

  const handleRename = useCallback((name: string) => {
    setWorkspace((current) => ({ ...current, name }));
  }, []);

  const colorFor = useCallback(
    (kind: ComponentKind) => componentKinds[kind].color,
    [],
  );

  return (
    <div className={`workspace${drawerOpen ? " is-drawer-open" : ""}`}>
      {drawerOpen ? (
        <button
          type="button"
          className="workspace-drawer-backdrop is-open"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <WorkspaceSidebar
        workspace={workspace}
        activeTemplateId={activeTemplateId}
        colorFor={colorFor}
        accent={CANVAS_ACCENT}
        background={CANVAS_BACKGROUND}
        text={CANVAS_TEXT}
        status={status}
        onUseTemplate={handleUseTemplate}
        onAddNode={handleAddNode}
        onSave={handleSave}
        onImport={handleImport}
        onShare={handleShare}
        onReset={handleReset}
        onClear={handleClear}
        onRename={handleRename}
      />

      <div className="workspace__main">
        <header className="workspace-toolbar" aria-label="Editor controls">
          <div className="workspace-toolbar__modes" role="group" aria-label="Editing mode">
            {modes.map((entry) => {
              const Icon = entry.icon;
              const active = mode === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`workspace-toolbar__mode${active ? " is-active" : ""}`}
                  onClick={() => {
                    setMode(entry.id);
                    setConnectingFrom(null);
                  }}
                  aria-pressed={active}
                  title={entry.hint}
                >
                  <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
                  {entry.label}
                </button>
              );
            })}
          </div>

          <p className="workspace-toolbar__hint" aria-live="polite">
            {mode === "connect" && connectingFrom
              ? "Click a second component to create the connection."
              : modes.find((entry) => entry.id === mode)?.hint}
          </p>

          <div className="workspace-toolbar__views" role="group" aria-label="View">
            <button
              type="button"
              className={`workspace-toolbar__mode${view === "2d" ? " is-active" : ""}`}
              aria-pressed={view === "2d"}
              onClick={() => setView("2d")}
            >
              <Box size={15} strokeWidth={1.7} aria-hidden="true" />
              2D canvas
            </button>
            <button
              type="button"
              className={`workspace-toolbar__mode${view === "3d" ? " is-active" : ""}`}
              aria-pressed={view === "3d"}
              onClick={() => setView("3d")}
            >
              <Layers size={15} strokeWidth={1.7} aria-hidden="true" />
              3D universe
            </button>
          </div>

          <button
            type="button"
            className={`workspace-toolbar__mode workspace-toolbar__drawer-toggle${drawerOpen ? " is-active" : ""}`}
            aria-expanded={drawerOpen}
            aria-controls="workspace-tools"
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <SlidersHorizontal size={15} strokeWidth={1.7} aria-hidden="true" />
            Tools
          </button>
        </header>

        <div className="workspace-stage">
          {view === "2d" ? (
            <GraphStage
              workspace={workspace}
              selection={selection}
              connectingFrom={connectingFrom}
              pathEdgeIds={pathEdgeIds}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onBackgroundClick={handleBackgroundClick}
              onMoveNode={handleMoveNode}
            />
          ) : (
            <DiagramUniverse
              workspace={workspace}
              selection={selection}
              pathEdgeIds={pathEdgeIds}
              onSelectNode={(id) => setSelection({ type: "node", id })}
            />
          )}
        </div>

        <div className="workspace-panels">
          <FlowTrace
            workspace={workspace}
            pathEdgeIds={pathEdgeIds}
            onSelectPath={setPathEdgeIds}
          />
          <Inspector
            workspace={workspace}
            selection={selection}
            onUpdateNode={handleUpdateNode}
            onUpdateEdge={handleUpdateEdge}
            onDeleteSelection={handleDeleteSelection}
          />
        </div>

        <footer className="workspace-meta">
          <p aria-live="polite">
            {workspace.nodes.length} component{workspace.nodes.length === 1 ? "" : "s"} ·{" "}
            {workspace.edges.length} connection{workspace.edges.length === 1 ? "" : "s"}
            {pathEdgeIds ? ` · ${pathEdgeIds.length} hop path highlighted` : ""}
          </p>
          <p>
            Everything autosaves to this browser.{" "}
            <Link href="/playground">Use keyboard shortcuts</Link> — drag
            components, arrow keys nudge, Delete removes the selection.
          </p>
        </footer>
      </div>
    </div>
  );
}
