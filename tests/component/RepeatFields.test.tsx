import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RepeatFields, type RepeatChange } from "../../src/ui/RepeatFields";
import type { RepeatChoice } from "../../src/domain/taskDraft";

interface HarnessProps {
  initial?: { repeat?: RepeatChoice; days?: number[]; until?: string };
  dueDate?: string;
  daysError?: string;
  untilError?: string;
  disabled?: boolean;
  onChange?: (change: RepeatChange) => void;
}

/** Keeps the fields' state like the form does, and reports every change. */
function Harness({ initial = {}, dueDate = "2026-10-15", daysError, untilError, disabled, onChange }: HarnessProps) {
  const [repeat, setRepeat] = useState<RepeatChoice>(initial.repeat ?? "none");
  const [days, setDays] = useState<number[]>(initial.days ?? []);
  const [until, setUntil] = useState(initial.until ?? "");
  return (
    <RepeatFields
      repeat={repeat}
      days={days}
      until={until}
      dueDate={dueDate}
      daysError={daysError}
      untilError={untilError}
      disabled={disabled}
      onChange={(change) => {
        onChange?.(change);
        if (change.repeat !== undefined) setRepeat(change.repeat);
        if (change.days !== undefined) setDays(change.days);
        if (change.until !== undefined) setUntil(change.until);
      }}
    />
  );
}

const select = () => screen.getByRole("combobox", { name: "Repeat" });

