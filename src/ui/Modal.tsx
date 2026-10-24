import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { openModal } from "./modalStack";

interface ModalProps {
  title: string;
  /** Called for Escape and the Close button. The parent decides whether to actually close. */
  onRequestClose: () => void;
  showClose?: boolean;
  /** Element to focus on open. Defaults to the first focusable control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/**
 * Return focus to the control that opened the modal. This runs in a microtask so that, when two
 * modals close in the same update, every modal has left the stack (and nothing is `inert`) before
 * focus moves. If the opener is gone, focus goes to the page's primary action unless something
 * else already has focus.
 */
function restoreFocus(opener: Element | null): void {
  queueMicrotask(() => {
    if (
      opener instanceof HTMLElement &&
      opener !== document.body &&
      opener.isConnected &&
      !opener.closest("[inert]")
    ) {
      opener.focus();
      return;
    }
    const active = document.activeElement;
    if (active && active !== document.body) return;
    document.querySelector<HTMLElement>("[data-modal-fallback]")?.focus();
  });
}

/**
 * Shared dialog shell for the task form and the confirmation dialog: portal, heading, optional
 * Close button, focus trap, Escape, isolation of everything underneath, and focus return.
 */
export function Modal({ title, onRequestClose, showClose = false, initialFocusRef, children }: ModalProps) {
  const [container] = useState(() => document.createElement("div"));
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null | undefined>(undefined);
  const headingId = useId();

  useLayoutEffect(() => {
    // Capture the opener before isolating the page: making it inert blurs the focused element.
    // Remember it once per dialog: React's development double-run of effects would otherwise
    // capture the already-blurred page the second time.
    if (openerRef.current === undefined) openerRef.current = document.activeElement;
    document.body.appendChild(container);
    const close = openModal(container);
    return () => {
      close();
      container.remove();
      restoreFocus(openerRef.current ?? null);
    };
  }, [container]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const target = initialFocusRef?.current ?? (dialog ? focusableIn(dialog)[0] : undefined);
    target?.focus();
    // Only on open.
  }, []);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onRequestClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = focusableIn(dialogRef.current);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Clicking the dimmed area must neither close the dialog nor move focus out of it.
  function handleBackdropMouseDown(event: MouseEvent) {
    if (event.target === event.currentTarget) event.preventDefault();
  }

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={handleBackdropMouseDown}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={handleKeyDown}
      >
        <h2 id={headingId}>{title}</h2>
        {children}
        {showClose && (
          <button type="button" className="dialog-close" aria-label="Close" onClick={onRequestClose}>
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>
    </div>,
    container,
  );
}
