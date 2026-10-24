/**
 * Tracks open modals so that only the topmost one is interactive. Everything else, the page
 * (`#root`) and any lower modal, gets the `inert` attribute: it blocks pointer input, leaves the
 * Tab order, and is hidden from assistive technology.
 */
const stack: HTMLElement[] = [];

function setInert(element: HTMLElement, inert: boolean): void {
  if (inert) element.setAttribute("inert", "");
  else element.removeAttribute("inert");
}

function apply(): void {
  const top = stack[stack.length - 1];
  const root = document.getElementById("root");
  if (root) setInert(root, stack.length > 0);
  for (const modal of stack) setInert(modal, modal !== top);
}

/** Register an open modal. Returns a function that closes it again (safe to call twice). */
export function openModal(container: HTMLElement): () => void {
  stack.push(container);
  apply();
  let open = true;
  return () => {
    if (!open) return;
    open = false;
    const index = stack.indexOf(container);
    if (index >= 0) stack.splice(index, 1);
    setInert(container, false);
    apply();
  };
}
