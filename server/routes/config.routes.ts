import { Router } from 'express';
import { configController } from '../controllers/config.controller';

const router = Router();

router.get('/firebase-config', (req, res) => configController.getFirebaseConfig(req, res));

export default router;
