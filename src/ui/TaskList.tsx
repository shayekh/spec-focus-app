import type { Task } from "../domain/task";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  /** True when any task exists at all, before filters are applied. */
  hasTasks: boolean;
  today: string;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onClearFilters: () => void;
  /** Opens the new task form from the empty state. */
  onCreate: () => void;
}

export function TaskList({
  tasks,
  hasTasks,
  today,
  onEdit,
  onComplete,
  onDelete,
  onClearFilters,
  onCreate,
}: TaskListProps) {
  if (!hasTasks) {
    return (
      <div className="empty-state">
        <p>No tasks yet. Add your first one to get started.</p>
        <button type="button" className="primary" onClick={onCreate}>
          Add your first task
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>No tasks match your filters.</p>
        <button type="button" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          today={today}
          onEdit={onEdit}
          onComplete={onComplete}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
