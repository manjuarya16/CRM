import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import leadService from "@/services/leadService";
import { requireAuth } from "@/middleware/auth";

const router = Router();

// Configure multer for file uploads (max 10MB, pdf/images)
const upload = multer({
  dest: path.join(process.cwd(), "uploads", "leads"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/bmp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed (pdf, jpeg, jpg, png, webp, bmp)"));
    }
  },
});

// ─── Static routes (must come before dynamic /:id) ──────────────────────────

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

router.get("/kanban", requireAuth, (req: Request, res: Response) => {
  leadService.getKanbanLeads(req, res);
});

// ─── File upload – create lead from uploaded file ────────────────────────────

router.post(
  "/create-by-ai",
  requireAuth,
  upload.single("file"),
  (req: Request, res: Response) => {
    leadService.createLeadByAI(req, res);
  }
);

// ─── CRUD ────────────────────────────────────────────────────────────────────

router.get("/", requireAuth, (req: Request, res: Response) => {
  leadService.getLeads(req, res);
});

router.post("/create", requireAuth, (req: Request, res: Response) => {
  leadService.createLead(req, res);
});

router.post("/", requireAuth, (req: Request, res: Response) => {
  leadService.createLead(req, res);
});

router.put("/update/:id", requireAuth, (req: Request, res: Response) => {
  leadService.updateLead(req, res);
});

router.put("/:id", requireAuth, (req: Request, res: Response) => {
  leadService.updateLead(req, res);
});

router.delete("/delete/:id", requireAuth, (req: Request, res: Response) => {
  leadService.deleteLead(req, res);
});

router.delete("/:id", requireAuth, (req: Request, res: Response) => {
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

// ─── Stage update ─────────────────────────────────────────────────────────────

router.put("/:id/stage", requireAuth, (req: Request, res: Response) => {
  leadService.updateLeadStage(req, res);
});

// ─── Single lead (must be last) ───────────────────────────────────────────────

router.get("/:id", requireAuth, (req: Request, res: Response) => {
  leadService.getLeadById(req, res);
});

export default router;

