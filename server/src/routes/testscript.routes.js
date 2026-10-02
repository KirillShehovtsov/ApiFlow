import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getByRequest, getById, create, update, remove, run, getRuns } from '../controllers/testscript.controller.js';

const router = Router();
router.use(authenticate);

router.get('/request/:requestId', getByRequest); // GET  /api/test-scripts/request/5
router.get('/:id/runs', getRuns);                // GET  /api/test-scripts/3/runs
router.get('/:id', getById);                     // GET  /api/test-scripts/3
router.post('/', create);                        // POST /api/test-scripts
router.put('/:id', update);                      // PUT  /api/test-scripts/3
router.delete('/:id', remove);                   // DELETE /api/test-scripts/3
router.post('/:id/run', run);                    // POST /api/test-scripts/3/run

export default router;
