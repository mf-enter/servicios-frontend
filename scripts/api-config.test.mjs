import assert from "node:assert/strict";
import { resolveApiBaseUrl } from "../src/api/config.js";

const local = resolveApiBaseUrl({
  apiUrl: "http://localhost:5000/api",
  currentOrigin: "http://localhost:5173",
  currentHostname: "localhost",
});

assert.equal(local, "http://localhost:5000/api");

const remoteFallback = resolveApiBaseUrl({
  apiUrl: "http://localhost:5000/api",
  currentOrigin: "https://frontend.example.com",
  currentHostname: "frontend.example.com",
});

assert.equal(remoteFallback, "https://frontend.example.com/api");

const remoteExplicit = resolveApiBaseUrl({
  apiUrl: "https://api.example.com/api",
  currentOrigin: "https://frontend.example.com",
  currentHostname: "frontend.example.com",
});

assert.equal(remoteExplicit, "https://api.example.com/api");

const remoteMissingApiPath = resolveApiBaseUrl({
  apiUrl: "https://servicios-backend.onrender.com",
  currentOrigin: "https://servicios-frontend.onrender.com",
  currentHostname: "servicios-frontend.onrender.com",
});

assert.equal(remoteMissingApiPath, "https://servicios-backend.onrender.com/api");

console.log("api-config smoke test passed");