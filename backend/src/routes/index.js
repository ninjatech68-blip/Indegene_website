import { Router } from 'express';
import authRoutes from './auth.js';
import publicRoutes from './public.js';
import formRoutes from './forms.js';
import adminApiRoutes from './admin-api.js';
import uploadRoutes from './uploads.js';
import securityRoutes from './security.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/public', publicRoutes);
router.use('/forms', formRoutes);
router.use('/admin-api', adminApiRoutes);
router.use('/uploads', uploadRoutes);
router.use('/security', securityRoutes);

export default router;
