import { createActivityNotification } from "@/services/notificationService";
import { SseService } from "@/services/sse.service";
import { logger } from "@/utils/logger";

export const notifyCRMActivity = async ({
  title,
  message,
  module,
  entityId,
  actionType = "created",
  userId = null,
  createdBy = null,
}: {
  title: string;
  message: string;
  module: 'lead' | 'activity' | 'quote' | 'person' | 'organization' | 'mail' | 'user' | string;
  entityId?: number | null;
  actionType?: 'created' | 'updated' | 'deleted' | 'assigned' | 'stage_changed' | string;
  userId?: number | null;
  createdBy?: number | null;
}): Promise<void> => {
  try {
    await createActivityNotification({
      title,
      message,
      module,
      entityId: entityId ?? null,
      actionType,
      userId: userId ?? null,
      createdBy: createdBy ?? null,
    });

    // Real-time SSE push for notification badge & alert
    SseService.emitNotificationEvent({
      userId: userId ?? undefined,
      notification: { title, message, module, entityId, actionType },
    });

    // Real-time SSE push for leads Kanban / Table
    if (module === 'lead' || module === 'leads') {
      const eventType = actionType === 'deleted' ? 'lead:deleted' : (actionType === 'created' ? 'lead:created' : 'lead:updated');
      SseService.emitLeadEvent(eventType, {
        id: entityId,
        actionType,
      });
    }
  } catch (error) {
    logger.warn({ error, title, module }, "notifyCRMActivity failed silently without blocking main transaction");
  }
};
