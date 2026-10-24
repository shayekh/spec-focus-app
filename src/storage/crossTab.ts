import { TASKS_KEY } from "./taskStore";

/**
 * Call `onChange` when another tab changes the stored tasks. The browser only fires
 * `storage` events in tabs other than the one that wrote, so this never echoes our own saves.
 * Returns an unsubscribe function.
 */
export function subscribeToTaskChanges(onChange: () => void): () => void {
  function handle(event: StorageEvent) {
    // A null key means storage was cleared.
    if (event.key === null || event.key === TASKS_KEY) onChange();
  }
  window.addEventListener("storage", handle);
  return () => window.removeEventListener("storage", handle);
}
