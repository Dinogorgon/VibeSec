import express from 'express';
import authRoutes from './auth.js';
import scanRoutes from './scan.js';
import aiRoutes from './ai.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/scan', scanRoutes);
router.use('/ai', aiRoutes);

export default router;

