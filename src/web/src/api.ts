import type { ApiErrorBody, Tag, Task, TaskView } from './types';

export class ApiError extends Error {
  code: string;
  fields?: Record<string, string>;

  constructor(body: ApiErrorBody['error']) {
    super(body.message);
    this.code = body.code;
    this.fields = body.fields;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError((body as ApiErrorBody).error);
  }
  return body as T;
}

// docs/specs/001-todo-olustur.md — API Contract: POST /api/tasks
export async function createTask(title: string): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return parseResponse<Task>(res);
}

// docs/specs/003-gorev-listesi.md §7 — view/arama/etiket filtresi
export async function listTasks(params: {
  view: TaskView;
  q?: string;
  tags?: string[];
}): Promise<Task[]> {
  const search = new URLSearchParams();
  search.set('view', params.view);
  if (params.q) search.set('q', params.q);
  for (const tag of params.tags ?? []) search.append('tag', tag);

  const res = await fetch(`/api/tasks?${search.toString()}`);
  return parseResponse<Task[]>(res);
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, 'title' | 'description' | 'completed' | 'priority' | 'dueDate'>>,
): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return parseResponse<Task>(res);
}

// docs/PRD.md §6.3 — soft delete
export async function deleteTask(id: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  return parseResponse<Task>(res);
}

export async function restoreTask(id: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}/restore`, { method: 'POST' });
  return parseResponse<Task>(res);
}

export async function permanentlyDeleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}/permanent`, { method: 'DELETE' });
  return parseResponse<void>(res);
}

// docs/specs/003-gorev-listesi.md §5 — sürükle-bırak sıralama
export async function reorderTasks(pairs: { id: string; order: number }[]): Promise<void> {
  const res = await fetch('/api/tasks/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pairs),
  });
  return parseResponse<void>(res);
}

export async function listTags(): Promise<Tag[]> {
  const res = await fetch('/api/tags');
  return parseResponse<Tag[]>(res);
}
