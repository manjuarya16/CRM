import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import { logger } from "@/utils/logger";
import { ICreateNotificationInput, INotificationItem } from "@/interfaces";

const getNotifications = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const userId = req.user?.id || null;
    const isReadParam = req.query.is_read;
    const isRead = isReadParam !== undefined && isReadParam !== "" ? isReadParam === "true" : null;
    const moduleName = req.query.module ? String(req.query.module) : null;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit || req.query.per_page) || 10);

    // Safely generate reminders without breaking notification queries
    try {
      await connection.query("SELECT public.fn_generate_activity_reminders($1)", [userId]);
    } catch (e: any) {
      logger.warn({ error: e.message }, "fn_generate_activity_reminders non-blocking warning");
    }

    const result = await connection.query<INotificationItem>(
      "SELECT * FROM public.fn_get_all_notifications($1, $2, $3, $4, $5)",
      [userId, isRead, moduleName, page, limit]
    );

    const countResult = await connection.query(
      "SELECT public.fn_get_unread_notification_count($1) as unread_count",
      [userId]
    );

    const total = result.rows.length > 0 ? Number(result.rows[0].total_count || result.rows.length) : 0;
    const unreadCount = Number(countResult.rows[0]?.unread_count || 0);

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: result.rows,
      total,
      unreadCount,
      page,
      limit,
    });
  } catch (error: any) {
    logger.error({ error }, "notificationService.getNotifications failed");
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const userId = req.user?.id || null;

    // Safely generate reminders
    try {
      await connection.query("SELECT public.fn_generate_activity_reminders($1)", [userId]);
    } catch (e: any) {
      logger.warn({ error: e.message }, "fn_generate_activity_reminders non-blocking warning");
    }

    const result = await connection.query(
      "SELECT public.fn_get_unread_notification_count($1) as unread_count",
      [userId]
    );

    const count = Number(result.rows[0]?.unread_count || 0);

    res.status(HttpStatusCodes.OK).json({
      success: true,
      unreadCount: count,
      data: { count, unreadCount: count },
    });
  } catch (error: any) {
    logger.error({ error }, "notificationService.getUnreadCount failed");
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const markAsRead = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id);
    const userId = req.user?.id || null;

    await connection.query(
      "SELECT public.fn_mark_notification_as_read($1, $2)",
      [id, userId]
    );

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error: any) {
    logger.error({ error }, "notificationService.markAsRead failed");
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const userId = req.user?.id || null;

    const result = await connection.query(
      "SELECT public.fn_mark_all_notifications_as_read($1) as updated_count",
      [userId]
    );

    const updatedCount = Number(result.rows[0]?.updated_count || 0);

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: `Marked ${updatedCount} notifications as read`,
      data: { updatedCount },
    });
  } catch (error: any) {
    logger.error({ error }, "notificationService.markAllAsRead failed");
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id);
    const userId = req.user?.id || null;

    await connection.query(
      "SELECT public.fn_delete_notification($1, $2)",
      [id, userId]
    );

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error: any) {
    logger.error({ error }, "notificationService.deleteNotification failed");
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const clearAllNotifications = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const userId = req.user?.id || null;

    const result = await connection.query(
      "SELECT public.fn_clear_all_notifications($1) as deleted_count",
      [userId]
    );

    const deletedCount = Number(result.rows[0]?.deleted_count || 0);

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: `Cleared ${deletedCount} notifications`,
      data: { deletedCount },
    });
  } catch (error: any) {
    logger.error({ error }, "notificationService.clearAllNotifications failed");
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

/**
 * Direct programmatic notification dispatcher (called by other services)
 */
export const createActivityNotification = async (
  input: ICreateNotificationInput
): Promise<any> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const result = await connection.query(
      "SELECT public.fn_create_notification($1, $2, $3, $4, $5, $6, $7) as result",
      [
        input.userId ?? null,
        input.title,
        input.message,
        input.module,
        input.entityId ?? null,
        input.actionType || "created",
        input.createdBy ?? null,
      ]
    );
    return result.rows[0]?.result || null;
  } catch (error) {
    logger.error({ error, input }, "createActivityNotification failed");
    return null;
  } finally {
    connection?.release();
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  createActivityNotification,
};
