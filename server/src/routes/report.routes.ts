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
  getSalesRepsReport,
  getMarketingReport,
  getAccountsReport,
  getForecastReport,
  getInventoryReport,
  getWinLossReport,
  getProductServiceMixReport,
  getStaleLeadsReport,
  getRecurringContractsReport,
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

router.get('/sales-reps', requireAuth, (req: Request, res: Response) => {
  getSalesRepsReport(req, res);
});

router.get('/marketing', requireAuth, (req: Request, res: Response) => {
  getMarketingReport(req, res);
});

router.get('/accounts', requireAuth, (req: Request, res: Response) => {
  getAccountsReport(req, res);
});

router.get('/forecast', requireAuth, (req: Request, res: Response) => {
  getForecastReport(req, res);
});

router.get('/inventory', requireAuth, (req: Request, res: Response) => {
  getInventoryReport(req, res);
});

router.get('/win-loss', requireAuth, (req: Request, res: Response) => {
  getWinLossReport(req, res);
});

router.get('/product-service-mix', requireAuth, (req: Request, res: Response) => {
  getProductServiceMixReport(req, res);
});

router.get('/stale-leads', requireAuth, (req: Request, res: Response) => {
  getStaleLeadsReport(req, res);
});

router.get('/recurring-contracts', requireAuth, (req: Request, res: Response) => {
  getRecurringContractsReport(req, res);
});

export default router;
