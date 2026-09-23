import API from "@/config";

export const getConfigurations = async () => {
  const response = await API.get("/configuration");
  return response.data;
};

export const saveConfigurations = async (settings: Record<string, any>) => {
  const response = await API.post("/configuration", { settings });
  return response.data;
};

export const uploadConfigImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await API.post("/configuration/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const testSmtpConnection = async (testConfig?: Record<string, any>) => {
  const response = await API.post("/configuration/test-smtp", { testConfig });
  return response.data;
};
