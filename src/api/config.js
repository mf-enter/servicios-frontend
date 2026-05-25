const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const trimTrailingSlash = (value) => String(value || "").replace(/\/$/, "");

const normalizeSocketPath = (value) => {
  const path = String(value || "/ws").trim();

  if (!path) {
    return "/ws";
  }

  return `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};

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
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const originIsLocal = LOCAL_HOSTNAMES.has(String(currentHostname).toLowerCase());
  const socketPath = normalizeSocketPath(import.meta.env.VITE_WS_PATH || "/ws");
  const configuredSocketUrl = String(import.meta.env.VITE_WS_URL || "").trim();

  if (configuredSocketUrl) {
    try {
      const resolved = new URL(configuredSocketUrl, currentOrigin);
      const resolvedIsLocal = LOCAL_HOSTNAMES.has(resolved.hostname.toLowerCase());

      if (resolvedIsLocal && !originIsLocal) {
        const fallbackUrl = new URL(socketPath, currentOrigin);
        const fallbackProtocol = fallbackUrl.protocol === "https:" ? "wss:" : "ws:";

        return `${fallbackProtocol}//${fallbackUrl.host}${fallbackUrl.pathname}`;
      }

      const resolvedProtocol = resolved.protocol === "https:" ? "wss:" : "ws:";

      return `${resolvedProtocol}//${resolved.host}${normalizeSocketPath(resolved.pathname)}`;
    } catch (_) {
      if (!originIsLocal && configuredSocketUrl.includes("localhost")) {
        const fallbackUrl = new URL(socketPath, currentOrigin);
        const fallbackProtocol = fallbackUrl.protocol === "https:" ? "wss:" : "ws:";

        return `${fallbackProtocol}//${fallbackUrl.host}${fallbackUrl.pathname}`;
      }
    }
  }

  const apiBaseUrl = getApiBaseUrl();
  const baseUrl = new URL(apiBaseUrl, currentOrigin);
  const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";

  return `${wsProtocol}//${baseUrl.host}${socketPath}`;
};