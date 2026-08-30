import { Router } from 'express';
import adminRoutes from './admin.routes';
import configRoutes from './config.routes';
import contributionRoutes from './contribution.routes';
import contributorRoutes from './contributor.routes';
import announcementRoutes from './announcement.routes';
import feedbackRoutes from './feedback.routes';
import healthRoutes from './health.routes';
import aiRoutes from './ai.routes';

const router = Router();

router.use('/admin', adminRoutes);
router.use('/', configRoutes);
router.use('/contributions', contributionRoutes);
router.use('/contributors', contributorRoutes);
router.use('/announcements', announcementRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/', healthRoutes);
router.use('/', aiRoutes);

export default router;
