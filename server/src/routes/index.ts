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
import warehouseRoutes from '@/routes/warehouse.routes';
import attributeRoutes from '@/routes/attribute.routes';
import emailTemplateRoutes from '@/routes/emailTemplate.routes';
import eventRoutes from '@/routes/event.routes';
import campaignRoutes from '@/routes/campaign.routes';
import webhookRoutes from '@/routes/webhook.routes';
import workflowRoutes from '@/routes/workflow.routes';
import webformRoutes from '@/routes/webform.routes';
import dataTransferRoutes from '@/routes/dataTransfer.routes';
import googleContactRoutes from '@/routes/googleContact.routes';
import tagRoutes from '@/routes/tag.routes';
import userRoutes from '@/routes/user.routes';
import configRoutes from '@/routes/config.routes';
import mailRoutes from '@/routes/mail.routes';
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
router.use('/mail', mailRoutes);
router.use('/emails', mailRoutes);

// Configuration
router.use('/configuration', configRoutes);
router.use('/configurations', configRoutes);

// Settings sub-modules
router.use('/users', userRoutes);
router.use('/user', userRoutes);
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
router.use('/warehouses', warehouseRoutes);
router.use('/warehouse', warehouseRoutes);
router.use('/attributes', attributeRoutes);
router.use('/attribute', attributeRoutes);

// New Krayin CRM Settings Modules
router.use('/email-templates', emailTemplateRoutes);
router.use('/email-template', emailTemplateRoutes);
router.use('/events', eventRoutes);
router.use('/event', eventRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/campaign', campaignRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/webhook', webhookRoutes);
router.use('/workflows', workflowRoutes);
router.use('/workflow', workflowRoutes);
router.use('/web-forms', webformRoutes);
router.use('/web-form', webformRoutes);
router.use('/data-transfer', dataTransferRoutes);
router.use('/google-contacts', googleContactRoutes);
router.use('/tags', tagRoutes);
router.use('/tag', tagRoutes);

router.use('/', authRoutes);

export default router;
