import { useEffect, useState, useRef, useMemo } from "react";
import Layout from "@/components/layout";
import { HelpIcon } from "@/components/help-icon";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, Search,
  Filter, Play, Loader2, ChevronRight, Info,
  Clock, Zap, AlertCircle, Fingerprint, ExternalLink,
  Activity, Scale, Bug, Hexagon, Cloud
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useSearch } from "wouter";
import type { Policy, PolicyFinding } from "@shared/schema";
import { usePermission } from "@/lib/auth";
import { useProject } from "@/hooks/use-project";

const cardClass = "border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-sm";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const CATEGORY_META: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  DIS: { label: "Discovery", color: "#007aff", icon: Search },
  INF: { label: "Infrastructure", color: "#f59e0b", icon: Shield },
  DAT: { label: "Data Security", color: "#10b981", icon: Shield },
  IAM: { label: "Identity & Access", color: "#8b5cf6", icon: Fingerprint },
  GRD: { label: "Guardrails", color: "#ec4899", icon: ShieldCheck },
  SUP: { label: "Supply Chain", color: "#ef4444", icon: Zap },
  MON: { label: "Monitoring", color: "#06b6d4", icon: Activity },
  GOV: { label: "Governance", color: "#84cc16", icon: Scale },
  RUN: { label: "Runtime Security", color: "#d946ef", icon: Bug },
  NET: { label: "Network Security", color: "#14b8a6", icon: Shield },
  COM: { label: "Compliance", color: "#f97316", icon: Scale },
  HEX: { label: "Hex Scanner", color: "#6366f1", icon: Hexagon },
};

const severityColor: Record<string, string> = {
  Critical: "bg-red-500/10 text-red-500 border-red-500/20",
  High: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const statusConfig: Record<string, { color: string; label: string }> = {
  open: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Open" },
  acknowledged: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Acknowledged" },
  resolved: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Resolved" },
  suppressed: { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: "Suppressed" },
  false_positive: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "False Positive" },
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  color: "hsl(var(--foreground))",
  borderRadius: "8px",
  fontSize: "12px",
};

function AnimatedCount({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    if (end === 0) { setCount(0); return; }
    const increment = end / (1.5 * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, value]);
  return <span ref={ref} className="font-mono">{count}{suffix}</span>;
}

