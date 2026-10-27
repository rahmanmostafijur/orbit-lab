"use client";

import {
  Component,
  type ReactNode,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { supportsWebGL } from "@/lib/webgl";

const UniverseCanvas = dynamic(
  () => import("@/components/three/UniverseCanvas"),
  {
    ssr: false,
  },
);

type SceneBoundaryProps = {
  children: ReactNode;
  onError: () => void;
};

type SceneBoundaryState = {
  failed: boolean;
};

class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function subscribeToClient() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function Universe() {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const reducedMotion = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const supported = useMemo(
    () => isClient && supportsWebGL(),
    [isClient],
  );

  const quality = useMemo<"high" | "low">(() => {
    if (!isClient) return "high";

    const lowPowerDevice =
      window.innerWidth < 900 ||
      (typeof navigator.hardwareConcurrency === "number" &&
        navigator.hardwareConcurrency <= 4);

    return lowPowerDevice ? "low" : "high";
  }, [isClient]);

  const enabled = isClient && supported && !reducedMotion && !failed;

  return (
    <div
      className={`universe${enabled && ready ? " is-ready" : ""}`}
      aria-hidden="true"
    >
      <div className="universe__nebula" />
      <div className="universe__stars" />
      <div className="universe__static">
        <div className="universe__static-orb">
          <span className="universe__static-ring universe__static-ring--one" />
          <span className="universe__static-ring universe__static-ring--two" />
          <span className="universe__static-ring universe__static-ring--three" />
          <span className="universe__static-satellite" />
          <span className="universe__static-body" />
        </div>
      </div>
      <div className="universe__grid" />
      <div className="universe__vignette" />
      <div className="universe__grain" />

      {enabled ? (
        <SceneBoundary
          onError={() => {
            setFailed(true);
            setReady(false);
          }}
        >
          <UniverseCanvas quality={quality} onReady={() => setReady(true)} />
        </SceneBoundary>
      ) : null}
    </div>
  );
}
