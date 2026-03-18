import { 
  LayoutDashboard, 
  BrainCircuit, 
  ShieldAlert, 
  FileLock2, 
  Settings, 
  ChevronDown, 
  LogOut,
  User,
  Menu,
  Users,
  Building,
  CloudCog,
  Database,
  Moon,
  Sun,
  FolderKanban,
  LayoutGrid,
  AlertTriangle,
  Webhook,
  FileText,
  Network,
  Scale,
  BookOpen,
  Code,
  KeyRound,
  HelpCircle,
  Bug,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ClipboardList,
  CreditCard
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { useAuth, usePermission } from "@/lib/auth";
import { useProject } from "@/hooks/use-project";
import NotificationPopover from "@/components/notification-popover";
import { ProfileDrawer, SettingsDrawer, MfaDrawer } from "@/components/user-drawers";
import { FyxLogo } from "@/components/fyx-logo";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GuidedTour, useTour } from "@/components/guided-tour";
import GlobalSearch from "@/components/global-search";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItem = { icon: any; label: string; href: string; requiredPermission?: string; requireSuperAdmin?: boolean };
type NavSection = { label: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    label: "MONITORING",
    items: [
      { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
      { icon: BrainCircuit, label: "AI Models", href: "/models" },
      { icon: Database, label: "Asset Inventory", href: "/inventory" },
      { icon: Network, label: "Security Graph", href: "/security-graph" },
    ],
  },
  {
    label: "SECURITY",
    items: [
      { icon: FileLock2, label: "Data Security", href: "/data" },
      { icon: ShieldAlert, label: "Policies", href: "/policies" },
      { icon: AlertTriangle, label: "Findings", href: "/findings" },
      { icon: Scale, label: "Compliance", href: "/compliance" },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { icon: FolderKanban, label: "Projects", href: "/projects" },
      { icon: CloudCog, label: "Cloud Connectors", href: "/connectors", requiredPermission: "manage_connectors" },
      { icon: Webhook, label: "Integrations", href: "/webhooks", requiredPermission: "manage_connectors" },
      { icon: FileText, label: "Reports", href: "/reports" },
      { icon: Users, label: "User Management", href: "/users", requiredPermission: "manage_users" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { icon: Building, label: "Organization", href: "/organization", requiredPermission: "manage_org" },
      { icon: CreditCard, label: "Billing", href: "/billing", requiredPermission: "manage_org" },
      { icon: KeyRound, label: "API Keys", href: "/api-keys" },
      { icon: ClipboardList, label: "Audit Log", href: "/audit-logs", requiredPermission: "manage_org" },
      { icon: LayoutGrid, label: "Platform Admin", href: "/superadmin", requireSuperAdmin: true },
    ],
  },
  {
    label: "HELP",
    items: [
      { icon: BookOpen, label: "Documentation", href: "/docs" },
      { icon: Code, label: "API Docs", href: "/api-docs" },
    ],
  },
];

function NavItemComponent({ item, isActive, collapsed }: { item: NavItem; isActive: boolean; collapsed: boolean }) {
  const inner = (
    <Link
      href={item.href}
      data-testid={`nav-${item.href.replace('/', '') || 'overview'}`}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${
        collapsed ? "justify-center" : ""
      } ${
        isActive
          ? "bg-[#007aff]/10 text-[#007aff]"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#007aff] rounded-r-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <item.icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? "text-[#007aff]" : "group-hover:text-foreground"}`} />
      {!collapsed && (
        <span className={`text-[13px] truncate ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout, permissions, isSuperAdmin, impersonating, stopImpersonation, license, licenseStatus } = useAuth();
  useRealtimeNotifications();
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugSeverity, setBugSeverity] = useState("Medium");
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const { toast } = useToast();
  const { isActive: tourActive, startTour, endTour, shouldAutoStart } = useTour();
  const { selectedProjectId, selectedProjectName, setProject, clearProject } = useProject();

  useEffect(() => {
    if (user && shouldAutoStart()) {
      const timer = setTimeout(() => startTour(), 1500);
      return () => clearTimeout(timer);
    }
  }, [user, shouldAutoStart, startTour]);
  
  const { data: projectsList = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  useEffect(() => {
    if (!theme) setTheme('dark');
  }, [theme, setTheme]);

  const sidebarWidth = collapsed ? "w-[68px]" : "w-60";
  const mainMargin = collapsed ? "md:ml-[68px]" : "md:ml-60";

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isCollapsed = isMobile ? false : collapsed;
    return (
      <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-border/40">
        <div className={`flex items-center h-14 border-b border-border/40 shrink-0 ${isCollapsed ? "justify-center px-2" : "px-4 gap-3"}`}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <FyxLogo className="h-8 w-8" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight leading-none text-foreground">FYX CLOUD</span>
              <span className="text-[9px] text-muted-foreground/60 font-medium tracking-[0.2em] mt-0.5">AI-SPM</span>
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto py-3 space-y-4 scrollbar-thin ${isCollapsed ? "px-1.5" : "px-2.5"}`}>
          {navSections.map((section) => {
            const visibleItems = section.items.filter(item => {
              if (item.requireSuperAdmin) return isSuperAdmin;
              if (item.requiredPermission) return permissions.includes(item.requiredPermission);
              return true;
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                {!isCollapsed && (
                  <div className="px-3 mb-1.5">
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/50 uppercase select-none">
                      {section.label}
                    </span>
                  </div>
                )}
                {isCollapsed && <div className="h-px bg-border/30 mx-2 mb-1.5" />}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavItemComponent
                      key={item.href}
                      item={item}
                      isActive={location === item.href}
                      collapsed={isCollapsed}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`px-3 py-3 border-t border-border/30 ${isCollapsed ? "text-center" : ""}`}>
          {isCollapsed ? (
            <span className="text-[9px] text-muted-foreground/40 font-mono">1.0</span>
          ) : (
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground/40 font-medium">Fyx Cloud AI</span>
              <span className="text-[10px] text-muted-foreground/30 font-mono">v1.0.0</span>
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="p-2 border-t border-border/30">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center w-full py-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
              data-testid="button-collapse-sidebar"
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 border-r border-border/40 w-60">
          <SidebarContent isMobile />
        </SheetContent>
      </Sheet>

      <aside className={`hidden md:block fixed left-0 top-0 bottom-0 z-30 transition-all duration-300 ${sidebarWidth}`}>
        <SidebarContent />
      </aside>

      <main className={`${mainMargin} min-h-screen flex flex-col transition-all duration-300`}>
        <header className="h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-20 px-4 md:px-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0" onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden sm:flex items-center gap-2 h-8 px-2 hover:bg-muted/40 transition-all rounded-lg" data-testid="button-tenant-switcher">
                  <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] text-white font-bold shadow-sm shrink-0">
                    AC
                  </div>
                  <span className="text-sm font-medium truncate">Acme Corp</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-card/95 backdrop-blur-xl border-border/60">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Tenant</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem className="gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer">
                  <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] text-white font-bold">AC</div>
                  Acme Corp
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer">
                  <div className="h-5 w-5 rounded bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-[9px] text-white font-bold">GS</div>
                  Globex Systems
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden sm:block h-4 w-px bg-border/40 shrink-0" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden lg:flex items-center gap-2 h-8 px-2 hover:bg-muted/40 transition-all rounded-lg" data-testid="button-project-switcher">
                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate max-w-[120px]">{selectedProjectName || "All Projects"}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-card/95 backdrop-blur-xl border-border/60">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Project</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  className={`gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer ${!selectedProjectId ? "bg-primary/10 text-primary" : ""}`}
                  onClick={() => clearProject()}
                  data-testid="button-all-projects"
                >
                  <LayoutGrid className="h-4 w-4" />
                  All Projects
                </DropdownMenuItem>
                {projectsLoading ? (
                  <DropdownMenuItem disabled className="text-muted-foreground">Loading...</DropdownMenuItem>
                ) : (
                  projectsList.map(project => (
                    <DropdownMenuItem
                      key={project.id}
                      className={`gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer ${selectedProjectId === project.id ? "bg-primary/10 text-primary" : ""}`}
                      onClick={() => setProject(project.id, project.name)}
                      data-testid={`button-project-${project.id}`}
                    >
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{project.name}</span>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator className="bg-border/50" />
                <Link href="/projects">
                  <DropdownMenuItem className="gap-2 text-primary cursor-pointer focus:bg-primary/10">
                    <Settings className="h-4 w-4" />
                    Manage Projects
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
            <GlobalSearch />

            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  data-testid="button-theme-toggle"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded-lg"
                  onClick={() => setBugReportOpen(true)}
                  data-testid="button-report-bug"
                >
                  <Bug className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Report a bug</TooltipContent>
            </Tooltip>

            <NotificationPopover />

            <div className="h-5 w-px bg-border/40 mx-0.5" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 gap-2 px-1.5 rounded-lg hover:bg-muted/40" data-testid="button-user-menu">
                  <Avatar className="h-7 w-7 ring-1 ring-border/60">
                    <AvatarFallback className="bg-gradient-to-br from-[#007aff] to-indigo-600 text-white text-[11px] font-semibold">{user?.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:block text-sm font-medium max-w-[100px] truncate">{user?.name}</span>
                  <ChevronDown className="hidden lg:block h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border/60">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-border/60">
                      <AvatarFallback className="bg-gradient-to-br from-[#007aff] to-indigo-600 text-white text-sm font-semibold">{user?.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold truncate">{user?.name}</span>
                      <span className="text-xs font-normal text-muted-foreground truncate">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                  onClick={() => setProfileOpen(true)}
                  data-testid="button-profile"
                >
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                  onClick={() => setSettingsOpen(true)}
                  data-testid="button-settings"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                  onClick={() => setMfaOpen(true)}
                  data-testid="button-mfa-settings"
                >
                  <KeyRound className="h-4 w-4" />
                  MFA Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                  onClick={() => startTour()}
                  data-testid="button-take-tour"
                >
                  <HelpCircle className="h-4 w-4" />
                  Take a Tour
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  onClick={() => logout()}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {impersonating && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              <span>Impersonating <strong>{user?.name}</strong> ({user?.email})</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
              onClick={() => stopImpersonation()}
              data-testid="button-stop-impersonation"
            >
              Stop Impersonation
            </Button>
          </div>
        )}

        <div className="flex-1 p-5 md:p-7 overflow-y-auto">
          {children}
        </div>
      </main>

      <ProfileDrawer open={profileOpen} onOpenChange={setProfileOpen} />
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
      <MfaDrawer open={mfaOpen} onOpenChange={setMfaOpen} />
      <GuidedTour isActive={tourActive} onEnd={endTour} />

      <Dialog open={bugReportOpen} onOpenChange={(open) => {
        setBugReportOpen(open);
        if (!open) { setBugTitle(""); setBugDescription(""); setBugSeverity("Medium"); }
      }}>
        <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-card/95 border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-amber-500" />
              Report a Bug
            </DialogTitle>
            <DialogDescription>
              Describe the issue you encountered. Your report will be reviewed by the platform admin team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bug-title">Title</Label>
              <Input
                id="bug-title"
                placeholder="Brief summary of the issue"
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                data-testid="input-bug-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-description">Description</Label>
              <Textarea
                id="bug-description"
                placeholder="Steps to reproduce, expected behavior, what actually happened..."
                rows={4}
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                data-testid="input-bug-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={bugSeverity} onValueChange={setBugSeverity}>
                <SelectTrigger data-testid="select-bug-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low - Minor cosmetic issue</SelectItem>
                  <SelectItem value="Medium">Medium - Feature not working as expected</SelectItem>
                  <SelectItem value="High">High - Major functionality broken</SelectItem>
                  <SelectItem value="Critical">Critical - System unusable or data loss</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Current page:</span> {location}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                <span className="font-medium text-foreground">Reported by:</span> {user?.name} ({user?.email})
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBugReportOpen(false)} data-testid="button-cancel-bug">Cancel</Button>
            <Button
              disabled={!bugTitle.trim() || !bugDescription.trim() || bugSubmitting}
              data-testid="button-submit-bug"
              onClick={async () => {
                setBugSubmitting(true);
                try {
                  await apiRequest("POST", "/api/bug-reports", {
                    title: bugTitle.trim(),
                    description: bugDescription.trim(),
                    severity: bugSeverity,
                    page: location,
                  });
                  toast({ title: "Bug report submitted", description: "Thank you for your feedback. Our team will review it shortly.", variant: "success" });
                  setBugReportOpen(false);
                  setBugTitle("");
                  setBugDescription("");
                  setBugSeverity("Medium");
                } catch {
                  toast({ title: "Failed to submit", description: "Please try again later.", variant: "destructive" });
                } finally {
                  setBugSubmitting(false);
                }
              }}
            >
              {bugSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
