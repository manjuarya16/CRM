import { API_URL } from "@/config";
import type { LeadEventCallback, NotificationEventCallback } from "@/interface";

class RealtimeService {
  private eventSource: EventSource | null = null;
  private leadListeners: Set<LeadEventCallback> = new Set();
  private notificationListeners: Set<NotificationEventCallback> = new Set();
  private reconnectTimer: any = null;
  private isConnecting = false;

  public start(): void {
    if (this.eventSource || this.isConnecting) return;

    const token = sessionStorage.getItem("token") || "";
    if (!token) return;

    this.isConnecting = true;
    const url = `${API_URL}/realtime/stream?token=${encodeURIComponent(token)}`;

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        // console.log("[Realtime] Connected to SSE server stream");
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "ping" || payload.type === "connected") return;

          if (payload.type?.startsWith("lead:")) {
            this.leadListeners.forEach((cb) => {
              try { cb(payload); } catch (e) { console.error("[Realtime] Lead listener error:", e); }
            });
          }

          if (payload.type?.startsWith("notification:")) {
            this.notificationListeners.forEach((cb) => {
              try { cb(payload); } catch (e) { console.error("[Realtime] Notification listener error:", e); }
            });
          }
        } catch (err) {
          console.warn("[Realtime] Malformed SSE message received:", err);
        }
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        this.close();
        // Exponential/gentle reconnect after 5s
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.start();
          }, 5000);
        }
      };
    } catch (err) {
      this.isConnecting = false;
      console.warn("[Realtime] Could not initialize EventSource:", err);
    }
  }

  public close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isConnecting = false;
  }

  public onLeadChange(callback: LeadEventCallback): () => void {
    this.leadListeners.add(callback);
    this.start();
    return () => {
      this.leadListeners.delete(callback);
    };
  }

  public onNotificationChange(callback: NotificationEventCallback): () => void {
    this.notificationListeners.add(callback);
    this.start();
    return () => {
      this.notificationListeners.delete(callback);
    };
  }
}

export const realtimeService = new RealtimeService();
