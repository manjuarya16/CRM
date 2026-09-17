import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";

/** Check if dark mode is active*/
const isDarkMode = (): boolean => {
  return document.documentElement.classList.contains("dark");
};

/**
 * Get common Swal configuration based on theme
 */
const getThemeConfig = () => ({
  background: isDarkMode() ? "#1F2937" : "#FFFFFF",
  color: isDarkMode() ? "#F3F4F6" : "#000000",
});

/**
 * Extract error message from API response or error object
 */
const getErrorMessage = (error: any): string => {
  if (!error) return "Failed to process request";

  if (typeof error === "string") return error;

  // Check for API response message
  if (error.response?.data?.message) {
    const msg: string = error.response.data.message;
    // Humanize raw Zod/DB messages like "Invalid input: Expected String, Received null"
    return humanizeServerError(msg, error.response?.data?.details);
  }

  // Check for nested error message
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  // Check for direct message
  if (error.message) {
    return error.message;
  }

  return "Failed to process request";
};

/**
 * Humanize raw server/Zod validation error messages into user-friendly text
 */
const humanizeServerError = (message: string, details?: string): string => {
  const raw = details || message || "";

  // Pattern: "Invalid input: Expected String, Received null" - extract field context if available
  if (/invalid input.*expected.*received/i.test(raw)) {
    return "One or more required fields are missing. Please check all required fields and try again.";
  }
  if (
    /expected string.*received null/i.test(raw) ||
    /expected.*received null/i.test(raw)
  ) {
    return "One or more required fields are empty. Please fill in all required fields.";
  }
  if (/duplicate key.*violates unique constraint/i.test(raw)) {
    const match = raw.match(/Key \((.+?)\)=\((.+?)\)/);
    if (match)
      return `${match[1].replace(/_/g, " ")} "${match[2]}" already exists.`;
    return "A record with this information already exists.";
  }
  if (/not null constraint/i.test(raw)) {
    const match = raw.match(/column "(.+?)"/);
    if (match) {
      const field = match[1]
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return `${field} is required and cannot be empty.`;
    }
    return "A required field is missing.";
  }
  return message || "Failed to process request";
};

/** Extract success message from API response*/
const getSuccessMessage = (
  response: any,
  defaultMessage: string = "",
): string => {
  if (!response) return defaultMessage;

  // Check for API response message
  if (response.data?.message) {
    return response.data.message;
  }

  // Check for nested message
  if (response.message) {
    return response.message;
  }

  return defaultMessage;
};

/** Success Alert*/
export const showSuccessAlert = (
  title: string = "Success!",
  text: string = "",
  response?: any,
) => {
  const displayText = response ? getSuccessMessage(response, text) : text;

  return Swal.fire({
    title,
    text: displayText,
    icon: "success",
    confirmButtonText: "OK",
    confirmButtonColor: "#1CB454",
    ...getThemeConfig(),
  });
};

/** Error Alert*/
export const showErrorAlert = (
  title: string = "Error!",
  text: string = "Failed to process request",
  error?: any,
) => {
  const displayText = error ? getErrorMessage(error) : text;

  return Swal.fire({
    title,
    text: displayText,
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#E63535",
    ...getThemeConfig(),
  });
};

/** Warning Alert*/
export const showWarningAlert = (
  title: string = "Warning!",
  text: string = "",
) => {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    confirmButtonText: "OK",
    confirmButtonColor: "#FFA500",
    ...getThemeConfig(),
  });
};

/** Info Alert */
export const showInfoAlert = (title: string = "Info", text: string = "") => {
  return Swal.fire({
    title,
    text,
    icon: "info",
    confirmButtonText: "OK",
    confirmButtonColor: "#3B82F6",
    ...getThemeConfig(),
  });
};

/** Confirm Dialog */
export const showConfirmDialog = (
  title: string = "Are you sure?",
  text: string = "",
) => {
  return Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "No",
    confirmButtonColor: "#1CB454",
    cancelButtonColor: "#E63535",
    ...getThemeConfig(),
  });
};

/** Loading Alert (can't be dismissed by user) */
export const showLoadingAlert = (
  title: string = "Loading...",
  text: string = "",
) => {
  return Swal.fire({
    title,
    text,
    icon: "info",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
    ...getThemeConfig(),
  });
};

/** Close all Swal alerts */
export const closeAlert = () => {
  Swal.close();
};

export const handleSuccessResponse = (
  operationName: string = "Item",
  action: string = "created",
  response?: any,
) => {
  let message = `${operationName} ${action} successfully`;

  // If response has a message, use that instead
  if (response) {
    const extractedMessage = getSuccessMessage(response, "");
    message = extractedMessage || message;
  }

  return showSuccessAlert("Success!", message);
};

export const handleErrorResponse = (
  operationName: string = "Item",
  action: string = "create",
  error?: any,
) => {
  let message = `Failed to ${action} ${operationName.toLowerCase()}`;

  // If error has a message, use that instead
  if (error) {
    const extractedMessage = getErrorMessage(error);
    if (extractedMessage && extractedMessage !== "Failed to process request") {
      message = extractedMessage;
    }
  }

  return showErrorAlert("Error!", message);
};

/**
 * Combined Response Handler - Shows success or error based on response * @returns Swal promise
 */
export const handleApiResponse = (
  operationName: string = "Item",
  action: string = "created",
  response?: any,
  error?: any,
) => {
  if (error) {
    return handleErrorResponse(
      operationName,
      action.replace(/d\s*$/, ""),
      error,
    );
  }
  return handleSuccessResponse(operationName, action, response);
};

export default {
  showSuccessAlert,
  showErrorAlert,
  showWarningAlert,
  showInfoAlert,
  showConfirmDialog,
  showLoadingAlert,
  closeAlert,
  handleSuccessResponse,
  handleErrorResponse,
  handleApiResponse,
};
