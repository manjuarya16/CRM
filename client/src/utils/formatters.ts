/**
 * Centralized formatting utilities
 */

export const formatDate = (
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", options || {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", options || {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export const formatCurrency = (
  amount: number | string | null | undefined,
  currency: string = "USD"
): string => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatFileSize = (bytes: number | null | undefined): string => {
  const b = Number(bytes) || 0;
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const truncateString = (str: string | null | undefined, maxLength: number = 50): string => {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
};

export const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const timeAgo = (date: string | number | Date | null | undefined): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
};

/**
 * Strips all HTML tags, <style>/<script>/<head> blocks, comments, and decodes HTML entities
 * so email bodies and activity comments render as clean plain text without raw HTML markup.
 */
export const stripHtmlToText = (input: string | null | undefined): string => {
  if (!input) return "";
  let text = String(input);

  // Remove HTML comments and DOCTYPE
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<!DOCTYPE[^>]*>/gi, "");

  // Remove <style>, <script>, <head>, <title>, <xml>, <svg> blocks completely
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
  text = text.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  text = text.replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, "");
  text = text.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");

  // Strip CSS block debris, @media rules, and inline style fragments that leaked into text
  text = text
    .replace(/@media[^{]*\{[^{}]*\{[^{}]*\}\s*\}/gi, "")
    .replace(/@[a-zA-Z0-9_-]+[^{]*\{[^}]*\}/gi, "")
    .replace(/(?:^|\n)\s*[.#][a-zA-Z0-9_\-#.,\s>:+]+\s*\{[^}]*\}/gm, "")
    .replace(/(?:padding|margin|font|color|background|width|height|border|display|line-height|text-align)[a-z-]*\s*:\s*[^;{}\n]+(?:!important)?\s*;?\s*\}?\s*\d*/gi, "")
    .replace(/!important\s*;\s*\}\s*\d*/gi, "")
    .replace(/^[ \t]*\}?\s*\d+\s*$/gm, "");

  // Preserve email addresses inside angle brackets like <user@example.com> before stripping HTML tags
  text = text.replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, "$1");

  // Convert mailto anchor tags <a href="mailto:x@y.com">...</a> to just the email address or text
  text = text.replace(
    /<a\b[^>]*href=["']mailto:([^"'?>]+)(?:\?[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, mailtoAddr, innerHtml) => {
      const cleanInner = innerHtml.replace(/<[^>]+>/g, "").trim();
      return cleanInner || mailtoAddr.trim();
    }
  );

  // Convert line-break and block-level tags to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|tr|li|h[1-6]|blockquote|section|article|header|footer|table)>/gi, "\n");
  text = text.replace(/<li\b[^>]*>/gi, "• ");
  text = text.replace(/<\/(td|th)>/gi, " \t ");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&bull;/gi, "•")
    .replace(/&copy;/gi, "©")
    .replace(/&reg;/gi, "®")
    .replace(/&#(\d+);/g, (_m, code) => {
      const n = parseInt(code, 10);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    });

  // Second pass: if entity decoding revealed encoded HTML tags (e.g. &lt;div&gt;), strip them too
  if (/<\/?[a-zA-Z][^>]*>/.test(text)) {
    text = text
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
      .replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, "$1")
      .replace(/<[^>]+>/g, "");
  }

  // Clean up excessive horizontal spaces and blank lines
  text = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
};

/**
 * Extracts only the clean email address from any raw string, HTML snippet, mailto link, or object.
 */
