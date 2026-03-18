import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { Notification } from "@shared/schema";

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  orgId: string;
  isAlive: boolean;
}

const clients: AuthenticatedClient[] = [];

function removeClient(client: AuthenticatedClient) {
  const idx = clients.indexOf(client);
  if (idx !== -1) clients.splice(idx, 1);
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/notifications" });

  const heartbeat = setInterval(() => {
    for (const client of [...clients]) {
      if (!client.isAlive) {
        client.ws.terminate();
        removeClient(client);
        continue;
      }
      client.isAlive = false;
      client.ws.ping();
    }
  }, 30000);

  wss.on("close", () => clearInterval(heartbeat));

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId");
    const orgId = url.searchParams.get("orgId");

    if (!userId || !orgId) {
      ws.close(4001, "Missing userId or orgId");
      return;
    }

    const client: AuthenticatedClient = { ws, userId, orgId, isAlive: true };
    clients.push(client);

    ws.send(JSON.stringify({ type: "connected", message: "Real-time notifications active" }));

    ws.on("pong", () => {
      client.isAlive = true;
    });

    ws.on("close", () => removeClient(client));
    ws.on("error", () => removeClient(client));
  });

  return wss;
}

export function broadcastNotification(notification: Notification) {
  const payload = JSON.stringify({
    type: "notification",
    data: notification,
  });

  for (const client of clients) {
    if (
      client.ws.readyState === WebSocket.OPEN &&
      client.userId === notification.userId &&
      client.orgId === notification.orgId
    ) {
      client.ws.send(payload);
    }
  }
}

export function broadcastToOrg(orgId: string, event: string, data: any) {
  const payload = JSON.stringify({ type: event, data });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN && client.orgId === orgId) {
      client.ws.send(payload);
    }
  }
}
