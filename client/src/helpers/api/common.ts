/**
 * Common API Service
 * Handles common API calls like states and cities
 */

import API from "@/config";

let _statesCache: any = null;
let _statesFlight: Promise<any> | null = null;
const _citiesCache: Record<number, any> = {};
const _citiesFlight: Record<number, Promise<any> | undefined> = {};

export const commonAPI = {
  // Get all states (cached for session)
  getStates: async () => {
    if (_statesCache) return _statesCache;
    if (_statesFlight) return _statesFlight;
    _statesFlight = API.get("/common/getStates").then((r) => {
      _statesCache = r;
      _statesFlight = null;
      return r;
    });
    return _statesFlight;
  },

  // Get cities by state ID (cached per state)
  getCitiesByState: async (stateId: number) => {
    if (_citiesCache[stateId]) return _citiesCache[stateId];
    if (_citiesFlight[stateId]) return _citiesFlight[stateId];
    _citiesFlight[stateId] = API.get(`/common/getCities?state_id=${stateId}`).then((r) => {
      _citiesCache[stateId] = r;
      delete _citiesFlight[stateId];
      return r;
    });
    return _citiesFlight[stateId];
  },

  // Get all states with their cities
  getStateCities: async () => {
    return API.get("/common/getStateCities");
  },

  // Upload file
  uploadFile: async (formData: FormData) => {
    return API.post("/common/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  // Upload base64 file payload
  uploadBase64: async (payload: {
    tableName: string;
    columnName: string;
    recordId: number | string;
    filename: string;
    content: string;
  }) => {
    return API.post("/common/upload/base64", payload);
  },
  // Upload base64 content directly to DB (no file written on server)
  uploadBase64ToDb: async (payload: {
    tableName: string;
    columnName: string;
    recordId: number | string;
    filename: string;
    content: string;
  }) => {
    return API.post("/common/upload/base64/store", payload);
  },
  getPublicBranding: async () => {
    return API.get("/organization/public/branding");
  },
  getNextUserId: async () => {
    return API.get(`/user/next-id`);
  },
};

export default commonAPI;
