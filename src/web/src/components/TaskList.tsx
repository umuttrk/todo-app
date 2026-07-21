import { useState } from 'react';
import type { DragEvent } from 'react';
import type { Task, TaskView } from '../types';
import TaskCard from './TaskCard';
import EmptyState from './EmptyState';
import { computeKeyboardMove, computeNewOrder } from '../reorder';

interface TaskListProps {
  view: TaskView;
  tasks: Task[];
  hasActiveFilter: boolean;
  onToggleCompleted: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRestore: (task: Task) => void;
  onPermanentDelete: (task: Task) => void;
  onReorder: (taskId: string, newOrder: number) => void;
}

const EMPTY_COPY: Record<TaskView, { title: string; message: string }> = {
  active: { title: 'Henüz görev yok', message: 'Yeni bir görev ekleyerek başla.' },
  completed: {
    title: 'Tamamlanan görev yok',
    message: 'Bir görevi tamamlandı işaretlediğinde burada görünür.',
  },
  trash: {
    title: 'Çöp kutusu boş',
    message: 'Sildiğin görevler geri yükleyebilmen için burada bekler.',
  },
};

// docs/specs/003-gorev-listesi.md — Görev Listesi ve sürükle-bırak sıralama
export default function TaskList({
  view,
  tasks,
  hasActiveFilter,
  onToggleCompleted,
  onDelete,
  onRestore,
  onPermanentDelete,
  onReorder,
}: TaskListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  if (tasks.length === 0) {
    const copy = hasActiveFilter
      ? { title: 'Eşleşen görev bulunamadı', message: 'Farklı bir arama terimi veya etiket dene.' }
      : EMPTY_COPY[view];
    return <EmptyState title={copy.title} message={copy.message} />;
  }

  function applyReorder(taskId: string, targetId: string | null) {
    const newOrder = computeNewOrder(tasks, taskId, targetId);
    onReorder(taskId, newOrder);
    const task = tasks.find((t) => t.id === taskId);
    const newIndex = tasks.filter((t) => t.id !== taskId).findIndex((t) => t.id === targetId);
    const position = targetId === null ? tasks.length : newIndex + 1;
    if (task) setAnnouncement(`${task.title}, pozisyon ${position}/${tasks.length}`);
  }

  function handleMove(task: Task, direction: -1 | 1) {
    const newOrder = computeKeyboardMove(tasks, task.id, direction);
    if (newOrder === null) return;
    onReorder(task.id, newOrder);
    const currentIndex = tasks.findIndex((t) => t.id === task.id);
    const newPosition = currentIndex + 1 + direction;
    setAnnouncement(`${task.title}, pozisyon ${newPosition}/${tasks.length}`);
  }

  function handleDragOver(e: DragEvent<HTMLLIElement>) {
    if (view !== 'active') return;
    e.preventDefault();
  }

  return (
    <>
      <ul className="task-list">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            view={view}
            onToggleCompleted={onToggleCompleted}
            onDelete={onDelete}
            onRestore={onRestore}
            onPermanentDelete={onPermanentDelete}
            onMove={handleMove}
            dragProps={
              view === 'active'
                ? {
                    draggable: true,
                    isDragging: draggedId === task.id,
                    onDragStart: () => setDraggedId(task.id),
                    onDragOver: handleDragOver,
                    onDrop: (e) => {
                      e.preventDefault();
                      if (draggedId && draggedId !== task.id) {
                        applyReorder(draggedId, task.id);
                      }
                      setDraggedId(null);
                    },
                    onDragEnd: () => setDraggedId(null),
                  }
                : undefined
            }
          />
        ))}
        {view === 'active' && draggedId && (
          <li
            className="drop-zone-end"
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              applyReorder(draggedId, null);
              setDraggedId(null);
            }}
            style={{ height: 32 }}
          />
        )}
      </ul>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
