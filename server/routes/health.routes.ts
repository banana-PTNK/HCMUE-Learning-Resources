import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/health', (req, res) => healthController.getHealth(req, res));

export default router;
