import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAll, create, update, remove } from '../controllers/collection.controller.js';
import { exportCol, importCol } from '../controllers/importexport.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.post('/', create);
router.post('/import', importCol);        // POST /api/collections/import
router.get('/:id/export', exportCol);     // GET  /api/collections/:id/export
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
