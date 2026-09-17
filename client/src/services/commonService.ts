import API from "@/config";

const getStates = () => API.get("/common/getStates");
const getCities = (stateId: number | string) =>
  API.get(`/common/getCities?state_id=${stateId}`);
const getStateCities = () => API.get("/common/getStateCities");

export { getStates, getCities, getStateCities };
