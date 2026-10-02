import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { execute } from '../controllers/proxy.controller.js';

const router = Router();

router.use(authenticate);

// Единственный эндпоинт — выполнить запрос
router.post('/execute', execute);

export default router;