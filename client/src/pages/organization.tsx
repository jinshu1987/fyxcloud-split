import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Organization, AiModel, Alert, Resource } from "@shared/schema";
import { motion } from "framer-motion";
import { ScanLine, Brain, Bell, HardDrive, Clock, Radar, CheckCircle2, Loader2, ShieldCheck, Calendar, Users, Database, FolderKanban, CloudCog, FileText, Send, CreditCard, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const glassCard = "border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-sm";

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OrganizationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { license: authLicense, licenseStatus: authLicenseStatus, refetch: refetchAuth } = useAuth();
  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });
  const { data: modelsData = [] } = useQuery<AiModel[]>({ queryKey: ["/api/models"] });
  const { data: alertsData = [] } = useQuery<Alert[]>({ queryKey: ["/api/alerts"] });
  const { data: resourcesData = [] } = useQuery<Resource[]>({ queryKey: ["/api/resources"] });
  const { data: licenseData } = useQuery<{ license: any; status: string; daysRemaining: number }>({
    queryKey: ["/api/license"],
    refetchInterval: 30 * 1000,
  });
  const license = licenseData?.license ?? authLicense;
  const licenseStatus = (licenseData?.status as "active" | "expired" | "none") ?? authLicenseStatus;
  const { data: licenseUsage } = useQuery<{ assets: number; models: number; connectors: number; users: number; projects: number; policies: number }>({
    queryKey: ["/api/license/usage"],
  });

  const { data: billingUsage } = useQuery<{ cloudAssets: number; hfRepos: number; totalUnits: number; maxUnits: number; percentage: number; warningLevel: string | null; plan: string }>({
    queryKey: ["/api/billing/usage"],
  });

  const { data: subscriptionData } = useQuery<{ subscription: any }>({
    queryKey: ["/api/billing/subscription"],
  });

  const requestExtensionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/license/request-extension");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Extension requested", description: "Your request has been sent to the platform administrator.", variant: "success" });
    },
    onError: () => {
      toast({ title: "Request failed", description: "Could not send extension request. Please try again.", variant: "destructive" });
    },
  });

  const org = organizations[0];

  const [orgName, setOrgName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [autoDiscovery, setAutoDiscovery] = useState(true);
  const [autoDiscoveryInterval, setAutoDiscoveryInterval] = useState(20);

  useEffect(() => {
    if (org) {
      setOrgName(org.name || "");
      setContactEmail(org.contactEmail || "");
      setMfaEnforced(org.mfaEnforced === "true");
      setAutoDiscovery(org.autoDiscovery === "true");
      setAutoDiscoveryInterval(org.autoDiscoveryInterval || 20);
    }
  }, [org]);

  const updateOrgMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({ title: "Settings saved", description: "Organization settings have been updated.", variant: "success" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const statsCards = [
    { label: "Total Resources", value: resourcesData.length.toString(), icon: ScanLine, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Models Monitored", value: modelsData.length.toString(), icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Active Alerts", value: alertsData.length.toString(), icon: Bell, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Connectors", value: "—", icon: HardDrive, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold tracking-tight text-foreground">
              Organization Settings
            </h1>
            <p data-testid="text-page-subtitle" className="text-muted-foreground">
              Configure general settings for {org?.name || "your organization"}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className={`${glassCard} hover:shadow-lg transition-shadow`} data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground" data-testid={`text-value-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              <Card className={glassCard} data-testid="card-general-info">
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>Update your organization details and contact info.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="bg-background/50 border-border"
                      data-testid="input-org-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="bg-background/50 border-border"
                      data-testid="input-contact-email"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/50 pt-4 flex justify-end">
                  <Button
                    data-testid="button-save-general"
                    disabled={updateOrgMutation.isPending}
                    onClick={() => updateOrgMutation.mutate({ name: orgName, contactEmail })}
                  >
                    {updateOrgMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
            >
              <Card className={glassCard} data-testid="card-security-preferences">
                <CardHeader>
                  <CardTitle>Security Preferences</CardTitle>
                  <CardDescription>Enforce security policies across the tenant.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">MFA Enforcement</Label>
                      <p className="text-sm text-muted-foreground">
                        Require Multi-Factor Authentication for all users
                      </p>
                    </div>
                    <Switch
                      checked={mfaEnforced}
                      onCheckedChange={(val) => {
                        setMfaEnforced(val);
                        updateOrgMutation.mutate({ mfaEnforced: val });
                      }}
                      data-testid="switch-mfa"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.4 }}
            >
              <Card className={`${glassCard} border-primary/20`} data-testid="card-auto-discovery">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Radar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Auto-Discovery</CardTitle>
                        <CardDescription>Automatically scan connected clouds for new AI assets</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={autoDiscovery}
                      onCheckedChange={(val) => {
                        setAutoDiscovery(val);
                        updateOrgMutation.mutate({ autoDiscovery: val });
                      }}
                      data-testid="switch-auto-discovery"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {autoDiscovery && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-3.5 w-3.5 text-primary/70" />
                            <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">Scan Interval</span>
                          </div>
                          <Select
                            value={String(autoDiscoveryInterval)}
                            onValueChange={(val) => {
                              const numVal = Number(val);
                              setAutoDiscoveryInterval(numVal);
                              updateOrgMutation.mutate({ autoDiscoveryInterval: numVal });
                            }}
                          >
                            <SelectTrigger className="mt-1.5 bg-background/50 border-border" data-testid="select-discovery-interval">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">Every 10 minutes</SelectItem>
                              <SelectItem value="20">Every 20 minutes</SelectItem>
                              <SelectItem value="30">Every 30 minutes</SelectItem>
                              <SelectItem value="60">Every 1 hour</SelectItem>
                              <SelectItem value="120">Every 2 hours</SelectItem>
                              <SelectItem value="360">Every 6 hours</SelectItem>
                              <SelectItem value="720">Every 12 hours</SelectItem>
                              <SelectItem value="1440">Every 24 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary/70" />
                            <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">Last Scan</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground mt-1.5" data-testid="text-last-auto-discovery">
                            {timeAgo(org?.lastAutoDiscovery)}
                          </p>
                          {org?.lastAutoDiscovery && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(org.lastAutoDiscovery).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <Radar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="text-sm text-muted-foreground">
                          When enabled, Fyx Cloud will automatically scan all active cloud connectors every{" "}
                          <span className="text-primary font-medium">{autoDiscoveryInterval} minutes</span>{" "}
                          to discover new AI assets, models, and resources. Discovered assets are automatically added to your inventory.
                        </div>
                      </div>
                    </div>
                  )}

                  {!autoDiscovery && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <Radar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Auto-discovery is disabled. Enable it to automatically scan your connected cloud accounts for new AI assets on a schedule.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
            {billingUsage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <Card className={glassCard} data-testid="card-subscription-summary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <CreditCard className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle>Subscription</CardTitle>
                          <CardDescription className="capitalize">
                            {billingUsage.plan} Plan — {billingUsage.totalUnits.toLocaleString()} / {billingUsage.maxUnits.toLocaleString()} units
                          </CardDescription>
                        </div>
                      </div>
                      <Link href="/billing">
                        <Button variant="outline" size="sm" data-testid="button-manage-subscription">
                          Manage
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">Unit Usage</span>
                          <span className="font-medium">{billingUsage.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${billingUsage.percentage >= 100 ? "bg-red-500" : billingUsage.percentage >= 80 ? "bg-yellow-500" : "bg-blue-500"}`}
                            style={{ width: `${Math.min(billingUsage.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cloud Assets</p>
                          <p className="text-sm font-semibold">{billingUsage.cloudAssets.toLocaleString()}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">HF Repos</p>
                          <p className="text-sm font-semibold">{billingUsage.hfRepos.toLocaleString()}</p>
                        </div>
                      </div>
                      {subscriptionData?.subscription?.currentPeriodEnd && (
                        <div className="p-2.5 rounded-lg bg-muted/20 border border-border/50">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Next Renewal</p>
                          <p className="text-sm font-semibold">{new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <Card className={glassCard} data-testid="card-current-plan">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${licenseStatus === "active" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        <ShieldCheck className={`h-5 w-5 ${licenseStatus === "active" ? "text-emerald-500" : "text-red-500"}`} />
                      </div>
                      <div>
                        <CardTitle>License</CardTitle>
                        <CardDescription>
                          {license ? (license.plan === "free" ? "Free Trial" : `${license.plan.charAt(0).toUpperCase() + license.plan.slice(1)} Plan`) : "No License"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        licenseStatus === "active"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : licenseStatus === "expired"
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                      data-testid="badge-license-status"
                    >
                      {licenseStatus === "active" ? "Active" : licenseStatus === "expired" ? "Expired" : "None"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {license ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Expires</span>
                          </div>
                          <p className="text-sm font-semibold" data-testid="text-license-expires">
                            {new Date(license.expiresAt).toLocaleDateString()}
                          </p>
                          {licenseStatus === "active" && (
                            <p className="text-[11px] text-emerald-500 mt-0.5">
                              {Math.max(0, Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
                            </p>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Started</span>
                          </div>
                          <p className="text-sm font-semibold" data-testid="text-license-started">
                            {new Date(license.startsAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <Separator className="bg-border/30" />

                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Plan Limits</p>
                        <div className="space-y-3">
                          {[
                            { label: "Assets", value: licenseUsage?.assets ?? resourcesData.length, max: license.maxAssets, icon: Database, color: "bg-blue-500" },
                            { label: "Models", value: licenseUsage?.models ?? modelsData.length, max: license.maxModels, icon: Brain, color: "bg-purple-500" },
                            { label: "Users", value: licenseUsage?.users ?? 0, max: license.maxUsers, icon: Users, color: "bg-emerald-500" },
                            { label: "Connectors", value: licenseUsage?.connectors ?? 0, max: license.maxConnectors, icon: CloudCog, color: "bg-blue-500" },
                            { label: "Projects", value: licenseUsage?.projects ?? 0, max: license.maxProjects, icon: FolderKanban, color: "bg-indigo-500" },
                            { label: "Policies", value: licenseUsage?.policies ?? 0, max: license.maxPolicies, icon: FileText, color: "bg-amber-500" },
                          ].map(item => (
                            <div key={item.label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <item.icon className="h-3 w-3" />
                                  {item.label}
                                </span>
                                <span className="font-medium text-foreground text-xs">
                                  {item.value.toLocaleString()} / {item.max.toLocaleString()}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${item.color} transition-all`}
                                  style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-border/30" />

                      <div className="space-y-2">
                        <Button
                          className="w-full gap-2"
                          variant="outline"
                          onClick={() => requestExtensionMutation.mutate()}
                          disabled={requestExtensionMutation.isPending}
                          data-testid="button-request-extension"
                        >
                          {requestExtensionMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Request License Extension
                        </Button>
                        <p className="text-[11px] text-center text-muted-foreground">
                          Sends a request to your platform administrator
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No license assigned to this organization.</p>
                      <Button
                        className="mt-3 gap-2"
                        variant="outline"
                        onClick={() => requestExtensionMutation.mutate()}
                        disabled={requestExtensionMutation.isPending}
                        data-testid="button-request-license"
                      >
                        <Send className="h-4 w-4" />
                        Request License
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
