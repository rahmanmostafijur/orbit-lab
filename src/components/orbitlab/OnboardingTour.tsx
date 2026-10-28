"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TOUR_KEY = "orbitlab.tour.v1";
const EDGE_GAP = 16;
const TARGET_GAP = 12;
const START_DELAY_MS = 600;

// Each target is an element with a matching data-tour attribute.
const STEPS = [
  {
    target: "palette",
    title: "Add components",
    body: "Click any component in the palette to drop it on the canvas, then drag it into place.",
  },
  {
    target: "connect",
    title: "Connect them",
    body: "Switch to Connect (C), click one component, then another, to draw a connection.",
  },
  {
    target: "flow",
    title: "Trace a request",
    body: "In Trace mode (T), click a source and then a destination to animate the route between them.",
  },
  {
    target: "export",
    title: "Save and share",
    body: "Work autosaves in this browser. Export JSON, SVG or PNG, or copy a share link, from here.",
  },
];

function isTourDone() {
  try {
    return window.localStorage.getItem(TOUR_KEY) === "done";
  } catch {
    return true; // Storage blocked: don't nag on every visit.
  }
}

function markTourDone() {
  try {
    window.localStorage.setItem(TOUR_KEY, "done");
  } catch {
    // Storage blocked: the tour simply shows again next visit.
  }
}

/** Places the card under its target (or above when there is no room), else bottom-center. */
function placeCard(card: HTMLElement, target: Element | null) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const rect = target?.getBoundingClientRect();
  const onScreen =
    rect && rect.width > 0 && rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width;
  let left = (width - card.offsetWidth) / 2;
  let top = height - card.offsetHeight - EDGE_GAP;
  if (rect && onScreen) {
    left = Math.min(Math.max(rect.left, EDGE_GAP), width - card.offsetWidth - EDGE_GAP);
    const below = rect.bottom + TARGET_GAP;
    top = below + card.offsetHeight <= height - EDGE_GAP ? below : Math.max(EDGE_GAP, rect.top - TARGET_GAP - card.offsetHeight);
  }
  card.style.left = `${Math.max(EDGE_GAP, left)}px`;
  card.style.top = `${top}px`;
}

/** First-run tour: four dismissible tips, shown once per browser. */
export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Deferred so the first paint (and any autosave hydrate) settles before the tour appears.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isTourDone()) setStep(0);
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (step === null || !card) return;
    const target = document.querySelector(`[data-tour="${STEPS[step].target}"]`);
    target?.classList.add("tour-target");
    target?.scrollIntoView({ block: "nearest" });
    const place = () => placeCard(card, target);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      target?.classList.remove("tour-target");
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [step]);

  if (step === null) return null;

  const finish = () => {
    markTourDone();
    setStep(null);
  };
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      ref={cardRef}
      className="tour-card"
      role="dialog"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          finish();
        }
      }}
    >
      <p className="tour-card__step micro-label">
        Tip {step + 1} of {STEPS.length}
      </p>
      <h2 id="tour-title" className="tour-card__title">
        {current.title}
      </h2>
      <p id="tour-body" className="tour-card__body">
        {current.body}
      </p>
      <div className="tour-card__actions">
        <button type="button" className="link-button" onClick={finish}>
          Skip tour
        </button>
        <button
          type="button"
          className="button button--primary button--sm"
          onClick={() => (isLast ? finish() : setStep(step + 1))}
        >
          {isLast ? "Got it" : "Next"}
        </button>
      </div>
    </div>
  );
}
