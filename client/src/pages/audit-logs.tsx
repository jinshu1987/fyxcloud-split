import { useState } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ClipboardList, ChevronLeft, ChevronRight, Search, Filter, Clock,
  LogIn, UserPlus, UserMinus, UserCog, Shield, ShieldOff, KeyRound,
  Settings, CloudCog, ScanSearch, FileText, Download, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { AuditLog } from "@shared/schema";
import { HelpIcon } from "@/components/help-icon";

const PAGE_SIZE = 25;

const categoryOptions = [
  { label: "All Categories", value: "all" },
  { label: "Authentication", value: "auth" },
  { label: "Users", value: "users" },
  { label: "Connectors", value: "connectors" },
  { label: "Policies", value: "policies" },
  { label: "Settings", value: "settings" },
  { label: "Reports", value: "reports" },
  { label: "API Keys", value: "api_keys" },
];

const actionIcons: Record<string, any> = {
  login: LogIn,
  change_password: KeyRound,
  enable_mfa: Shield,
  disable_mfa: ShieldOff,
  invite_user: UserPlus,
  delete_user: UserMinus,
  update_user_role: UserCog,
  update_user_status: UserCog,
  create_connector: CloudCog,
  delete_connector: CloudCog,
  run_policy_scan: ScanSearch,
  update_organization: Settings,
  generate_report: FileText,
  create_api_key: KeyRound,
  delete_api_key: KeyRound,
};

const actionLabels: Record<string, string> = {
  login: "User Login",
  change_password: "Password Changed",
  enable_mfa: "MFA Enabled",
  disable_mfa: "MFA Disabled",
  invite_user: "User Invited",
  delete_user: "User Deleted",
  update_user_role: "Role Changed",
  update_user_status: "Status Changed",
  create_connector: "Connector Created",
  delete_connector: "Connector Deleted",
  run_policy_scan: "Policy Scan Run",
  update_organization: "Org Settings Updated",
  generate_report: "Report Generated",
  create_api_key: "API Key Created",
  delete_api_key: "API Key Deleted",
};

const categoryColors: Record<string, string> = {
  auth: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  users: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  connectors: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  policies: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  settings: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  reports: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  api_keys: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function DetailsCell({ log }: { log: AuditLog }) {
  const details = log.details as Record<string, any> | null;
  if (!details || Object.keys(details).length === 0) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const items: string[] = [];
  if (details.provider) items.push(`Provider: ${details.provider}`);
  if (details.oldRole && details.newRole) items.push(`${details.oldRole} → ${details.newRole}`);
  if (details.oldStatus && details.newStatus) items.push(`${details.oldStatus} → ${details.newStatus}`);
  if (details.findingsCount !== undefined) items.push(`${details.findingsCount} findings`);
  if (details.role) items.push(`Role: ${details.role}`);
  if (details.error) items.push(`Error: ${details.error}`);
  if (items.length === 0) {
    items.push(JSON.stringify(details).slice(0, 80));
  }

  return (
    <div className="text-xs space-y-0.5">
      {items.map((item, i) => (
        <div key={i} className="text-muted-foreground">{item}</div>
      ))}
    </div>
  );
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    searchTimeout[0] = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 400);
  };

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(PAGE_SIZE));
  queryParams.set("offset", String(page * PAGE_SIZE));
  if (category !== "all") queryParams.set("category", category);
  if (debouncedSearch) queryParams.set("search", debouncedSearch);

  const { data, isLoading, refetch } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ["/api/audit-logs", page, category, debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filteredLogs = logs;

  const handleExport = () => {
    const csv = [
      ["Timestamp", "User", "Action", "Category", "Target", "Status", "IP Address"].join(","),
      ...filteredLogs.map(l =>
        [
          l.createdAt,
          l.userEmail || "-",
          actionLabels[l.action] || l.action,
          l.category,
          l.targetName || "-",
          l.status,
          l.ipAddress || "-",
        ].map(v => `"${v}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6" data-testid="audit-logs-page">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Audit Log</h1>
              <p className="text-sm text-muted-foreground">Track all system changes and user actions</p>
            </div>
            <HelpIcon section="audit-logs" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, action, or target..."
                  value={searchTerm}
                  onChange={e => handleSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={category} onValueChange={v => { setCategory(v); setPage(0); }}>
                  <SelectTrigger className="w-[180px]" data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-muted-foreground" data-testid="text-total-count">
                {total} event{total !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No audit log entries found</p>
                <p className="text-xs mt-1">Actions will be recorded as users interact with the platform</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[200px]">User</TableHead>
                      <TableHead className="w-[200px]">Action</TableHead>
                      <TableHead className="w-[120px]">Category</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="w-[200px]">Details</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log, idx) => {
                      const Icon = actionIcons[log.action] || Clock;
                      const isExpanded = expandedRow === log.id;
                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                          data-testid={`row-audit-${log.id}`}
                        >
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                              <div>
                                <div>{timeAgo(log.createdAt)}</div>
                                <div className="text-[10px] text-muted-foreground">{formatDate(log.createdAt)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm truncate max-w-[200px]" data-testid={`text-user-${log.id}`}>
                              {log.userEmail || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm" data-testid={`text-action-${log.id}`}>
                                {actionLabels[log.action] || log.action}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[11px] capitalize ${categoryColors[log.category] || "bg-muted text-muted-foreground"}`}
                              data-testid={`badge-category-${log.id}`}
                            >
                              {log.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm truncate max-w-[200px]" data-testid={`text-target-${log.id}`}>
                              {log.targetName || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DetailsCell log={log} />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={log.status === "success"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"}
                              data-testid={`badge-status-${log.id}`}
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                <span className="text-xs text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
