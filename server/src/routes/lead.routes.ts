import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import leadService from "@/services/leadService";
import { requireAuth } from "@/middleware/auth";

const router = Router();

// Configure multer for file uploads (max 50MB, pdf/images/documents/jmx/txt/csv)
const upload = multer({
  dest: path.join(process.cwd(), "uploads", "leads"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Configure multer for general lead attachments (accepts any document/file like .jmx, txt, csv, pdf, etc. max 50MB)
const leadAttachmentDir = path.join(process.cwd(), "uploads", "leads");
if (!fs.existsSync(leadAttachmentDir)) {
  fs.mkdirSync(leadAttachmentDir, { recursive: true });
}
const uploadLeadAttachment = multer({
  dest: leadAttachmentDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Helper middleware to catch multer errors gracefully without throwing 500
const handleMulterUpload = (uploadMiddleware: any) => (req: Request, res: Response, next: any) => {
  uploadMiddleware(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload error",
      });
    }
    next();
  });
};

const audioDir = path.join(process.cwd(), "uploads", "voice");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Configure multer for voice audio recording uploads (max 25MB)
const uploadAudio = multer({
  dest: audioDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
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
  handleMulterUpload(upload.single("file")),
  (req: Request, res: Response) => {
    leadService.createLeadByAI(req, res);
  }
);

// ─── Voice Lead Creation ────────────────────────────────────────────────────

router.post(
  "/parse-voice",
  requireAuth,
  uploadAudio.single("audio"),
  (req: Request, res: Response) => {
    leadService.parseVoiceLead(req, res);
  }
);

router.post(
  "/create-by-voice",
  requireAuth,
  uploadAudio.single("audio"),
  (req: Request, res: Response) => {
    leadService.createLeadByVoice(req, res);
  }
);

router.post(
  "/:id/upload-file",
  requireAuth,
  handleMulterUpload(uploadLeadAttachment.single("file")),
  (req: Request, res: Response) => {
    leadService.uploadLeadFile(req, res);
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

router.post("/bulk-delete", requireAuth, (req: Request, res: Response) => {
  leadService.deleteBulkLeads(req, res);
});

router.delete("/bulk-delete", requireAuth, (req: Request, res: Response) => {
  leadService.deleteBulkLeads(req, res);
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

