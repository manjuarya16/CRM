import React, { useState, useRef } from "react";
import { API_URL } from "@/config";
import { ImageUploaderProps } from "@/interface/fileUploader";

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  label = "Upload Image",
  error,
  preview,
  maxSize = 5, // 5MB default
  accept = "image/*",
  onUpload,
  centered = false,
  previewSize = 80,
  required = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const normalizePreview = (p?: string) => {
    if (!p) return "";
    const raw = p.toString().trim();
    // normalize backslashes to forward slashes
    const fixed = raw.replace(/\\/g, "/");
    if (fixed.startsWith("http") || fixed.startsWith("data:")) return fixed;

    // derive API origin (strip trailing /api if present)
    let apiOrigin = API_URL;
    try {
      const u = new URL(API_URL);
      apiOrigin = u.origin;
    } catch (e) {
      apiOrigin = API_URL.replace(/\/api\/?$/, "");
    }

    if (fixed.startsWith("/")) return apiOrigin + fixed;
    return apiOrigin + "/" + fixed.replace(/^\/+/, "");
  };

  const [previewUrl, setPreviewUrl] = useState<string>(
    normalizePreview(preview),
  );
  const [fileName, setFileName] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setUploadError("");
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setUploadError(`File size must not exceed ${maxSize}MB`);
      setPreviewUrl("");
      setFileName("");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file");
      setPreviewUrl("");
      setFileName("");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      // basic check for corrupted images: ensure result is a valid data URL
      if (typeof preview === "string" && preview.startsWith("data:")) {
        setPreviewUrl(preview);
        setFileName(file.name);
        setUploadError("");
        setSelectedFile(file);
        onImageUpload(file, preview);
      } else {
        setUploadError("Selected image appears to be invalid or corrupted");
        setPreviewUrl("");
        setFileName("");
      }
    };
    reader.readAsDataURL(file);
  };

  // Update preview when parent changes `preview` prop (e.g., loading existing image)
  React.useEffect(() => {
    setPreviewUrl(normalizePreview(preview));
  }, [preview]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fakeEvent = {
        target: { files } as any,
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  const handleRemove = () => {
    setPreviewUrl("");
    setFileName("");
    setUploadError("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageUpload({} as File, "");
  };

  const handleUpload = async () => {
    // If parent supplied an upload handler via props, call it with the selected file
    if (selectedFile && typeof onUpload === "function") {
      try {
        await onUpload(selectedFile);
      } catch (err) {
        console.error("Upload handler failed:", err);
      }
      return;
    }

    // otherwise if no selectedFile, open file picker
    if (!selectedFile) {
      handleClick();
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-200 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!previewUrl ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            error || uploadError
              ? "border-red-300 bg-red-50 dark:bg-red-950"
              : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900 hover:border-primary hover:bg-primary-50"
          }`}
        >
          <svg
            className={`w-12 h-12 mx-auto mb-3 ${
              error || uploadError ? "text-red-400" : "text-gray-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>

          <p
            className={`text-sm font-medium ${
              error || uploadError
                ? "text-red-700"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            Click to upload or drag and drop
          </p>
          <p
            className={`text-xs ${
              error || uploadError
                ? "text-red-600"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            PNG, JPG, GIF up to {maxSize}MB
          </p>
        </div>
      ) : (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          {centered ? (
            <div className="flex flex-col items-center gap-3">
              <div
                style={{ width: previewSize, height: previewSize }}
                className="overflow-hidden rounded-full bg-gray-100 flex items-center justify-center"
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ width: previewSize, height: previewSize }}
                  className="object-cover"
                />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {fileName || "Preview"}
              </p>
              <div className="w-full">
                <button
                  type="button"
                  onClick={handleClick}
                  className="w-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary-50 dark:hover:bg-primary-950 border border-primary rounded-lg transition"
                >
                  Change Image
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-20 w-20 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {fileName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click button to change image
                </p>
              </div>
              <button
                type="button"
                onClick={handleUpload}
                className="flex-shrink-0 px-3 py-2 text-sm font-medium text-primary hover:text-primary-dark hover:bg-primary-50 dark:hover:bg-primary-950 rounded-lg transition"
              >
                Upload File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {(error || uploadError) && (
        <p className="mt-2 text-sm text-red-500 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18.101 12.93a1 1 0 00-1.414-1.414L10 15.172l-6.687-6.687a1 1 0 00-1.414 1.414l8 8a1 1 0 001.414 0l8-8z"
              clipRule="evenodd"
            />
          </svg>
          {error || uploadError}
        </p>
      )}

      {/* Success Message */}
      {previewUrl && !error && !uploadError && (
        <p className="mt-2 text-sm text-green-500 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Image uploaded successfully
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
