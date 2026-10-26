import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '@/config/db';
import HttpStatusCodes from '@/common/constants/HttpStatusCodes';
import { logger } from '@/utils/logger';

const getTenantId = (req: Request): number => {
  if (req.query.tenant_id) {
    const parsed = Number(req.query.tenant_id);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if ((req as any).tenant?.id) {
    return Number((req as any).tenant.id);
  }
  if ((req as any).user?.tenant_id) {
    return Number((req as any).user.tenant_id);
  }
  if ((req as any).user?.organization_id) {
    return Number((req as any).user.organization_id);
  }
  if ((req as any).tenant?.id) {
    return Number((req as any).tenant.id);
  }
  return 1;
};

export const getReportFilterOptions = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const tenantId = getTenantId(req);
    const result = await connection.query('SELECT fn_get_report_filter_options($1::int) AS filter_options', [tenantId]);
    const filterOptions = result.rows[0]?.filter_options || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: filterOptions,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching report filter options');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch report filter options',
    });
  } finally {
    connection?.release();
  }
};

export const getReportOverview = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const tenantId = getTenantId(req);
    const result = await connection.query('SELECT fn_get_report_overview($1::int) AS report_data', [tenantId]);
    const overviewData = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: overviewData,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching report overview');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch report overview',
    });
  } finally {
    connection?.release();
  }
};

export const getLeadSummaryReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const source = req.query.source ? String(req.query.source) : req.query.source_id ? String(req.query.source_id) : null;
    const type = req.query.type ? String(req.query.type) : req.query.type_id ? String(req.query.type_id) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const stage = req.query.stage ? String(req.query.stage) : req.query.stage_id ? String(req.query.stage_id) : null;
    const org = req.query.org ? String(req.query.org) : null;
    const outcome = req.query.outcome ? String(req.query.outcome) : null;
    const minValue = req.query.min_value ? Number(req.query.min_value) : null;
    const maxValue = req.query.max_value ? Number(req.query.max_value) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const ecFrom = req.query.ec_from ? String(req.query.ec_from) : null;
    const ecTo = req.query.ec_to ? String(req.query.ec_to) : null;
    const aging = req.query.aging ? String(req.query.aging) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_lead_summary(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar,
        $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::numeric, $11::numeric,
        $12::varchar, $13::date, $14::date, $15::varchar, $16::int
      ) AS report_data`,
      [
        fromDate, toDate, owner, source, type,
        pipeline, stage, org, outcome, minValue, maxValue,
        search, ecFrom, ecTo, aging, tenantId,
      ]
    );

    const leadSummaryData = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: leadSummaryData,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching lead summary report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch lead summary report',
    });
  } finally {
    connection?.release();
  }
};

export const getLeadSourcesReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const type = req.query.type ? String(req.query.type) : req.query.type_id ? String(req.query.type_id) : null;
    const org = req.query.org ? String(req.query.org) : null;
    const outcome = req.query.outcome ? String(req.query.outcome) : null;
    const source = req.query.source ? String(req.query.source) : req.query.source_id ? String(req.query.source_id) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_lead_sources(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::varchar, $9::int
      ) AS report_data`,
      [fromDate, toDate, owner, pipeline, type, org, outcome, source, tenantId]
    );

    const leadSourcesData = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: leadSourcesData,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching lead sources report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch lead sources report',
    });
  } finally {
    connection?.release();
  }
};

