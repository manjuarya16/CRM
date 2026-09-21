import API from "@/config";

export const getConfigurations = async () => {
  const response = await API.get("/configuration");
  return response.data;
};

export const saveConfigurations = async (settings: Record<string, any>) => {
  const response = await API.post("/configuration", { settings });
  return response.data;
};
