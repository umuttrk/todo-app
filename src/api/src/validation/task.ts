// docs/specs/001-todo-olustur.md — Validation Rules
import { ValidationError } from '../errors';

export interface CreateTaskInput {
  title: string;
}

const TITLE_MAX_LENGTH = 200;

export function validateCreateTaskInput(body: unknown): CreateTaskInput {
  if (typeof body !== 'object' || body === null || !('title' in body)) {
    throw new ValidationError({ title: 'title zorunludur' });
  }

  const rawTitle = (body as Record<string, unknown>).title;

  if (typeof rawTitle !== 'string') {
    throw new ValidationError({ title: 'title bir metin olmalıdır' });
  }

  const title = rawTitle.trim();

  if (title.length === 0) {
    throw new ValidationError({ title: 'title boş olamaz' });
  }

  if (title.length > TITLE_MAX_LENGTH) {
    throw new ValidationError({ title: `title en fazla ${TITLE_MAX_LENGTH} karakter olabilir` });
  }

  return { title };
}
