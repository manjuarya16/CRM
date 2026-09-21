import { Router, Request, Response } from "express";
import leadService from "@/services/leadService";
import { requireAuth } from "@/middleware/auth";

const router = Router();

router.get("/sources", requireAuth, (req: Request, res: Response) => {
  leadService.getLeadSources(req, res);
});

router.get("/types", requireAuth, (req: Request, res: Response) => {
  leadService.getLeadTypes(req, res);
});

router.get("/pipelines", requireAuth, (req: Request, res: Response) => {
  leadService.getLeadPipelines(req, res);
});

router.get("/stages", requireAuth, (req: Request, res: Response) => {
  leadService.getPipelineStages(req, res);
});

router.get("/", requireAuth, (req: Request, res: Response) => {
  leadService.getLeads(req, res);
});

router.post("/create", requireAuth, (req: Request, res: Response) => {
  leadService.createLead(req, res);
});

router.put("/update/:id", requireAuth, (req: Request, res: Response) => {
  leadService.updateLead(req, res);
});

router.delete("/delete/:id", requireAuth, (req: Request, res: Response) => {
  leadService.deleteLead(req, res);
});

router.get("/:id/products", requireAuth, (req: Request, res: Response) => {
  leadService.getLeadProducts(req, res);
});

router.post("/:id/products", requireAuth, (req: Request, res: Response) => {
  leadService.addLeadProduct(req, res);
});

router.delete("/products/:itemId", requireAuth, (req: Request, res: Response) => {
  leadService.deleteLeadProduct(req, res);
});

router.put("/:id/stage", requireAuth, (req: Request, res: Response) => {
  leadService.updateLeadStage(req, res);
});

router.get("/kanban", requireAuth, (req: Request, res: Response) => {
  leadService.getKanbanLeads(req, res);
});

router.get("/:id", requireAuth, (req: Request, res: Response) => {
  leadService.getLeadById(req, res);
});

export default router;
