"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { DiagramSelection, OrbitWorkspace } from "@/lib/orbitlab/types";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { supportsWebGL } from "@/lib/webgl";

const DiagramUniverseCanvas = dynamic(
  () => import("@/components/orbitlab/DiagramUniverseCanvas"),
  { ssr: false },
);

function subscribeToClient() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

type DiagramUniverseProps = {
  workspace: OrbitWorkspace;
  selection: DiagramSelection;
  pathEdgeIds: string[] | null;
  onSelectNode: (id: string) => void;
};

export function DiagramUniverse({
  workspace,
  selection,
  pathEdgeIds,
  onSelectNode,
}: DiagramUniverseProps) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const reducedMotion = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);

  const supported = useMemo(() => isClient && supportsWebGL(), [isClient]);
  const quality: "high" | "low" = useMemo(
    () =>
      isClient && typeof window !== "undefined" && window.innerWidth < 768
        ? "low"
        : "high",
    [isClient],
  );

  if (!isClient) {
    return (
      <div className="universe-view universe-view--loading" role="status">
        <p>Preparing 3D universe…</p>
      </div>
    );
  }

  if (!supported || failed) {
    return (
      <div className="universe-view universe-view--fallback">
        <p className="universe-view__title">3D view unavailable</p>
        <p className="universe-view__hint">
          WebGL is disabled on this device (or reduced motion is blocking the
          scene). The 2D canvas keeps full editing support.
        </p>
        <p className="universe-view__hint">
          Switch back to the 2D canvas to keep designing.
        </p>
        <Link className="button button--ghost" href="/playground" onClick={() => setFailed(false)}>
          Back to 2D canvas
        </Link>
      </div>
    );
  }

  return (
    <div className="universe-view">
      <DiagramUniverseCanvas
        workspace={workspace}
        selection={selection}
        pathEdgeIds={pathEdgeIds}
        reducedMotion={reducedMotion}
        quality={quality}
        onSelectNode={onSelectNode}
      />
    </div>
  );
}
