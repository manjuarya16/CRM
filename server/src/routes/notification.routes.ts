import { Router } from "express";
import notificationService from "@/services/notificationService";
import { requireAuth } from "@/middleware/auth";

const router = Router();

router.get("/", requireAuth, notificationService.getNotifications);
router.get("/count", requireAuth, notificationService.getUnreadCount);
router.patch("/read-all", requireAuth, notificationService.markAllAsRead);
router.patch("/:id/read", requireAuth, notificationService.markAsRead);
router.delete("/clear-all", requireAuth, notificationService.clearAllNotifications);
router.delete("/:id", requireAuth, notificationService.deleteNotification);

export default router;
