import { Router } from 'express';
import { announcementController } from '../controllers/announcement.controller';

const router = Router();

router.get('/', (req, res) => announcementController.getAll(req, res));
router.post('/', (req, res) => announcementController.createOrUpdate(req, res));
router.delete('/:id', (req, res) => announcementController.delete(req, res));

export default router;
