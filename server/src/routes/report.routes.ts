import { Router, Request, Response } from 'express';
import { requireAuth } from '@/middleware/auth';
import {
  getReportFilterOptions,
  getReportOverview,
  getLeadSummaryReport,
  getLeadSourcesReport,
  getProductValueReport,
  getProductLinesReport,
  getPipelineReport,
  getActivitiesReport,
  getQuotesReport,
} from '@/services/report.service';

const router = Router();

router.get('/filter-options', requireAuth, (req: Request, res: Response) => {
  getReportFilterOptions(req, res);
});

router.get('/overview', requireAuth, (req: Request, res: Response) => {
  getReportOverview(req, res);
});

router.get('/leads', requireAuth, (req: Request, res: Response) => {
  getLeadSummaryReport(req, res);
});

router.get('/sources', requireAuth, (req: Request, res: Response) => {
  getLeadSourcesReport(req, res);
});

router.get('/product-value', requireAuth, (req: Request, res: Response) => {
  getProductValueReport(req, res);
});

router.get('/product-lines', requireAuth, (req: Request, res: Response) => {
  getProductLinesReport(req, res);
});

router.get('/pipeline', requireAuth, (req: Request, res: Response) => {
  getPipelineReport(req, res);
});

router.get('/activities', requireAuth, (req: Request, res: Response) => {
  getActivitiesReport(req, res);
});

router.get('/quotes', requireAuth, (req: Request, res: Response) => {
  getQuotesReport(req, res);
});

export default router;
