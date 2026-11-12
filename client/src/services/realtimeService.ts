import { API_URL } from "@/config";
import type { LeadEventCallback, NotificationEventCallback } from "@/interface";
import { getToken } from "@/lib/auth-utils";
import { getSubdomain } from "@/utils/subdomain";

class RealtimeService {
  private eventSource: EventSource | null = null;
  private leadListeners: Set<LeadEventCallback> = new Set();
  private notificationListeners: Set<NotificationEventCallback> = new Set();
  private reconnectTimer: any = null;
  private isConnecting = false;
  private currentToken: string | null = null;
  private currentSlug: string | null = null;

  public start(): void {
    const token = getToken() || "";
    const { slug } = getSubdomain();
    const savedSlug =
      typeof window !== "undefined"
        ? sessionStorage.getItem("active_tenant_slug") || localStorage.getItem("active_tenant_slug")
        : null;
    const effectiveSlug = slug || savedSlug || "";

    if (!token) {
      if (this.eventSource) {
        this.close();
      }
      return;
    }

    if (
      this.eventSource &&
      (this.currentToken !== token || this.currentSlug !== effectiveSlug)
    ) {
      this.close();
    }

    if (this.eventSource || this.isConnecting) return;

    this.isConnecting = true;
    this.currentToken = token;
    this.currentSlug = effectiveSlug;

    const params = new URLSearchParams({ token });
    if (effectiveSlug) {
      params.set("slug", effectiveSlug);
    }
    const url = `${API_URL}/realtime/stream?${params.toString()}`;

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
    this.currentToken = null;
    this.currentSlug = null;
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
