import axios from "axios";
import { getApiBaseUrl } from "./config";

const api = axios.create({ baseURL: getApiBaseUrl() });
api.interceptors.request.use((config)=>{
  const t=localStorage.getItem("token");
  if(t) config.headers.Authorization=`Bearer ${t}`;
  return config;
});
export default api;