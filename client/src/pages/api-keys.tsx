import { useState } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Key, Plus, Loader2, Copy, AlertTriangle, Shield, Check, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ApiKey } from "@shared/schema";
import { apiKeyPermissions } from "@shared/schema";
import { HelpIcon } from "@/components/help-icon";

const expirationOptions = [
  { label: "30 days", value: "30d" },
  { label: "60 days", value: "60d" },
  { label: "90 days", value: "90d" },
  { label: "1 year", value: "1y" },
  { label: "Never", value: "never" },
];

function getExpiresAt(value: string): string | undefined {
  if (value === "never") return undefined;
  const now = new Date();
  const days: Record<string, number> = { "30d": 30, "60d": 60, "90d": 90, "1y": 365 };
  now.setDate(now.getDate() + (days[value] || 30));
  return now.toISOString();
}

export default function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", permissions: [] as string[], expiration: "90d" });
  const { toast } = useToast();

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMut = useMutation({
    mutationFn: async (data: { name: string; permissions: string[]; expiresAt?: string }) => {
      const res = await apiRequest("POST", "/api/api-keys", data);
      return res.json();
    },
    onSuccess: (data: { fullKey: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setNewKey(data.fullKey);
      setCreateOpen(false);
      setForm({ name: "", permissions: [], expiration: "90d" });
    },
    onError: () => toast({ title: "Failed to create API key", variant: "destructive" }),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key revoked", variant: "success" });
    },
    onError: () => toast({ title: "Failed to revoke key", variant: "destructive" }),
  });

  function handleCreate() {
    if (!form.name || form.permissions.length === 0) {
      toast({ title: "Name and at least one permission are required", variant: "destructive" });
      return;
    }
    createMut.mutate({
      name: form.name,
      permissions: form.permissions,
      expiresAt: getExpiresAt(form.expiration),
    });
  }

  function togglePermission(perm: string) {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "API key copied to clipboard", variant: "info" });
    }
  }

  const activeKeys = keys.filter(k => k.status === "active").length;
  const revokedKeys = keys.filter(k => k.status === "revoked").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-api-keys-title">API Keys <HelpIcon section="api-keys" /></h1>
            <p className="text-sm text-muted-foreground mt-1">Manage API keys for programmatic access</p>
          </div>
          <Button
            className="gap-2 bg-[#007aff] hover:bg-[#0066d6] text-white"
            onClick={() => setCreateOpen(true)}
            data-testid="button-create-api-key"
          >
            <Plus className="h-4 w-4" />
            Create API Key
          </Button>
        </div>

        {newKey && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-xl" data-testid="card-new-key">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-amber-300">This key will only be shown once</p>
                    <p className="text-xs text-muted-foreground">Copy it now and store it securely. You won't be able to see it again.</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 text-xs bg-muted/30 border border-border/50 rounded-lg px-3 py-2 font-mono break-all" data-testid="text-full-api-key">
                        {newKey}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={copyKey}
                        data-testid="button-copy-api-key"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setNewKey(null)} data-testid="button-dismiss-new-key">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Total Keys", value: keys.length, icon: Key, color: "text-[#007aff]" },
            { label: "Active", value: activeKeys, icon: Shield, color: "text-emerald-400" },
            { label: "Revoked", value: revokedKeys, icon: XCircle, color: "text-red-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card/60 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-muted/30 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card/60 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-[#007aff]" />
              <span className="text-[10px] font-semibold tracking-[0.15em] text-primary/60 uppercase">API KEYS</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Key className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No API keys created yet</p>
                <p className="text-xs mt-1">Create your first API key to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Key Prefix</TableHead>
                    <TableHead className="text-xs">Permissions</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Last Used</TableHead>
                    <TableHead className="text-xs">Expires</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id} className="border-border/30 hover:bg-muted/20" data-testid={`row-api-key-${key.id}`}>
                      <TableCell className="font-medium text-sm">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted/30 px-2 py-0.5 rounded" data-testid={`text-key-prefix-${key.id}`}>
                          {key.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(key.permissions || []).slice(0, 3).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-[9px] px-1.5 py-0">
                              {perm}
                            </Badge>
                          ))}
                          {(key.permissions || []).length > 3 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              +{key.permissions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            key.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                          data-testid={`badge-key-status-${key.id}`}
                        >
                          {key.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {key.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => revokeMut.mutate(key.id)}
                            disabled={revokeMut.isPending}
                            data-testid={`button-revoke-key-${key.id}`}
                          >
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] bg-card/95 backdrop-blur-xl border-l border-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Create API Key</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., CI/CD Pipeline Key"
                  className="bg-muted/30 border-border/50"
                  data-testid="input-api-key-name"
                />
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Permissions</Label>
                <div className="grid grid-cols-1 gap-2">
                  {apiKeyPermissions.map((perm) => (
                    <label
                      key={perm}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        form.permissions.includes(perm)
                          ? "border-[#007aff] bg-[#007aff]/10"
                          : "border-border/50 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={form.permissions.includes(perm)}
                        onCheckedChange={() => togglePermission(perm)}
                        data-testid={`checkbox-perm-${perm}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{perm}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {perm.startsWith("read:") ? "Read access to" : perm.startsWith("write:") ? "Write access to" : "Execute"} {perm.split(":")[1]}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Expiration</Label>
                <Select value={form.expiration} onValueChange={v => setForm(prev => ({ ...prev, expiration: v }))}>
                  <SelectTrigger className="bg-muted/30 border-border/50" data-testid="select-expiration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expirationOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#007aff] hover:bg-[#0066d6] text-white gap-2"
                  onClick={handleCreate}
                  disabled={createMut.isPending}
                  data-testid="button-submit-create-key"
                >
                  {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Key
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}