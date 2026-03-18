import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { apiRequest } from "@/lib/queryClient";
import {
  User, Mail, Shield, Clock, Fingerprint, CheckCircle, XCircle,
  KeyRound, ShieldCheck, ShieldOff, AlertCircle, CheckCircle2,
  Copy, Eye, EyeOff, Lock, Save, Loader2, Moon, Sun, Bell,
  Monitor, Palette, Info, Crown, Wrench, BarChart3, Settings,
  LogOut, ChevronRight
} from "lucide-react";

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string; color: string }> = {
  Owner: { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", color: "#f59e0b" },
  Admin: { text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", color: "#007aff" },
  "Security Engineer": { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", color: "#a855f7" },
  Analyst: { text: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", color: "#06b6d4" },
  Viewer: { text: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20", color: "#6b7280" },
};

const ROLE_ICONS: Record<string, any> = {
  Owner: Crown,
  Admin: ShieldCheck,
  "Security Engineer": Wrench,
  Analyst: BarChart3,
  Viewer: Eye,
};

export function ProfileDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, refetch } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setEmail(user.email);
      setError("");
      setSuccess("");
      setShowPasswordSection(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setPasswordSuccess("");
    }
  }, [open, user]);

  const roleStyle = ROLE_COLORS[user?.role || "Viewer"] || ROLE_COLORS.Viewer;
  const RoleIcon = ROLE_ICONS[user?.role || "Viewer"] || Eye;

  const hasProfileChanges = name !== user?.name || email !== user?.email;

  const handleSaveProfile = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/auth/profile", { name, email });
      setSuccess("Profile updated successfully");
      refetch();
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "") || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    setPasswordSaving(true);
    try {
      await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
      setPasswordSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message?.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "") || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background" data-testid="drawer-profile">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-[#007aff] to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="text-xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${roleStyle.text} ${roleStyle.bg} ${roleStyle.border}`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {user?.role}
                  </Badge>
                  {user?.mfaEnabled && (
                    <Badge variant="outline" className="text-xs text-primary border-primary/20 bg-primary/10">
                      <Fingerprint className="h-3 w-3 mr-1" /> MFA
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-lg font-bold leading-tight">Profile</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <User className="h-3.5 w-3.5" /> Personal Information
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-sm text-muted-foreground">Full Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/50"
                  data-testid="input-profile-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-sm text-muted-foreground">Email Address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50"
                  data-testid="input-profile-email"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {success}
                </div>
              )}
              <Button
                className="w-full gap-2 bg-[#007aff] hover:bg-[#007aff]/90 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                onClick={handleSaveProfile}
                disabled={saving || !hasProfileChanges}
                data-testid="button-save-profile"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Account Details
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline" className={`text-xs ${roleStyle.text} ${roleStyle.bg} ${roleStyle.border}`}>
                  <RoleIcon className="h-3 w-3 mr-1" /> {user?.role}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-500">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">MFA</span>
                <span className={`text-sm font-medium ${user?.mfaEnabled ? "text-primary" : "text-muted-foreground"}`}>
                  {user?.mfaEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Last Login</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" /> Change Password
            </h3>
            {!showPasswordSection ? (
              <Button
                variant="outline"
                className="w-full gap-2 border-border/50"
                onClick={() => setShowPasswordSection(true)}
                data-testid="button-show-change-password"
              >
                <Lock className="h-4 w-4" />
                Change Password
              </Button>
            ) : (
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-sm text-muted-foreground">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-background/50 pr-10"
                      data-testid="input-current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowCurrent(!showCurrent)}
                    >
                      {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm text-muted-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="bg-background/50 pr-10"
                      data-testid="input-new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background/50"
                    data-testid="input-confirm-password"
                  />
                </div>
                {passwordError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-[#007aff] hover:bg-[#007aff]/90 text-white"
                    onClick={handleChangePassword}
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                    data-testid="button-change-password"
                  >
                    {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {passwordSaving ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SettingsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background" data-testid="drawer-settings">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-muted/50">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <SheetTitle className="text-lg font-bold leading-tight">Settings</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Customize your experience</p>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Palette className="h-3.5 w-3.5" /> Appearance
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1">
              <button
                onClick={() => setTheme("dark")}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${theme === "dark" ? "bg-[#007aff]/10 ring-1 ring-[#007aff]/30" : "hover:bg-muted/30"}`}
                data-testid="button-theme-dark"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${theme === "dark" ? "bg-[#007aff]/20 text-[#007aff]" : "bg-muted/50 text-muted-foreground"}`}>
                  <Moon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${theme === "dark" ? "text-[#007aff]" : ""}`}>Sapphire Future</p>
                  <p className="text-xs text-muted-foreground">Dark theme with sapphire accents</p>
                </div>
                {theme === "dark" && <CheckCircle className="h-4 w-4 text-[#007aff]" />}
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${theme === "light" ? "bg-[#007aff]/10 ring-1 ring-[#007aff]/30" : "hover:bg-muted/30"}`}
                data-testid="button-theme-light"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${theme === "light" ? "bg-[#007aff]/20 text-[#007aff]" : "bg-muted/50 text-muted-foreground"}`}>
                  <Sun className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${theme === "light" ? "text-[#007aff]" : ""}`}>Clean Future</p>
                  <p className="text-xs text-muted-foreground">Light theme with clean aesthetics</p>
                </div>
                {theme === "light" && <CheckCircle className="h-4 w-4 text-[#007aff]" />}
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${theme === "system" ? "bg-[#007aff]/10 ring-1 ring-[#007aff]/30" : "hover:bg-muted/30"}`}
                data-testid="button-theme-system"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${theme === "system" ? "bg-[#007aff]/20 text-[#007aff]" : "bg-muted/50 text-muted-foreground"}`}>
                  <Monitor className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${theme === "system" ? "text-[#007aff]" : ""}`}>System</p>
                  <p className="text-xs text-muted-foreground">Follow your system preference</p>
                </div>
                {theme === "system" && <CheckCircle className="h-4 w-4 text-[#007aff]" />}
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Bell className="h-3.5 w-3.5" /> Notifications
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-0">
              <div className="flex items-center justify-between py-3 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium">Policy Violations</p>
                  <p className="text-xs text-muted-foreground">Get notified about critical security violations</p>
                </div>
                <Switch defaultChecked data-testid="switch-notify-violations" />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium">Scan Results</p>
                  <p className="text-xs text-muted-foreground">Notifications when scans complete or fail</p>
                </div>
                <Switch defaultChecked data-testid="switch-notify-scans" />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium">Report Generation</p>
                  <p className="text-xs text-muted-foreground">Notified when reports are ready</p>
                </div>
                <Switch defaultChecked data-testid="switch-notify-reports" />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Integration Alerts</p>
                  <p className="text-xs text-muted-foreground">Webhook delivery failures and connector events</p>
                </div>
                <Switch defaultChecked data-testid="switch-notify-integrations" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Session
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Signed in as</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Last Login</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Session</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  <span className="text-sm font-medium text-emerald-500">Active</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-3 gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={() => logout()}
              data-testid="button-settings-logout"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MfaDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, refetch } = useAuth();
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "done">("idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("idle");
      setSecret("");
      setUri("");
      setQrCode("");
      setCode("");
      setError("");
    }
  }, [open]);

  const startSetup = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/mfa/setup");
      const data = await res.json();
      setSecret(data.secret);
      setUri(data.uri);
      setQrCode(data.qrCode || "");
      setStep("setup");
    } catch (err: any) {
      setError("Failed to generate MFA secret");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/mfa/verify", { code });
      setStep("done");
      refetch();
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "") || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/mfa/disable");
      refetch();
      onOpenChange(false);
    } catch (err: any) {
      setError("Failed to disable MFA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background" data-testid="drawer-mfa">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${user?.mfaEnabled ? "bg-emerald-500/10" : "bg-primary/10"}`}>
                <KeyRound className={`h-6 w-6 ${user?.mfaEnabled ? "text-emerald-500" : "text-primary"}`} />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <Badge variant="outline" className={`text-[10px] mb-2 ${user?.mfaEnabled ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-muted-foreground border-border bg-muted/10"}`}>
                  {user?.mfaEnabled ? "Enabled" : "Disabled"}
                </Badge>
                <SheetTitle className="text-lg font-bold leading-tight">Multi-Factor Authentication</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.mfaEnabled ? "Your account is protected with MFA" : "Add an extra layer of security"}
                </p>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="mfa-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {user?.mfaEnabled && step === "idle" && (
            <>
              <section>
                <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Status
                </h3>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-500">MFA is Active</p>
                      <p className="text-xs text-muted-foreground">Your account has an additional layer of security</p>
                    </div>
                  </div>
                  <Separator className="opacity-20 mb-3" />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Time-based one-time passwords (TOTP)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Compatible with Google Authenticator, Authy, and more</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Required at every login</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                  Actions
                </h3>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                  onClick={disableMfa}
                  disabled={loading}
                  data-testid="button-disable-mfa"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  {loading ? "Disabling..." : "Disable MFA"}
                </Button>
              </section>
            </>
          )}

          {!user?.mfaEnabled && step === "idle" && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Setup
              </h3>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">MFA is not enabled</p>
                    <p className="text-xs text-muted-foreground">Your account is less secure without MFA</p>
                  </div>
                </div>
                <Separator className="opacity-20" />
                <p className="text-sm text-muted-foreground">
                  Use an authenticator app like Google Authenticator or Authy to scan a QR code and generate verification codes for login.
                </p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#007aff]/10 text-[#007aff] flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Click "Set Up MFA" below</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#007aff]/10 text-[#007aff] flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Scan the QR code with your authenticator app</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#007aff]/10 text-[#007aff] flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Enter the 6-digit code to verify</span>
                  </div>
                </div>
                <Button
                  className="w-full gap-2 bg-[#007aff] hover:bg-[#007aff]/90 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  onClick={startSetup}
                  disabled={loading}
                  data-testid="button-setup-mfa"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {loading ? "Setting up..." : "Set Up MFA"}
                </Button>
              </div>
            </section>
          )}

          {step === "setup" && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" /> Scan QR Code
              </h3>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4">
                {qrCode && (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground text-center">Scan this QR code with your authenticator app</p>
                    <div className="p-3 bg-white rounded-xl shadow-lg" data-testid="mfa-qr-code">
                      <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">Google Authenticator, Authy, 1Password, or any TOTP app</p>
                  </div>
                )}

                <Separator className="opacity-20" />

                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    Can't scan? Enter key manually
                  </summary>
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Secret Key</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2.5 bg-background/50 rounded-lg text-xs font-mono break-all border border-border/30" data-testid="text-mfa-secret">
                        {secret}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigator.clipboard.writeText(secret)}
                        className="shrink-0 h-9 w-9"
                        data-testid="button-copy-secret"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </details>

                <Separator className="opacity-20" />

                <div className="space-y-2">
                  <Label htmlFor="mfaVerifyCode" className="text-sm font-medium">Enter Verification Code</Label>
                  <Input
                    id="mfaVerifyCode"
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="bg-background/50 text-center tracking-[0.5em] text-xl font-mono h-12"
                    data-testid="input-mfa-verify-code"
                  />
                  <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setStep("idle"); setCode(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-[#007aff] hover:bg-[#007aff]/90 text-white"
                    onClick={verifyCode}
                    disabled={loading || code.length !== 6}
                    data-testid="button-verify-mfa"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {loading ? "Verifying..." : "Verify & Enable"}
                  </Button>
                </div>
              </div>
            </section>
          )}

          {step === "done" && (
            <section>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-500" data-testid="text-mfa-success">MFA Enabled Successfully</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your account is now protected with multi-factor authentication. You'll need your authenticator app code each time you log in.
                  </p>
                </div>
                <Button
                  className="w-full gap-2 bg-[#007aff] hover:bg-[#007aff]/90 text-white"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-mfa-done"
                >
                  Done
                </Button>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
