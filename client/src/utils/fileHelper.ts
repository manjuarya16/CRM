import { SERVER_URL } from "@/config";

/**
 * Converts a browser File/Blob to a Base64 data URL string
 */
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const extractFileUrl = (text?: string | null): string | null => {
  if (!text) return null;
  const trimmed = text.trim();

  // 1. Check for data URL (Base64)
  if (trimmed.startsWith("data:")) return trimmed;
  const dataIdx = text.indexOf("data:");
  if (dataIdx !== -1) {
    const rawData = text.substring(dataIdx).trim();
    const endIdx = rawData.search(/[\s]/);
    return endIdx !== -1 ? rawData.substring(0, endIdx) : rawData;
  }

  // 2. Check for /uploads/ server path
  if (trimmed.startsWith("/uploads/")) return `${SERVER_URL}${trimmed}`;
  const uploadIdx = text.indexOf("/uploads/");
  if (uploadIdx !== -1) {
    const rawUpload = text.substring(uploadIdx).trim();
    const endIdx = rawUpload.search(/[\s]/);
    const path = endIdx !== -1 ? rawUpload.substring(0, endIdx) : rawUpload;
    return `${SERVER_URL}${path}`;
  }

  // 3. Check for absolute HTTP / HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const httpMatch = text.match(/https?:\/\/[^\s]+/);
  if (httpMatch) return httpMatch[0];

  return null;
};
