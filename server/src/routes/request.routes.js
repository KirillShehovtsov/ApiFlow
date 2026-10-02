import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getByCollection, getById, create, update, remove } from '../controllers/request.controller.js';

const router = Router();

router.use(authenticate);

router.get('/collection/:collectionId', getByCollection);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;