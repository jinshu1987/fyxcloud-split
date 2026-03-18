import { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { HelpIcon } from "@/components/help-icon";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, RefreshCw, Trash2, Cloud, Wifi, WifiOff, CheckCircle2, XCircle, Loader2, AlertTriangle, Shield, FolderOpen, Pencil } from "lucide-react";
import { ProviderIcon } from "@/components/provider-icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CloudConnector, Project } from "@shared/schema";
import { useLocation } from "wouter";
import { usePermission } from "@/lib/auth";
import { useProject } from "@/hooks/use-project";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const providerColors: Record<string, string> = {
  AWS: "#FF9900",
  GCP: "#4285F4",
  Azure: "#0078D4",
  HuggingFace: "#FFD21E",
  "Hugging Face": "#FFD21E",
};

function getSyncStatusBadge(syncStatus: string | undefined) {
  switch (syncStatus) {
    case "completed":
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Synced</Badge>;
    case "syncing":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Syncing</Badge>;
    case "error":
      return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
    default:
      return <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border/30">Not Synced</Badge>;
  }
}

export default function ConnectorsPage() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const canManageConnectors = usePermission("manage_connectors");
  const canRunScans = usePermission("run_scans");
  const { selectedProjectId } = useProject();
  const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";
  const { data: cloudConnectors = [], isLoading } = useQuery<CloudConnector[]>({
    queryKey: ["/api/connectors", selectedProjectId],
    queryFn: () => fetch(`/api/connectors${projectParam}`, { credentials: "include" }).then(r => r.json()),
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [editingConnector, setEditingConnector] = useState<CloudConnector | null>(null);
  const [editProjectId, setEditProjectId] = useState<string>("");
  const { data: projectsList = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const connectorProviderData = useMemo(() => {
    const providerMap: Record<string, number> = {};
    for (const c of cloudConnectors) {
      providerMap[c.provider] = (providerMap[c.provider] || 0) + 1;
    }
    return Object.entries(providerMap).map(([name, count]) => ({
      name, count, color: providerColors[name] || "#888"
    }));
  }, [cloudConnectors]);

  const totalConnectors = cloudConnectors.length;
  const connectedCount = cloudConnectors.filter((c) => c.status === "Connected").length;
  const errorCount = cloudConnectors.filter((c) => c.status === "Error").length;
  const totalAssets = cloudConnectors.reduce((sum, c) => sum + ((c as any).assetsFound || 0), 0);

  const stats = [
    { label: "Total Connectors", value: totalConnectors, icon: Cloud, color: "text-blue-400" },
    { label: "Connected", value: connectedCount, icon: Wifi, color: "text-emerald-400" },
    { label: "Errors", value: errorCount, icon: WifiOff, color: "text-red-400" },
    { label: "Assets Found", value: totalAssets, icon: Shield, color: "text-purple-400" },
  ];

  const syncMutation = useMutation({
    mutationFn: async (connectorId: string) => {
      setSyncingId(connectorId);
      const res = await apiRequest("POST", `/api/connectors/${connectorId}/sync`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");

      const pollForCompletion = async () => {
        for (let i = 0; i < 120; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const statusRes = await fetch(`/api/connectors/${connectorId}/status`, { credentials: "include" });
          if (!statusRes.ok) continue;
          const status = await statusRes.json();
          queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
          if (status.syncStatus === "completed") {
            return { success: true };
          }
          if (status.syncStatus === "error") {
            throw new Error(status.syncError || "Sync failed");
          }
        }
        throw new Error("Sync timed out");
      };

      return pollForCompletion();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setSyncingId(null);
      toast({ title: "Sync complete", description: "Connector synced successfully.", variant: "success" });
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      setSyncingId(null);
      toast({ title: "Sync failed", description: err?.message || "Could not sync connector. Check credentials.", variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/connectors/${id}`, { projectId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      setEditingConnector(null);
      toast({ title: "Project assignment updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update project", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/connectors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      setShowDeleteConfirm(null);
      toast({ title: "Connector deleted", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to delete connector", variant: "destructive" });
    },
  });

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
              Cloud Connectors <HelpIcon section="connectors" />
            </h1>
            <p className="text-muted-foreground">
              Connect your cloud accounts to discover and monitor AI assets.
            </p>
          </div>
          {canManageConnectors && (
          <Button
            data-testid="button-add-connector"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
            onClick={() => navigate("/connectors/add")}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Connector
          </Button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-row">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-panel border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-primary/60 uppercase tracking-wider">{stat.label}</p>
                      <p data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`} className="text-3xl font-bold mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-panel border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium">Connectors by Provider</CardTitle>
            </CardHeader>
            <CardContent>
              {connectorProviderData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="provider-chart-empty">
                  <Cloud className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No connectors to display.</p>
                </div>
              ) : (
                <div className="h-[280px]" data-testid="provider-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={connectorProviderData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={90} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {connectorProviderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cloudConnectors.length === 0 ? (
          <Card className="glass-panel border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-xl">
            <CardContent className="py-16 text-center">
              <Cloud className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No connectors configured</h3>
              <p className="text-muted-foreground text-sm mb-6">Connect your cloud accounts to start discovering AI assets.</p>
              {canManageConnectors && (
              <Button
                data-testid="button-add-connector-empty"
                className="bg-primary hover:bg-primary/90"
                onClick={() => navigate("/connectors/add")}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Connector
              </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cloudConnectors.map((connector, i) => {
              const c = connector as any;
              const color = providerColors[connector.provider] || "#888";
              const isError = connector.status === "Error";
              const isSyncing = syncingId === connector.id || c.syncStatus === "syncing";

              return (
                <motion.div
                  key={connector.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    data-testid={`card-connector-${connector.id}`}
                    className="glass-panel border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-xl hover:border-primary/40 transition-all duration-300 group"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <ProviderIcon provider={connector.provider} size={32} />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge
                            data-testid={`badge-status-${connector.id}`}
                            variant="outline"
                            className={
                              isError
                                ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            }
                          >
                            {connector.status}
                          </Badge>
                          {getSyncStatusBadge(c.syncStatus)}
                        </div>
                      </div>

                      <h3 className="text-base font-semibold mb-1">{connector.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono mb-4">{connector.accountId}</p>

                      {c.syncError && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/15 mb-4">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-400 line-clamp-2">{c.syncError}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div>
                          <span className="text-[10px] text-primary/60 uppercase tracking-wider block">Scope</span>
                          <span data-testid={`text-region-${connector.id}`} className="text-sm font-medium">{connector.region || "All Regions"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-primary/60 uppercase tracking-wider block">Assets</span>
                          <span data-testid={`text-assets-${connector.id}`} className="text-sm font-medium font-mono">{c.assetsFound || 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-primary/60 uppercase tracking-wider block">Last Sync</span>
                          <span data-testid={`text-lastsync-${connector.id}`} className="text-sm font-medium">
                            {connector.lastSync ? new Date(connector.lastSync).toLocaleDateString() : "Never"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/20 border border-border/30">
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">Project:</span>
                        <span data-testid={`text-project-${connector.id}`} className="text-xs font-medium truncate">
                          {connector.projectId
                            ? (projectsList.find(p => p.id === connector.projectId)?.name || "Unknown")
                            : "None (organization-wide)"}
                        </span>
                        {canManageConnectors && (
                          <Button
                            data-testid={`button-edit-project-${connector.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto text-muted-foreground hover:text-primary shrink-0"
                            onClick={() => {
                              setEditingConnector(connector);
                              setEditProjectId(connector.projectId || "");
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        {canRunScans && c.syncStatus !== undefined ? (
                          <Button
                            data-testid={`button-sync-${connector.id}`}
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                            disabled={isSyncing}
                            onClick={() => syncMutation.mutate(connector.id)}
                          >
                            {isSyncing ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...</>
                            ) : (
                              <><RefreshCw className="h-3.5 w-3.5" /> Sync Now</>
                            )}
                          </Button>
                        ) : (
                          <div />
                        )}
                        {canManageConnectors && (
                        <Button
                          data-testid={`button-delete-${connector.id}`}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setShowDeleteConfirm(connector.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-lg">Delete Connector</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this connector and all discovered assets associated with it. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button
              data-testid="button-confirm-delete"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => showDeleteConfirm && deleteMutation.mutate(showDeleteConfirm)}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Connector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingConnector} onOpenChange={() => setEditingConnector(null)}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-lg">Change Project Assignment</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingConnector && `Update the project for "${editingConnector.name}". Assets discovered by this connector will be scoped to the selected project.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              Project
            </Label>
            <Select value={editProjectId || "__none__"} onValueChange={(v) => setEditProjectId(v === "__none__" ? "" : v)}>
              <SelectTrigger data-testid="select-edit-project" className="h-10 bg-background border-border/60">
                <SelectValue placeholder="No project (organization-wide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No project (organization-wide)</SelectItem>
                {projectsList.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditingConnector(null)}>Cancel</Button>
            <Button
              data-testid="button-save-project"
              className="bg-primary hover:bg-primary/90"
              disabled={updateProjectMutation.isPending}
              onClick={() => {
                if (editingConnector) {
                  updateProjectMutation.mutate({
                    id: editingConnector.id,
                    projectId: editProjectId || null,
                  });
                }
              }}
            >
              {updateProjectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
