import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';

const router = Router();

router.post('/ai', (req, res) => aiController.handleAiAction(req, res));

export default router;
