import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(RECONNECT_DELAY);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!user?.id || !user?.orgId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/notifications?userId=${user.id}&orgId=${user.orgId}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectDelay.current = RECONNECT_DELAY;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "notification" && msg.data) {
            const notification = msg.data;
            const priority = notification._priority || "normal";

            queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

            if (priority === "critical" || priority === "high") {
              const variant = priority === "critical" ? "destructive" as const : "info" as const;
              const prefix = priority === "critical" ? "\u26a0\ufe0f " : "";

              toast({
                title: `${prefix}${notification.title}`,
                description: notification.message,
                variant,
                duration: priority === "critical" ? 15000 : 8000,
              });
            }
          }
        } catch {
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (mountedRef.current && user?.id) {
          reconnectTimer.current = setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, MAX_RECONNECT_DELAY);
            connect();
          }, reconnectDelay.current);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
    }
  }, [user?.id, user?.orgId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
