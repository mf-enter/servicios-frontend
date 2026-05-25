const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const trimTrailingSlash = (value) => String(value || "").replace(/\/$/, "");

export const resolveApiBaseUrl = ({ apiUrl, currentOrigin, currentHostname } = {}) => {
  const origin = currentOrigin || "http://localhost";
  const hostname = String(currentHostname || "").toLowerCase();
  const configuredUrl = String(apiUrl || "").trim();
  const originIsLocal = LOCAL_HOSTNAMES.has(hostname);

  if (configuredUrl) {
    try {
      const resolved = new URL(configuredUrl, origin);
      const resolvedIsLocal = LOCAL_HOSTNAMES.has(resolved.hostname.toLowerCase());

      if (resolvedIsLocal && !originIsLocal) {
        return trimTrailingSlash(new URL("/api", origin).toString());
      }

      return trimTrailingSlash(resolved.toString());
    } catch (_) {
      if (!originIsLocal && configuredUrl.includes("localhost")) {
        return trimTrailingSlash(new URL("/api", origin).toString());
      }

      return trimTrailingSlash(configuredUrl);
    }
  }

  return trimTrailingSlash(new URL("/api", origin).toString());
};

export const getApiBaseUrl = () => {
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
  const currentHostname = typeof window !== "undefined" ? window.location.hostname : undefined;

  return resolveApiBaseUrl({
    apiUrl: import.meta.env.VITE_API_URL,
    currentOrigin,
    currentHostname,
  });
};

export const getWebSocketUrl = () => {
  const apiBaseUrl = getApiBaseUrl();
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const baseUrl = new URL(apiBaseUrl, fallbackOrigin);
  const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";

  return `${wsProtocol}//${baseUrl.host}/`;
};