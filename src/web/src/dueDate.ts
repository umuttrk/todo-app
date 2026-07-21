// docs/PRD.md §8 — overdue, kullanıcının tarayıcısındaki yerel "bugün"
// tarihine göre hesaplanır; UTC/timezone dönüşümü yapılmaz.
export type DueDateStatus = 'overdue' | 'today' | 'upcoming';

function localToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dueDateStatus(dueDate: string, completed: boolean): DueDateStatus {
  const today = localToday();
  if (!completed && dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  return 'upcoming';
}

export function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
