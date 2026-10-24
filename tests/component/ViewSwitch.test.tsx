import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewSwitch } from "../../src/ui/ViewSwitch";

describe("ViewSwitch", () => {
  it("is a group named View with List and Calendar buttons", () => {
    render(<ViewSwitch value="list" onChange={() => {}} />);
    const group = screen.getByRole("group", { name: "View" });
    expect(group).toContainElement(screen.getByRole("button", { name: "List" }));
    expect(group).toContainElement(screen.getByRole("button", { name: "Calendar" }));
  });

  it("marks the current view as pressed", () => {
    const { rerender } = render(<ViewSwitch value="list" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute("aria-pressed", "false");

    rerender(<ViewSwitch value="calendar" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the chosen view", async () => {
    const onChange = vi.fn();
    render(<ViewSwitch value="list" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(onChange).toHaveBeenCalledWith("calendar");
  });

  it("works with the keyboard", async () => {
    const onChange = vi.fn();
    render(<ViewSwitch value="list" onChange={onChange} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "List" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("calendar");
  });
});