export const getProductValueReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const product = req.query.product ? String(req.query.product) : req.query.product_id ? String(req.query.product_id) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const stage = req.query.stage ? String(req.query.stage) : req.query.stage_id ? String(req.query.stage_id) : null;
    const org = req.query.org ? String(req.query.org) : null;
    const outcome = req.query.outcome ? String(req.query.outcome) : null;
    const warehouse = req.query.warehouse ? String(req.query.warehouse) : req.query.warehouse_id ? String(req.query.warehouse_id) : null;
    const productType = req.query.product_type ? String(req.query.product_type) : req.query.type ? String(req.query.type) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_product_value(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::varchar, $11::int
      ) AS report_data`,
      [fromDate, toDate, product, owner, pipeline, stage, org, outcome, warehouse, productType, tenantId]
    );

    const productValueData = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: productValueData,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching product value report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch product value report',
    });
  } finally {
    connection?.release();
  }
};

export const getProductLinesReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const product = req.query.product ? String(req.query.product) : req.query.product_id ? String(req.query.product_id) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const warehouse = req.query.warehouse ? String(req.query.warehouse) : req.query.warehouse_id ? String(req.query.warehouse_id) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const stage = req.query.stage ? String(req.query.stage) : req.query.stage_id ? String(req.query.stage_id) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const productType = req.query.product_type ? String(req.query.product_type) : req.query.type ? String(req.query.type) : null;
    const organization = req.query.organization ? String(req.query.organization) : req.query.organization_id ? String(req.query.organization_id) : req.query.org ? String(req.query.org) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_product_lines(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::int, $11::varchar
      ) AS report_data`,
      [fromDate, toDate, product, owner, warehouse, pipeline, stage, search, productType, tenantId, organization]
    );

    const productLinesData = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: productLinesData,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching product lines report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch product lines report',
    });
  } finally {
    connection?.release();
  }
};

export const getPipelineReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const stage = req.query.stage ? String(req.query.stage) : req.query.stage_id ? String(req.query.stage_id) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const outcome = req.query.outcome ? String(req.query.outcome) : null;
    const aging = req.query.aging ? String(req.query.aging) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_pipeline(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::int
      ) AS report_data`,
      [fromDate, toDate, pipeline, stage, owner, outcome, aging, tenantId]
    );

    const pipelineData = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: pipelineData,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching pipeline report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch pipeline report',
    });
  } finally {
    connection?.release();
  }
};

export const getActivitiesReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const user = req.query.user ? String(req.query.user) : req.query.user_id ? String(req.query.user_id) : null;
    const type = req.query.type ? String(req.query.type) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const overdue = req.query.overdue ? String(req.query.overdue) : null;
    const lead = req.query.lead ? String(req.query.lead) : null;
    const person = req.query.person ? String(req.query.person) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_activities(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::varchar, $9::int
      ) AS report_data`,
      [fromDate, toDate, user, type, status, overdue, lead, person, tenantId]
    );

    const activitiesData = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: activitiesData,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching activities report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch activities report',
    });
  } finally {
    connection?.release();
  }
};

export const getQuotesReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const expiry = req.query.expiry ? String(req.query.expiry) : null;
    const soonDays = req.query.soon_days ? Number(req.query.soon_days) : 7;
    const minValue = req.query.min_value ? Number(req.query.min_value) : null;
    const maxValue = req.query.max_value ? Number(req.query.max_value) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const exFrom = req.query.ex_from ? String(req.query.ex_from) : null;
    const exTo = req.query.ex_to ? String(req.query.ex_to) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_quotes(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar,
        $6::int, $7::numeric, $8::numeric, $9::varchar, $10::date, $11::date, $12::int
      ) AS report_data`,
      [fromDate, toDate, owner, status, expiry, soonDays, minValue, maxValue, search, exFrom, exTo, tenantId]
    );

    const quotesData = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: quotesData,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching quotes report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch quotes report',
    });
  } finally {
    connection?.release();
  }
};

export const getSalesRepsReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const user = req.query.user ? String(req.query.user) : req.query.user_id ? String(req.query.user_id) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_sales_reps($1::timestamptz, $2::timestamptz, $3::varchar, $4::int) AS report_data`,
      [fromDate, toDate, user, tenantId]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching sales reps report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch sales reps report',
    });
  } finally {
    connection?.release();
  }
};

