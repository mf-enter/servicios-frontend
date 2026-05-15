import api from "./axios";
export const loginRequest = (email, password) =>
  api.post("/auth/login", { email, password });
