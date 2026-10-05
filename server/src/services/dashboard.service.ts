import { pool } from "@/config/db";
import { logger } from "@/utils/logger";

export interface IDashboardStatsParams {
  start_date?: string;
  end_date?: string;
  pipeline_id?: number | string;
  startDate?: string;
  endDate?: string;
  pipelineId?: number | string;
}

function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. Check YYYY-MM-DD format (standard)
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date;
  }

  // 2. Check DD-MM-YYYY format (e.g. 05-09-2026)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date;
  }

  // 3. Fallback standard Date parsing
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export class DashboardService {
  /**
   * Get complete dashboard metrics matching Krayin CRM specification
   */
  static async getDashboardStats(params: IDashboardStatsParams) {
    try {
      const now = new Date();
      const rawStart = params.start_date || params.startDate;
      const rawEnd = params.end_date || params.endDate;
      const pipelineIdParam = params.pipeline_id || params.pipelineId;

      // Ensure full start day (00:00:00) and full end day (23:59:59.999)
      const parsedStart = parseFlexibleDate(rawStart);
      const parsedEnd = parseFlexibleDate(rawEnd);

      let startDateObj: Date;
      if (parsedStart) {
        startDateObj = parsedStart;
      } else {
        startDateObj = new Date(now);
        startDateObj.setDate(startDateObj.getDate() - 30);
      }
      startDateObj.setHours(0, 0, 0, 0);

      const endDateObj = parsedEnd ? parsedEnd : new Date(now);
      endDateObj.setHours(23, 59, 59, 999);

      const startDateStr = startDateObj.toISOString();
      const endDateStr = endDateObj.toISOString();

      // 1. Fetch available pipelines
      const pipelinesRes = await pool.query(
        "SELECT id, name, is_default FROM lead_pipelines ORDER BY id ASC"
      );
      const pipelines: any[] = pipelinesRes.rows;
      // Default pipeline preference: id 1 (Default Pipeline) or is_default
      const defaultPipeline = pipelines.find((p: any) => p.id === 1) || pipelines.find((p: any) => p.is_default) || pipelines[0];

      let targetPipelineId: number | null = null;
      if (pipelineIdParam && pipelineIdParam !== "all") {
        targetPipelineId = Number(pipelineIdParam);
      }

      // 2. Fetch stages for selected pipeline or all (with sort_order)
      let stagesQuery = "SELECT id, name, code, sort_order, lead_pipeline_id FROM lead_pipeline_stages";
      const stagesQueryParams: any[] = [];
      if (targetPipelineId) {
        stagesQuery += " WHERE lead_pipeline_id = $1";
        stagesQueryParams.push(targetPipelineId);
      }
      stagesQuery += " ORDER BY sort_order ASC, id ASC";
      const stagesRes = await pool.query(stagesQuery, stagesQueryParams);
      const stages: any[] = stagesRes.rows;

      // 3. Fetch Leads within date range and pipeline
      let leadsQuery = `
        SELECT
          l.id,
          l.lead_value,
          l.lead_pipeline_id,
          l.lead_pipeline_stage_id,
          l.lead_source_id,
          l.lead_type_id,
          l.status,
          l.created_at,
          l.closed_at
        FROM leads l
        WHERE l.created_at >= $1 AND l.created_at <= $2
      `;
      const leadsQueryParams: any[] = [startDateStr, endDateStr];

      if (targetPipelineId) {
        leadsQuery += " AND l.lead_pipeline_id = $3";
        leadsQueryParams.push(targetPipelineId);
      }
      leadsQuery += " ORDER BY l.created_at ASC";

      const leadsRes = await pool.query(leadsQuery, leadsQueryParams);
      const leads: any[] = leadsRes.rows;

      // Calculate totals
      let wonRevenue = 0;
      let wonCount = 0;
      let lostRevenue = 0;
      let lostCount = 0;
      let totalLeadValueSum = 0;
      const totalLeads = leads.length;

      const stageCountsMap: Record<number, { count: number; total_value: number }> = {};
      const sourceCountsMap: Record<string, { name: string; count: number; total_value: number }> = {};
      const typeCountsMap: Record<string, { name: string; count: number; total_value: number }> = {};

      stages.forEach((st: any) => {
        stageCountsMap[st.id] = { count: 0, total_value: 0 };
      });

      leads.forEach((l: any) => {
        const val = Number(l.lead_value) || 0;
        totalLeadValueSum += val;

        const stageObj = stages.find((s: any) => s.id === l.lead_pipeline_stage_id);
        const stageCode = (stageObj?.code || "").toLowerCase();
        const stageName = (stageObj?.name || "").toLowerCase();

        if (stageCountsMap[l.lead_pipeline_stage_id]) {
          stageCountsMap[l.lead_pipeline_stage_id].count += 1;
          stageCountsMap[l.lead_pipeline_stage_id].total_value += val;
        }

        if (stageCode === "won" || stageName === "won" || stageCode.includes("won")) {
          wonRevenue += val;
          wonCount += 1;
        } else if (stageCode === "lost" || stageName === "lost" || stageCode.includes("lost") || l.status === false) {
          lostRevenue += val;
          lostCount += 1;
        }
      });

      // 4. Over All Stats (Quotations, Persons, Organizations)
      const quotesRes = await pool.query(
        "SELECT COUNT(*) as count FROM quotes WHERE created_at >= $1 AND created_at <= $2",
        [startDateStr, endDateStr]
      );
      const totalQuotations = Number(quotesRes.rows[0]?.count || 0);

      const personsRes = await pool.query(
        "SELECT COUNT(*) as count FROM persons WHERE created_at >= $1 AND created_at <= $2",
        [startDateStr, endDateStr]
      );
      const totalPersons = Number(personsRes.rows[0]?.count || 0);

      const orgsRes = await pool.query(
        "SELECT COUNT(*) as count FROM organizations WHERE created_at >= $1 AND created_at <= $2",
        [startDateStr, endDateStr]
      );
      const totalOrganizations = Number(orgsRes.rows[0]?.count || 0);

      // 5. Sources Map
      const sourcesRes = await pool.query("SELECT id, name FROM lead_sources ORDER BY id ASC");
      const sourceMap: Record<number, string> = {};
      sourcesRes.rows.forEach((s: any) => (sourceMap[s.id] = s.name));

      leads.forEach((l: any) => {
        const val = Number(l.lead_value) || 0;
        const srcName = l.lead_source_id && sourceMap[l.lead_source_id] ? sourceMap[l.lead_source_id] : "Direct";
        if (!sourceCountsMap[srcName]) {
          sourceCountsMap[srcName] = { name: srcName, count: 0, total_value: 0 };
        }
        sourceCountsMap[srcName].count += 1;
        sourceCountsMap[srcName].total_value += val;
      });

      // 6. Types Map
      const typesRes = await pool.query("SELECT id, name FROM lead_types ORDER BY id ASC");
      const typeMap: Record<number, string> = {};
      typesRes.rows.forEach((t: any) => (typeMap[t.id] = t.name));

      leads.forEach((l: any) => {
        const val = Number(l.lead_value) || 0;
        const typeName = l.lead_type_id && typeMap[l.lead_type_id] ? typeMap[l.lead_type_id] : "New Business";
        if (!typeCountsMap[typeName]) {
          typeCountsMap[typeName] = { name: typeName, count: 0, total_value: 0 };
        }
        typeCountsMap[typeName].count += 1;
        typeCountsMap[typeName].total_value += val;
      });

      // Days count
      const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
      const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const avgLeadValue = totalLeads > 0 ? totalLeadValueSum / totalLeads : 0;
      const avgLeadsPerDay = totalLeads / daysCount;

      // 7. Funnel: Open Leads By Stages (strictly open leads, excluding won and lost)
      let funnel: any[] = [];
      if (!targetPipelineId) {
        // Group open stages across all pipelines by standard stage progression
        const stageOrderMap: Record<string, { name: string; sort_order: number }> = {
          new: { name: 'New', sort_order: 1 },
          follow_up: { name: 'Follow Up', sort_order: 2 },
          'follow-up': { name: 'Follow Up', sort_order: 2 },
          prospect: { name: 'Prospect', sort_order: 3 },
          negotiation: { name: 'Negotiation', sort_order: 4 },
        };

        const openStageMap: Record<string, { stage_name: string; count: number; total_value: number; sort_order: number }> = {};

        leads.forEach((l: any) => {
          const st = stages.find((s: any) => s.id === l.lead_pipeline_stage_id);
          const c = (st?.code || '').toLowerCase();
          const n = (st?.name || '').trim();
          const isWon = c.includes('won') || n.toLowerCase().includes('won');
          const isLost = c.includes('lost') || n.toLowerCase().includes('lost') || l.status === false;

          if (!isWon && !isLost) {
            const mapped = stageOrderMap[c] || { name: n || 'New', sort_order: st?.sort_order || 99 };
            const displayName = mapped.name;
            if (!openStageMap[displayName]) {
              openStageMap[displayName] = {
                stage_name: displayName,
                count: 0,
                total_value: 0,
                sort_order: mapped.sort_order,
              };
            }
            openStageMap[displayName].count += 1;
            openStageMap[displayName].total_value += Number(l.lead_value) || 0;
          }
        });

        funnel = Object.values(openStageMap).sort((a, b) => a.sort_order - b.sort_order);
      } else {
        const openStages = stages.filter((st: any) => {
          const c = (st.code || '').toLowerCase();
          const n = (st.name || '').toLowerCase();
          return !c.includes('won') && !c.includes('lost') && !n.includes('won') && !n.includes('lost');
        });

        funnel = openStages
          .map((st: any) => ({
            stage_id: st.id,
            stage_name: st.name,
            code: st.code,
            count: stageCountsMap[st.id]?.count || 0,
            total_value: stageCountsMap[st.id]?.total_value || 0,
            sort_order: st.sort_order || st.id,
          }))
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      }

      // 8. Timeline map: Group by Month if > 60 days, or Day if <= 60 days
      const isMonthly = daysCount > 60;
      const dateSeriesMap: Record<string, { date: string; label: string; won_revenue: number; lost_revenue: number; leads_count: number; won_count: number; lost_count: number }> = {};

      if (isMonthly) {
        const mCurr = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);
        const mEnd = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 1);
        while (mCurr <= mEnd) {
          const key = `${mCurr.getFullYear()}-${String(mCurr.getMonth() + 1).padStart(2, "0")}`;
          const label = mCurr.toLocaleString("en-US", { month: "short", year: "numeric" });
          dateSeriesMap[key] = { date: key, label, won_revenue: 0, lost_revenue: 0, leads_count: 0, won_count: 0, lost_count: 0 };
          mCurr.setMonth(mCurr.getMonth() + 1);
        }

        leads.forEach((l: any) => {
          const ld = new Date(l.created_at);
          const key = `${ld.getFullYear()}-${String(ld.getMonth() + 1).padStart(2, "0")}`;
          const val = Number(l.lead_value) || 0;
          if (dateSeriesMap[key]) {
            dateSeriesMap[key].leads_count += 1;
            const stageObj = stages.find((s: any) => s.id === l.lead_pipeline_stage_id);
            const stageName = (stageObj?.name || "").toLowerCase();
            const stageCode = (stageObj?.code || "").toLowerCase();
            if (stageName.includes("won") || stageCode.includes("won")) {
              dateSeriesMap[key].won_revenue += val;
              dateSeriesMap[key].won_count += 1;
            } else if (stageName.includes("lost") || stageCode.includes("lost") || l.status === false) {
              dateSeriesMap[key].lost_revenue += val;
              dateSeriesMap[key].lost_count += 1;
            }
          }
        });
      } else {
        const curr = new Date(startDateObj);
        while (curr <= endDateObj) {
          const dStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`;
          const label = curr.toLocaleString("en-US", { month: "short", day: "numeric" });
          dateSeriesMap[dStr] = { date: dStr, label, won_revenue: 0, lost_revenue: 0, leads_count: 0, won_count: 0, lost_count: 0 };
          curr.setDate(curr.getDate() + 1);
        }

        leads.forEach((l: any) => {
          const ld = new Date(l.created_at);
          const dStr = `${ld.getFullYear()}-${String(ld.getMonth() + 1).padStart(2, "0")}-${String(ld.getDate()).padStart(2, "0")}`;
          const val = Number(l.lead_value) || 0;
          if (dateSeriesMap[dStr]) {
            dateSeriesMap[dStr].leads_count += 1;
            const stageObj = stages.find((s: any) => s.id === l.lead_pipeline_stage_id);
            const stageName = (stageObj?.name || "").toLowerCase();
            const stageCode = (stageObj?.code || "").toLowerCase();
            if (stageName.includes("won") || stageCode.includes("won")) {
              dateSeriesMap[dStr].won_revenue += val;
              dateSeriesMap[dStr].won_count += 1;
            } else if (stageName.includes("lost") || stageCode.includes("lost") || l.status === false) {
              dateSeriesMap[dStr].lost_revenue += val;
              dateSeriesMap[dStr].lost_count += 1;
            }
          }
        });
      }

      const timeline = Object.values(dateSeriesMap).sort((a, b) => a.date.localeCompare(b.date));

      // 9. Top Selling Products (combining real sales from lead_products and quote_items within date range)
      const topProductsRes = await pool.query(
        `SELECT
          p.id,
          p.name,
          COALESCE(p.price, 0) as price,
          COALESCE(sales.total_revenue, 0) as revenue,
          COALESCE(sales.total_qty, 0) as quantity_sold
        FROM products p
        LEFT JOIN (
          SELECT
            product_id,
            SUM(amount) as total_revenue,
            SUM(quantity) as total_qty
          FROM (
            SELECT lp.product_id, lp.amount, lp.quantity
            FROM lead_products lp
            JOIN leads l ON l.id = lp.lead_id
            WHERE l.created_at >= $1 AND l.created_at <= $2
            UNION ALL
            SELECT qi.product_id, qi.total as amount, qi.quantity
            FROM quote_items qi
            JOIN quotes q ON q.id = qi.quote_id
            WHERE q.created_at >= $1 AND q.created_at <= $2
          ) combined
          GROUP BY product_id
        ) sales ON sales.product_id = p.id
        ORDER BY revenue DESC, p.price DESC NULLS LAST, p.id ASC
        LIMIT 5`,
        [startDateStr, endDateStr]
      );
      const topProducts = topProductsRes.rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        revenue: Number(p.revenue) || 0,
        quantity_sold: Number(p.quantity_sold) || 0,
      }));

      // 10. Top Customers / Contacts by Revenue within date range
      const topPersonsRes = await pool.query(
        `SELECT
          p.id,
          p.name,
          p.emails,
          p.contact_numbers,
          COUNT(l.id) as deals_count,
          COALESCE(SUM(l.lead_value), 0) as revenue
        FROM persons p
        LEFT JOIN leads l ON l.person_id = p.id AND l.created_at >= $1 AND l.created_at <= $2
        GROUP BY p.id, p.name, p.emails, p.contact_numbers
        ORDER BY revenue DESC, deals_count DESC, p.id ASC
        LIMIT 5`,
        [startDateStr, endDateStr]
      );
      const topPersons = topPersonsRes.rows.map((r: any) => {
        let emailStr = "";
        try {
          const em = typeof r.emails === "string" ? JSON.parse(r.emails) : r.emails;
          emailStr = Array.isArray(em) ? em[0]?.value : "";
        } catch { emailStr = ""; }
        return {
          id: r.id,
          name: r.name,
          email: emailStr,
          deals_count: Number(r.deals_count) || 0,
          revenue: Number(r.revenue) || 0,
        };
      });

      // 11. Prior Period Comparison (for percentage badges)
      const diffMs = endDateObj.getTime() - startDateObj.getTime();
      const prevEndDate = new Date(startDateObj.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - diffMs);

      const prevLeadsRes = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(lead_value), 0) as total_val
         FROM leads
         WHERE created_at >= $1 AND created_at <= $2`,
        [prevStartDate.toISOString(), prevEndDate.toISOString()]
      );
      const prevTotalLeads = Number(prevLeadsRes.rows[0]?.count || 0);

      const calcProgress = (curr: number, prev: number): number => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
      };

      const progress = {
        won_revenue: calcProgress(wonRevenue, 0),
        lost_revenue: calcProgress(lostRevenue, 0),
        total_leads: calcProgress(totalLeads, prevTotalLeads),
        avg_lead_value: totalLeads > 0 ? 100 : 0,
        avg_leads_per_day: totalLeads > 0 ? 100 : 0,
        total_quotations: totalQuotations > 0 ? 100 : 0,
        total_persons: totalPersons > 0 ? 100 : 0,
        total_organizations: totalOrganizations > 0 ? 100 : 0,
      };

      return {
        pipelines,
        selected_pipeline_id: targetPipelineId || "all",
        start_date: startDateStr.split("T")[0],
        end_date: endDateStr.split("T")[0],
        won_revenue: wonRevenue,
        won_count: wonCount,
        lost_revenue: lostRevenue,
        lost_count: lostCount,
        avg_lead_value: avgLeadValue,
        total_leads: totalLeads,
        avg_leads_per_day: avgLeadsPerDay,
        total_quotations: totalQuotations,
        total_persons: totalPersons,
        total_organizations: totalOrganizations,
        funnel,
        revenue_by_source: Object.values(sourceCountsMap),
        revenue_by_type: Object.values(typeCountsMap),
        top_products: topProducts,
        top_persons: topPersons,
        timeline,
        progress,
      };
    } catch (error: any) {
      logger.error({ error, params }, "DashboardService.getDashboardStats failed");
      throw error;
    }
  }
}
