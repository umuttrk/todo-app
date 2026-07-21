// docs/specs/001-todo-olustur.md — API Contract: POST /api/tasks
// docs/specs/003-gorev-listesi.md — GET (view/q/tag), PATCH (toggle),
// DELETE (soft delete), restore, permanent delete, reorder.
import { Router } from 'express';
import {
  parseListTasksQuery,
  validateCreateTaskInput,
  validateReorderInput,
  validateUpdateTaskInput,
} from '../validation/task';
import {
  createTask,
  listTasks,
  permanentlyDeleteTask,
  reorderTasks,
  restoreTask,
  softDeleteTask,
  updateTask,
} from '../services/taskService';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const input = parseListTasksQuery(req.query as Record<string, unknown>);
    const tasks = await listTasks(input);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = validateCreateTaskInput(req.body);
    const task = await createTask(input);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// '/reorder' toplu güncelleme yolu, '/:id' ile aynı HTTP metodunu
// (PATCH) kullandığı için '/:id'den ÖNCE tanımlanmalıdır — aksi halde
// Express "reorder" string'ini bir görev id'si sanır.
router.patch('/reorder', async (req, res, next) => {
  try {
    const pairs = validateReorderInput(req.body);
    await reorderTasks(pairs);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = validateUpdateTaskInput(req.body);
    const task = await updateTask(req.params.id, input);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const task = await softDeleteTask(req.params.id);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/restore', async (req, res, next) => {
  try {
    const task = await restoreTask(req.params.id);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/permanent', async (req, res, next) => {
  try {
    await permanentlyDeleteTask(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
