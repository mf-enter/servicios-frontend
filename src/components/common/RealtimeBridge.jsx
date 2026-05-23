import { useEffect } from "react";

const buildWebSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const baseUrl = apiUrl ? new URL(apiUrl, window.location.origin) : new URL(window.location.origin);
  const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${baseUrl.host}/`;
};

const broadcastDataUpdated = (type, id) => {
  try {
    localStorage.setItem("app:data-updated", JSON.stringify({ ts: Date.now(), type, id }));
  } catch (_) {}

  try {
    window.dispatchEvent(new Event("app-data-updated"));
  } catch (_) {}
};

export default function RealtimeBridge() {
  useEffect(() => {
    let socket = null;
    let reconnectTimer = null;
    let mounted = true;

    const connect = () => {
      if (!mounted || typeof window === "undefined" || typeof WebSocket === "undefined") return;

      try {
        socket = new WebSocket(buildWebSocketUrl());

        socket.onmessage = (event) => {
          let message;

          try {
            message = JSON.parse(event.data);
          } catch (_) {
            return;
          }

          if (message?.event !== "quote_accepted" && message?.event !== "quote_created") return;

          try {
            window.dispatchEvent(new CustomEvent("quote-accepted", { detail: message.payload }));
          } catch (_) {}

          broadcastDataUpdated(message?.event, message?.payload?.quote_id ?? message?.payload?.service_id ?? null);
        };

        socket.onclose = () => {
          if (!mounted) return;
          reconnectTimer = window.setTimeout(connect, 5000);
        };

        socket.onerror = () => {
          try {
            socket?.close();
          } catch (_) {}
        };
      } catch (_) {}
    };

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try {
        socket?.close();
      } catch (_) {}
    };
  }, []);

  return null;
}