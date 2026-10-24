import { useRef } from "react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Text of the button that backs out. Defaults to "Cancel". */
  cancelLabel?: string;
  /** "danger" (default) for destructive actions, "primary" for ordinary ones. */
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus starts on the safe choice, so a stray Enter never confirms.
  return (
    <Modal title={title} onRequestClose={onCancel} initialFocusRef={cancelRef}>
      <p>{message}</p>
      <div className="dialog-actions">
        <button ref={cancelRef} type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={confirmVariant} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
