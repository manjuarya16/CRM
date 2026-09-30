import { Router, Request, Response } from "express";
import activityService from "@/services/activityService";
import { requireAuth } from "@/middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "activities");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `act-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

const router = Router();

router.post("/upload-file", requireAuth, upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }
  const fileUrl = `/uploads/activities/${req.file.filename}`;
  res.status(200).json({
    success: true,
    fileUrl,
    filename: req.file.originalname,
  });
});

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
