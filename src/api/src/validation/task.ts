// docs/specs/001-todo-olustur.md — Validation Rules (kaynak: PRD §10)
import { ValidationError } from '../errors';

export interface CreateTaskInput {
  title: string;
}

export type TaskView = 'active' | 'completed' | 'trash';

export interface ListTasksInput {
  view: TaskView;
  q?: string;
  tags: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
}

export interface ReorderPair {
  id: string;
  order: number;
}

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const PRIORITIES = ['low', 'medium', 'high'] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null;
}

export function validateCreateTaskInput(body: unknown): CreateTaskInput {
  if (!isPlainObject(body) || !('title' in body)) {
    throw new ValidationError({ title: 'title zorunludur' });
  }

  const rawTitle = body.title;

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

// docs/specs/003-gorev-listesi.md §7 — view/arama/etiket filtresi
// (kaynak: PRD §7.1, §7.3, ARCHITECTURE.md API Surface).
export function parseListTasksQuery(query: Record<string, unknown>): ListTasksInput {
  const rawView = query.view;
  const view: TaskView =
    rawView === 'completed' || rawView === 'trash' ? rawView : 'active';

  const rawQ = query.q;
  const q = typeof rawQ === 'string' && rawQ.trim().length > 0 ? rawQ.trim() : undefined;

  const rawTag = query.tag;
  const tags = Array.isArray(rawTag)
    ? rawTag.filter((t): t is string => typeof t === 'string')
    : typeof rawTag === 'string' && rawTag.length > 0
      ? [rawTag]
      : [];

  return { view, q, tags };
}

// docs/ARCHITECTURE.md API Surface — PATCH /api/tasks/:id (kısmi güncelleme).
export function validateUpdateTaskInput(body: unknown): UpdateTaskInput {
  if (!isPlainObject(body)) {
    throw new ValidationError({ _: 'geçerli bir gövde bekleniyor' });
  }

  const result: UpdateTaskInput = {};

  if ('title' in body) {
    if (typeof body.title !== 'string') {
      throw new ValidationError({ title: 'title bir metin olmalıdır' });
    }
    const title = body.title.trim();
    if (title.length === 0) {
      throw new ValidationError({ title: 'title boş olamaz' });
    }
    if (title.length > TITLE_MAX_LENGTH) {
      throw new ValidationError({ title: `title en fazla ${TITLE_MAX_LENGTH} karakter olabilir` });
    }
    result.title = title;
  }

  if ('description' in body) {
    if (body.description !== null && typeof body.description !== 'string') {
      throw new ValidationError({ description: 'description bir metin olmalıdır' });
    }
    if (typeof body.description === 'string' && body.description.length > DESCRIPTION_MAX_LENGTH) {
      throw new ValidationError({
        description: `description en fazla ${DESCRIPTION_MAX_LENGTH} karakter olabilir`,
      });
    }
    result.description = body.description;
  }

  if ('completed' in body) {
    if (typeof body.completed !== 'boolean') {
      throw new ValidationError({ completed: 'completed bir boolean olmalıdır' });
    }
    result.completed = body.completed;
  }

  if ('priority' in body) {
    if (typeof body.priority !== 'string' || !PRIORITIES.includes(body.priority as (typeof PRIORITIES)[number])) {
      throw new ValidationError({ priority: 'priority low, medium veya high olmalıdır' });
    }
    result.priority = body.priority as UpdateTaskInput['priority'];
  }

  if ('dueDate' in body) {
    if (body.dueDate !== null) {
      if (typeof body.dueDate !== 'string' || !DATE_REGEX.test(body.dueDate) || Number.isNaN(Date.parse(body.dueDate))) {
        throw new ValidationError({ dueDate: 'dueDate YYYY-MM-DD biçiminde olmalıdır' });
      }
    }
    result.dueDate = body.dueDate;
  }

  return result;
}

// docs/specs/003-gorev-listesi.md §5 — PATCH /api/tasks/reorder
export function validateReorderInput(body: unknown): ReorderPair[] {
  if (!Array.isArray(body) || body.length === 0) {
    throw new ValidationError({ _: 'bir dizi {id, order} bekleniyor' });
  }

  return body.map((item, index) => {
    if (!isPlainObject(item) || typeof item.id !== 'string' || typeof item.order !== 'number') {
      throw new ValidationError({ [`${index}`]: 'her öğe {id: string, order: number} olmalıdır' });
    }
    return { id: item.id, order: item.order };
  });
}
