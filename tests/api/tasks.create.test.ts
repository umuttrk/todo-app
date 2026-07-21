// docs/specs/001-todo-olustur.md — Test Cases
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/src/app';
import { prisma } from '../../src/api/src/prismaClient';

const app = createApp();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

beforeEach(async () => {
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/tasks', () => {
  it('test_create_task_success_returns_full_task_schema', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Sütü al' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Sütü al',
      description: null,
      completed: false,
      priority: 'medium',
      dueDate: null,
      deletedAt: null,
    });
    expect(res.body.id).toMatch(UUID_REGEX);
    expect(typeof res.body.order).toBe('number');
    expect(res.body.createdAt).toMatch(ISO_DATETIME_REGEX);
    expect(res.body.updatedAt).toMatch(ISO_DATETIME_REGEX);

    const stored = await prisma.task.findUnique({ where: { id: res.body.id } });
    expect(stored).not.toBeNull();
    expect(stored?.title).toBe('Sütü al');
  });

  it('test_create_task_empty_title_fails_with_400_validation_error', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('title');
  });

  it('test_create_task_whitespace_only_title_fails_with_400', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '     ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('title');
  });

  it('test_create_task_title_over_200_chars_fails_with_400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'a'.repeat(201) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('title');
  });

  it('test_create_task_defaults_completed_false_and_priority_medium', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Çamaşırları as' });

    expect(res.status).toBe(201);
    expect(res.body.completed).toBe(false);
    expect(res.body.priority).toBe('medium');
  });

  it('test_create_task_is_placed_at_top_of_active_list', async () => {
    const first = await request(app).post('/api/tasks').send({ title: 'İlk görev' });
    const second = await request(app).post('/api/tasks').send({ title: 'İkinci görev' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.order).toBeLessThan(first.body.order);

    const tasks = await prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: { order: 'asc' },
    });

    expect(tasks[0].id).toBe(second.body.id);
    expect(tasks[1].id).toBe(first.body.id);
  });
});
