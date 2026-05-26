const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const trimTrailingSlash = (value) => String(value || "").replace(/\/$/, "");

const normalizeSocketPath = (value) => {
  const path = String(value || "/ws").trim();

  if (!path) {
    return "/ws";
  }

  return `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};

const ensureApiPath = (url) => {
  const resolved = new URL(url);
  const pathname = resolved.pathname.replace(/\/+$/, "");

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return trimTrailingSlash(resolved.toString());
  }

  resolved.pathname = pathname === "" || pathname === "/" ? "/api" : `/api${pathname}`;
  return trimTrailingSlash(resolved.toString());
};

const toSecureSocketProtocol = (protocol) => (protocol === "https:" ? "wss:" : protocol === "http:" ? "ws:" : protocol);

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

      return ensureApiPath(resolved.toString());
    } catch (_) {
      if (!originIsLocal && configuredUrl.includes("localhost")) {
        return trimTrailingSlash(new URL("/api", origin).toString());
      }

      return ensureApiPath(new URL(configuredUrl, origin).toString());
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
  const pageProtocol = typeof window !== "undefined" ? window.location.protocol : "http:";
  const secureSocketProtocol = toSecureSocketProtocol(pageProtocol);
  const configuredSocketUrl = String(import.meta.env.VITE_WS_URL || "").trim();

  if (configuredSocketUrl) {
    try {
      const resolved = new URL(configuredSocketUrl, currentOrigin);
      const resolvedIsLocal = LOCAL_HOSTNAMES.has(resolved.hostname.toLowerCase());
      const resolvedProtocol = secureSocketProtocol === "wss:" ? "wss:" : toSecureSocketProtocol(resolved.protocol);

      if (resolvedIsLocal && !originIsLocal) {
        const fallbackUrl = new URL(socketPath, currentOrigin);
        const fallbackProtocol = toSecureSocketProtocol(fallbackUrl.protocol);

        return `${fallbackProtocol}//${fallbackUrl.host}${fallbackUrl.pathname}`;
      }

      return `${resolvedProtocol}//${resolved.host}${normalizeSocketPath(resolved.pathname)}`;
    } catch (_) {
      if (!originIsLocal && configuredSocketUrl.includes("localhost")) {
        const fallbackUrl = new URL(socketPath, currentOrigin);
        const fallbackProtocol = toSecureSocketProtocol(fallbackUrl.protocol);

        return `${fallbackProtocol}//${fallbackUrl.host}${fallbackUrl.pathname}`;
      }
    }
  }

  const apiBaseUrl = getApiBaseUrl();
  const baseUrl = new URL(apiBaseUrl, currentOrigin);
  const wsProtocol = toSecureSocketProtocol(baseUrl.protocol);

  return `${wsProtocol}//${baseUrl.host}${socketPath}`;
};