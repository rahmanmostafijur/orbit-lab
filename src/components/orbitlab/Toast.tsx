"use client";

export type ToastState = {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
} | null;

type ToastProps = {
  toast: ToastState;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  // The live region stays mounted so screen readers announce each new message.
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast ? (
        <div key={toast.id} className="toast">
          <span>{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action?.run();
                onDismiss();
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
