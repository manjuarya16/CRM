export interface RealtimeEventPayload<T = any> {
  type: string;
  data: T;
  timestamp: string;
}

export type LeadEventCallback = (event: RealtimeEventPayload) => void;
export type NotificationEventCallback = (event: RealtimeEventPayload) => void;
