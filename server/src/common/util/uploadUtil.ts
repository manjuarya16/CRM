import crypto from "crypto";
import path from "path";

export const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const allowedTables = ["organizations", "users", "volunteers"];

// Include organization-specific columns for image compatibility.
export const allowedColumns = [
  "logo",
  "org_img",
  "profile_img",
  "profile_image",
  "id_proof_file",
  "agreement_document",
  "police_verification_file",
];

export const generateFileName = (originalName: string): string => {
  // Preserve the original filename but sanitize it to avoid unsafe characters.
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return safeName;
};
