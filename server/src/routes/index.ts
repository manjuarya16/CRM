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
import dashboardRoutes from '@/routes/dashboard.routes';
import notificationRoutes from '@/routes/notification.routes';
import whatsappRoutes from '@/routes/whatsapp.routes';
import realtimeRoutes from '@/routes/realtime.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Real-time Event Stream (SSE)
router.use('/realtime', realtimeRoutes);
router.use('/v1/realtime', realtimeRoutes);
router.use('/realtimes', realtimeRoutes);

// Core Modules
router.use('/dashboard', dashboardRoutes);
router.use('/dashboards', dashboardRoutes);
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/organization', organizationRoutes);
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
router.use('/notifications', notificationRoutes);
router.use('/notification', notificationRoutes);

// Configuration & Settings
router.use('/configuration', configRoutes);
router.use('/configurations', configRoutes);
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
router.use('/types', typeRoutes);
router.use('/type', typeRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/warehouse', warehouseRoutes);
router.use('/attributes', attributeRoutes);
router.use('/attribute', attributeRoutes);

// CRM Settings & Integration Modules
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
router.use('/whatsapp', whatsappRoutes);
router.use('/', authRoutes);

export default router;
