import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAll, getById, clear, remove } from '../controllers/history.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getAll);            // GET /api/history?limit=20
router.get('/:id', getById);        // GET /api/history/5
router.delete('/clear', clear);     // DELETE /api/history/clear — очистить всё
router.delete('/:id', remove);      // DELETE /api/history/5 — удалить одну запись

export default router;