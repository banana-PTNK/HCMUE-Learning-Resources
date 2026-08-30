import { Router } from 'express';
import { contributorController } from '../controllers/contributor.controller';

const router = Router();

router.get('/', (req, res) => contributorController.getAll(req, res));
router.post('/', (req, res) => contributorController.saveOrUpdate(req, res));
router.post('/:id/adjust', (req, res) => contributorController.adjustPoints(req, res));

export default router;
