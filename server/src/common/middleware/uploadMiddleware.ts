import multer from "multer";
import fs from "fs";
import path from "path";
import pino from "pino";

const logger = pino();
const uploadPath = path.join(process.cwd(), "uploads");

try {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });

    logger.info({
      message: "Upload directory created",
      path: uploadPath,
    });
  }
} catch (error) {
  logger.error(
    {
      error: error instanceof Error ? error.message : error,
    },
    "Failed to initialize upload directory",
  );
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_").trim();
    const baseName = safeName || "upload";
    cb(null, `${Date.now()}-${baseName}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedMime = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  if (!allowedMime.includes(file.mimetype)) {
    logger.warn(
      { mimetype: file.mimetype },
      "Rejected upload due to invalid file type",
    );

    return cb(new Error("Only JPG, PNG, GIF, WEBP, PDF allowed"));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
