import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../../src/ui/Modal";

interface HarnessProps {
  onRequestClose?: () => void;
  showClose?: boolean;
  withInitialFocus?: boolean;
  removeOpenerOnClose?: boolean;
}

/** Mimics the app: a #root with an opener button and a fallback button, and a modal portal. */
function Harness({
  onRequestClose = () => {},
  showClose = false,
  withInitialFocus = false,
  removeOpenerOnClose = false,
}: HarnessProps) {
  const [open, setOpen] = useState(false);
  const [openerShown, setOpenerShown] = useState(true);
  const second = useRef<HTMLInputElement>(null);
  return (
    <div id="root">
      <button data-modal-fallback>New task</button>
      {openerShown && (
        <button
          onClick={() => setOpen(true)}
        >
          Opener
        </button>
      )}
      {open && (
        <Modal
          title="Sample dialog"
          onRequestClose={() => {
            onRequestClose();
            if (removeOpenerOnClose) setOpenerShown(false);
            setOpen(false);
          }}
          showClose={showClose}
          initialFocusRef={withInitialFocus ? second : undefined}
        >
          <input aria-label="first" />
          <input aria-label="second" ref={second} />
          <button>Last</button>
        </Modal>
      )}
    </div>
  );
}

function renderHarness(props: HarnessProps = {}) {
  const view = render(<Harness {...props} />, { container: document.body.appendChild(document.createElement("div")) });
  return view;
}

async function openIt() {
  await userEvent.click(screen.getByRole("button", { name: "Opener" }));
}

describe("Modal", () => {
  it("renders a labelled modal dialog in a portal outside #root", async () => {
    renderHarness();
    await openIt();
    const dialog = screen.getByRole("dialog", { name: "Sample dialog" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.closest("#root")).toBeNull();
    expect(dialog.parentElement?.parentElement?.parentElement).toBe(document.body);
  });

  it("moves focus to the first focusable control, or to initialFocusRef when given", async () => {
    const first = renderHarness();
    await openIt();
    expect(screen.getByLabelText("first")).toHaveFocus();
    first.unmount();

    renderHarness({ withInitialFocus: true });
    await openIt();
    expect(screen.getByLabelText("second")).toHaveFocus();
  });

  it("wraps Tab from the last control to the first, and Shift+Tab the other way", async () => {
    renderHarness();
    await openIt();
    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    await userEvent.tab();
    expect(screen.getByLabelText("first")).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it("calls onRequestClose on Escape, once", async () => {
    const onRequestClose = vi.fn();
    renderHarness({ onRequestClose });
    await openIt();
    await userEvent.keyboard("{Escape}");
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when the dimmed backdrop is clicked", async () => {
    const onRequestClose = vi.fn();
    renderHarness({ onRequestClose });
    await openIt();
    const backdrop = screen.getByRole("dialog").parentElement;
    if (!backdrop) throw new Error("backdrop not found");
    await userEvent.click(backdrop);
    expect(onRequestClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps focus inside the dialog after a backdrop click", async () => {
    renderHarness();
    await openIt();
    const backdrop = screen.getByRole("dialog").parentElement;
    if (!backdrop) throw new Error("backdrop not found");
    await userEvent.click(backdrop);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("shows a Close button only when asked, and it requests closing", async () => {
    const onRequestClose = vi.fn();
    const first = renderHarness({ onRequestClose });
    await openIt();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    first.unmount();

    renderHarness({ onRequestClose, showClose: true });
    await openIt();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("makes #root inert while open and interactive again after closing", async () => {
    renderHarness({ showClose: true });
    const root = document.getElementById("root");
    expect(root).not.toHaveAttribute("inert");
    await openIt();
    expect(root).toHaveAttribute("inert");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(root).not.toHaveAttribute("inert");
  });

  it("returns focus to the opener when it closes", async () => {
    renderHarness({ showClose: true });
    await openIt();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Opener" })).toHaveFocus();
  });

  it("returns focus to the New task button when the opener no longer exists", async () => {
    renderHarness({ showClose: true, removeOpenerOnClose: true });
    await openIt();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "New task" })).toHaveFocus();
  });

  it("stacks: the lower dialog becomes inert while a second is open", async () => {
    function Stacked() {
      const [second, setSecond] = useState(false);
      return (
        <div id="root">
          <Modal title="Lower" onRequestClose={() => {}}>
            <button onClick={() => setSecond(true)}>Open upper</button>
          </Modal>
          {second && (
            <Modal title="Upper" onRequestClose={() => setSecond(false)}>
              <button>Inside upper</button>
            </Modal>
          )}
        </div>
      );
    }
    render(<Stacked />);
    const lower = screen.getByRole("dialog", { name: "Lower" }).parentElement?.parentElement;
    await userEvent.click(screen.getByRole("button", { name: "Open upper" }));
    expect(lower).toHaveAttribute("inert");
    await userEvent.keyboard("{Escape}");
    expect(lower).not.toHaveAttribute("inert");
    expect(screen.queryByRole("dialog", { name: "Upper" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Lower" })).toBeInTheDocument();
  });
});