export const getMarketingReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_marketing($1::timestamptz, $2::timestamptz, $3::int) AS report_data`,
      [fromDate, toDate, tenantId]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching marketing report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch marketing report',
    });
  } finally {
    connection?.release();
  }
};

export const getAccountsReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_accounts($1::timestamptz, $2::timestamptz, $3::varchar, $4::int) AS report_data`,
      [fromDate, toDate, search, tenantId]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching accounts report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch accounts report',
    });
  } finally {
    connection?.release();
  }
};

export const getForecastReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_forecast($1::timestamptz, $2::timestamptz, $3::varchar, $4::int) AS report_data`,
      [fromDate, toDate, pipeline, tenantId]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching forecast report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch forecast report',
    });
  } finally {
    connection?.release();
  }
};

export const getInventoryReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const warehouse = req.query.warehouse ? String(req.query.warehouse) : req.query.warehouse_id ? String(req.query.warehouse_id) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_inventory($1::varchar, $2::varchar, $3::int) AS report_data`,
      [warehouse, search, tenantId]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching inventory report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch inventory report',
    });
  } finally {
    connection?.release();
  }
};

export const getWinLossReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const source = req.query.source ? String(req.query.source) : req.query.source_id ? String(req.query.source_id) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const dealType = req.query.deal_type ? String(req.query.deal_type) : req.query.kind ? String(req.query.kind) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const _tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_win_loss(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar
      ) AS report_data`,
      [fromDate, toDate, owner, source, pipeline, dealType, search]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching win/loss report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch win/loss report',
    });
  } finally {
    connection?.release();
  }
};

export const getProductServiceMixReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const outcome = req.query.outcome ? String(req.query.outcome) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const _tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_product_service_mix(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::varchar, $6::varchar
      ) AS report_data`,
      [fromDate, toDate, owner, pipeline, outcome, search]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching product vs service mix report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch product vs service mix report',
    });
  } finally {
    connection?.release();
  }
};

export const getStaleLeadsReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const staleDays = req.query.stale ? Number(req.query.stale) : req.query.stale_days ? Number(req.query.stale_days) : 14;
    const flag = req.query.flag ? String(req.query.flag) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const _tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_stale_leads(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, $5::int, $6::varchar, $7::varchar
      ) AS report_data`,
      [fromDate, toDate, owner, pipeline, staleDays, flag, search]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching stale leads report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch stale leads report',
    });
  } finally {
    connection?.release();
  }
};

export const getRecurringContractsReport = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;
    const owner = req.query.owner ? String(req.query.owner) : req.query.owner_id ? String(req.query.owner_id) : null;
    const pipeline = req.query.pipeline ? String(req.query.pipeline) : req.query.pipeline_id ? String(req.query.pipeline_id) : null;
    const cycle = req.query.cycle ? String(req.query.cycle) : req.query.billing_cycle ? String(req.query.billing_cycle) : null;
    const status = req.query.status ? String(req.query.status) : req.query.contract_status ? String(req.query.contract_status) : null;
    const productType = req.query.product_type ? String(req.query.product_type) : req.query.type ? String(req.query.type) : null;
    const search = req.query.search ? String(req.query.search) : null;
    const organization = req.query.organization ? String(req.query.organization) : req.query.organization_id ? String(req.query.organization_id) : req.query.org ? String(req.query.org) : null;
    const tenantId = getTenantId(req);

    const result = await connection.query(
      `SELECT fn_get_report_recurring_contracts(
        $1::timestamptz, $2::timestamptz, $3::varchar, $4::varchar, 
        $5::varchar, $6::varchar, $7::varchar, $8::varchar, $9::int, $10::varchar
      ) AS report_data`,
      [fromDate, toDate, owner, pipeline, cycle, status, productType, search, tenantId, organization]
    );

    const data = result.rows[0]?.report_data || null;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching recurring contracts report');
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch recurring contracts report',
    });
  } finally {
    connection?.release();
  }
};
