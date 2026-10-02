import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAll, getById, create, update, remove } from '../controllers/environment.controller.js';

const router = Router();

// Все роуты окружений требуют авторизации
router.use(authenticate);

router.get('/', getAll);        // GET  /api/environments
router.get('/:id', getById);    // GET  /api/environments/1
router.post('/', create);       // POST /api/environments
router.put('/:id', update);     // PUT  /api/environments/1
router.delete('/:id', remove);  // DELETE /api/environments/1

export default router;
