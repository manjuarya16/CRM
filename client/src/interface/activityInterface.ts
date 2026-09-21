export interface IActivity {
  id: number;
  title?: string;
  type: string;
  comment?: string;
  schedule_from?: string;
  schedule_to?: string;
  is_done?: boolean;
  location?: string;
  user_id?: number;
  user_name?: string;
  lead_id?: number;
  person_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityStore {
  activities: IActivity[];
  total: number;
  loading: boolean;
  error: string | null;
  selectedActivity: IActivity | null;
  fetchActivities: (page?: number, limit?: number, search?: string, leadId?: number) => Promise<void>;
  fetchActivityById: (id: number) => Promise<IActivity | null>;
  addActivity: (data: any) => Promise<any>;
  updateActivity: (id: number, data: any) => Promise<any>;
  deleteActivity: (id: number) => Promise<void>;
  setSelectedActivity: (activity: IActivity | null) => void;
  clearError: () => void;
}
