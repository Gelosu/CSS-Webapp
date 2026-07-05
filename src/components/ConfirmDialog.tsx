import { Modal } from "./Modal";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-alt transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
