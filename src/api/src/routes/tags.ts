// docs/specs/003-gorev-listesi.md — üst bar etiket filtresi
import { Router } from 'express';
import { listTags } from '../services/tagService';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const tags = await listTags();
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

export default router;
