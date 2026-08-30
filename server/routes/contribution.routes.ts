import { Router } from 'express';
import { contributionController } from '../controllers/contribution.controller';

const router = Router();

router.get('/', (req, res) => contributionController.getAll(req, res));
router.post('/', (req, res) => contributionController.create(req, res));
router.put('/:id/files-count', (req, res) => contributionController.updateFilesCount(req, res));
router.post('/:id/approve', (req, res) => contributionController.approve(req, res));
router.post('/:id/reject', (req, res) => contributionController.reject(req, res));
router.delete('/:id', (req, res) => contributionController.delete(req, res));

export default router;
