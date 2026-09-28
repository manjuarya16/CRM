import { Router } from "express";
import { DashboardService } from "@/services/dashboard.service";

const router = Router();

router.get("/stats", async (req, res, next) => {
  try {
    const startDate = typeof req.query.start_date === "string" ? req.query.start_date : undefined;
    const endDate = typeof req.query.end_date === "string" ? req.query.end_date : undefined;
    const pipelineId = req.query.pipeline_id ? String(req.query.pipeline_id) : undefined;

    const stats = await DashboardService.getDashboardStats({ startDate, endDate, pipelineId });
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

export default router;
