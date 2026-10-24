import { isOverdue } from "../domain/overdue";
import { describeRecurrence } from "../domain/recurrence";
import { describeProgress, progress } from "../domain/subtasks";
import type { Task } from "../domain/task";
import { RepeatIcon } from "./RepeatIcon";

interface TaskItemProps {
  task: Task;
  today: string;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onSubtasks: (task: Task) => void;
}

export function TaskItem({ task, today, onEdit, onComplete, onDelete, onSubtasks }: TaskItemProps) {
  const completed = task.status === "completed";
  const overdue = isOverdue(task, today);
  const steps = progress(task);

  return (
    <li className={`task-item${completed ? " is-completed" : ""}`}>
      <div className="task-main">
        <h3 className="task-title">{task.title}</h3>
        {task.description && <p className="task-description">{task.description}</p>}
        <div className="task-meta">
          <span className={`badge priority priority-${task.priority}`}>Priority: {task.priority}</span>
          <span className="badge">Status: {task.status}</span>
          {task.dueDate && <span className="badge due">Due {task.dueDate}</span>}
          {overdue && <span className="badge overdue">Overdue</span>}
          {task.recurrence && (
            <span className="badge repeat">
              <RepeatIcon />
              {describeRecurrence(task.recurrence)}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="badge">
              {tag}
            </span>
          ))}
        </div>
        {steps.total > 0 && (
          <div className="task-progress">
            <span>{describeProgress(steps)}</span>
            <span className="progress-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((steps.done / steps.total) * 100)}%` }} />
            </span>
          </div>
        )}
      </div>
      <div className="task-actions">
        {!completed && (
          <button
            type="button"
            aria-label={`Complete ${task.title}`}
            onClick={() => onComplete(task)}
          >
            Complete
          </button>
        )}
        <button type="button" aria-label={`Subtasks for ${task.title}`} onClick={() => onSubtasks(task)}>
          Subtasks
        </button>
        <button type="button" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)}>
          Edit
        </button>
        <button
          type="button"
          className="danger-outline"
          aria-label={`Delete ${task.title}`}
          onClick={() => onDelete(task)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
