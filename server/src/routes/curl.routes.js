import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { parse } from '../controllers/curl.controller.js';

const router = Router();

router.use(authenticate);

// POST /api/curl/parse — парсинг curl-строки
router.post('/parse', parse);

export default router;