function PolicyDrawer({ policy, findings, onClose, onToggle, canManage }: {
  policy: Policy | null;
  findings: PolicyFinding[];
  onClose: () => void;
  onToggle: (id: string, enabled: boolean) => void;
  canManage: boolean;
}) {
  if (!policy) return null;
  const catMeta = CATEGORY_META[policy.category] || CATEGORY_META.DIS;
  const policyFindings = findings.filter(f => f.policyId === policy.id || f.ruleId === policy.ruleId);
  const openFindings = policyFindings.filter(f => f.status === "open");

  return (
    <Sheet open={!!policy} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${catMeta.color}15`, color: catMeta.color }}>
                <catMeta.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] font-mono" style={{ borderColor: `${catMeta.color}40`, color: catMeta.color, backgroundColor: `${catMeta.color}10` }}>
                    {policy.ruleId}
                  </Badge>
                  <Badge variant="outline" className={severityColor[policy.severity] + " text-xs"}>
                    {policy.severity}
                  </Badge>
                </div>
                <SheetTitle className="text-lg font-bold leading-tight pr-8">
                  {policy.name}
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Description
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{policy.description}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" /> Policy Details
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Category</span>
                <Badge variant="outline" className="text-xs" style={{ borderColor: `${catMeta.color}40`, color: catMeta.color, backgroundColor: `${catMeta.color}10` }}>
                  {catMeta.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Applicability</span>
                <span className="text-sm font-medium">{policy.applicability}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  <Switch
                    data-testid={`switch-policy-drawer-${policy.id}`}
                    checked={policy.enabled}
                    onCheckedChange={(checked) => onToggle(policy.id, checked)}
                    disabled={!canManage}
                  />
                  <span className={`text-sm font-medium ${policy.enabled ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {policy.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Findings</span>
                <span className="text-sm font-mono font-bold">{policyFindings.length} total · {openFindings.length} open</span>
              </div>
            </div>
          </section>

          {policyFindings.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Findings ({policyFindings.length})
                </h3>
                <Link href="/findings">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary h-7" data-testid="link-view-all-findings">
                    View all <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 divide-y divide-border/30">
                {policyFindings.slice(0, 10).map((pf, i) => {
                  const sc = statusConfig[pf.status] || statusConfig.open;
                  return (
                    <div key={pf.id || i} className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{pf.assetName}</span>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${sc.color}`}>
                          {sc.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{pf.finding}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
                        <span>{pf.assetType}</span>
                        {pf.detectedAt && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(pf.detectedAt).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {policyFindings.length > 10 && (
                  <div className="p-3 text-center">
                    <Link href="/findings">
                      <Button variant="ghost" size="sm" className="text-xs text-primary gap-1.5">
                        +{policyFindings.length - 10} more findings <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {policyFindings.length === 0 && (
            <section>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-8 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No findings for this policy</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Run an evaluation to check your assets against this rule</p>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function PoliciesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [enabledFilter, setEnabledFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const canManagePolicies = usePermission("manage_policies");
  const canRunScans = usePermission("run_scans");
  const searchString = useSearch();
  const { selectedProjectId } = useProject();
  const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";

  const { data: policiesData = [], isLoading } = useQuery<Policy[]>({ queryKey: ["/api/policies"] });
  const { data: findingsData = [] } = useQuery<PolicyFinding[]>({ queryKey: ["/api/policy-findings", selectedProjectId], queryFn: () => fetch(`/api/policy-findings${projectParam}`, { credentials: "include" }).then(r => r.json()) });

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const highlightId = params.get("highlight");
    if (highlightId && policiesData.length > 0 && !selectedPolicy) {
      const match = policiesData.find(p => p.id === highlightId);
      if (match) {
        setSelectedPolicy(match);
        window.history.replaceState({}, "", "/policies");
      }
    }
  }, [searchString, policiesData]);

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/policies/evaluate");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({ title: "Evaluation complete", description: `Found ${data?.findingsCount || 0} finding(s).`, variant: "success" });
    },
    onError: () => {
      toast({ title: "Evaluation failed", description: "Could not evaluate policies.", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/policies/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({ title: "Policy updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update policy", variant: "destructive" });
    },
  });

  const handleToggle = (id: string, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
    if (selectedPolicy && selectedPolicy.id === id) {
      setSelectedPolicy({ ...selectedPolicy, enabled });
    }
  };

  const findingsCountByPolicy = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of findingsData) {
      if (f.policyId) map[f.policyId] = (map[f.policyId] || 0) + 1;
      if (f.ruleId) map[f.ruleId] = (map[f.ruleId] || 0) + 1;
    }
    return map;
  }, [findingsData]);

  const filteredPolicies = useMemo(() => {
    return policiesData.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.ruleId.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (severityFilter !== "all" && p.severity !== severityFilter) return false;
      if (enabledFilter === "enabled" && !p.enabled) return false;
      if (enabledFilter === "disabled" && p.enabled) return false;
      if (providerFilter !== "all" && p.applicability !== providerFilter) return false;
      return true;
    });
  }, [policiesData, search, categoryFilter, severityFilter, enabledFilter, providerFilter]);

  const totalPolicies = policiesData.length;
  const enabledPolicies = policiesData.filter(p => p.enabled).length;
  const totalFindings = findingsData.length;
  const criticalFindings = findingsData.filter(f => f.severity === "Critical" && f.status === "open").length;
  const openFindings = findingsData.filter(f => f.status === "open").length;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { total: number; findings: number }> = {};
    for (const p of policiesData) {
      if (!map[p.category]) map[p.category] = { total: 0, findings: 0 };
      map[p.category].total++;
    }
    for (const f of findingsData) {
      const policy = policiesData.find(p => p.id === f.policyId || p.ruleId === f.ruleId);
      if (policy) {
        if (!map[policy.category]) map[policy.category] = { total: 0, findings: 0 };
        map[policy.category].findings++;
      }
    }
    return Object.entries(map).map(([cat, data]) => ({
      name: CATEGORY_META[cat]?.label || cat,
      policies: data.total,
      findings: data.findings,
      color: CATEGORY_META[cat]?.color || "#64748b",
    }));
  }, [policiesData, findingsData]);

  const severityBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of findingsData) {
      if (f.status === "open") {
        map[f.severity] = (map[f.severity] || 0) + 1;
      }
    }
    return [
      { name: "Critical", value: map["Critical"] || 0, color: "#ef4444" },
      { name: "High", value: map["High"] || 0, color: "#f97316" },
      { name: "Medium", value: map["Medium"] || 0, color: "#eab308" },
      { name: "Low", value: map["Low"] || 0, color: "#007aff" },
    ].filter(s => s.value > 0);
  }, [findingsData]);

  const stats = [
    { label: "Total Policies", value: totalPolicies, icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Enabled", value: enabledPolicies, icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Open Findings", value: openFindings, icon: AlertTriangle, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Critical Findings", value: criticalFindings, icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="policies-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2" data-testid="text-page-title">Detection Policies <HelpIcon section="policies" /></h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
              {totalPolicies} security rules evaluating your AI assets for risks and compliance violations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/findings">
              <Button variant="outline" className="gap-2" data-testid="button-view-findings">
                <AlertTriangle className="h-4 w-4" />
                View Findings ({totalFindings})
              </Button>
            </Link>
            {canRunScans && (
            <Button
              data-testid="button-run-evaluation"
              onClick={() => evaluateMutation.mutate()}
              disabled={evaluateMutation.isPending}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {evaluateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {evaluateMutation.isPending ? "Evaluating..." : "Run Evaluation"}
            </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeIn}>
              <Card data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`} className={cardClass}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold"><AnimatedCount value={stat.value} /></p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {(categoryBreakdown.length > 0 || severityBreakdown.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div custom={4} initial="hidden" animate="visible" variants={fadeIn}>
              <Card data-testid="card-category-chart" className={`${cardClass} h-full`}>
                <CardHeader>
                  <CardTitle className="text-lg">Findings by Category</CardTitle>
                  <CardDescription>Policy categories and their finding counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryBreakdown} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="findings" name="Findings" radius={[4, 4, 0, 0]}>
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div custom={5} initial="hidden" animate="visible" variants={fadeIn}>
              <Card data-testid="card-severity-chart" className={`${cardClass} h-full`}>
                <CardHeader>
                  <CardTitle className="text-lg">Open Findings by Severity</CardTitle>
                  <CardDescription>Distribution of open findings across severity levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] flex items-center justify-center">
                    {severityBreakdown.length === 0 ? (
                      <div className="text-center">
                        <CheckCircle className="h-10 w-10 text-emerald-500/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No open findings</p>
                        <p className="text-xs text-muted-foreground/70">Run an evaluation to scan your assets</p>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="60%" height="100%">
                          <PieChart>
                            <Pie data={severityBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                              {severityBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-2 min-w-[120px]">
                          {severityBreakdown.map(r => (
                            <div key={r.name} className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                              <span className="text-muted-foreground">{r.name}</span>
                              <span className="font-mono font-semibold ml-auto">{r.value}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {evaluateMutation.isSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    Evaluation complete — {totalFindings} finding{totalFindings !== 1 ? "s" : ""} detected across {totalPolicies} policies
                  </span>
                </div>
                <Link href="/findings">
                  <Button variant="outline" size="sm" className="gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
                    View Findings <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div custom={6} initial="hidden" animate="visible" variants={fadeIn}>
          <Card data-testid="card-policies-table" className={cardClass}>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle className="text-xl">All Policies</CardTitle>
                  <CardDescription>Click any policy to view details and findings</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      data-testid="input-search-policies"
                      placeholder="Search policies..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger data-testid="select-category-filter" className="w-[170px] h-9">
                      <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(CATEGORY_META).map(([key, meta]) => (
                        <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger data-testid="select-severity-filter" className="w-[140px] h-9">
                      <AlertTriangle className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <SelectTrigger data-testid="select-provider-filter" className="w-[150px] h-9">
                      <Cloud className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      <SelectItem value="AWS">AWS</SelectItem>
                      <SelectItem value="Azure">Azure</SelectItem>
                      <SelectItem value="GCP">GCP</SelectItem>
                      <SelectItem value="Hugging Face">Hugging Face</SelectItem>
                      <SelectItem value="Multi-Cloud">Multi-Cloud</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={enabledFilter} onValueChange={setEnabledFilter}>
                    <SelectTrigger data-testid="select-enabled-filter" className="w-[130px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  {(categoryFilter !== "all" || severityFilter !== "all" || enabledFilter !== "all" || providerFilter !== "all" || search) && (
                    <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setCategoryFilter("all"); setSeverityFilter("all"); setEnabledFilter("all"); setProviderFilter("all"); setSearch(""); }}>
                      Clear filters
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {filteredPolicies.length} of {totalPolicies} policies
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-muted-foreground font-semibold w-[90px]">Rule ID</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Policy</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Category</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Severity</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Applicability</TableHead>
                        <TableHead className="text-muted-foreground font-semibold text-center">Findings</TableHead>
                        <TableHead className="text-muted-foreground font-semibold text-center">Enabled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPolicies.map((policy) => {
                        const catMeta = CATEGORY_META[policy.category] || CATEGORY_META.DIS;
                        const count = findingsCountByPolicy[policy.id] || findingsCountByPolicy[policy.ruleId] || 0;
                        return (
                          <TableRow
                            key={policy.id}
                            data-testid={`row-policy-${policy.ruleId}`}
                            className="border-border/50 hover:bg-primary/5 transition-all duration-200 group cursor-pointer"
                            onClick={() => setSelectedPolicy(policy)}
                          >
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[11px]" style={{ borderColor: `${catMeta.color}40`, color: catMeta.color, backgroundColor: `${catMeta.color}10` }}>
                                {policy.ruleId}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col min-w-0">
                                  <span data-testid={`text-policy-name-${policy.ruleId}`} className="font-medium truncate group-hover:text-primary transition-colors">{policy.name}</span>
                                  <span className="text-xs text-muted-foreground truncate">{policy.description.substring(0, 80)}...</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors ml-auto shrink-0" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs" style={{ borderColor: `${catMeta.color}40`, color: catMeta.color, backgroundColor: `${catMeta.color}10` }}>
                                {catMeta.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${severityColor[policy.severity]}`}>
                                {policy.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{policy.applicability}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {count > 0 ? (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20 font-mono">
                                  {count}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Switch
                                data-testid={`switch-policy-${policy.ruleId}`}
                                checked={policy.enabled}
                                onCheckedChange={(checked) => handleToggle(policy.id, checked)}
                                disabled={!canManagePolicies}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <PolicyDrawer
        policy={selectedPolicy}
        findings={findingsData}
        onClose={() => setSelectedPolicy(null)}
        onToggle={handleToggle}
        canManage={canManagePolicies}
      />
    </Layout>
  );
}