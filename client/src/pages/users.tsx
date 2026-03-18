import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import Layout from "@/components/layout";
import { HelpIcon } from "@/components/help-icon";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Shield, UserCog, UserX, Trash2, AlertCircle, KeyRound, Info, FolderOpen,
  ShieldCheck, ShieldAlert, Eye, Users, Search, Mail, Clock, Fingerprint,
  CheckCircle, XCircle, ChevronRight, Activity, Lock, Unlock, Crown, Wrench, BarChart3
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import type { User, Project, ProjectMembership } from "@shared/schema";

type UserWithMemberships = User & { projectMemberships: ProjectMembership[] };

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Owner: "Full access. Can transfer ownership, manage billing, delete org. Only one per org.",
  Admin: "Manage users, all projects, org settings, connectors. Cannot delete org or transfer ownership.",
  "Security Engineer": "Manage policies, run evaluations/scans, create connectors, triage findings. Project-scoped.",
  Analyst: "View findings, acknowledge/suppress findings, view policies & inventory. Project-scoped.",
  Viewer: "Read-only access to dashboards, inventory, findings. Project-scoped.",
};

const ROLE_ICONS: Record<string, any> = {
  Owner: Crown,
  Admin: ShieldCheck,
  "Security Engineer": Wrench,
  Analyst: BarChart3,
  Viewer: Eye,
};

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string; color: string }> = {
  Owner: { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", color: "#f59e0b" },
  Admin: { text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", color: "#007aff" },
  "Security Engineer": { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", color: "#a855f7" },
  Analyst: { text: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", color: "#06b6d4" },
  Viewer: { text: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20", color: "#6b7280" },
};

const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  Owner: ["Manage org settings", "Manage users", "Create/delete projects", "Manage connectors", "Run scans", "Manage policies", "Triage findings", "View all data", "Manage project members"],
  Admin: ["Manage org settings", "Manage users", "Create/delete projects", "Manage connectors", "Run scans", "Manage policies", "Triage findings", "View all data", "Manage project members"],
  "Security Engineer": ["Manage connectors", "Run scans", "Manage policies", "Triage findings", "View all data"],
  Analyst: ["Triage findings", "View all data"],
  Viewer: ["View all data"],
};

const PROJECT_SCOPED_ROLES = ["Security Engineer", "Analyst", "Viewer"];
const ALL_ROLES = ["Owner", "Admin", "Security Engineer", "Analyst", "Viewer"];

const cardClass = "border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-sm";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

function UserDetailDrawer({ user, projectsList, onClose, isOwnerOrAdmin, isOwner, currentUserId, onEditRole, onToggleStatus, onDelete }: {
  user: UserWithMemberships | null;
  projectsList: Project[];
  onClose: () => void;
  isOwnerOrAdmin: boolean;
  isOwner: boolean;
  currentUserId: string | undefined;
  onEditRole: (user: UserWithMemberships) => void;
  onToggleStatus: (id: string, status: string) => void;
  onDelete: (user: UserWithMemberships) => void;
}) {
  if (!user) return null;

  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.Viewer;
  const RoleIcon = ROLE_ICONS[user.role] || Eye;
  const permissions = PERMISSIONS_BY_ROLE[user.role] || [];
  const isSelf = user.id === currentUserId;
  const canManageThisUser = isOwnerOrAdmin && !isSelf && !(user.role === "Owner" && !isOwner);

  const getProjectName = (projectId: string) => {
    return projectsList.find((p) => p.id === projectId)?.name || projectId;
  };

  return (
    <Sheet open={!!user} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${roleStyle.color}15` }}>
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg font-bold" style={{ backgroundColor: `${roleStyle.color}20`, color: roleStyle.color }}>
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${roleStyle.text} ${roleStyle.bg} ${roleStyle.border}`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {user.role}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${user.status === "Active" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-gray-500 border-gray-500/20 bg-gray-500/10"}`}>
                    {user.status === "Active" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {user.status}
                  </Badge>
                  {user.mfaEnabled && (
                    <Badge variant="outline" className="text-xs text-primary border-primary/20 bg-primary/10">
                      <Fingerprint className="h-3 w-3 mr-1" /> MFA
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-lg font-bold leading-tight">{user.name}</SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {user.email}
                </p>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Account Details
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline" className={`text-xs ${roleStyle.text} ${roleStyle.bg} ${roleStyle.border}`}>
                  <RoleIcon className="h-3 w-3 mr-1" /> {user.role}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Scope</span>
                <span className="text-sm font-medium">
                  {PROJECT_SCOPED_ROLES.includes(user.role) ? "Project-scoped" : "Organization-wide"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-1.5">
                  {user.status === "Active" ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-gray-500" />
                  )}
                  <span className={`text-sm font-medium ${user.status === "Active" ? "text-emerald-500" : "text-gray-500"}`}>
                    {user.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">MFA</span>
                <span className={`text-sm font-medium ${user.mfaEnabled ? "text-primary" : "text-muted-foreground"}`}>
                  {user.mfaEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Last Login</span>
                <span className="text-sm font-mono text-muted-foreground">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" /> Role Permissions
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs text-muted-foreground mb-3">{ROLE_DESCRIPTIONS[user.role]}</p>
              <Separator className="opacity-30 mb-3" />
              <div className="grid grid-cols-1 gap-1.5">
                {permissions.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: roleStyle.color }} />
                    <span className="text-foreground/80">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5" /> Project Access
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              {PROJECT_SCOPED_ROLES.includes(user.role) ? (
                <>
                  {user.projectMemberships && user.projectMemberships.length > 0 ? (
                    <div className="space-y-2">
                      {user.projectMemberships.map((m) => (
                        <div key={m.projectId} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0" data-testid={`drawer-project-${user.id}-${m.projectId}`}>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{getProjectName(m.projectId)}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[m.role]?.text || "text-gray-500"} ${ROLE_COLORS[m.role]?.border || "border-gray-500/20"} ${ROLE_COLORS[m.role]?.bg || "bg-gray-500/10"}`}>
                            {m.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No project assignments</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">This user cannot access any projects yet</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 py-1">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${roleStyle.color}10` }}>
                    <ShieldCheck className="h-4 w-4" style={{ color: roleStyle.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">All Projects</p>
                    <p className="text-xs text-muted-foreground">
                      {user.role === "Owner" ? "Owners" : "Admins"} have automatic access to every project
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {canManageThisUser && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" /> Actions
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    data-testid={`drawer-edit-role-${user.id}`}
                    variant="outline"
                    className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => onEditRole(user)}
                  >
                    <UserCog className="h-4 w-4" /> Change Role
                  </Button>
                  <Button
                    data-testid={`drawer-toggle-status-${user.id}`}
                    variant="outline"
                    className={`gap-2 ${user.status === "Active" ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10" : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"}`}
                    onClick={() => onToggleStatus(user.id, user.status === "Active" ? "Disabled" : "Active")}
                  >
                    {user.status === "Active" ? (
                      <><Lock className="h-4 w-4" /> Disable</>
                    ) : (
                      <><Unlock className="h-4 w-4" /> Enable</>
                    )}
                  </Button>
                </div>
                <Button
                  data-testid={`drawer-delete-${user.id}`}
                  variant="outline"
                  className="w-full gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                  onClick={() => onDelete(user)}
                >
                  <Trash2 className="h-4 w-4" /> Delete User
                </Button>
              </div>
            </section>
          )}

          {isSelf && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-primary font-medium flex items-center gap-2">
                <Info className="h-4 w-4" /> This is your account
              </p>
              <p className="text-xs text-muted-foreground mt-1">You can manage your MFA settings from the user menu.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const isOwnerOrAdmin = currentUser?.role === "Owner" || currentUser?.role === "Admin";
  const isOwner = currentUser?.role === "Owner";

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: usersList = [], isLoading } = useQuery<UserWithMemberships[]>({
    queryKey: ["/api/users"],
  });

  const { data: projectsList = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const [selectedUser, setSelectedUser] = useState<UserWithMemberships | null>(null);
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const highlightId = params.get("highlight");
    if (highlightId && usersList.length > 0 && !selectedUser) {
      const match = usersList.find(u => u.id === highlightId);
      if (match) {
        setSelectedUser(match);
        window.history.replaceState({}, "", "/users");
      }
    }
  }, [searchString, usersList]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [inviteError, setInviteError] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState<UserWithMemberships | null>(null);
  const [newRole, setNewRole] = useState("");
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserWithMemberships | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: string }) => {
      const res = await apiRequest("POST", "/api/users/invite", data);
      const newUser = await res.json();
      if (PROJECT_SCOPED_ROLES.includes(data.role) && selectedProjectIds.length > 0) {
        for (const projectId of selectedProjectIds) {
          await apiRequest("POST", `/api/projects/${projectId}/members`, {
            userId: newUser.id,
            role: data.role,
          });
        }
      }
      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteRole("Viewer");
      setInviteError("");
      setSelectedProjectIds([]);
      toast({ title: "User invited", description: "New user has been added successfully.", variant: "success" });
    },
    onError: (err: any) => {
      const msg = err.message?.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "") || "Failed to invite user";
      setInviteError(msg);
      toast({ title: "Failed to invite user", description: msg, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role, projectIds, currentMemberships }: { id: string; role: string; projectIds: string[]; currentMemberships: ProjectMembership[] }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/role`, { role });
      const result = await res.json();

      if (PROJECT_SCOPED_ROLES.includes(role)) {
        const currentProjectIds = currentMemberships.map((m) => m.projectId);
        const toAdd = projectIds.filter((pid) => !currentProjectIds.includes(pid));
        const toRemove = currentProjectIds.filter((pid) => !projectIds.includes(pid));

        for (const projectId of toAdd) {
          await apiRequest("POST", `/api/projects/${projectId}/members`, { userId: id, role });
        }
        for (const projectId of toRemove) {
          await apiRequest("DELETE", `/api/projects/${projectId}/members/${id}`);
        }
        const toUpdate = projectIds.filter((pid) => currentProjectIds.includes(pid));
        for (const projectId of toUpdate) {
          const existing = currentMemberships.find((m) => m.projectId === projectId);
          if (existing && existing.role !== role) {
            await apiRequest("PATCH", `/api/projects/${projectId}/members/${id}`, { role });
          }
        }
      } else {
        for (const m of currentMemberships) {
          await apiRequest("DELETE", `/api/projects/${m.projectId}/members/${id}`);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditRoleOpen(false);
      setEditRoleUser(null);
      setSelectedUser(null);
      toast({ title: "Role updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User status updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteOpen(false);
      setDeleteUser(null);
      setSelectedUser(null);
      toast({ title: "User deleted", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const toggleProjectSelection = (projectId: string, list: string[], setter: (ids: string[]) => void) => {
    if (list.includes(projectId)) {
      setter(list.filter((id) => id !== projectId));
    } else {
      setter([...list, projectId]);
    }
  };

  const getAvailableRoles = () => {
    if (isOwner) return ALL_ROLES;
    return ALL_ROLES.filter((r) => r !== "Owner");
  };

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [usersList, search, roleFilter, statusFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of usersList) {
      counts[u.role] = (counts[u.role] || 0) + 1;
    }
    return counts;
  }, [usersList]);

  const stats = [
    { label: "Total Users", value: usersList.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active", value: usersList.filter(u => u.status === "Active").length, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "MFA Enabled", value: usersList.filter(u => u.mfaEnabled).length, icon: Fingerprint, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Roles", value: Object.keys(roleCounts).length, icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const handleOpenEditRole = (user: UserWithMemberships) => {
    setEditRoleUser(user);
    setNewRole(user.role);
    setEditProjectIds(user.projectMemberships?.map((m) => m.projectId) || []);
    setEditRoleOpen(true);
  };

  const handleToggleStatus = (id: string, status: string) => {
    toggleStatusMutation.mutate({ id, status });
  };

  const handleOpenDelete = (user: UserWithMemberships) => {
    setDeleteUser(user);
    setDeleteOpen(true);
  };

  return (
    <Layout>
      <TooltipProvider>
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2" data-testid="text-page-title">User Management <HelpIcon section="users" /></h1>
              <p className="text-muted-foreground">
                Manage access and roles for your organization members.
              </p>
            </div>
            {isOwnerOrAdmin && (
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                data-testid="button-invite-user"
                onClick={() => setInviteOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Invite User
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeIn}>
                <Card data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`} className={cardClass}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {ALL_ROLES.map((role) => {
                const rs = ROLE_COLORS[role];
                const count = roleCounts[role] || 0;
                const Icon = ROLE_ICONS[role] || Eye;
                return (
                  <Badge
                    key={role}
                    variant="outline"
                    className={`text-xs cursor-pointer transition-all ${roleFilter === role ? `${rs.text} ${rs.bg} ${rs.border} ring-1 ring-offset-1` : "text-muted-foreground border-border/50 hover:border-border"}`}
                    onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
                    data-testid={`filter-role-${role.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="h-3 w-3 mr-1" /> {role} ({count})
                  </Badge>
                );
              })}
            </div>
          </div>

          <motion.div custom={4} initial="hidden" animate="visible" variants={fadeIn}>
            <Card className={cardClass}>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>{filteredUsers.length} of {usersList.length} users</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 w-64 bg-background/50"
                        data-testid="input-search-users"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] h-9 bg-background/50" data-testid="select-status-filter">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No users found</h3>
                    <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">User</TableHead>
                        <TableHead className="text-muted-foreground">Role</TableHead>
                        <TableHead className="text-muted-foreground">Projects</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">MFA</TableHead>
                        <TableHead className="text-muted-foreground">Last Login</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => {
                        const rs = ROLE_COLORS[u.role] || ROLE_COLORS.Viewer;
                        const Icon = ROLE_ICONS[u.role] || Eye;
                        return (
                          <TableRow
                            key={u.id}
                            className="border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                            onClick={() => setSelectedUser(u)}
                            data-testid={`row-user-${u.id}`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-sm font-semibold" style={{ backgroundColor: `${rs.color}20`, color: rs.color }}>
                                    {u.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">{u.name}</span>
                                  <span className="text-xs text-muted-foreground">{u.email}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${rs.text} ${rs.bg} ${rs.border}`}>
                                <Icon className="h-3 w-3 mr-1" /> {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {PROJECT_SCOPED_ROLES.includes(u.role) ? (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {u.projectMemberships && u.projectMemberships.length > 0 ? (
                                    u.projectMemberships.slice(0, 2).map((m) => (
                                      <Badge key={m.projectId} variant="outline" className="text-[10px] text-muted-foreground border-border/50">
                                        {projectsList.find((p) => p.id === m.projectId)?.name || m.projectId}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60">No projects</span>
                                  )}
                                  {u.projectMemberships && u.projectMemberships.length > 2 && (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground/60 border-border/30">
                                      +{u.projectMemberships.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">All projects</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${u.status === "Active" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-gray-500 border-gray-500/20 bg-gray-500/10"}`}>
                                {u.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {u.mfaEnabled ? (
                                <Badge variant="outline" className="text-xs text-primary border-primary/20 bg-primary/10">
                                  <KeyRound className="h-3 w-3 mr-1" /> On
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">Off</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <UserDetailDrawer
          user={selectedUser}
          projectsList={projectsList}
          onClose={() => setSelectedUser(null)}
          isOwnerOrAdmin={isOwnerOrAdmin}
          isOwner={isOwner}
          currentUserId={currentUser?.id}
          onEditRole={handleOpenEditRole}
          onToggleStatus={handleToggleStatus}
          onDelete={handleOpenDelete}
        />

        <Sheet open={inviteOpen} onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteError("");
            setSelectedProjectIds([]);
            setInviteName("");
            setInviteEmail("");
            setInvitePassword("");
            setInviteRole("Viewer");
          }
        }}>
          <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
              <SheetHeader className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl shrink-0 bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <SheetTitle className="text-lg font-bold leading-tight">Invite New User</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Add a new team member to your organization
                    </p>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate({ name: inviteName, email: inviteEmail, password: invitePassword, role: inviteRole });
              }}
              className="p-6 space-y-6"
            >
              {inviteError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm" data-testid="invite-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {inviteError}
                </div>
              )}

              <section>
                <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> User Details
                </h3>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Full Name</Label>
                    <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} required data-testid="input-invite-name" className="bg-background/50" placeholder="e.g. Jane Smith" />
                  </div>
                  <Separator className="opacity-30" />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email Address</Label>
                    <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required data-testid="input-invite-email" className="bg-background/50" placeholder="e.g. jane@company.com" />
                  </div>
                  <Separator className="opacity-30" />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Temporary Password</Label>
                    <Input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} required minLength={8} data-testid="input-invite-password" className="bg-background/50" placeholder="Min. 8 characters" />
                    <p className="text-[11px] text-muted-foreground/60">The user will be asked to change this on first login</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" /> Select Role
                </h3>
                <div className="space-y-2">
                  {getAvailableRoles().map((role) => {
                    const rs = ROLE_COLORS[role] || ROLE_COLORS.Viewer;
                    const RIcon = ROLE_ICONS[role] || Eye;
                    const isSelected = inviteRole === role;
                    return (
                      <div
                        key={role}
                        data-testid={`invite-role-option-${role.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected ? `${rs.border} ${rs.bg} ring-1` : "border-border/50 hover:border-border bg-muted/5 hover:bg-muted/10"}`}
                        onClick={() => {
                          setInviteRole(role);
                          if (!PROJECT_SCOPED_ROLES.includes(role)) {
                            setSelectedProjectIds([]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${rs.color}${isSelected ? '20' : '10'}` }}>
                            <RIcon className="h-4 w-4" style={{ color: rs.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{role}</span>
                              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/30">
                                {PROJECT_SCOPED_ROLES.includes(role) ? "Project-scoped" : "Org-wide"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 shrink-0" style={{ color: rs.color }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {PROJECT_SCOPED_ROLES.includes(inviteRole) && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5" /> Project Assignments
                  </h3>
                  <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2 max-h-60 overflow-y-auto">
                    {projectsList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No projects available</p>
                    ) : (
                      projectsList.map((project) => (
                        <div
                          key={project.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selectedProjectIds.includes(project.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/20 border border-transparent"}`}
                          onClick={() => toggleProjectSelection(project.id, selectedProjectIds, setSelectedProjectIds)}
                          data-testid={`checkbox-invite-project-${project.id}`}
                        >
                          <Checkbox
                            id={`invite-project-${project.id}`}
                            checked={selectedProjectIds.includes(project.id)}
                            onCheckedChange={() => toggleProjectSelection(project.id, selectedProjectIds, setSelectedProjectIds)}
                          />
                          <label htmlFor={`invite-project-${project.id}`} className="text-sm cursor-pointer flex-1 font-medium">
                            {project.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedProjectIds.length === 0 && (
                    <p className="text-xs text-amber-500 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Select at least one project for project-scoped roles
                    </p>
                  )}
                </section>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending} className="flex-1 bg-primary hover:bg-primary/90" data-testid="button-submit-invite">
                  {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>

        <Sheet open={editRoleOpen} onOpenChange={setEditRoleOpen}>
          <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
              <SheetHeader className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl shrink-0 bg-primary/10">
                    <UserCog className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <SheetTitle className="text-lg font-bold leading-tight">Change Role</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Update role and project access for {editRoleUser?.name}
                    </p>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <div className="p-6 space-y-6">
              <section>
                <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" /> Select Role
                </h3>
                <div className="space-y-2">
                  {getAvailableRoles().map((role) => {
                    const rs = ROLE_COLORS[role] || ROLE_COLORS.Viewer;
                    const RIcon = ROLE_ICONS[role] || Eye;
                    const isSelected = newRole === role;
                    return (
                      <div
                        key={role}
                        data-testid={`role-option-${role.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected ? `${rs.border} ${rs.bg} ring-1` : "border-border/50 hover:border-border bg-muted/5 hover:bg-muted/10"}`}
                        onClick={() => {
                          setNewRole(role);
                          if (!PROJECT_SCOPED_ROLES.includes(role)) {
                            setEditProjectIds([]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${rs.color}${isSelected ? '20' : '10'}` }}>
                            <RIcon className="h-4 w-4" style={{ color: rs.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{role}</span>
                              <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/30">
                                {PROJECT_SCOPED_ROLES.includes(role) ? "Project-scoped" : "Org-wide"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 shrink-0" style={{ color: rs.color }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {PROJECT_SCOPED_ROLES.includes(newRole) && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5" /> Project Assignments
                  </h3>
                  <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2 max-h-60 overflow-y-auto">
                    {projectsList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No projects available</p>
                    ) : (
                      projectsList.map((project) => (
                        <div
                          key={project.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${editProjectIds.includes(project.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/20 border border-transparent"}`}
                          onClick={() => toggleProjectSelection(project.id, editProjectIds, setEditProjectIds)}
                          data-testid={`checkbox-edit-project-${project.id}`}
                        >
                          <Checkbox
                            id={`edit-project-${project.id}`}
                            checked={editProjectIds.includes(project.id)}
                            onCheckedChange={() => toggleProjectSelection(project.id, editProjectIds, setEditProjectIds)}
                          />
                          <label htmlFor={`edit-project-${project.id}`} className="text-sm cursor-pointer flex-1 font-medium">
                            {project.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {editProjectIds.length === 0 && (
                    <p className="text-xs text-amber-500 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Select at least one project for project-scoped roles
                    </p>
                  )}
                </section>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditRoleOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => editRoleUser && updateRoleMutation.mutate({
                    id: editRoleUser.id,
                    role: newRole,
                    projectIds: editProjectIds,
                    currentMemberships: editRoleUser.projectMemberships || [],
                  })}
                  disabled={updateRoleMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  data-testid="button-confirm-role"
                >
                  {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="glass-panel border-white/10 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)} data-testid="button-cancel-delete">Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </Layout>
  );
}
