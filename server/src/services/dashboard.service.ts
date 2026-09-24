import { pool } from "@/config/db";
import { logger } from "@/utils/logger";

export class DashboardService {
  public static async getDashboardStats(params: {
    startDate?: string;
    endDate?: string;
    pipelineId?: string | number;
  }) {
    try {
      const now = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(now.getDate() - 30);

      const startDateStr = params.startDate ? new Date(params.startDate).toISOString() : defaultStart.toISOString();
      const endDateStr = params.endDate ? new Date(params.endDate).toISOString() : now.toISOString();
      const pipelineId = params.pipelineId && params.pipelineId !== "all" ? Number(params.pipelineId) : null;

      // 1. Fetch Pipelines
      const pipelinesRes = await pool.query("SELECT id, name, is_default FROM lead_pipelines ORDER BY id ASC");
      const pipelines = pipelinesRes.rows;
      const targetPipelineId = pipelineId || pipelines.find((p) => p.is_default)?.id || pipelines[0]?.id || 1;

      // 2. Fetch Pipeline Stages
      const stagesRes = await pool.query(
        "SELECT id, name, code, sort_order FROM lead_pipeline_stages WHERE lead_pipeline_id = $1 ORDER BY sort_order ASC",
        [targetPipelineId]
      );
      const stages = stagesRes.rows;

      // 3. Query Leads
      let leadWhere = "WHERE created_at >= $1 AND created_at <= $2";
      const queryParams: any[] = [startDateStr, endDateStr];

      if (targetPipelineId) {
        queryParams.push(targetPipelineId);
        leadWhere += ` AND lead_pipeline_id = $${queryParams.length}`;
      }

      const leadsRes = await pool.query(
        `SELECT id, title, lead_value, status, lead_pipeline_id, lead_pipeline_stage_id, lead_source_id, lead_type_id, created_at
         FROM leads ${leadWhere}`,
        queryParams
      );
      const leads = leadsRes.rows;

      // Total counters
      const totalLeads = leads.length;
      let totalLeadValueSum = 0;
      let wonCount = 0;
      let wonRevenue = 0;
      let lostCount = 0;
      let lostRevenue = 0;

      const stageCountsMap: Record<number, { count: number; total_value: number }> = {};
      stages.forEach((st) => {
        stageCountsMap[st.id] = { count: 0, total_value: 0 };
      });

      const sourceCountsMap: Record<string, { name: string; count: number; total_value: number }> = {};
      const typeCountsMap: Record<string, { name: string; count: number; total_value: number }> = {};

      leads.forEach((l) => {
        const val = Number(l.lead_value) || 0;
        totalLeadValueSum += val;

        const stageId = l.lead_pipeline_stage_id;
        if (stageId && stageCountsMap[stageId]) {
          stageCountsMap[stageId].count += 1;
          stageCountsMap[stageId].total_value += val;
        }

        const stageObj = stages.find((s) => s.id === stageId);
        const stageName = (stageObj?.name || "").toLowerCase();
        const stageCode = (stageObj?.code || "").toLowerCase();

        const isWon = stageName.includes("won") || stageCode.includes("won");
        const isLost = stageName.includes("lost") || stageCode.includes("lost");

        if (isWon) {
          wonCount += 1;
          wonRevenue += val;
        } else if (isLost) {
          lostCount += 1;
          lostRevenue += val;
        }
      });

      // 4. Quotations, Persons, Organizations
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
      const sourcesRes = await pool.query("SELECT id, name FROM lead_sources");
      const sourceMap: Record<number, string> = {};
      sourcesRes.rows.forEach((s) => (sourceMap[s.id] = s.name));

      leads.forEach((l) => {
        const val = Number(l.lead_value) || 0;
        const srcName = l.lead_source_id && sourceMap[l.lead_source_id] ? sourceMap[l.lead_source_id] : "Direct / Web Form";
        if (!sourceCountsMap[srcName]) {
          sourceCountsMap[srcName] = { name: srcName, count: 0, total_value: 0 };
        }
        sourceCountsMap[srcName].count += 1;
        sourceCountsMap[srcName].total_value += val;
      });

      // 6. Types Map
      const typesRes = await pool.query("SELECT id, name FROM lead_types");
      const typeMap: Record<number, string> = {};
      typesRes.rows.forEach((t) => (typeMap[t.id] = t.name));

      leads.forEach((l) => {
        const val = Number(l.lead_value) || 0;
        const typeName = l.lead_type_id && typeMap[l.lead_type_id] ? typeMap[l.lead_type_id] : "General Inquiry";
        if (!typeCountsMap[typeName]) {
          typeCountsMap[typeName] = { name: typeName, count: 0, total_value: 0 };
        }
        typeCountsMap[typeName].count += 1;
        typeCountsMap[typeName].total_value += val;
      });

      // Days count
      const startDateObj = new Date(startDateStr);
      const endDateObj = new Date(endDateStr);
      const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
      const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const avgLeadValue = totalLeads > 0 ? totalLeadValueSum / totalLeads : 0;
      const avgLeadsPerDay = totalLeads / daysCount;

      // Funnel array
      const funnel = stages.map((st) => ({
        stage_id: st.id,
        stage_name: st.name,
        code: st.code,
        count: stageCountsMap[st.id]?.count || 0,
        total_value: stageCountsMap[st.id]?.total_value || 0,
      }));

      // Timeline map
      const dateSeriesMap: Record<string, { date: string; won_revenue: number; lost_revenue: number; leads_count: number }> = {};
      const curr = new Date(startDateObj);
      while (curr <= endDateObj) {
        const dStr = curr.toISOString().split("T")[0];
        dateSeriesMap[dStr] = { date: dStr, won_revenue: 0, lost_revenue: 0, leads_count: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      leads.forEach((l) => {
        const dStr = new Date(l.created_at).toISOString().split("T")[0];
        const val = Number(l.lead_value) || 0;
        if (dateSeriesMap[dStr]) {
          dateSeriesMap[dStr].leads_count += 1;

          const stageObj = stages.find((s) => s.id === l.lead_pipeline_stage_id);
          const stageName = (stageObj?.name || "").toLowerCase();
          if (stageName.includes("won")) {
            dateSeriesMap[dStr].won_revenue += val;
          } else if (stageName.includes("lost")) {
            dateSeriesMap[dStr].lost_revenue += val;
          }
        }
      });

      const timeline = Object.values(dateSeriesMap).sort((a, b) => a.date.localeCompare(b.date));

      return {
        pipelines,
        selected_pipeline_id: targetPipelineId,
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
        timeline,
      };
    } catch (error: any) {
      logger.error({ error, params }, "DashboardService.getDashboardStats failed");
      throw error;
    }
  }
}
