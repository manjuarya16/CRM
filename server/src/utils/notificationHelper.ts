import { createActivityNotification } from "@/services/notificationService";
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
  } catch (error) {
    logger.warn({ error, title, module }, "notifyCRMActivity failed silently without blocking main transaction");
  }
};
