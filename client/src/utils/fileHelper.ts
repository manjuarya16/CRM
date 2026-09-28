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

/**
 * Extracts or resolves a file URL dynamically from given text or path
 */
export const extractFileUrl = (text?: string | null): string | null => {
  if (!text) return null;
  if (text.startsWith("data:image/") || text.startsWith("data:")) return text;
  if (text.startsWith("http://") || text.startsWith("https://")) return text;
  if (text.startsWith("/uploads/")) return `${SERVER_URL}${text}`;
  const match = text.match(/\/uploads\/[^\s]+/);
  if (match) return `${SERVER_URL}${match[0]}`;
  return null;
};
