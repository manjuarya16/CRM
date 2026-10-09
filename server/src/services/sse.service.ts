import { Request, Response } from 'express';
import { logger } from '@/utils/logger';

export interface SseClient {
  id: string;
  userId?: number;
  res: Response;
}

export interface RealtimeEvent<T = any> {
  type: 'lead:created' | 'lead:updated' | 'lead:deleted' | 'notification:new' | 'notification:count' | 'ping';
  data: T;
  timestamp: string;
}

export class SseService {
  private static clients: Map<string, SseClient> = new Map();
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  static init(): void {
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        this.broadcast({
          type: 'ping',
          data: {},
          timestamp: new Date().toISOString(),
        });
      }, 25000);
      // Ensure interval does not prevent node process exit if needed
      if (this.heartbeatTimer.unref) {
        this.heartbeatTimer.unref();
      }
    }
  }

  static handleConnection(req: Request, res: Response): void {
    const userId = (req.user as any)?.id ? Number((req.user as any).id) : undefined;
    const clientId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() })}\n\n`);

    const client: SseClient = { id: clientId, userId, res };
    this.clients.set(clientId, client);
    logger.info(`[SSE] Client connected: ${clientId} (User #${userId || 'anon'}). Total active streams: ${this.clients.size}`);

    req.on('close', () => {
      this.clients.delete(clientId);
      logger.info(`[SSE] Client disconnected: ${clientId}. Total active streams: ${this.clients.size}`);
    });
  }

  static broadcast<T>(event: RealtimeEvent<T>): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(payload);
      } catch (err: any) {
        logger.warn(`[SSE] Failed to send to client ${clientId}, removing: ${err.message}`);
        this.clients.delete(clientId);
      }
    }
  }

  static emitToUser<T>(userId: number, event: RealtimeEvent<T>): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
        } catch (err: any) {
          logger.warn(`[SSE] Failed to send to client ${clientId}: ${err.message}`);
          this.clients.delete(clientId);
        }
      }
    }
  }

  static emitLeadEvent(type: 'lead:created' | 'lead:updated' | 'lead:deleted', data: any): void {
    logger.info(`[SSE] Broadcasting ${type} event to all clients (Active streams: ${this.clients.size})`);
    this.broadcast({
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static emitNotificationEvent(data: { userId?: number; unreadCount?: number; notification?: any }): void {
    logger.info(`[SSE] Broadcasting notification event (Active streams: ${this.clients.size})`);
    if (data.userId) {
      this.emitToUser(data.userId, {
        type: 'notification:new',
        data,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.broadcast({
        type: 'notification:new',
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

SseService.init();