describe("RepeatFields", () => {
  it("has a Repeat select with the five choices", () => {
    render(<Harness />);
    const options = within(select()).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Does not repeat", "Daily", "Weekly", "Monthly", "On selected days"]);
    expect(select()).toHaveValue("none");
  });

  it("is a group of repeat settings", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Repeat settings" })).toBeInTheDocument();
  });

  it("reports the chosen repeat", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.selectOptions(select(), "weekly");
    expect(onChange).toHaveBeenCalledWith({ repeat: "weekly" });
  });

  it("shows nothing else while the task does not repeat", () => {
    render(<Harness />);
    expect(screen.queryByRole("group", { name: "Repeat on" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Repeat until (optional)")).not.toBeInTheDocument();
  });

  it("shows the end date field whenever a repeat is chosen, and reports changes to it", async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ repeat: "daily" }} onChange={onChange} />);
    const until = screen.getByLabelText("Repeat until (optional)");
    expect(until).toHaveAttribute("type", "date");
    await userEvent.type(until, "2026-12-31");
    expect(onChange).toHaveBeenLastCalledWith({ until: "2026-12-31" });
  });

  describe("On selected days", () => {
    it("shows seven day checkboxes named by weekday, in a group called Repeat on", () => {
      render(<Harness initial={{ repeat: "days" }} />);
      const group = screen.getByRole("group", { name: "Repeat on" });
      const names = within(group).getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"));
      expect(names).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
      expect(within(group).getByText("Mon")).toBeInTheDocument();
    });

    it("ticks and unticks days, keeping them sorted", async () => {
      const onChange = vi.fn();
      render(<Harness initial={{ repeat: "days" }} onChange={onChange} />);
      await userEvent.click(screen.getByRole("checkbox", { name: "Friday" }));
      expect(onChange).toHaveBeenLastCalledWith({ days: [4] });
      await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
      expect(onChange).toHaveBeenLastCalledWith({ days: [0, 4] });
      await userEvent.click(screen.getByRole("checkbox", { name: "Friday" }));
      expect(onChange).toHaveBeenLastCalledWith({ days: [0] });
    });

    it("shows the ticked days", () => {
      render(<Harness initial={{ repeat: "days", days: [0, 2] }} />);
      expect(screen.getByRole("checkbox", { name: "Monday" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Tuesday" })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Wednesday" })).toBeChecked();
    });

    it("can be operated with the keyboard", async () => {
      render(<Harness initial={{ repeat: "days" }} />);
      screen.getByRole("checkbox", { name: "Monday" }).focus();
      await userEvent.keyboard(" ");
      expect(screen.getByRole("checkbox", { name: "Monday" })).toBeChecked();
      await userEvent.tab();
      expect(screen.getByRole("checkbox", { name: "Tuesday" })).toHaveFocus();
    });

    it("is not shown for the other kinds of repeat", () => {
      render(<Harness initial={{ repeat: "weekly" }} />);
      expect(screen.queryByRole("group", { name: "Repeat on" })).not.toBeInTheDocument();
    });
  });

  describe("sentences", () => {
    it("explains a weekly repeat from the due date", () => {
      render(<Harness initial={{ repeat: "weekly" }} dueDate="2026-10-15" />);
      expect(screen.getByText("Repeats every week on Thursday.")).toBeInTheDocument();
    });

    it("explains a monthly repeat from the due date", () => {
      render(<Harness initial={{ repeat: "monthly" }} dueDate="2026-10-31" />);
      expect(
        screen.getByText("Repeats on the 31st of every month, or the last day of shorter months."),
      ).toBeInTheDocument();
    });

    it("has no sentence without a due date", () => {
      render(<Harness initial={{ repeat: "weekly" }} dueDate="" />);
      expect(screen.queryByText(/Repeats every week/)).not.toBeInTheDocument();
    });

    it("follows the due date when it changes", () => {
      const { rerender } = render(
        <RepeatFields repeat="weekly" days={[]} until="" dueDate="2026-10-15" onChange={() => {}} />,
      );
      expect(screen.getByText("Repeats every week on Thursday.")).toBeInTheDocument();
      rerender(<RepeatFields repeat="weekly" days={[]} until="" dueDate="2026-10-16" onChange={() => {}} />);
      expect(screen.getByText("Repeats every week on Friday.")).toBeInTheDocument();
    });
  });

  describe("messages", () => {
    it("shows the days message beside the days and links it to the group", () => {
      render(<Harness initial={{ repeat: "days" }} daysError="Choose at least one day." />);
      const message = screen.getByText("Choose at least one day.");
      expect(screen.getByRole("group", { name: "Repeat on" })).toHaveAttribute("aria-describedby", message.id);
    });

    it("shows the end date message beside the field and links it to the field", () => {
      render(<Harness initial={{ repeat: "daily" }} untilError="End date cannot be earlier than the due date." />);
      const message = screen.getByText("End date cannot be earlier than the due date.");
      const field = screen.getByLabelText("Repeat until (optional)");
      expect(field).toHaveAttribute("aria-describedby", message.id);
      expect(field).toHaveAttribute("aria-invalid", "true");
    });

    it("shows no message when there is no error", () => {
      render(<Harness initial={{ repeat: "daily" }} />);
      expect(screen.getByLabelText("Repeat until (optional)")).not.toHaveAttribute("aria-describedby");
    });
  });

  describe("when disabled", () => {
    it("disables every control and says how to change the repeat", () => {
      render(<Harness initial={{ repeat: "days", days: [1] }} disabled />);
      expect(select()).toBeDisabled();
      expect(screen.getByLabelText("Repeat until (optional)")).toBeDisabled();
      for (const box of screen.getAllByRole("checkbox")) expect(box).toBeDisabled();
      expect(screen.getByText("Choose Entire series to change how this task repeats.")).toBeInTheDocument();
    });

    it("shows no note when enabled", () => {
      render(<Harness />);
      expect(screen.queryByText(/Choose Entire series/)).not.toBeInTheDocument();
    });
  });

  it("is reached in order by keyboard: the repeat select, then the end date", async () => {
    render(<Harness initial={{ repeat: "daily" }} />);
    await userEvent.tab();
    expect(select()).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText("Repeat until (optional)")).toHaveFocus();
  });

  it("puts the day checkboxes between the select and the end date in the Tab order", async () => {
    render(<Harness initial={{ repeat: "days" }} />);
    await userEvent.tab();
    expect(select()).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("checkbox", { name: "Monday" })).toHaveFocus();
    for (let i = 0; i < 7; i++) await userEvent.tab();
    expect(screen.getByLabelText("Repeat until (optional)")).toHaveFocus();
  });
});
