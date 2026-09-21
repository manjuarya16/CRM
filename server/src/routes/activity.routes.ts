import { Router, Request, Response } from "express";
import activityService from "@/services/activityService";
import { requireAuth } from "@/middleware/auth";

const router = Router();

router.get("/", requireAuth, (req: Request, res: Response) => {
  activityService.getActivities(req, res);
});

router.post("/create", requireAuth, (req: Request, res: Response) => {
  activityService.createActivity(req, res);
});

router.post("/", requireAuth, (req: Request, res: Response) => {
  activityService.createActivity(req, res);
});

router.put("/update/:id", requireAuth, (req: Request, res: Response) => {
  activityService.updateActivity(req, res);
});

router.put("/:id", requireAuth, (req: Request, res: Response) => {
  activityService.updateActivity(req, res);
});

router.delete("/delete/:id", requireAuth, (req: Request, res: Response) => {
  activityService.deleteActivity(req, res);
});

router.delete("/:id", requireAuth, (req: Request, res: Response) => {
  activityService.deleteActivity(req, res);
});

router.get("/:id", requireAuth, (req: Request, res: Response) => {
  activityService.getActivityById(req, res);
});

export default router;
