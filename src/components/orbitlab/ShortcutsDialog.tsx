"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const SHORTCUTS: [keys: string, action: string][] = [
  ["Delete / Backspace", "Remove the selected component or connection"],
  ["Arrow keys", "Nudge the focused component 8 px"],
  ["Shift + arrows", "Nudge 32 px"],
  ["Alt + arrows", "Nudge 1 px"],
  ["Ctrl / ⌘ + Z", "Undo"],
  ["Ctrl / ⌘ + Shift + Z, Ctrl + Y", "Redo"],
  ["Shift + click / Shift + drag", "Add to the selection, or select with a box"],
  ["Ctrl / ⌘ + D", "Duplicate the selection"],
  ["Ctrl / ⌘ + C, Ctrl / ⌘ + V", "Copy and paste components (with their links)"],
  ["Drag empty canvas, Space + drag", "Pan the canvas"],
  ["Ctrl / ⌘ + wheel, pinch", "Zoom at the cursor"],
  ["Escape", "Deselect, or cancel a pending connection"],
  ["V / C / T", "Edit, Connect, or Trace mode"],
  ["?", "Show this list"],
];

type ShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Native <dialog> gives focus trapping, Escape to close, and focus return.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="shortcuts-dialog"
      aria-labelledby="shortcuts-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="shortcuts-dialog__inner">
        <div className="panel__heading">
          <h2 id="shortcuts-title" className="micro-label">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            <X size={14} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
        <dl className="shortcuts-list">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}
