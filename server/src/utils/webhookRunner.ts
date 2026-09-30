import { logger } from '@/utils/logger';

export interface WebhookConfig {
  method: string;
  end_point: string;
  headers?: Array<{ key: string; value: string }> | null;
  query_params?: Array<{ key: string; value: string }> | null;
  payload_type?: string | null;        // 'default' | 'x-www-form-urlencoded' | 'raw'
  raw_payload_type?: string | null;    // 'json' | 'text'
  payload?: any;
}

export interface WebhookResult {
  status: 'success' | 'error';
  status_code?: number;
  response?: string;
}

/**
 * Append query params from [{key,value}] array to a URL.
 */
function appendQueryParams(url: string, params?: Array<{ key: string; value: string }> | null): string {
  if (!params || params.length === 0) return url;
  const qs = params
    .filter((p) => p.key && p.key.trim())
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value ?? '')}`)
    .join('&');
  if (!qs) return url;
  return url + (url.includes('?') ? '&' : '?') + qs;
}

/**
 * Convert [{key,value}] header array to a plain object.
 */
function normalizeHeaders(headers?: Array<{ key: string; value: string }> | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;
  for (const h of headers) {
    if (h.key && h.key.trim()) {
      result[h.key.trim()] = h.value ?? '';
    }
  }
  return result;
}

/**
 * Build the fetch RequestInit based on method, payload_type, and payload.
 */
function buildFetchOptions(
  method: string,
  headers: Record<string, string>,
  payload: any,
  payloadType: string,
  rawPayloadType: string
): RequestInit {
  const upperMethod = method.toUpperCase();
  const opts: RequestInit = { method: upperMethod, headers, signal: AbortSignal.timeout(30_000) };

  if (!payload || ['GET', 'HEAD'].includes(upperMethod)) return opts;

  if (payloadType === 'x-www-form-urlencoded') {
    const body = typeof payload === 'object' ? new URLSearchParams(payload).toString() : String(payload);
    (opts.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.body = body;
  } else if (payloadType === 'raw') {
    if (rawPayloadType === 'text') {
      (opts.headers as Record<string, string>)['Content-Type'] = 'text/plain';
      opts.body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    } else {
      // raw json
      (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
      opts.body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    }
  } else {
    // default → JSON
    const existingCT = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type');
    if (!existingCT) {
      (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
    opts.body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  return opts;
}

/**
 * Fire a webhook HTTP request to the configured endpoint.
 * Returns result with status, status_code, and response body.
 */
export async function fireWebhook(config: WebhookConfig): Promise<WebhookResult> {
  const { method, payload_type = 'default', raw_payload_type = 'json', payload } = config;

  const url = appendQueryParams(config.end_point, config.query_params);
  const headers = normalizeHeaders(config.headers);
  const fetchOpts = buildFetchOptions(method, headers, payload, payload_type ?? 'default', raw_payload_type ?? 'json');

  try {
    const res = await fetch(url, fetchOpts);
    const body = await res.text();
    logger.info({ url, method, status: res.status }, '[Webhook] Fired successfully');
    return { status: 'success', status_code: res.status, response: body };
  } catch (err: any) {
    logger.error({ url, method, err: err?.message }, '[Webhook] Fire failed');
    return { status: 'error', response: err?.message };
  }
}
