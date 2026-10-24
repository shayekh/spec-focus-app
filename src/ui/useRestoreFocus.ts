import { useEffect } from "react";

/** Remember the focused element on mount and return focus to it on unmount. */
export function useRestoreFocus(): void {
  useEffect(() => {
    const opener = document.activeElement;
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
}
