import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';

const router = Router();

router.post('/login', (req, res) => adminController.login(req, res));
router.post('/verify', (req, res) => adminController.verify(req, res));
router.post('/logout', (req, res) => adminController.logout(req, res));

export default router;
