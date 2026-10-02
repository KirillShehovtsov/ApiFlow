import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { start, status, report, history } from '../controllers/loadtest.controller.js';

const router = Router();
router.use(authenticate);

router.post('/start', start);
router.get('/history', history);
router.get('/:jobId', status);
router.get('/:jobId/report', report);

export default router;

