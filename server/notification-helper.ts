import { storage } from "./storage";
import type { InsertNotification } from "@shared/schema";
import { broadcastNotification } from "./ws";

export type NotificationType = 
  | "finding_created"
  | "finding_resolved" 
  | "scan_completed"
  | "scan_failed"
  | "connector_synced"
  | "policy_violated"
  | "report_ready"
  | "webhook_failed"
  | "user_invited"
  | "info";

const typeConfig: Record<NotificationType, { icon: string; priority: "critical" | "high" | "normal" }> = {
  finding_created: { icon: "shield-alert", priority: "high" },
  finding_resolved: { icon: "shield-check", priority: "normal" },
  scan_completed: { icon: "scan", priority: "normal" },
  scan_failed: { icon: "alert-triangle", priority: "high" },
  connector_synced: { icon: "cloud", priority: "normal" },
  policy_violated: { icon: "alert-octagon", priority: "critical" },
  report_ready: { icon: "file-text", priority: "normal" },
  webhook_failed: { icon: "webhook", priority: "high" },
  user_invited: { icon: "user-plus", priority: "normal" },
  info: { icon: "info", priority: "normal" },
};

export async function createNotification(params: {
  userId: string;
  orgId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  priority?: "critical" | "high" | "normal";
  deduplicate?: boolean;
}): Promise<void> {
  try {
    if (params.deduplicate) {
      const existing = await storage.findNotificationByDedup(params.userId, params.orgId, params.title, params.type);
      if (existing) return;
    }
    const config = typeConfig[params.type] || typeConfig.info;
    const notification: InsertNotification = {
      userId: params.userId,
      orgId: params.orgId,
      title: params.title,
      message: params.message,
      type: params.type,
      icon: config.icon,
      link: params.link,
      createdAt: new Date().toISOString(),
    };
    const created = await storage.createNotification(notification);
    broadcastNotification({ ...created, _priority: params.priority || config.priority } as any);
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

export async function notifyOrgUsers(params: {
  orgId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  excludeUserId?: string;
  priority?: "critical" | "high" | "normal";
  deduplicate?: boolean;
}): Promise<void> {
  try {
    const users = await storage.getUsers(params.orgId);
    const targets = params.excludeUserId 
      ? users.filter(u => u.id !== params.excludeUserId && u.status === "Active")
      : users.filter(u => u.status === "Active");
    
    await Promise.all(targets.map(user => 
      createNotification({
        userId: user.id,
        orgId: params.orgId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link,
        priority: params.priority,
        deduplicate: params.deduplicate,
      })
    ));
  } catch (err) {
    console.error("Failed to notify org users:", err);
  }
}
