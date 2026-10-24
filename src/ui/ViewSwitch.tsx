export type AppView = "list" | "calendar";

interface ViewSwitchProps {
  value: AppView;
  onChange: (view: AppView) => void;
}

const OPTIONS: { value: AppView; label: string }[] = [
  { value: "list", label: "List" },
  { value: "calendar", label: "Calendar" },
];

/** Switch between the task list and the calendar. */
export function ViewSwitch({ value, onChange }: ViewSwitchProps) {
  return (
    <div role="group" aria-label="View" className="view-switch">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
