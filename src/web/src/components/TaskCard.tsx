import type { DragEvent, KeyboardEvent } from 'react';
import type { Task, TaskView } from '../types';
import { dueDateStatus, formatDueDate } from '../dueDate';

interface TaskCardProps {
  task: Task;
  view: TaskView;
  onToggleCompleted: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRestore: (task: Task) => void;
  onPermanentDelete: (task: Task) => void;
  onMove: (task: Task, direction: -1 | 1) => void;
  dragProps?: {
    draggable: boolean;
    isDragging: boolean;
    onDragStart: (e: DragEvent<HTMLLIElement>) => void;
    onDragOver: (e: DragEvent<HTMLLIElement>) => void;
    onDrop: (e: DragEvent<HTMLLIElement>) => void;
    onDragEnd: () => void;
  };
}

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: 'Düşük öncelik',
  medium: 'Orta öncelik',
  high: 'Yüksek öncelik',
};

// docs/specs/003-gorev-listesi.md §1 — Görev Kartı Anatomisi
export default function TaskCard({
  task,
  view,
  onToggleCompleted,
  onDelete,
  onRestore,
  onPermanentDelete,
  onMove,
  dragProps,
}: TaskCardProps) {
  const status = task.dueDate ? dueDateStatus(task.dueDate, task.completed) : null;
  const subtaskTotal = task.subtasks.length;
  const subtaskDone = task.subtasks.filter((s) => s.completed).length;

  function handleKeyDown(e: KeyboardEvent<HTMLLIElement>) {
    if (!dragProps || view !== 'active') return;
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      onMove(task, -1);
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      onMove(task, 1);
    }
  }

  return (
    <li
      className={`task-card${task.completed ? ' completed' : ''}`}
      data-priority={task.priority}
      data-view={view}
      data-dragging={dragProps?.isDragging ?? false}
      draggable={dragProps?.draggable ?? false}
      onDragStart={dragProps?.onDragStart}
      onDragOver={dragProps?.onDragOver}
      onDrop={dragProps?.onDrop}
      onDragEnd={dragProps?.onDragEnd}
      onKeyDown={handleKeyDown}
      tabIndex={view === 'active' ? 0 : undefined}
      aria-label={dragProps ? `${task.title}, ${PRIORITY_LABEL[task.priority]}` : undefined}
    >
      {view !== 'trash' && (
        <span className="task-checkbox">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggleCompleted(task)}
            aria-label={task.completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
          />
        </span>
      )}

      <span className="task-main">
        <span className="task-title-row">
          <span className="task-title" title={task.title}>
            {task.title}
          </span>
        </span>
        {task.description && (
          <p className="task-description" title={task.description}>
            {task.description}
          </p>
        )}
        {task.tags.length > 0 && (
          <p className="task-tags">
            {task.tags.map((tag) => (
              <span key={tag.id}>#{tag.name}</span>
            ))}
          </p>
        )}
      </span>

      <span className="task-meta">
        {task.dueDate && status && (
          <span className="due-badge" data-status={status}>
            {formatDueDate(task.dueDate)}
          </span>
        )}
        {subtaskTotal > 0 && (
          <span className="subtask-count">
            {subtaskDone}/{subtaskTotal}
          </span>
        )}
      </span>

      {view === 'active' && (
        <button type="button" className="drag-handle" aria-label="Yeniden sırala (Alt+Yukarı/Aşağı)">
          ⋮⋮
        </button>
      )}

      {view === 'trash' ? (
        <span className="trash-actions">
          <button type="button" onClick={() => onRestore(task)} aria-label="Geri yükle">
            ↺
          </button>
          <button
            type="button"
            className="permanent-delete"
            onClick={() => onPermanentDelete(task)}
            aria-label="Kalıcı sil"
          >
            🗑
          </button>
        </span>
      ) : (
        <span className="trash-actions">
          <button type="button" onClick={() => onDelete(task)} aria-label="Sil">
            🗑
          </button>
        </span>
      )}
    </li>
  );
}
