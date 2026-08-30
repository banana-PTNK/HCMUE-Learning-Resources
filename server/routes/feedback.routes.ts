import { Router } from 'express';
import { feedbackController } from '../controllers/feedback.controller';

const router = Router();

router.get('/', (req, res) => feedbackController.getAll(req, res));
router.post('/', (req, res) => feedbackController.create(req, res));
router.put('/:id', (req, res) => feedbackController.updateStatus(req, res));
router.patch('/:id', (req, res) => feedbackController.updateStatus(req, res));
router.delete('/:id', (req, res) => feedbackController.delete(req, res));

export default router;
