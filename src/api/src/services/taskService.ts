// docs/PRD.md §6.1 — yeni görev aktif listenin başına eklenir.
import { prisma } from '../prismaClient';
import { CreateTaskInput } from '../validation/task';

const INITIAL_ORDER = 1000;

export async function createTask(input: CreateTaskInput) {
  const topTask = await prisma.task.findFirst({
    where: { deletedAt: null },
    orderBy: { order: 'asc' },
    select: { order: true },
  });

  const order = topTask ? topTask.order - 1 : INITIAL_ORDER;

  return prisma.task.create({
    data: {
      title: input.title,
      order,
    },
  });
}
