// docs/PRD.md §6.1 — yeni görev aktif listenin başına eklenir.
import { Prisma } from '@prisma/client';
import { prisma } from '../prismaClient';
import { NotFoundError } from '../errors';
import { CreateTaskInput, ListTasksInput, ReorderPair, UpdateTaskInput } from '../validation/task';

const INITIAL_ORDER = 1000;

const taskInclude = {
  subtasks: { orderBy: { order: 'asc' as const } },
  tags: { include: { tag: true } },
} satisfies Prisma.TaskInclude;

// docs/PRD.md §8 — dueDate saatsiz saklanır; Prisma bunu Date olarak
// döndürse de API her zaman `YYYY-MM-DD` string'i taşır (ADR-5).
function toDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

// docs/specs/003-gorev-listesi.md — API'nin döndüğü Task şekli, kart
// anatomisinin ihtiyaç duyduğu subtasks/tags'i düz bir biçimde taşır
// (join tablosu detayı frontend'e sızdırılmaz).
function serializeTask(task: Prisma.TaskGetPayload<{ include: typeof taskInclude }>) {
  const { tags, dueDate, ...rest } = task;
  return { ...rest, dueDate: toDateOnly(dueDate), tags: tags.map((t) => t.tag) };
}

async function findTopOrder(): Promise<number> {
  const topTask = await prisma.task.findFirst({
    where: { deletedAt: null },
    orderBy: { order: 'asc' },
    select: { order: true },
  });
  return topTask ? topTask.order - 1 : INITIAL_ORDER;
}

export async function createTask(input: CreateTaskInput) {
  const order = await findTopOrder();

  const task = await prisma.task.create({
    data: {
      title: input.title,
      order,
    },
    include: taskInclude,
  });

  return serializeTask(task);
}

// docs/specs/003-gorev-listesi.md §7 (kaynak: PRD §7.1–§7.3, §7.2)
export async function listTasks(input: ListTasksInput) {
  const where: Prisma.TaskWhereInput = {
    deletedAt: input.view === 'trash' ? { not: null } : null,
    ...(input.view === 'completed' ? { completed: true } : {}),
    ...(input.view === 'active' ? { completed: false } : {}),
    ...(input.q
      ? {
          OR: [
            { title: { contains: input.q, mode: 'insensitive' } },
            { description: { contains: input.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(input.tags.length > 0
      ? { tags: { some: { tag: { name: { in: input.tags } } } } }
      : {}),
  };

  const orderBy: Prisma.TaskOrderByWithRelationInput =
    input.view === 'completed'
      ? { updatedAt: 'desc' }
      : input.view === 'trash'
        ? { deletedAt: 'desc' }
        : { order: 'asc' };

  const tasks = await prisma.task.findMany({ where, orderBy, include: taskInclude });
  return tasks.map(serializeTask);
}

async function requireTask(id: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new NotFoundError(`${id} id'li görev bulunamadı`);
  }
  return task;
}

// docs/ARCHITECTURE.md API Surface — PATCH /api/tasks/:id
export async function updateTask(id: string, input: UpdateTaskInput) {
  await requireTask(id);

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.completed !== undefined ? { completed: input.completed } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate === null ? null : new Date(input.dueDate) }
        : {}),
    },
    include: taskInclude,
  });

  return serializeTask(task);
}

// docs/PRD.md §6.3 — soft delete; alt görevler bağımsız bir deletedAt
// taşımaz, görünürlükleri her zaman parent Task'tan miras alınır
// (bkz. schema.prisma yorumu), bu yüzden ayrı bir cascade update
// gerekmez.
export async function softDeleteTask(id: string) {
  await requireTask(id);
  const task = await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: taskInclude,
  });
  return serializeTask(task);
}

// docs/PRD.md §7.5 — çöp kutusundan geri yüklenen görev listenin başına eklenir.
export async function restoreTask(id: string) {
  await requireTask(id);
  const order = await findTopOrder();
  const task = await prisma.task.update({
    where: { id },
    data: { deletedAt: null, order },
    include: taskInclude,
  });
  return serializeTask(task);
}

export async function permanentlyDeleteTask(id: string) {
  await requireTask(id);
  await prisma.task.delete({ where: { id } });
}

// docs/specs/003-gorev-listesi.md §5 — PATCH /api/tasks/reorder
export async function reorderTasks(pairs: ReorderPair[]) {
  await prisma.$transaction(
    pairs.map(({ id, order }) => prisma.task.update({ where: { id }, data: { order } })),
  );
}
