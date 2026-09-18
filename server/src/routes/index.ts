import { Router } from 'express';
import authRoutes from '@/routes/auth.routes';
import organizationRoutes from '@/routes/organization.routes';
import quoteRoutes from '@/routes/quote.routes';
import leadRoutes from '@/routes/lead.routes';
import personRoutes from '@/routes/person.routes';
import productRoutes from '@/routes/product.routes';
import activityRoutes from '@/routes/activity.routes';
import groupRoutes from '@/routes/group.routes';
import roleRoutes from '@/routes/role.routes';
import pipelineRoutes from '@/routes/pipeline.routes';
import sourceRoutes from '@/routes/source.routes';
import typeRoutes from '@/routes/type.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/organization', organizationRoutes);
router.use('/organizations', organizationRoutes);
router.use('/quotes', quoteRoutes);
router.use('/quote', quoteRoutes);
router.use('/leads', leadRoutes);
router.use('/lead', leadRoutes);
router.use('/persons', personRoutes);
router.use('/person', personRoutes);
router.use('/products', productRoutes);
router.use('/product', productRoutes);
router.use('/activities', activityRoutes);
router.use('/activity', activityRoutes);

// Settings sub-modules
router.use('/groups', groupRoutes);
router.use('/group', groupRoutes);
router.use('/roles', roleRoutes);
router.use('/role', roleRoutes);
router.use('/pipelines', pipelineRoutes);
router.use('/pipeline', pipelineRoutes);
router.use('/sources', sourceRoutes);
router.use('/source', sourceRoutes);
router.use('/lead-sources', sourceRoutes);
router.use('/types', typeRoutes);
router.use('/type', typeRoutes);
router.use('/lead-types', typeRoutes);

router.use('/', authRoutes);

export default router;
