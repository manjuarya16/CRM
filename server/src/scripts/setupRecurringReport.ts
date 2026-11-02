import { pool } from '@/config/db';
import { logger } from '@/utils/logger';

export async function setupRecurringReport() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update fn_get_report_product_lines to include recurring contract columns and organization filtering
    await client.query(`
      DROP FUNCTION IF EXISTS fn_get_report_product_lines(timestamptz, timestamptz, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int) CASCADE;
      DROP FUNCTION IF EXISTS fn_get_report_product_lines(timestamptz, timestamptz, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int, varchar) CASCADE;
      CREATE OR REPLACE FUNCTION fn_get_report_product_lines(
        p_from timestamptz,
        p_to timestamptz,
        p_product varchar,
        p_owner varchar,
        p_warehouse varchar,
        p_pipeline varchar,
        p_stage varchar,
        p_search varchar,
        p_type varchar DEFAULT NULL,
        p_tenant_id int DEFAULT NULL,
        p_organization varchar DEFAULT NULL
      )
      RETURNS jsonb AS $$
      DECLARE
        result jsonb;
        kpis_data jsonb;
        lines_data jsonb;
      BEGIN
        DROP TABLE IF EXISTS pg_temp._filtered_product_lines;
        CREATE TEMP TABLE _filtered_product_lines AS
        SELECT 
          lp.id,
          lp.lead_id,
          v.title as lead_title,
          lp.product_id,
          p.name as product_name,
          COALESCE(p.sku, '') as sku,
          COALESCE(p.type, 'Product') as product_type,
          lp.quantity,
          COALESCE(lp.price, p.price, 0) as unit_price,
          COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) as amount,
          (lp.amount IS NULL) as is_calculated,
          v.pipeline_name,
          v.stage_name,
          v.outcome,
          v.owner_name,
          v.organization_id,
          COALESCE(v.organization_name, '—') as organization_name,
          COALESCE(w.name, '—') as warehouse_name,
          v.created_at as lead_created_at,
          COALESCE(lp.is_recurring, false) as is_recurring,
          lp.billing_cycle,
          lp.contract_duration,
          lp.contract_start_date,
          lp.contract_end_date
        FROM lead_products lp
        JOIN products p ON p.id = lp.product_id
        JOIN v_lead_report v ON v.id = lp.lead_id
        LEFT JOIN warehouses w ON w.id = lp.warehouse_id
        WHERE (p_from IS NULL OR v.created_at >= p_from)
          AND (p_to IS NULL OR v.created_at <= p_to + interval '1 day')
          AND (p_tenant_id IS NULL OR v.tenant_id = p_tenant_id)
          AND (p_organization IS NULL OR p_organization = '' OR v.organization_id::text = p_organization OR v.organization_name ILIKE p_organization)
          AND (p_product IS NULL OR p_product = '' OR lp.product_id::text = p_product OR p.name ILIKE p_product)
          AND (p_owner IS NULL OR p_owner = '' OR v.user_id::text = p_owner OR v.owner_name ILIKE p_owner)
          AND (p_warehouse IS NULL OR p_warehouse = '' OR lp.warehouse_id::text = p_warehouse OR w.name ILIKE p_warehouse)
          AND (p_pipeline IS NULL OR p_pipeline = '' OR v.lead_pipeline_id::text = p_pipeline OR v.pipeline_name ILIKE p_pipeline)
          AND (p_stage IS NULL OR p_stage = '' OR v.lead_pipeline_stage_id::text = p_stage OR v.stage_name ILIKE p_stage)
          AND (p_search IS NULL OR p_search = '' OR v.title ILIKE '%' || p_search || '%' OR p.name ILIKE '%' || p_search || '%')
          AND (p_type IS NULL OR p_type = '' OR p.type ILIKE p_type);

        SELECT 
          jsonb_build_object(
            'total_lines', COUNT(*),
            'total_quantity', COALESCE(SUM(quantity), 0),
            'total_amount', COALESCE(SUM(amount), 0),
            'distinct_products', COUNT(DISTINCT product_id),
            'distinct_leads', COUNT(DISTINCT lead_id)
          )
        INTO kpis_data
        FROM pg_temp._filtered_product_lines;

        SELECT jsonb_agg(to_jsonb(l)) INTO lines_data
        FROM (
          SELECT * FROM pg_temp._filtered_product_lines
          ORDER BY amount DESC
          LIMIT 500
        ) l;

        DROP TABLE IF EXISTS pg_temp._filtered_product_lines;

        result := jsonb_build_object(
          'kpis', COALESCE(kpis_data, jsonb_build_object(
            'total_lines', 0, 'total_quantity', 0, 'total_amount', 0, 'distinct_products', 0, 'distinct_leads', 0
          )),
          'lines', COALESCE(lines_data, '[]'::jsonb)
        );

        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Create fn_get_report_recurring_contracts with organization filtering and normalized cycles
    await client.query(`
      DROP FUNCTION IF EXISTS fn_get_report_recurring_contracts(timestamptz, timestamptz, varchar, varchar, varchar, varchar, varchar, varchar, int) CASCADE;
      DROP FUNCTION IF EXISTS fn_get_report_recurring_contracts(timestamptz, timestamptz, varchar, varchar, varchar, varchar, varchar, varchar, int, varchar) CASCADE;
      CREATE OR REPLACE FUNCTION fn_get_report_recurring_contracts(
        p_from timestamptz,
        p_to timestamptz,
        p_owner varchar,
        p_pipeline varchar,
        p_cycle varchar,
        p_status varchar,
        p_product_type varchar,
        p_search varchar,
        p_tenant_id int DEFAULT NULL,
        p_organization varchar DEFAULT NULL
      )
      RETURNS jsonb AS $$
      DECLARE
        result jsonb;
        kpis_data jsonb;
        status_mix_data jsonb;
        cycle_breakdown_data jsonb;
        offering_mix_data jsonb;
        upcoming_expiries_data jsonb;
        contracts_data jsonb;
        insights_data jsonb;
      BEGIN
        DROP TABLE IF EXISTS pg_temp._rec_contracts;
        CREATE TEMP TABLE _rec_contracts AS
        SELECT 
          lp.id as line_id,
          lp.lead_id,
          v.title as lead_title,
          v.outcome,
          v.owner_name,
          v.user_id,
          v.lead_pipeline_id,
          v.pipeline_name,
          v.stage_name,
          v.organization_id,
          COALESCE(v.organization_name, '—') as organization_name,
          COALESCE(v.person_name, '—') as person_name,
          p.id as product_id,
          p.name as item_name,
          COALESCE(p.type, 'Product') as item_type,
          COALESCE(p.sku, '') as sku,
          lp.quantity,
          COALESCE(lp.price, p.price, 0)::numeric as unit_price,
          COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0))::numeric as cycle_amount,
          lp.is_recurring,
          LOWER(COALESCE(lp.billing_cycle, 'monthly')) as billing_cycle,
          COALESCE(lp.contract_duration, 1) as contract_duration_months,
          lp.contract_start_date,
          lp.contract_end_date,
          v.created_at as lead_created_at,
          -- Normalized MRR:
          CASE 
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') = 'quarterly' THEN ROUND(COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) / 3.0, 2)
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') = 'half_yearly' THEN ROUND(COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) / 6.0, 2)
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') IN ('yearly', 'annually') THEN ROUND(COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) / 12.0, 2)
            ELSE ROUND(COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)), 2)
          END::numeric as mrr,
          -- Annual Recurring Revenue:
          CASE 
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') = 'quarterly' THEN ROUND((COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) / 3.0) * 12.0, 2)
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') = 'half_yearly' THEN ROUND((COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) / 6.0) * 12.0, 2)
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') IN ('yearly', 'annually') THEN ROUND(COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)), 2)
            ELSE ROUND(COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) * 12.0, 2)
          END::numeric as arr,
          -- Total Contract Value (TCV):
          CASE 
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') = 'quarterly' THEN ROUND((COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) / 3.0) * GREATEST(COALESCE(lp.contract_duration, 3), 1), 2)
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') = 'half_yearly' THEN ROUND((COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) / 6.0) * GREATEST(COALESCE(lp.contract_duration, 6), 1), 2)
            WHEN REPLACE(LOWER(COALESCE(lp.billing_cycle, 'monthly')), '-', '_') IN ('yearly', 'annually') THEN ROUND((COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) / 12.0) * GREATEST(COALESCE(lp.contract_duration, 12), 1), 2)
            ELSE ROUND(COALESCE(lp.amount, lp.quantity * COALESCE(lp.price, p.price, 0)) * GREATEST(COALESCE(lp.contract_duration, 1), 1), 2)
          END::numeric as total_contract_value,
          -- Days until expiry:
          CASE 
            WHEN lp.contract_end_date IS NULL THEN 9999
            ELSE (lp.contract_end_date - CURRENT_DATE)
          END as days_until_expiry,
          -- Expiry status:
          CASE 
            WHEN lp.contract_end_date IS NULL THEN 'active'
            WHEN lp.contract_end_date < CURRENT_DATE THEN 'expired'
            WHEN lp.contract_end_date <= CURRENT_DATE + interval '30 days' THEN 'expiring_30'
            WHEN lp.contract_end_date <= CURRENT_DATE + interval '60 days' THEN 'expiring_60'
            WHEN lp.contract_end_date <= CURRENT_DATE + interval '90 days' THEN 'expiring_90'
            ELSE 'active'
          END as expiry_status
        FROM lead_products lp
        JOIN products p ON p.id = lp.product_id
        JOIN v_lead_report v ON v.id = lp.lead_id
        WHERE lp.is_recurring = true
          AND (p_tenant_id IS NULL OR v.tenant_id = p_tenant_id)
          AND (p_organization IS NULL OR p_organization = '' OR v.organization_id::text = p_organization OR v.organization_name ILIKE p_organization)
          AND (p_from IS NULL OR COALESCE(lp.contract_start_date, v.created_at::date) >= p_from::date)
          AND (p_to IS NULL OR COALESCE(lp.contract_start_date, v.created_at::date) <= p_to::date)
          AND (p_owner IS NULL OR p_owner = '' OR v.user_id::text = p_owner OR v.owner_name ILIKE p_owner)
          AND (p_pipeline IS NULL OR p_pipeline = '' OR v.lead_pipeline_id::text = p_pipeline OR v.pipeline_name ILIKE p_pipeline)
          AND (p_cycle IS NULL OR p_cycle = '' OR REPLACE(LOWER(lp.billing_cycle), '-', '_') = REPLACE(LOWER(p_cycle), '-', '_'))
          AND (p_product_type IS NULL OR p_product_type = '' OR p.type ILIKE p_product_type)
          AND (p_search IS NULL OR p_search = '' 
               OR p.name ILIKE '%' || p_search || '%' 
               OR v.title ILIKE '%' || p_search || '%'
               OR v.organization_name ILIKE '%' || p_search || '%'
               OR p.sku ILIKE '%' || p_search || '%');

        -- Compute KPIs
        SELECT jsonb_build_object(
          'total_contracts', COUNT(*),
          'active_contracts', COUNT(*) FILTER (WHERE expiry_status != 'expired'),
          'total_mrr', COALESCE(SUM(mrr) FILTER (WHERE expiry_status != 'expired'), 0)::numeric,
          'total_arr', COALESCE(SUM(arr) FILTER (WHERE expiry_status != 'expired'), 0)::numeric,
          'total_tcv', COALESCE(SUM(total_contract_value), 0)::numeric,
          'expiring_30_count', COUNT(*) FILTER (WHERE expiry_status = 'expiring_30'),
          'expiring_30_mrr', COALESCE(SUM(mrr) FILTER (WHERE expiry_status = 'expiring_30'), 0)::numeric,
          'expiring_60_count', COUNT(*) FILTER (WHERE expiry_status = 'expiring_60'),
          'expiring_90_count', COUNT(*) FILTER (WHERE expiry_status = 'expiring_90'),
          'expired_count', COUNT(*) FILTER (WHERE expiry_status = 'expired'),
          'expired_mrr', COALESCE(SUM(mrr) FILTER (WHERE expiry_status = 'expired'), 0)::numeric,
          'won_contracts', COUNT(*) FILTER (WHERE outcome = 'won'),
          'open_contracts', COUNT(*) FILTER (WHERE outcome = 'open')
        ) INTO kpis_data
        FROM pg_temp._rec_contracts;

        -- Expiry / Renewal Status Mix Chart
        SELECT jsonb_agg(sub) INTO status_mix_data FROM (
          SELECT 
            CASE 
              WHEN expiry_status = 'active' THEN 'Active (> 90 Days)'
              WHEN expiry_status = 'expiring_30' THEN 'Renewals Due (<= 30 Days)'
              WHEN expiry_status = 'expiring_60' THEN 'Expiring in 31-60 Days'
              WHEN expiry_status = 'expiring_90' THEN 'Expiring in 61-90 Days'
              WHEN expiry_status = 'expired' THEN 'Expired Contracts'
              ELSE 'Other'
            END as label,
            COUNT(*)::int as count,
            COALESCE(SUM(mrr), 0)::numeric as value,
            CASE 
              WHEN expiry_status = 'active' THEN '#10b981'
              WHEN expiry_status = 'expiring_30' THEN '#f97316'
              WHEN expiry_status = 'expiring_60' THEN '#f59e0b'
              WHEN expiry_status = 'expiring_90' THEN '#3b82f6'
              WHEN expiry_status = 'expired' THEN '#ef4444'
              ELSE '#94a3b8'
            END as color
          FROM pg_temp._rec_contracts
          GROUP BY expiry_status
          ORDER BY 
            CASE 
              WHEN expiry_status = 'expiring_30' THEN 1
              WHEN expiry_status = 'expiring_60' THEN 2
              WHEN expiry_status = 'expiring_90' THEN 3
              WHEN expiry_status = 'active' THEN 4
              WHEN expiry_status = 'expired' THEN 5
              ELSE 6
            END
        ) sub;

        -- Billing Cycle Breakdown
        SELECT jsonb_agg(sub) INTO cycle_breakdown_data FROM (
          SELECT 
            INITCAP(REPLACE(billing_cycle, '_', '-')) as label,
            COUNT(*)::int as count,
            COALESCE(SUM(cycle_amount), 0)::numeric as total_cycle_amount,
            COALESCE(SUM(mrr), 0)::numeric as total_mrr,
            COALESCE(SUM(arr), 0)::numeric as total_arr
          FROM pg_temp._rec_contracts
          GROUP BY billing_cycle
          ORDER BY total_mrr DESC
        ) sub;

        -- Offering Type Mix (Products vs Services)
        SELECT jsonb_agg(sub) INTO offering_mix_data FROM (
          SELECT 
            item_type as label,
            COUNT(*)::int as count,
            COALESCE(SUM(mrr), 0)::numeric as value
          FROM pg_temp._rec_contracts
          GROUP BY item_type
          ORDER BY value DESC
        ) sub;

        -- Upcoming Expiries by Month (Next 12 months)
        SELECT jsonb_agg(sub) INTO upcoming_expiries_data FROM (
          SELECT 
            TO_CHAR(contract_end_date, 'Mon YYYY') as label,
            DATE_TRUNC('month', contract_end_date) as month_date,
            COUNT(*)::int as count,
            COALESCE(SUM(mrr), 0)::numeric as value
          FROM pg_temp._rec_contracts
          WHERE contract_end_date IS NOT NULL 
            AND contract_end_date >= CURRENT_DATE
            AND contract_end_date <= CURRENT_DATE + interval '12 months'
          GROUP BY TO_CHAR(contract_end_date, 'Mon YYYY'), DATE_TRUNC('month', contract_end_date)
          ORDER BY month_date ASC
        ) sub;

        -- Contracts List (Filtered by p_status if provided)
        SELECT jsonb_agg(to_jsonb(c)) INTO contracts_data FROM (
          SELECT * FROM pg_temp._rec_contracts
          WHERE (
            p_status IS NULL OR p_status = '' OR p_status = 'all'
            OR (p_status = 'active' AND expiry_status = 'active')
            OR (p_status = 'expiring_30' AND expiry_status = 'expiring_30')
            OR (p_status = 'expiring_60' AND expiry_status = 'expiring_60')
            OR (p_status = 'expiring_90' AND expiry_status = 'expiring_90')
            OR (p_status = 'expired' AND expiry_status = 'expired')
          )
          ORDER BY 
            CASE 
              WHEN expiry_status = 'expiring_30' THEN 1
              WHEN expiry_status = 'expiring_60' THEN 2
              WHEN expiry_status = 'expiring_90' THEN 3
              WHEN expiry_status = 'active' THEN 4
              ELSE 5
            END,
            days_until_expiry ASC
          LIMIT 500
        ) c;

        -- Automated Insights
        SELECT jsonb_agg(txt) INTO insights_data FROM (
          SELECT 
            'Total Active MRR is ₹' || COALESCE(TO_CHAR((kpis_data->>'total_mrr')::numeric, 'FM99,99,999.00'), '0') || ' across ' || (kpis_data->>'active_contracts') || ' active contracts.' as txt
          UNION ALL
          SELECT 
            (kpis_data->>'expiring_30_count') || ' contracts are expiring within the next 30 days (₹' || COALESCE(TO_CHAR((kpis_data->>'expiring_30_mrr')::numeric, 'FM99,99,999.00'), '0') || ' MRR at risk).' as txt
          WHERE (kpis_data->>'expiring_30_count')::int > 0
          UNION ALL
          SELECT 
            (kpis_data->>'expired_count') || ' contracts have passed their end date and require renewal follow-up.' as txt
          WHERE (kpis_data->>'expired_count')::int > 0
        ) ins;

        DROP TABLE IF EXISTS pg_temp._rec_contracts;

        result := jsonb_build_object(
          'kpis', COALESCE(kpis_data, jsonb_build_object(
            'total_contracts', 0, 'active_contracts', 0, 'total_mrr', 0, 'total_arr', 0, 'total_tcv', 0,
            'expiring_30_count', 0, 'expiring_30_mrr', 0, 'expiring_60_count', 0, 'expiring_90_count', 0,
            'expired_count', 0, 'expired_mrr', 0, 'won_contracts', 0, 'open_contracts', 0
          )),
          'status_mix', COALESCE(status_mix_data, '[]'::jsonb),
          'cycle_breakdown', COALESCE(cycle_breakdown_data, '[]'::jsonb),
          'offering_mix', COALESCE(offering_mix_data, '[]'::jsonb),
          'upcoming_expiries', COALESCE(upcoming_expiries_data, '[]'::jsonb),
          'contracts', COALESCE(contracts_data, '[]'::jsonb),
          'insights', COALESCE(insights_data, '[]'::jsonb)
        );

        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query('COMMIT');
    console.log('Successfully installed fn_get_report_recurring_contracts and updated fn_get_report_product_lines!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error installing recurring report functions:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  setupRecurringReport()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
