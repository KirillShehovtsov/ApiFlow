import { Router } from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Публичные роуты
router.post('/register', register);
router.post('/login', login);

// Защищённые роуты
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);

export default router;