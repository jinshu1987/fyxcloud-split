import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/layout";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Activity, Users, Building2, Shield, ShieldAlert, Database, FolderKanban,
  CloudCog, Search, Eye, UserCog, AlertTriangle, ChevronRight, Globe, Bug, CheckCircle2, Clock, MessageSquare, Mail, Loader2, TestTube2, KeyRound, Plus, CreditCard, Gift
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Organization, User } from "@shared/schema";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

const glassCard = "border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-sm";

type OrgWithStats = Organization & {
  userCount: number;
  modelCount: number;
  resourceCount: number;
  connectorCount: number;
  findingCount: number;
  projectCount: number;
};

type SuperUser = User & { orgName: string; isSuperAdmin: boolean };

type Stats = {
  totalOrganizations: number;
  totalUsers: number;
  totalModels: number;
  totalResources: number;
  totalConnectors: number;
  totalFindings: number;
  totalProjects: number;
  superAdmins: number;
  activeUsers: number;
  disabledUsers: number;
};

function OrgDetailDrawer({ org, onClose }: { org: OrgWithStats | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const { data: orgUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/superadmin/org", org?.id, "users"],
    queryFn: async () => {
      if (!org) return [];
      const res = await fetch(`/api/superadmin/org/${org.id}/users`);
      return res.json();
    },
    enabled: !!org,
  });

  const { data: orgFindings = [] } = useQuery<any[]>({
    queryKey: ["/api/superadmin/org", org?.id, "findings"],
    queryFn: async () => {
      if (!org) return [];
      const res = await fetch(`/api/superadmin/org/${org.id}/findings`);
      return res.json();
    },
    enabled: !!org,
  });

  const { data: orgProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/superadmin/org", org?.id, "projects"],
    queryFn: async () => {
      if (!org) return [];
      const res = await fetch(`/api/superadmin/org/${org.id}/projects`);
      return res.json();
    },
    enabled: !!org,
  });

  const { data: orgConnectors = [] } = useQuery<any[]>({
    queryKey: ["/api/superadmin/org", org?.id, "connectors"],
    queryFn: async () => {
      if (!org) return [];
      const res = await fetch(`/api/superadmin/org/${org.id}/connectors`);
      return res.json();
    },
    enabled: !!org,
  });

  const updateOrgMutation = useMutation({
    mutationFn: async (data: { plan?: string; status?: string }) => {
      const res = await apiRequest("PATCH", `/api/superadmin/organizations/${org!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
      toast({ title: "Organization updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update organization", variant: "destructive" });
    },
  });

  if (!org) return null;

  const openFindings = orgFindings.filter((f: any) => f.status === "open").length;
  const criticalFindings = orgFindings.filter((f: any) => f.severity === "Critical").length;

  return (
    <Sheet open={!!org} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto bg-card/95 backdrop-blur-xl border-border">
        <div className="space-y-6 pt-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                {org.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground" data-testid="text-org-detail-name">{org.name}</h2>
                <p className="text-sm text-muted-foreground">{org.contactEmail || "No contact email"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-center">
              <p className="text-2xl font-bold text-foreground">{org.userCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Users</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-center">
              <p className="text-2xl font-bold text-foreground">{org.resourceCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Assets</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-center">
              <p className="text-2xl font-bold text-foreground">{openFindings}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Open Findings</p>
            </div>
          </div>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3">Organization Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <Select value={editPlan || org.plan} onValueChange={(v) => { setEditPlan(v); updateOrgMutation.mutate({ plan: v }); }}>
                  <SelectTrigger className="w-32 h-8 text-sm" data-testid="select-org-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Starter">Starter</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Select value={editStatus || org.status} onValueChange={(v) => { setEditStatus(v); updateOrgMutation.mutate({ status: v }); }}>
                  <SelectTrigger className="w-32 h-8 text-sm" data-testid="select-org-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Auto-Discovery</span>
                <Badge variant={org.autoDiscovery === "true" ? "default" : "secondary"} className="text-xs">
                  {org.autoDiscovery === "true" ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Scan Interval</span>
                <span className="text-sm">{org.autoDiscoveryInterval} min</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3">Users ({orgUsers.length})</h3>
            <div className="space-y-2">
              {orgUsers.slice(0, 10).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 border border-border/30">
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                    <Badge variant={u.status === "Active" ? "default" : "secondary"} className="text-[10px]">
                      {u.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3">Projects ({orgProjects.length})</h3>
            <div className="space-y-2">
              {orgProjects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 border border-border/30">
                  <p className="text-sm font-medium">{p.name}</p>
                  <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3">Connectors ({orgConnectors.length})</h3>
            <div className="space-y-2">
              {orgConnectors.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 border border-border/30">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.provider} - {c.accountId}</p>
                  </div>
                  <Badge variant={c.status === "Connected" ? "default" : "secondary"} className="text-[10px]">
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          {criticalFindings > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-destructive/70 font-semibold mb-3">Critical Findings ({criticalFindings})</h3>
              <div className="space-y-2">
                {orgFindings.filter((f: any) => f.severity === "Critical" && f.status === "open").slice(0, 5).map((f: any) => (
                  <div key={f.id} className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive">{f.finding}</p>
                    <p className="text-xs text-muted-foreground">{f.assetName} - {f.ruleId}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function UserDetailDrawer({ selectedUser, onClose }: { selectedUser: SuperUser | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const toggleSuperAdminMutation = useMutation({
    mutationFn: async ({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) => {
      const res = await apiRequest("PATCH", `/api/superadmin/users/${userId}/superadmin`, { isSuperAdmin });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
      toast({ title: "Super admin status updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update super admin status", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/superadmin/users/${userId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({ title: "User status updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update user status", variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/superadmin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({ title: "User role updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update user role", variant: "destructive" });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/superadmin/impersonate/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Impersonating user", description: "You are now viewing as this user.", variant: "info" });
      queryClient.clear();
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 200);
    },
    onError: () => {
      toast({ title: "Failed to impersonate", variant: "destructive" });
    },
  });

  if (!selectedUser) return null;

  const isSelf = currentUser?.id === selectedUser.id;

  return (
    <Sheet open={!!selectedUser} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto bg-card/95 backdrop-blur-xl border-border">
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
              {selectedUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground" data-testid="text-user-detail-name">{selectedUser.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Organization</p>
              <p className="text-sm font-medium">{selectedUser.orgName}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Org Role</p>
              <p className="text-sm font-medium">{selectedUser.role}</p>
            </div>
          </div>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3">User Controls</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/30">
                <div>
                  <p className="text-sm font-medium">Superadmin Access</p>
                  <p className="text-xs text-muted-foreground">Grant platform-wide administration privileges</p>
                </div>
                <Switch
                  checked={selectedUser.isSuperAdmin}
                  onCheckedChange={(checked) => toggleSuperAdminMutation.mutate({ userId: selectedUser.id, isSuperAdmin: checked })}
                  disabled={isSelf || toggleSuperAdminMutation.isPending}
                  data-testid="switch-superadmin"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/30">
                <div>
                  <p className="text-sm font-medium">Account Status</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.status === "Active" ? "User can log in" : "User is disabled"}</p>
                </div>
                <Switch
                  checked={selectedUser.status === "Active"}
                  onCheckedChange={(checked) => updateStatusMutation.mutate({ userId: selectedUser.id, status: checked ? "Active" : "Disabled" })}
                  disabled={isSelf || updateStatusMutation.isPending}
                  data-testid="switch-user-status"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/30">
                <div>
                  <p className="text-sm font-medium">Organization Role</p>
                  <p className="text-xs text-muted-foreground">Change the user's role within their organization</p>
                </div>
                <Select value={selectedUser.role} onValueChange={(v) => updateRoleMutation.mutate({ userId: selectedUser.id, role: v })}>
                  <SelectTrigger className="w-40 h-8 text-sm" data-testid="select-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Security Engineer">Security Engineer</SelectItem>
                    <SelectItem value="Analyst">Analyst</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isSelf && (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  onClick={() => impersonateMutation.mutate(selectedUser.id)}
                  disabled={impersonateMutation.isPending}
                  data-testid="button-impersonate"
                >
                  <Eye className="h-4 w-4" />
                  {impersonateMutation.isPending ? "Switching..." : "Impersonate User"}
                </Button>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">MFA</span>
                <Badge variant={selectedUser.mfaEnabled ? "default" : "secondary"} className="text-[10px]">
                  {selectedUser.mfaEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Login</span>
                <span>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : "Never"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="text-xs font-mono text-muted-foreground">{selectedUser.id.substring(0, 12)}...</span>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function SuperAdminPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrgWithStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<SuperUser | null>(null);

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/superadmin/stats"],
    enabled: isSuperAdmin,
  });

  const { data: organizationsList = [] } = useQuery<OrgWithStats[]>({
    queryKey: ["/api/superadmin/organizations"],
    enabled: isSuperAdmin,
  });

  const { data: usersList = [] } = useQuery<SuperUser[]>({
    queryKey: ["/api/superadmin/users"],
    enabled: isSuperAdmin,
  });

  type BugReport = {
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    page: string | null;
    reportedByName: string | null;
    reportedByEmail: string | null;
    orgName: string | null;
    adminNotes: string | null;
    resolvedAt: string | null;
    createdAt: string;
  };

  const { data: bugReports = [] } = useQuery<BugReport[]>({
    queryKey: ["/api/superadmin/bug-reports"],
    queryFn: () => apiRequest("GET", "/api/superadmin/bug-reports").then(r => r.json()),
    enabled: isSuperAdmin,
  });

  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [licenseForm, setLicenseForm] = useState({
    orgId: "", plan: "paid", durationDays: 365, maxAssets: 50000, maxModels: 5000,
    maxRepoScans: 1000, maxConnectors: 50, maxUsers: 100, maxPolicies: 500, maxProjects: 50, notes: "",
  });

  type LicenseRecord = {
    id: string; orgId: string; orgName: string; plan: string; status: string; computedStatus: string;
    maxAssets: number; maxModels: number; maxRepoScans: number; maxConnectors: number; maxUsers: number;
    maxPolicies: number; maxProjects: number; startsAt: string; expiresAt: string;
    activatedBy: string | null; notes: string | null; createdAt: string;
  };

  const { data: licensesList = [] } = useQuery<LicenseRecord[]>({
    queryKey: ["/api/superadmin/licenses"],
    queryFn: () => apiRequest("GET", "/api/superadmin/licenses").then(r => r.json()),
    enabled: isSuperAdmin,
  });

  const createLicenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/superadmin/licenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/licenses"] });
      toast({ title: "License created", variant: "success" });
      setLicenseDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create license", variant: "destructive" });
    },
  });

  const updateLicenseMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/superadmin/licenses/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/licenses"] });
      toast({ title: "License updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update license", variant: "destructive" });
    },
  });

  const updateBugMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status?: string; adminNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/superadmin/bug-reports/${id}`, { status, adminNotes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/bug-reports"] });
      toast({ title: "Bug report updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update bug report", variant: "destructive" });
    },
  });

  type SubscriptionRecord = {
    id: string; orgId: string; plan: string; billingInterval: string; status: string;
    maxUnits: number; stripeCustomerId: string | null; stripeSubscriptionId: string | null;
    currentPeriodEnd: string | null; cancelAtPeriodEnd: string; createdAt: string; updatedAt: string;
    orgName: string; usedUnits: number; usagePercentage: number;
  };

  const { data: subscriptionsList = [] } = useQuery<SubscriptionRecord[]>({
    queryKey: ["/api/superadmin/subscriptions"],
    queryFn: () => apiRequest("GET", "/api/superadmin/subscriptions").then(r => r.json()),
    enabled: isSuperAdmin,
  });

  const [subFilter, setSubFilter] = useState("");
  const [subPlanFilter, setSubPlanFilter] = useState("all");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [grantOrgId, setGrantOrgId] = useState("");
  const [grantPlan, setGrantPlan] = useState("starter");
  const [grantMaxUnits, setGrantMaxUnits] = useState("");

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/superadmin/subscriptions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/subscriptions"] });
      toast({ title: "Subscription updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update subscription", variant: "destructive" });
    },
  });

  const grantSubscriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/superadmin/subscriptions/${data.orgId}/grant`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/subscriptions"] });
      toast({ title: "Subscription granted", variant: "success" });
      setGrantDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to grant subscription", variant: "destructive" });
    },
  });

  const filteredSubs = useMemo(() => {
    return subscriptionsList.filter(s => {
      if (subPlanFilter !== "all" && s.plan !== subPlanFilter) return false;
      if (subFilter) {
        const q = subFilter.toLowerCase();
        return s.orgName.toLowerCase().includes(q) || s.plan.toLowerCase().includes(q);
      }
      return true;
    });
  }, [subscriptionsList, subFilter, subPlanFilter]);

  const filteredOrgs = useMemo(() => {
    if (!searchQuery) return organizationsList;
    const q = searchQuery.toLowerCase();
    return organizationsList.filter(o => o.name.toLowerCase().includes(q) || (o.contactEmail || "").toLowerCase().includes(q));
  }, [organizationsList, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return usersList;
    const q = searchQuery.toLowerCase();
    return usersList.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.orgName.toLowerCase().includes(q));
  }, [usersList, searchQuery]);

  const { data: smtpData } = useQuery<any>({
    queryKey: ["/api/superadmin/smtp"],
    queryFn: () => apiRequest("GET", "/api/superadmin/smtp").then(r => r.json()),
    enabled: isSuperAdmin,
  });

  const [smtpForm, setSmtpForm] = useState({
    host: "", port: 587, secure: false, username: "", password: "", fromEmail: "", fromName: "Fyx Cloud", enabled: true,
  });

  useEffect(() => {
    if (smtpData && smtpData.host) {
      setSmtpForm((prev) => {
        if (prev.host) return prev;
        return {
          host: smtpData.host || "",
          port: smtpData.port || 587,
          secure: smtpData.secure || false,
          username: smtpData.username || "",
          password: "",
          fromEmail: smtpData.fromEmail || "",
          fromName: smtpData.fromName || "Fyx Cloud",
          enabled: smtpData.enabled !== false,
        };
      });
    }
  }, [smtpData]);

  const saveSmtpMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/superadmin/smtp", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/smtp"] });
      toast({ title: "SMTP settings saved", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to save SMTP settings", variant: "destructive" });
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/superadmin/smtp/test", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Test email sent", description: "Check your inbox.", variant: "success" });
    },
    onError: () => {
      toast({ title: "SMTP test failed", description: "Check your SMTP settings.", variant: "destructive" });
    },
  });

  const metricsCards = [
    { label: "Organizations", value: stats?.totalOrganizations ?? 0, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "AI Models", value: stats?.totalModels ?? 0, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Total Assets", value: stats?.totalResources ?? 0, icon: Database, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { label: "Connectors", value: stats?.totalConnectors ?? 0, icon: CloudCog, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Findings", value: stats?.totalFindings ?? 0, icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Projects", value: stats?.totalProjects ?? 0, icon: FolderKanban, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Superadmins", value: stats?.superAdmins ?? 0, icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const usageByOrg = useMemo(() => {
    return organizationsList.map(org => ({
      name: org.name.length > 15 ? org.name.substring(0, 15) + "..." : org.name,
      users: org.userCount,
      assets: org.resourceCount,
      findings: org.findingCount,
    }));
  }, [organizationsList]);

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Superadmin privileges are required to access this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold tracking-tight text-foreground">
              Platform Administration
            </h1>
            <p data-testid="text-page-subtitle" className="text-muted-foreground">
              Cross-organization management, user oversight, and platform metrics.
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search orgs, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-muted/30 border-border/50"
              data-testid="input-superadmin-search"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metricsCards.map((metric, i) => (
            <motion.div
              key={metric.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className={`${glassCard} hover:shadow-lg transition-shadow`} data-testid={`card-metric-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${metric.bg}`}>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="text-xl font-bold text-foreground" data-testid={`text-metric-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      {metric.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/30 border border-border/50">
            <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-overview">
              <Activity className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="organizations" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-organizations">
              <Building2 className="h-3.5 w-3.5" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-users">
              <Users className="h-3.5 w-3.5" />
              Users
            </TabsTrigger>
            <TabsTrigger value="bugs" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-bugs">
              <Bug className="h-3.5 w-3.5" />
              Bugs
              {bugReports.length > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-amber-500/20 text-amber-500 border-amber-500/30">{bugReports.filter(b => b.status === "Open").length || ""}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="smtp" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-smtp">
              <Mail className="h-3.5 w-3.5" />
              SMTP
            </TabsTrigger>
            <TabsTrigger value="licenses" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-licenses">
              <KeyRound className="h-3.5 w-3.5" />
              Licenses
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary" data-testid="tab-subscriptions">
              <CreditCard className="h-3.5 w-3.5" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className={glassCard} data-testid="card-usage-by-tenant-chart">
                <CardHeader>
                  <CardTitle>Organization Comparison</CardTitle>
                  <CardDescription>Users, assets, and findings across all tenants</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={usageByOrg} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="users" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="Users" />
                        <Bar dataKey="assets" fill="#007aff" radius={[2, 2, 0, 0]} name="Assets" />
                        <Bar dataKey="findings" fill="#ef4444" radius={[2, 2, 0, 0]} name="Findings" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={glassCard}>
                <CardHeader>
                  <CardTitle className="text-base">Recent Organizations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {organizationsList.slice(0, 5).map(org => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/30 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => setSelectedOrg(org)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {org.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.userCount} users, {org.resourceCount} assets</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className={glassCard}>
                <CardHeader>
                  <CardTitle className="text-base">Superadmin Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {usersList.filter(u => u.isSuperAdmin).map(u => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/30 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email} - {u.orgName}</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">Superadmin</Badge>
                    </div>
                  ))}
                  {usersList.filter(u => u.isSuperAdmin).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No superadmin users found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="mt-4">
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle>All Organizations</CardTitle>
                <CardDescription>{filteredOrgs.length} organization{filteredOrgs.length !== 1 ? "s" : ""} registered</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Users</TableHead>
                      <TableHead className="text-center">Assets</TableHead>
                      <TableHead className="text-center">Findings</TableHead>
                      <TableHead className="text-center">Projects</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.map(org => (
                      <TableRow
                        key={org.id}
                        className="cursor-pointer hover:bg-muted/20"
                        onClick={() => setSelectedOrg(org)}
                        data-testid={`row-org-${org.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {org.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{org.name}</p>
                              <p className="text-xs text-muted-foreground">{org.contactEmail || "No email"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{org.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={org.status === "Active" ? "text-emerald-500 border-emerald-500/20" : "text-red-500 border-red-500/20"}
                          >
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{org.userCount}</TableCell>
                        <TableCell className="text-center">{org.resourceCount}</TableCell>
                        <TableCell className="text-center">{org.findingCount}</TableCell>
                        <TableCell className="text-center">{org.projectCount}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle>All Platform Users</CardTitle>
                <CardDescription>{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} across all organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>MFA</TableHead>
                      <TableHead>Superadmin</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow
                        key={u.id}
                        className="cursor-pointer hover:bg-muted/20"
                        onClick={() => setSelectedUser(u)}
                        data-testid={`row-user-${u.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${u.isSuperAdmin ? "bg-gradient-to-br from-amber-500 to-blue-600" : "bg-gradient-to-br from-blue-600 to-indigo-600"}`}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{u.orgName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.status === "Active" ? "default" : "secondary"} className="text-[10px]">
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.mfaEnabled ? "default" : "outline"} className={`text-[10px] ${u.mfaEnabled ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}`}>
                            {u.mfaEnabled ? "On" : "Off"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.isSuperAdmin && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                              <Shield className="h-3 w-3 mr-1" />
                              SA
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bugs" className="space-y-4 mt-4">
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-amber-500" />
                  Bug Reports
                </CardTitle>
                <CardDescription>User-submitted bug reports from across all organizations</CardDescription>
              </CardHeader>
              <CardContent>
                {bugReports.length === 0 ? (
                  <div className="text-center py-12">
                    <Bug className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No bug reports yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead>Org</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bugReports.map(bug => {
                        const sevColors: Record<string, string> = {
                          Critical: "bg-red-500/10 text-red-500 border-red-500/20",
                          High: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                          Medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                          Low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                        };
                        const statusIcons: Record<string, any> = {
                          Open: <Clock className="h-3.5 w-3.5 text-amber-500" />,
                          "In Progress": <MessageSquare className="h-3.5 w-3.5 text-blue-500" />,
                          Resolved: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
                          Closed: <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />,
                        };
                        return (
                          <TableRow
                            key={bug.id}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => { setSelectedBug(bug); setAdminNotes(bug.adminNotes || ""); }}
                            data-testid={`row-bug-${bug.id}`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {statusIcons[bug.status] || statusIcons.Open}
                                <span className="text-xs">{bug.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${sevColors[bug.severity] || ""}`}>{bug.severity}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{bug.title}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">{bug.reportedByName || "Unknown"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">{bug.orgName || "—"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">{new Date(bug.createdAt).toLocaleDateString()}</span>
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="smtp" className="space-y-4 mt-4">
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> SMTP Configuration</CardTitle>
                <CardDescription>Configure email delivery for verification emails and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {smtpData && smtpData.host && (
                  <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    SMTP is configured ({smtpData.host}:{smtpData.port})
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">SMTP Host</label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={smtpForm.host}
                      onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                      className="bg-muted/30"
                      data-testid="input-smtp-host"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Port</label>
                    <Input
                      type="number"
                      placeholder="587"
                      value={smtpForm.port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                      className="bg-muted/30"
                      data-testid="input-smtp-port"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Username</label>
                    <Input
                      placeholder="user@company.com"
                      value={smtpForm.username}
                      onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                      className="bg-muted/30"
                      data-testid="input-smtp-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <Input
                      type="password"
                      placeholder={smtpData?.passwordEncrypted === "[configured]" ? "••••••••" : "Enter password"}
                      value={smtpForm.password}
                      onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                      className="bg-muted/30"
                      data-testid="input-smtp-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">From Email</label>
                    <Input
                      placeholder="noreply@fyxcloud.com"
                      value={smtpForm.fromEmail}
                      onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                      className="bg-muted/30"
                      data-testid="input-smtp-from-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">From Name</label>
                    <Input
                      placeholder="Fyx Cloud"
                      value={smtpForm.fromName}
                      onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                      className="bg-muted/30"
                      data-testid="input-smtp-from-name"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={smtpForm.secure}
                    onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, secure: checked })}
                    data-testid="switch-smtp-secure"
                  />
                  <span className="text-sm text-muted-foreground">Use TLS/SSL</span>
                  <span className="mx-4" />
                  <Switch
                    checked={smtpForm.enabled}
                    onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, enabled: checked })}
                    data-testid="switch-smtp-enabled"
                  />
                  <span className="text-sm text-muted-foreground">Enabled</span>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => saveSmtpMutation.mutate(smtpForm)}
                    disabled={saveSmtpMutation.isPending || !smtpForm.host || !smtpForm.username || !smtpForm.fromEmail || (!smtpForm.password && !smtpData?.host)}
                    data-testid="button-save-smtp"
                  >
                    {saveSmtpMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testSmtpMutation.mutate(smtpForm)}
                    disabled={testSmtpMutation.isPending || !smtpForm.host || !smtpForm.username || (!smtpForm.password && !smtpData?.host)}
                    data-testid="button-test-smtp"
                  >
                    {testSmtpMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</> : <><TestTube2 className="h-4 w-4 mr-2" /> Test Connection</>}
                  </Button>
                </div>
                {saveSmtpMutation.isSuccess && (
                  <div className="text-sm p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    SMTP settings saved successfully
                  </div>
                )}
                {testSmtpMutation.isSuccess && (
                  <div className={`text-sm p-3 rounded-lg ${testSmtpMutation.data?.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} border`}>
                    {testSmtpMutation.data?.success ? "Connection successful!" : `Connection failed: ${testSmtpMutation.data?.message}`}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="licenses" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">License Management</h3>
                <p className="text-sm text-muted-foreground">Manage organization licenses and plans</p>
              </div>
              <Dialog open={licenseDialogOpen} onOpenChange={setLicenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" data-testid="button-create-license">
                    <Plus className="h-3.5 w-3.5" />
                    Issue License
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Issue New License</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Organization</Label>
                      <Select value={licenseForm.orgId} onValueChange={v => setLicenseForm(f => ({ ...f, orgId: v }))}>
                        <SelectTrigger data-testid="select-license-org"><SelectValue placeholder="Select organization" /></SelectTrigger>
                        <SelectContent>
                          {organizationsList.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Plan</Label>
                        <Select value={licenseForm.plan} onValueChange={v => setLicenseForm(f => ({ ...f, plan: v }))}>
                          <SelectTrigger data-testid="select-license-plan"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                            <SelectItem value="free">Free Trial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Duration (days)</Label>
                        <Input type="number" value={licenseForm.durationDays} onChange={e => setLicenseForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 30 }))} data-testid="input-license-duration" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>Max Assets</Label>
                        <Input type="number" value={licenseForm.maxAssets} onChange={e => setLicenseForm(f => ({ ...f, maxAssets: parseInt(e.target.value) || 0 }))} data-testid="input-license-max-assets" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Max Models</Label>
                        <Input type="number" value={licenseForm.maxModels} onChange={e => setLicenseForm(f => ({ ...f, maxModels: parseInt(e.target.value) || 0 }))} data-testid="input-license-max-models" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Max Repo Scans</Label>
                        <Input type="number" value={licenseForm.maxRepoScans} onChange={e => setLicenseForm(f => ({ ...f, maxRepoScans: parseInt(e.target.value) || 0 }))} data-testid="input-license-max-repo-scans" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Max Users</Label>
                        <Input type="number" value={licenseForm.maxUsers} onChange={e => setLicenseForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 0 }))} data-testid="input-license-max-users" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Max Connectors</Label>
                        <Input type="number" value={licenseForm.maxConnectors} onChange={e => setLicenseForm(f => ({ ...f, maxConnectors: parseInt(e.target.value) || 0 }))} data-testid="input-license-max-connectors" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Max Policies</Label>
                        <Input type="number" value={licenseForm.maxPolicies} onChange={e => setLicenseForm(f => ({ ...f, maxPolicies: parseInt(e.target.value) || 0 }))} data-testid="input-license-max-policies" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Max Projects</Label>
                        <Input type="number" value={licenseForm.maxProjects} onChange={e => setLicenseForm(f => ({ ...f, maxProjects: parseInt(e.target.value) || 0 }))} data-testid="input-license-max-projects" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea value={licenseForm.notes} onChange={e => setLicenseForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." rows={2} data-testid="input-license-notes" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setLicenseDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => createLicenseMutation.mutate(licenseForm)}
                      disabled={!licenseForm.orgId || createLicenseMutation.isPending}
                      data-testid="button-submit-license"
                    >
                      {createLicenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Issue License
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card className={glassCard}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30">
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Limits</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licensesList.filter(l => l.status !== "superseded").map(lic => {
                      const daysLeft = Math.max(0, Math.ceil((new Date(lic.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                      const isExpired = lic.computedStatus === "expired";
                      return (
                        <TableRow key={lic.id} className="border-border/20" data-testid={`row-license-${lic.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{lic.orgName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{lic.orgId.substring(0, 12)}...</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] capitalize ${
                              lic.plan === "enterprise" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                              lic.plan === "paid" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                              "bg-muted text-muted-foreground"
                            }`}>{lic.plan}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${
                              isExpired ? "bg-red-500/10 text-red-500 border-red-500/20" :
                              "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            }`}>
                              {isExpired ? "Expired" : `Active (${daysLeft}d left)`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>{lic.maxAssets.toLocaleString()} assets · {lic.maxModels.toLocaleString()} models · {lic.maxRepoScans.toLocaleString()} repo scans</p>
                              <p>{lic.maxUsers} users · {lic.maxConnectors} connectors</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{new Date(lic.expiresAt).toLocaleDateString()}</p>
                            {lic.activatedBy && <p className="text-xs text-muted-foreground">by {lic.activatedBy}</p>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {isExpired ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    const newExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
                                    updateLicenseMutation.mutate({ id: lic.id, status: "active", expiresAt: newExpiry, plan: "paid" });
                                  }}
                                  disabled={updateLicenseMutation.isPending}
                                  data-testid={`button-renew-${lic.id}`}
                                >
                                  Renew
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 text-red-500 border-red-500/20 hover:bg-red-500/10"
                                  onClick={() => updateLicenseMutation.mutate({ id: lic.id, status: "expired" })}
                                  disabled={updateLicenseMutation.isPending}
                                  data-testid={`button-revoke-${lic.id}`}
                                >
                                  Revoke
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {licensesList.filter(l => l.status !== "superseded").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No licenses found. Issue a license to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Subscription Management</h3>
                <p className="text-sm text-muted-foreground">View and manage organization subscriptions</p>
              </div>
              <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-grant-subscription">
                    <Gift className="h-4 w-4 mr-1" />
                    Grant Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Grant Subscription</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Organization</Label>
                      <Select value={grantOrgId} onValueChange={setGrantOrgId}>
                        <SelectTrigger data-testid="select-grant-org"><SelectValue placeholder="Select organization" /></SelectTrigger>
                        <SelectContent>
                          {organizationsList.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Plan</Label>
                      <Select value={grantPlan} onValueChange={setGrantPlan}>
                        <SelectTrigger data-testid="select-grant-plan"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter (500 units)</SelectItem>
                          <SelectItem value="professional">Professional (5,000 units)</SelectItem>
                          <SelectItem value="enterprise">Enterprise (50,000 units)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Custom Max Units (optional)</Label>
                      <Input
                        type="number"
                        placeholder="Leave blank for plan default"
                        value={grantMaxUnits}
                        onChange={(e) => setGrantMaxUnits(e.target.value)}
                        data-testid="input-grant-max-units"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => grantSubscriptionMutation.mutate({
                        orgId: grantOrgId,
                        plan: grantPlan,
                        maxUnits: grantMaxUnits ? parseInt(grantMaxUnits) : undefined,
                      })}
                      disabled={!grantOrgId || grantSubscriptionMutation.isPending}
                      data-testid="button-confirm-grant"
                    >
                      {grantSubscriptionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Grant
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subscriptions..."
                  className="pl-9"
                  value={subFilter}
                  onChange={(e) => setSubFilter(e.target.value)}
                  data-testid="input-search-subscriptions"
                />
              </div>
              <Select value={subPlanFilter} onValueChange={setSubPlanFilter}>
                <SelectTrigger className="w-40" data-testid="select-plan-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className={glassCard}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Billing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubs.map(sub => (
                      <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                        <TableCell className="font-medium">{sub.orgName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{sub.plan}</Badge>
                        </TableCell>
                        <TableCell className="capitalize text-sm">{sub.billingInterval}</TableCell>
                        <TableCell>
                          <Badge variant={sub.status === "active" ? "default" : sub.status === "past_due" ? "destructive" : "secondary"}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{sub.usedUnits.toLocaleString()}/{sub.maxUnits.toLocaleString()}</span>
                            <span className={`text-xs ${sub.usagePercentage >= 100 ? "text-red-500" : sub.usagePercentage >= 80 ? "text-yellow-500" : "text-muted-foreground"}`}>
                              ({sub.usagePercentage}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Select
                              value={sub.plan}
                              onValueChange={(plan) => updateSubscriptionMutation.mutate({ id: sub.id, plan })}
                            >
                              <SelectTrigger className="h-7 text-xs w-28" data-testid={`select-change-plan-${sub.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="starter">Starter</SelectItem>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                              </SelectContent>
                            </Select>
                            {sub.status === "active" && sub.plan !== "free" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-500"
                                onClick={() => updateSubscriptionMutation.mutate({ id: sub.id, status: "canceled", plan: "free", maxUnits: 100 })}
                                data-testid={`button-cancel-sub-${sub.id}`}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSubs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No subscriptions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <OrgDetailDrawer org={selectedOrg} onClose={() => setSelectedOrg(null)} />
      <UserDetailDrawer selectedUser={selectedUser} onClose={() => setSelectedUser(null)} />

      <Sheet open={!!selectedBug} onOpenChange={(open) => { if (!open) setSelectedBug(null); }}>
        <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background">
          {selectedBug && (
            <div>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Bug className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-semibold flex-1">{selectedBug.title}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={`text-[10px] ${
                    selectedBug.severity === "Critical" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    selectedBug.severity === "High" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                    selectedBug.severity === "Medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  }`}>{selectedBug.severity}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${
                    selectedBug.status === "Open" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    selectedBug.status === "Resolved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    selectedBug.status === "In Progress" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                    "bg-muted text-muted-foreground"
                  }`}>{selectedBug.status}</Badge>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-2">Description</h4>
                  <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-sm whitespace-pre-wrap">{selectedBug.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-1">Reporter</p>
                    <p className="text-sm font-medium">{selectedBug.reportedByName}</p>
                    <p className="text-xs text-muted-foreground">{selectedBug.reportedByEmail}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-1">Organization</p>
                    <p className="text-sm font-medium">{selectedBug.orgName || "—"}</p>
                  </div>
                  {selectedBug.page && (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/50 col-span-2">
                      <p className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-1">Page</p>
                      <p className="text-sm font-mono text-muted-foreground">{selectedBug.page}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-1">Submitted</p>
                    <p className="text-sm">{new Date(selectedBug.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedBug.resolvedAt && (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                      <p className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-1">Resolved</p>
                      <p className="text-sm">{new Date(selectedBug.resolvedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-2">Update Status</h4>
                  <div className="flex gap-2">
                    {["Open", "In Progress", "Resolved", "Closed"].map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selectedBug.status === s ? "default" : "outline"}
                        className="text-xs"
                        disabled={updateBugMutation.isPending}
                        onClick={() => {
                          updateBugMutation.mutate({ id: selectedBug.id, status: s });
                          setSelectedBug({ ...selectedBug, status: s });
                        }}
                        data-testid={`button-status-${s.toLowerCase().replace(" ", "-")}`}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-2">Admin Notes</h4>
                  <Textarea
                    placeholder="Add internal notes about this bug report..."
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    data-testid="input-admin-notes"
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={updateBugMutation.isPending || adminNotes === (selectedBug.adminNotes || "")}
                    onClick={() => {
                      updateBugMutation.mutate({ id: selectedBug.id, adminNotes });
                      setSelectedBug({ ...selectedBug, adminNotes });
                    }}
                    data-testid="button-save-notes"
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