export const cleanEmailAddress = (raw: any): string => {
  if (!raw) return "";

  if (typeof raw === "object") {
    if (Array.isArray(raw)) {
      return raw.length > 0 ? cleanEmailAddress(raw[0]) : "";
    }
    const candidate = raw.email ?? raw.value ?? raw.address ?? "";
    return candidate ? cleanEmailAddress(candidate) : "";
  }

  let str = String(raw).trim();
  if (!str) return "";

  // If JSON string, parse it
  if ((str.startsWith("[") && str.endsWith("]")) || (str.startsWith("{") && str.endsWith("}"))) {
    try {
      return cleanEmailAddress(JSON.parse(str));
    } catch {}
  }

  // Decode HTML entities and strip HTML tags
  str = str
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\bmailto:\s*/gi, "")
    .trim();

  // Extract valid email address if present
  const emailMatch = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    return emailMatch[1].toLowerCase().trim();
  }

  return str.replace(/^[<>"'\s]+|[<>"'\s]+$/g, "").trim();
};



/**
 * Formats email bodies into clean, safe HTML suitable for rendering in the email viewer.
 * Cleans out CSS debris, un-wraps multiline tracking URLs, transforms ugly links into clean clickable anchors,
 * and preserves paragraph and text readability.
 */
export const formatEmailBodyHtml = (input: string | null | undefined): string => {
  if (!input) return "";
  let text = String(input);

  // 1. Remove dangerous scripts and style blocks
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<!DOCTYPE[^>]*>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  // 2. Strip CSS debris
  text = text
    .replace(/@media[^{]*\{[^{}]*\{[^{}]*\}\s*\}/gi, "")
    .replace(/@[a-zA-Z0-9_-]+[^{]*\{[^}]*\}/gi, "")
    .replace(/(?:^|\n)\s*[.#][a-zA-Z0-9_\-#.,\s>:+]+\s*\{[^}]*\}/gm, "")
    .replace(/(?:padding|margin|font|color|background|width|height|border|display|line-height|text-align)[a-z-]*\s*:\s*[^;{}\n]+(?:!important)?\s*;?\s*\}?\s*\d*/gi, "")
    .replace(/!important\s*;\s*\}\s*\d*/gi, "")
    .replace(/^[ \t]*\}?\s*\d+\s*$/gm, "");

  // 3. Un-wrap multiline URLs inside parentheses
  text = text.replace(/\(\s*(https?:\/\/[^)]+?)\s*\)/gis, (_match, rawUrl) => {
    const cleanUrl = rawUrl.replace(/[\r\n\s]+/g, "");
    return `( ${cleanUrl} )`;
  });

  // 4. Transform mailparser link patterns
  // Pattern 1: ( https://... ) Label
  text = text.replace(
    /\(\s*(https?:\/\/\S+)\s*\)\s*([A-Za-z0-9][^\n\r()]{2,80})/g,
    (_m, url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#0088cc] hover:underline font-semibold">${label.trim()}</a>`
  );

  // Pattern 2: Label \n ( https://... )
  text = text.replace(
    /([A-Za-z0-9][^\n\r()]{2,80})\s*\n?\s*\(\s*(https?:\/\/\S+)\s*\)/g,
    (_m, label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#0088cc] hover:underline font-semibold">${label.trim()}</a>`
  );

  // Pattern 3: Standalone ( https://... )
  text = text.replace(
    /\(\s*(https?:\/\/\S+)\s*\)/g,
    (_m, url) => {
      let host = "Link";
      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[#0088cc] hover:underline text-xs bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 my-0.5">${host} &rarr;</a>`;
    }
  );

  // Pattern 4: Standalone URLs not yet inside an anchor tag
  text = text.replace(
    /(?<!href=["'])(https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+)(?!["']>)/g,
    (url) => {
      let host = url;
      try {
        const u = new URL(url);
        host = u.hostname.replace(/^www\./, "");
      } catch {}
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#0088cc] hover:underline">${host}</a>`;
    }
  );

  // 5. Convert newlines to HTML <br /> while preserving spacing
  text = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // If text already has HTML block tags (like <p>, <div>, <table>), preserve them
  if (/<(p|div|table|h[1-6]|ul|ol|blockquote)\b/i.test(text)) {
    return text;
  }

  // Otherwise convert paragraphs and newlines
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .map((p) => `<p class="mb-3">${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
};
