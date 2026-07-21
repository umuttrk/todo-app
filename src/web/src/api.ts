import type { ApiErrorBody, Task } from './types';

export class ApiError extends Error {
  code: string;
  fields?: Record<string, string>;

  constructor(body: ApiErrorBody['error']) {
    super(body.message);
    this.code = body.code;
    this.fields = body.fields;
  }
}

// docs/specs/001-todo-olustur.md — API Contract: POST /api/tasks
export async function createTask(title: string): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new ApiError((body as ApiErrorBody).error);
  }

  return body as Task;
}
