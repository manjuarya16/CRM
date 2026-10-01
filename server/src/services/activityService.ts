import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import type { IActivityCreateInput, IActivityUpdateInput } from "@/interfaces/activityInterface";
import { notifyCRMActivity } from "@/utils/notificationHelper";
import { processWorkflowsForEvent } from "@/utils/workflowEngine";
import { WorkflowService } from "@/services/workflow.service";

const logger = pino();

const getActivities = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const search = String(req.query.search || "");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit || req.query.per_page) || 100);
    const leadId = req.query.lead_id ? Number(req.query.lead_id) : null;
    const personId = req.query.person_id ? Number(req.query.person_id) : null;

    const result = await connection.query(
      "SELECT * FROM public.fn_get_all_activities($1, $2, $3, $4, $5)",
      [search, page, limit, leadId, personId]
    );


    const total = result.rows.length > 0 ? Number(result.rows[0].total_count || result.rows.length) : 0;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: result.rows,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const getActivityById = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id);
    const result = await connection.query(
      "SELECT * FROM public.fn_get_activity_by_id($1)",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(HttpStatusCodes.NOT_FOUND).json({
        success: false,
        message: "Activity not found",
      });
      return;
    }

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const createActivity = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const {
      title,
      type,
      comment,
      schedule_from,
      schedule_to,
      is_done,
      user_id,
      location,
      lead_id,
      person_id,
    }: IActivityCreateInput = req.body;

    const currentUserId = user_id || (req as any).user?.id || null;

    const result = await connection.query(
      "SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        title || null,
        type || "call",
        comment || null,
        schedule_from || null,
        schedule_to || null,
        is_done ?? false,
        currentUserId,
        location || null,
        lead_id || null,
        person_id || null,
      ]
    );

    const createdActivity = result.rows[0];

    notifyCRMActivity({
      title: `Activity Scheduled: ${title || type || "New Activity"}`,
      message: `A new ${type || "activity"} scheduled for ${schedule_from || "today"}`,
      module: "activity",
      entityId: createdActivity?.id || null,
      actionType: "created",
      userId: currentUserId,
      createdBy: (req as any).user?.id || null,
    });

    if (createdActivity?.id) {
      processWorkflowsForEvent('activities', 'created', createdActivity.id, (req as any).user).catch(() => { });
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "Activity created successfully",
      data: createdActivity,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const updateActivity = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id || req.body.id);
    const {
      title,
      type,
      comment,
      schedule_from,
      schedule_to,
      is_done,
      user_id,
      location,
      lead_id,
      person_id,
    }: IActivityUpdateInput & { lead_id?: number; person_id?: number } = req.body;

    const result = await connection.query(
      "SELECT * FROM public.fn_update_activity($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        id,
        title ?? null,
        type ?? null,
        comment ?? null,
        schedule_from ?? null,
        schedule_to ?? null,
        is_done ?? null,
        user_id ?? null,
        location ?? null,
      ]
    );

    // Update lead association if provided
    if (lead_id !== undefined) {
      await connection.query("DELETE FROM lead_activities WHERE activity_id = $1", [id]);
      if (lead_id) {
        await connection.query(
          "INSERT INTO lead_activities (activity_id, lead_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [id, lead_id]
        );
      }
    }

    // Update person association if provided
    if (person_id !== undefined) {
      await connection.query("DELETE FROM person_activities WHERE activity_id = $1", [id]);
      if (person_id) {
        await connection.query(
          "INSERT INTO person_activities (activity_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [id, person_id]
        );
      }
    }

    if (is_done) {
      notifyCRMActivity({
        title: `Activity Completed: ${title || "Activity"}`,
        message: `Activity #${id} has been marked as completed`,
        module: "activity",
        entityId: id,
        actionType: "updated",
        userId: user_id || null,
        createdBy: (req as any).user?.id || null,
      });
    }

    if (id) {
      processWorkflowsForEvent('activities', 'updated', id, (req as any).user).catch(() => { });
    }
    const updatedActivity = result.rows[0];
    WorkflowService.triggerWorkflows('activities', 'update', updatedActivity || { id }).catch((e) => logger.error(e));

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Activity updated successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const deleteActivity = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id || req.body.id);
    await connection.query(
      "SELECT public.fn_delete_activity($1) AS deleted",
      [id]
    );

    WorkflowService.triggerWorkflows('activities', 'delete', { id }).catch((e) => logger.error(e));

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Activity deleted successfully",
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

export default {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
};
