import { useState } from "react";
import { Bell, Check, CheckCheck, ShieldAlert, ShieldCheck, Scan, AlertTriangle, Cloud, FileText, Webhook, UserPlus, Info, Trash2, Loader2, ExternalLink, Clock, Tag, ChevronRight, X, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import type { Notification } from "@shared/schema";

const iconMap: Record<string, typeof Bell> = {
  "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck,
  "scan": Scan,
  "alert-triangle": AlertTriangle,
  "alert-octagon": AlertOctagon,
  "cloud": Cloud,
  "file-text": FileText,
  "webhook": Webhook,
  "user-plus": UserPlus,
  "info": Info,
};

const typeColors: Record<string, string> = {
  finding_created: "text-red-400 bg-red-500/10",
  finding_resolved: "text-emerald-400 bg-emerald-500/10",
  scan_completed: "text-blue-400 bg-blue-500/10",
  scan_failed: "text-amber-400 bg-amber-500/10",
  connector_synced: "text-cyan-400 bg-cyan-500/10",
  policy_violated: "text-blue-400 bg-blue-500/10",
  report_ready: "text-violet-400 bg-violet-500/10",
  webhook_failed: "text-red-400 bg-red-500/10",
  user_invited: "text-blue-400 bg-blue-500/10",
  info: "text-gray-400 bg-gray-500/10",
};

const typeLabels: Record<string, string> = {
  finding_created: "New Finding",
  finding_resolved: "Finding Resolved",
  scan_completed: "Scan Completed",
  scan_failed: "Scan Failed",
  connector_synced: "Connector Synced",
  policy_violated: "Policy Violation",
  report_ready: "Report Ready",
  webhook_failed: "Integration Failed",
  user_invited: "User Invited",
  info: "Information",
};

const typeBorderColors: Record<string, string> = {
  finding_created: "border-red-500/30",
  finding_resolved: "border-emerald-500/30",
  scan_completed: "border-blue-500/30",
  scan_failed: "border-amber-500/30",
  connector_synced: "border-cyan-500/30",
  policy_violated: "border-blue-500/30",
  report_ready: "border-violet-500/30",
  webhook_failed: "border-red-500/30",
  user_invited: "border-blue-500/30",
  info: "border-gray-500/30",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationDetailDrawer({
  notification,
  onClose,
  onDelete,
  onNavigate,
}: {
  notification: Notification | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onNavigate: (link: string) => void;
}) {
  if (!notification) return null;

  const IconComp = iconMap[notification.icon || "info"] || Info;
  const colorClass = typeColors[notification.type] || typeColors.info;
  const borderColor = typeBorderColors[notification.type] || typeBorderColors.info;
  const typeLabel = typeLabels[notification.type] || "Notification";

  return (
    <Sheet open={!!notification} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background" data-testid="drawer-notification-detail">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                <IconComp className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <Badge variant="outline" className={`text-[10px] mb-2 ${colorClass} ${borderColor}`}>
                  {typeLabel}
                </Badge>
                <SheetTitle className="text-lg font-bold leading-tight" data-testid="text-notification-detail-title">
                  {notification.title}
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Details
            </h3>
            <div className={`rounded-xl border ${borderColor} bg-muted/10 p-4`}>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap" data-testid="text-notification-detail-message">
                {notification.message}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" /> Metadata
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-0">
              <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline" className={`text-xs ${colorClass} ${borderColor}`}>
                  {typeLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className={`text-xs ${notification.read ? "text-gray-500 border-gray-500/20 bg-gray-500/10" : "text-[#007aff] border-[#007aff]/20 bg-[#007aff]/10"}`}>
                  {notification.read ? "Read" : "Unread"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Received</span>
                <span className="text-sm font-medium">{timeAgo(notification.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Timestamp</span>
                <span className="text-xs font-mono text-muted-foreground">{formatDate(notification.createdAt)}</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              Actions
            </h3>
            <div className="space-y-3">
              {notification.link && (
                <Button
                  className="w-full gap-2 bg-[#007aff] hover:bg-[#007aff]/90 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  onClick={() => onNavigate(notification.link!)}
                  data-testid="button-notification-navigate"
                >
                  <ExternalLink className="h-4 w-4" />
                  Go to {notification.link === "/findings" ? "Findings" : notification.link === "/connectors" ? "Connectors" : notification.link === "/reports" ? "Reports" : notification.link === "/policies" ? "Policies" : notification.link === "/inventory" ? "Inventory" : "Details"}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={() => {
                  onDelete(notification.id);
                  onClose();
                }}
                data-testid="button-notification-delete"
              >
                <Trash2 className="h-4 w-4" />
                Delete Notification
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function NotificationPopover() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [, setLocation] = useLocation();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 15000,
  });

  const unreadCount = unreadData?.count || 0;

  const markReadMut = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/mark-all-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "All notifications marked as read", variant: "success" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) markReadMut.mutate(notif.id);
    setSelectedNotification(notif);
    setDrawerOpen(false);
  };

  const handleNavigate = (link: string) => {
    setSelectedNotification(null);
    setLocation(link);
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-[#007aff] hover:bg-[#007aff]/10 relative rounded-lg"
        onClick={() => setDrawerOpen(true)}
        data-testid="button-notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center shadow-[0_0_6px_rgba(239,68,68,0.5)] ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:w-[420px] sm:max-w-[420px] p-0 border-l border-border/50 bg-card/95 backdrop-blur-xl flex flex-col" data-testid="drawer-notifications">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border/50">
            <SheetHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-[#007aff]/10 flex items-center justify-center">
                    <Bell className="h-4.5 w-4.5 text-[#007aff]" />
                  </div>
                  <div>
                    <SheetTitle className="text-base font-bold">Notifications</SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                    </p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-[#007aff] hover:text-[#007aff] hover:bg-[#007aff]/10 gap-1.5"
                    onClick={() => markAllReadMut.mutate()}
                    disabled={markAllReadMut.isPending}
                    data-testid="button-mark-all-read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </Button>
                )}
              </div>
            </SheetHeader>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              <div>
                {unreadNotifications.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-[#007aff]/5 border-b border-[#007aff]/10">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#007aff]">
                        Unread ({unreadNotifications.length})
                      </p>
                    </div>
                    <div className="divide-y divide-border/30">
                      <AnimatePresence>
                        {unreadNotifications.slice(0, 50).map((notif) => (
                          <NotificationItem
                            key={notif.id}
                            notif={notif}
                            onClick={handleNotificationClick}
                            onDelete={(id) => deleteMut.mutate(id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {readNotifications.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-muted/10 border-b border-border/30">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                        Earlier ({readNotifications.length})
                      </p>
                    </div>
                    <div className="divide-y divide-border/30">
                      <AnimatePresence>
                        {readNotifications.slice(0, 50).map((notif) => (
                          <NotificationItem
                            key={notif.id}
                            notif={notif}
                            onClick={handleNotificationClick}
                            onDelete={(id) => deleteMut.mutate(id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <NotificationDetailDrawer
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onDelete={(id) => deleteMut.mutate(id)}
        onNavigate={handleNavigate}
      />
    </>
  );
}

function NotificationItem({
  notif,
  onClick,
  onDelete,
}: {
  notif: Notification;
  onClick: (notif: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const IconComp = iconMap[notif.icon || "info"] || Info;
  const colorClass = typeColors[notif.type] || typeColors.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className={`group flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer ${
        !notif.read ? "bg-[#007aff]/5" : ""
      }`}
      onClick={() => onClick(notif)}
      data-testid={`notification-item-${notif.id}`}
    >
      <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        <IconComp className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-tight ${!notif.read ? "font-semibold" : "font-medium"}`}>
            {notif.title}
          </p>
          {!notif.read && (
            <div className="mt-1 h-2 w-2 rounded-full bg-[#007aff] shrink-0 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-muted-foreground/60">{timeAgo(notif.createdAt)}</p>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif.id);
        }}
        data-testid={`button-delete-notification-${notif.id}`}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}
