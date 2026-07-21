import type { Task } from './types';

// docs/PRD.md §7.4 — filtre uygulanmışken bile global `order`'ı
// bozmayan sıralama: sürüklenen görevin yeni `order`'ı, yalnızca yeni
// GÖRÜNÜR komşularının order değerlerinin ortalaması alınarak
// hesaplanır. Görünmeyen (filtrelenmiş) görevlerin order'ı hiç
// değişmediği için göreli sırası otomatik olarak korunur.
export function computeNewOrder(tasks: Task[], draggedId: string, targetId: string | null): number {
  const others = tasks.filter((t) => t.id !== draggedId);

  if (targetId === null) {
    const last = others[others.length - 1];
    return last ? last.order + 1 : (tasks.find((t) => t.id === draggedId)?.order ?? 0);
  }

  const targetIndex = others.findIndex((t) => t.id === targetId);
  const prev = others[targetIndex - 1];
  const next = others[targetIndex];

  if (prev && next) return (prev.order + next.order) / 2;
  if (!prev && next) return next.order - 1;
  if (prev && !next) return prev.order + 1;
  return tasks.find((t) => t.id === draggedId)?.order ?? 0;
}

// docs/specs/003-gorev-listesi.md §5 — Alt+Yukarı/Aşağı klavye alternatifi
export function computeKeyboardMove(
  tasks: Task[],
  taskId: string,
  direction: -1 | 1,
): number | null {
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  if (direction === -1) {
    if (index === 0) return null;
    return computeNewOrder(tasks, taskId, tasks[index - 1].id);
  }

  if (index >= tasks.length - 1) return null;
  const targetId = index + 2 < tasks.length ? tasks[index + 2].id : null;
  return computeNewOrder(tasks, taskId, targetId);
}
