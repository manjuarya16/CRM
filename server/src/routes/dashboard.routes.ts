import { Router } from "express";
import { DashboardService } from "@/services/dashboard.service";

const router = Router();

const handleGetStats = async (req: any, res: any, next: any) => {
  try {
    const startDate = typeof req.query.start_date === "string" ? req.query.start_date : undefined;
    const endDate = typeof req.query.end_date === "string" ? req.query.end_date : undefined;
    const pipelineId = req.query.pipeline_id ? String(req.query.pipeline_id) : undefined;

    const stats = await DashboardService.getDashboardStats({
      start_date: startDate,
      end_date: endDate,
      pipeline_id: pipelineId,
    });
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

router.get("/stats", handleGetStats);
router.get("/", handleGetStats);

export default router;
