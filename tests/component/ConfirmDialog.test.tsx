import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "../../src/ui/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("shows the message and calls onConfirm", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Delete task"
        message="Delete it?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Delete task" })).toBeInTheDocument();
    expect(screen.getByText("Delete it?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels with the Cancel button and with Escape", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="t"
        message="m"
        confirmLabel="Yes"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("moves focus into the dialog and keeps Tab inside it", async () => {
    render(
      <ConfirmDialog
        title="t"
        message="m"
        confirmLabel="Yes"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Yes" });
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(confirm).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
  });

  it("lets the cancel button be renamed and defaults to Cancel", () => {
    const { unmount } = render(
      <ConfirmDialog title="t" message="m" confirmLabel="Yes" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    unmount();

    render(
      <ConfirmDialog
        title="Discard changes?"
        message="m"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("renders in a portal and makes the page underneath inert while open", () => {
    const page = document.createElement("div");
    page.id = "root";
    document.body.appendChild(page);
    const { unmount } = render(
      <ConfirmDialog title="t" message="m" confirmLabel="Yes" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole("dialog").closest("#root")).toBeNull();
    expect(page).toHaveAttribute("inert");
    unmount();
    expect(page).not.toHaveAttribute("inert");
    page.remove();
  });

  it("has no Close button", () => {
    render(
      <ConfirmDialog title="t" message="m" confirmLabel="Yes" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});


describe("ConfirmDialog confirm style", () => {
  const props = { title: "T", message: "M", confirmLabel: "Go", onConfirm: () => {}, onCancel: () => {} };

  it("uses the danger style by default and the primary style on request", () => {
    const { unmount } = render(<ConfirmDialog {...props} />);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("danger");
    unmount();
    render(<ConfirmDialog {...props} confirmVariant="primary" />);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Go" })).not.toHaveClass("danger");
  });
});
