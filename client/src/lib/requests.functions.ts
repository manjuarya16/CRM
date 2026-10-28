import { z } from "zod";
import { requestSchema } from "./request-schema";

const GOOGLE_SHEETS_WEB_APP_URL =
  import.meta.env.VITE_GOOGLE_SHEETS_WEB_APP_URL ||
  "https://script.google.com/macros/s/AKfycbzjbdsQxGCpNK9J0bBjKhi_0imDtVNNiLIzOH9Y38KwW6YuV7GaIl3XAtq1d-GqBmIZ/exec";
const GOOGLE_SHEETS_SHARED_SECRET =
  import.meta.env.VITE_GOOGLE_SHEETS_SHARED_SECRET ||
  "2c26d948eb879a92dc84adbfd786134d7fdb0b04bab10277b59e456ecb824994";

function getSuccessMessage(kind: "demo" | "trial" | "contact" | "newsletter") {
  switch (kind) {
    case "newsletter":
      return "You’re on the product updates list.";
    case "trial":
      return "Your trial request has been received. Workspace access will be arranged separately.";
    case "demo":
      return "Your demo request has been received.";
    case "contact":
      return "Your message has been received. Thank you for sharing your requirements.";
  }
}

export async function submitRequest(data: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = requestSchema.parse(data);
  const submissionId = parsed.submission_id || crypto.randomUUID();

  try {
    if (GOOGLE_SHEETS_WEB_APP_URL && GOOGLE_SHEETS_SHARED_SECRET) {
      await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: GOOGLE_SHEETS_SHARED_SECRET,
          request: {
            submission_id: submissionId,
            ...parsed,
          },
        }),
        mode: "no-cors",
      });
    }

    return { ok: true, message: getSuccessMessage(parsed.kind) };
  } catch (error) {
    console.error("[Marketing form submission error]", error);
    return { ok: true, message: getSuccessMessage(parsed.kind) };
  }
}
