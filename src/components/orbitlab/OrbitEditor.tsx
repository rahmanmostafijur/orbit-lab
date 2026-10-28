"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Keyboard,
  Layers,
  MousePointerClick,
  Network,
  Redo2,
  SlidersHorizontal,
  Spline,
  Undo2,
} from "lucide-react";
import { GraphStage } from "@/components/orbitlab/GraphStage";
import { Inspector, type EdgeChanges } from "@/components/orbitlab/Inspector";
import { FlowTrace, type TraceState } from "@/components/orbitlab/FlowTrace";
import { WorkspaceSidebar } from "@/components/orbitlab/WorkspaceSidebar";
import { DiagramUniverse } from "@/components/orbitlab/DiagramUniverse";
import { ShortcutsDialog } from "@/components/orbitlab/ShortcutsDialog";
import { Toast, type ToastState } from "@/components/orbitlab/Toast";
import { componentKinds } from "@/lib/orbitlab/kinds";
import { workspaceTemplates, createWorkspaceFromTemplate, createEmptyWorkspace } from "@/lib/orbitlab/templates";
import { commit, createHistory, redo, undo } from "@/lib/orbitlab/history";
import { autoLayout } from "@/lib/orbitlab/layout";
import {
  addEdge,
  addNode,
  buildShareUrl,
  createId,
  decodeWorkspaceFromLink,
  duplicateNode,
  findPathEdges,
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

const TOAST_TIMEOUT = 4200;
const UNDO_TOAST_TIMEOUT = 8000;
const NO_TRACE: TraceState = { from: null, to: null, directed: true };

const modes: { id: EditorMode; label: string; hint: string; key: string; icon: typeof Layers }[] = [
  { id: "edit", label: "Edit", hint: "Select and drag components", key: "v", icon: MousePointerClick },
  { id: "connect", label: "Connect", hint: "Click one component, then another to link them", key: "c", icon: Spline },
  { id: "flow", label: "Trace", hint: "Trace an animated request route", key: "t", icon: Layers },
];

const CANVAS_ACCENT = "#6fe5ff";
const CANVAS_BACKGROUND = "#03050b";
const CANVAS_TEXT = "#eef4ff";

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function OrbitEditor() {
  const [history, setHistory] = useState(() =>
    createHistory<OrbitWorkspace>(createWorkspaceFromTemplate(workspaceTemplates[0])),
  );
  const workspace = history.present;
  const [selection, setSelection] = useState<DiagramSelection>({ type: "none" });
  const [mode, setMode] = useState<EditorMode>("edit");
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [trace, setTrace] = useState<TraceState>(NO_TRACE);
  // Derived, so the highlighted route follows edits; [] means "no path".
  const pathEdgeIds = useMemo(
    () =>
      trace.from && trace.to
        ? findPathEdges(workspace.edges, trace.from, trace.to, trace.directed) ?? []
        : null,
    [workspace.edges, trace],
  );
  const [toast, setToast] = useState<ToastState>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const toastTimerRef = useRef<number>(0);
  const hydratedRef = useRef(false);
  const saveFailedRef = useRef(false);

  const showToast = useCallback((message: string, action?: NonNullable<ToastState>["action"]) => {
    setToast({ id: Date.now(), message, action });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(
      () => setToast(null),
      action ? UNDO_TOAST_TIMEOUT : TOAST_TIMEOUT,
    );
  }, []);

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  /** Every workspace change goes through here so it can be undone. Same `key` within 1s = one step. */
  const apply = useCallback(
    (update: (current: OrbitWorkspace) => OrbitWorkspace, key: string | null = null) => {
      setHistory((current) => commit(current, update(current.present), key));
    },
    [],
  );

  /** Replace the whole workspace and offer an Undo that restores exactly what was there before. */
  const replaceWithUndo = useCallback(
    (next: OrbitWorkspace, message: string) => {
      const previous = workspace;
      apply(() => next);
      setSelection({ type: "none" });
      setConnectingFrom(null);
      setTrace(NO_TRACE);
      showToast(message, { label: "Undo", run: () => apply(() => previous) });
    },
    [workspace, apply, showToast],
  );

  const handleUndo = useCallback(() => {
    setHistory(undo);
    setSelection({ type: "none" });
    setConnectingFrom(null);
    setTrace(NO_TRACE);
  }, []);

  const handleRedo = useCallback(() => {
    setHistory(redo);
    setSelection({ type: "none" });
    setConnectingFrom(null);
    setTrace(NO_TRACE);
  }, []);

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

      const saved = loadSavedWorkspace();
      const hash = window.location.hash.startsWith("#diagram=")
        ? window.location.hash
        : null;
      const shared = hash ? decodeWorkspaceFromLink(hash) : null;

      if (saved) {
        setHistory(createHistory(saved));
      }

      if (shared) {
        // A shared link must not silently overwrite the visitor's own autosaved work.
        window.history.replaceState(null, "", window.location.pathname);
        if (saved) {
          setHistory((current) => commit(current, shared));
          showToast("Loaded shared diagram from link.", {
            label: "Back to my diagram",
            run: () => setHistory((current) => commit(current, saved)),
          });
        } else {
          setHistory(createHistory(shared));
          showToast("Loaded shared diagram from link.");
        }
        return;
      }

      if (saved) {
        showToast("Restored your saved workspace.");
      }
    };

    const hydrationTimer = window.setTimeout(hydrate, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(hydrationTimer);
    };
  }, [showToast]);

  // Debounced autosave.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = window.setTimeout(() => {
      const ok = saveWorkspace(workspace);
      if (!ok && !saveFailedRef.current) {
        showToast("Autosave failed — browser storage may be full or disabled. Export JSON to keep a copy.");
      }
      saveFailedRef.current = !ok;
    }, 900);
    return () => window.clearTimeout(timer);
  }, [workspace, showToast]);

  const handleMoveNode = useCallback(
    (id: string, x: number, y: number) => {
      apply((current) => moveNode(current, id, x, y), `move:${id}`);
    },
    [apply],
  );

  const handleNodeClick = useCallback(
    (id: string) => {
      setSelection({ type: "node", id });

      if (mode === "flow") {
        // First click picks the source, second the destination (which runs the trace), third starts over.
        setTrace((current) =>
          current.from && !current.to && current.from !== id
            ? { ...current, to: id }
            : { ...NO_TRACE, directed: current.directed, from: id },
        );
        return;
      }

      setTrace(NO_TRACE);

      if (mode === "connect") {
        if (!connectingFrom) {
          setConnectingFrom(id);
          showToast("Source selected — now click a component to connect.");
          return;
        }

        if (connectingFrom === id) {
          setConnectingFrom(null);
          return;
        }

        const result = addEdge(workspace, connectingFrom, id);
        if (!result.edge) {
          showToast("Those components are already connected.");
          setConnectingFrom(null);
          return;
        }
        apply(() => result.workspace);
        setSelection({ type: "edge", id: result.edge.id });
        setConnectingFrom(null);
        showToast(`Linked ${result.edge.label.toLowerCase()} connection.`);
        return;
      }

      if (connectingFrom) {
        setConnectingFrom(null);
      }
    },
    [mode, connectingFrom, workspace, apply, showToast],
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
      const result = addNode(workspace, kind);
      apply(() => result.workspace);
      setSelection({ type: "node", id: result.node.id });
      showToast(`Added ${componentKinds[kind].label} component.`);
    },
    [workspace, apply, showToast],
  );

  const handleDuplicate = useCallback(() => {
    if (selection.type !== "node") return;
    const result = duplicateNode(workspace, selection.id);
    if (!result.node) return;
    apply(() => result.workspace);
    setSelection({ type: "node", id: result.node.id });
    showToast(`Duplicated ${result.node.label}.`);
  }, [selection, workspace, apply, showToast]);

  const handleUpdateNode = useCallback(
    (id: string, changes: { label?: string; note?: string; kind?: ComponentKind }) => {
      apply((current) => updateNode(current, id, changes), `node:${id}:${Object.keys(changes).join()}`);
    },
    [apply],
  );

  const handleUpdateEdge = useCallback(
    (id: string, changes: EdgeChanges) => {
      apply((current) => updateEdge(current, id, changes), `edge:${id}:${Object.keys(changes).join()}`);
    },
    [apply],
  );

  const handleDeleteSelection = useCallback(() => {
    if (selection.type === "none") return;
    const previous = workspace;
    const { id } = selection;
    const isNode = selection.type === "node";
    apply((current) => (isNode ? removeNode(current, id) : removeEdge(current, id)));
    setSelection({ type: "none" });
    showToast(isNode ? "Component removed along with its connections." : "Connection removed.", {
      label: "Undo",
      run: () => apply(() => previous),
    });
  }, [selection, workspace, apply, showToast]);

  const handleUseTemplate = useCallback(
    (templateId: string) => {
      const template = workspaceTemplates.find((entry) => entry.id === templateId);
      if (!template) return;
      replaceWithUndo(createWorkspaceFromTemplate(template), `Loaded template: ${template.name}.`);
    },
    [replaceWithUndo],
  );

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = parseWorkspace(text);
        if (!parsed) {
          showToast("Import failed — that file is not a valid OrbitLab diagram.");
          return;
        }
        replaceWithUndo(parsed, `Imported “${parsed.name}”.`);
      } catch {
        showToast("Import failed — the file could not be read.");
      }
    },
    [replaceWithUndo, showToast],
  );

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(workspace);
    if (!url) {
      showToast("Sharing is unavailable in this context.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Share link copied to clipboard.");
    } catch {
      window.history.replaceState(null, "", url);
      showToast("Share link built in the address bar.");
    }
  }, [workspace, showToast]);

  const handleReset = useCallback(() => {
    const template = workspaceTemplates.find((entry) => entry.id === workspace.templateId);
    if (!template) return;
    replaceWithUndo(createWorkspaceFromTemplate(template), `Reset to ${template.name}.`);
  }, [workspace.templateId, replaceWithUndo]);

  const handleClear = useCallback(() => {
    replaceWithUndo(
      { ...createEmptyWorkspace(), name: `Untitled workspace ${createId("ws").slice(-4).toUpperCase()}` },
      "Started an empty workspace.",
    );
  }, [replaceWithUndo]);

  const handleAutoLayout = useCallback(() => {
    replaceWithUndo(autoLayout(workspace), "Arranged components left to right.");
  }, [workspace, replaceWithUndo]);

  const handleRename = useCallback(
    (name: string) => {
      apply((current) => ({ ...current, name }), "rename");
    },
    [apply],
  );

  const handleModeChange = useCallback((next: EditorMode) => {
    setMode(next);
    setConnectingFrom(null);
    setTrace(NO_TRACE);
  }, []);

  // Global editor shortcuts. Skipped while typing so text fields keep their native undo and Backspace.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shortcutsOpen || event.defaultPrevented || isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if (event.ctrlKey || event.metaKey) {
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) handleRedo();
          else handleUndo();
        } else if (key === "y") {
          event.preventDefault();
          handleRedo();
        } else if (key === "d") {
          event.preventDefault();
          handleDuplicate();
        }
        return;
      }
      if (event.altKey) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selection.type === "none") return;
        event.preventDefault();
        handleDeleteSelection();
      } else if (event.key === "Escape") {
        setSelection({ type: "none" });
        setConnectingFrom(null);
        setTrace(NO_TRACE);
      } else if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
      } else {
        const match = modes.find((entry) => entry.key === key);
        if (match) handleModeChange(match.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcutsOpen, selection, handleUndo, handleRedo, handleDuplicate, handleDeleteSelection, handleModeChange]);

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
        colorFor={colorFor}
        accent={CANVAS_ACCENT}
        background={CANVAS_BACKGROUND}
        text={CANVAS_TEXT}
        onUseTemplate={handleUseTemplate}
        onAddNode={handleAddNode}
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
                  onClick={() => handleModeChange(entry.id)}
                  aria-pressed={active}
                  aria-keyshortcuts={entry.key.toUpperCase()}
                  title={`${entry.hint} (${entry.key.toUpperCase()})`}
                >
                  <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
                  {entry.label}
                </button>
              );
            })}
          </div>

          <div className="workspace-toolbar__modes" role="group" aria-label="History">
            <button
              type="button"
              className="workspace-toolbar__mode"
              onClick={handleUndo}
              disabled={!history.past.length}
              aria-keyshortcuts="Control+Z Meta+Z"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={15} strokeWidth={1.7} aria-hidden="true" />
              Undo
            </button>
            <button
              type="button"
              className="workspace-toolbar__mode"
              onClick={handleRedo}
              disabled={!history.future.length}
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={15} strokeWidth={1.7} aria-hidden="true" />
              Redo
            </button>
            <button
              type="button"
              className="workspace-toolbar__mode"
              onClick={handleAutoLayout}
              disabled={workspace.nodes.length < 2}
              title="Arrange components left to right by their connections"
            >
              <Network size={15} strokeWidth={1.7} aria-hidden="true" />
              Auto-layout
            </button>
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
              connectingFrom={mode === "flow" && !trace.to ? trace.from : connectingFrom}
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
          {mode === "flow" ? (
            <FlowTrace workspace={workspace} trace={trace} pathEdgeIds={pathEdgeIds} onChange={setTrace} />
          ) : null}
        </div>

        <div className="workspace-panels">
          <Inspector
            workspace={workspace}
            selection={selection}
            onUpdateNode={handleUpdateNode}
            onUpdateEdge={handleUpdateEdge}
            onDeleteSelection={handleDeleteSelection}
            onClose={handleBackgroundClick}
          />
        </div>

        <footer className="workspace-meta">
          <p aria-live="polite">
            {workspace.nodes.length} component{workspace.nodes.length === 1 ? "" : "s"} ·{" "}
            {workspace.edges.length} connection{workspace.edges.length === 1 ? "" : "s"}
            {pathEdgeIds?.length ? ` · ${pathEdgeIds.length} hop path highlighted` : ""}
          </p>
          <p>
            <button
              type="button"
              className="link-button"
              onClick={() => setShortcutsOpen(true)}
              aria-keyshortcuts="?"
            >
              <Keyboard size={14} strokeWidth={1.7} aria-hidden="true" />
              Keyboard shortcuts
            </button>{" "}
            — press <kbd>?</kbd> anytime.
          </p>
        </footer>
      </div>

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
