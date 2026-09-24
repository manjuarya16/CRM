export interface INotificationItem {
  id: number;
  user_id?: number | null;
  title: string;
  message: string;
  module: 'lead' | 'activity' | 'quote' | 'person' | 'organization' | 'mail' | 'user' | 'system' | string;
  entity_id?: number | null;
  action_type: 'created' | 'updated' | 'deleted' | 'assigned' | 'stage_changed' | 'commented' | string;
  is_read: boolean;
  created_by?: number | null;
  created_by_name?: string;
  created_at: string | Date;
  total_count?: number;
}

export interface ICreateNotificationInput {
  userId?: number | null;
  title: string;
  message: string;
  module: string;
  entityId?: number | null;
  actionType?: string;
  createdBy?: number | null;
}
