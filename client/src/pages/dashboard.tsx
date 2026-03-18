import { useEffect, useState, useRef } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area, LineChart, Line
} from "recharts";
import {
  Shield, AlertTriangle, Brain, MonitorCheck, Clock, Lock, Radio,
  TrendingUp, TrendingDown, Activity, ShieldAlert, CheckCircle, EyeOff, UserCheck, Flag
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, useInView } from "framer-motion";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { HelpIcon } from "@/components/help-icon";
import type { Alert } from "@shared/schema";
import { useProject } from "@/hooks/use-project";

const cardClass = "border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-sm";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

function AnimatedCount({ value, suffix = "", duration = 1.5 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return <span ref={ref} className="font-mono">{count}{suffix}</span>;
}

const severityDotColor: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-blue-500",
  medium: "bg-yellow-500",
  low: "bg-blue-400",
  info: "bg-emerald-500",
};

const severityBadgeClass: Record<string, string> = {
  Critical: "text-red-500 border-red-500/30 bg-red-500/10",
  High: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  Medium: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
  Low: "text-blue-400 border-blue-400/30 bg-blue-400/10",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  color: "hsl(var(--foreground))",
  borderRadius: "8px",
  fontSize: "12px",
};

const severityColors: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#007aff",
};

export default function Dashboard() {
  const [trendDays, setTrendDays] = useState("30");
  const [trendView, setTrendView] = useState<"severity" | "volume">("severity");
  const { selectedProjectId } = useProject();
  const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";

  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/dashboard/overview", selectedProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/overview${projectParam}`);
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
  });

  const { data: findingTrends, isFetching: isTrendsFetching } = useQuery({
    queryKey: ["/api/dashboard/finding-trends", trendDays, selectedProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/finding-trends?days=${trendDays}${selectedProjectId ? `&projectId=${selectedProjectId}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch finding trends");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading || !overview) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = [
    {
      label: "Total Models",
      value: overview.counts.models ?? 0,
      icon: Brain,
      gradient: "from-blue-500/10 to-transparent",
    },
    {
      label: "Active Alerts",
      value: overview.counts.alerts ?? 0,
      icon: AlertTriangle,
      gradient: "from-amber-500/10 to-transparent",
    },
    {
      label: "Resources Monitored",
      value: overview.counts.resources ?? 0,
      icon: MonitorCheck,
      gradient: "from-cyan-500/10 to-transparent",
    },
    {
      label: "Security Score",
      value: Math.round(100 - (overview.avgRiskScore ?? 0)),
      suffix: "%",
      icon: Shield,
      gradient: "from-emerald-500/10 to-transparent",
    },
  ];

  const alertSeverityData = Object.entries(overview.alertSeverityBreakdown || {}).map(
    ([name, value]) => ({
      name,
      value: value as number,
      color: severityColors[name] || "#94a3b8",
    })
  );
  const alertTotal = alertSeverityData.reduce((s, d) => s + d.value, 0);

  const resourceRiskData = Object.entries(overview.resourceRiskBreakdown || {}).map(
    ([name, value]) => ({
      name,
      count: value as number,
      fill: severityColors[name] || "#94a3b8",
    })
  );

  const connectorStatusData = Object.entries(overview.connectorStatusBreakdown || {}).map(
    ([status, count]) => ({ status, count: count as number })
  );

  const recentAlerts: Array<{ id: number; title: string; description: string; severity: string; createdAt: string }> =
    overview.recentAlerts || [];

  const topRiskModels: Array<{ name: string; riskScore: number; vulnerabilities: number; status: string }> =
    overview.topRiskModels || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Dashboard</h1>
          <HelpIcon section="dashboard" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-row">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <Card className={`${cardClass} overflow-hidden relative`} data-testid={`stat-card-${i}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} pointer-events-none`} />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold font-mono text-foreground mb-1">
                    <AnimatedCount value={stat.value} suffix={stat.suffix || ""} />
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {findingTrends && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={3}
          >
            <Card className={cardClass} data-testid="finding-trends-widget">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium">Policy Finding Trends</CardTitle>
                      <CardDescription>Findings detected over time by severity</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tabs value={trendView} onValueChange={(v) => setTrendView(v as "severity" | "volume")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="severity" className="text-xs px-3 h-7" data-testid="trend-tab-severity">By Severity</TabsTrigger>
                        <TabsTrigger value="volume" className="text-xs px-3 h-7" data-testid="trend-tab-volume">Volume</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Select value={trendDays} onValueChange={setTrendDays}>
                      <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="trend-days-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="14">Last 14 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="60">Last 60 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30" data-testid="trend-stat-total">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-lg font-bold font-mono text-foreground">{findingTrends.summary.total}</div>
                      <div className="text-[10px] text-primary/60 uppercase tracking-wider">Total</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20" data-testid="trend-stat-open">
                    <Flag className="h-4 w-4 text-red-500 shrink-0" />
                    <div>
                      <div className="text-lg font-bold font-mono text-red-500">{findingTrends.summary.open}</div>
                      <div className="text-[10px] text-primary/60 uppercase tracking-wider">Open</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20" data-testid="trend-stat-resolved">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-lg font-bold font-mono text-emerald-500">{findingTrends.summary.resolved}</div>
                      <div className="text-[10px] text-primary/60 uppercase tracking-wider">Resolved</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20" data-testid="trend-stat-acknowledged">
                    <UserCheck className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-lg font-bold font-mono text-amber-500">{findingTrends.summary.acknowledged}</div>
                      <div className="text-[10px] text-primary/60 uppercase tracking-wider">Acknowledged</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-500/5 border border-slate-500/20" data-testid="trend-stat-suppressed">
                    <EyeOff className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <div className="text-lg font-bold font-mono text-slate-400">{findingTrends.summary.suppressed + (findingTrends.summary.falsePositive || 0)}</div>
                      <div className="text-[10px] text-primary/60 uppercase tracking-wider">Suppressed</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <div className={`h-[280px] w-full transition-opacity duration-300 ${isTrendsFetching ? "opacity-50" : "opacity-100"}`} data-testid="finding-trend-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        {trendView === "severity" ? (
                          <AreaChart data={findingTrends.trend}>
                            <defs>
                              <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="mediumGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#007aff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#007aff" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.1)" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => {
                                const d = new Date(v + "T00:00:00");
                                return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                              }}
                              interval={"preserveStartEnd"}
                              tickCount={7}
                            />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={tooltipStyle}
                              labelFormatter={(v) => {
                                const d = new Date(v + "T00:00:00");
                                return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                              }}
                            />
                            <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="url(#criticalGrad)" strokeWidth={1.5} name="Critical" />
                            <Area type="monotone" dataKey="high" stackId="1" stroke="#f97316" fill="url(#highGrad)" strokeWidth={1.5} name="High" />
                            <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fill="url(#mediumGrad)" strokeWidth={1.5} name="Medium" />
                            <Area type="monotone" dataKey="low" stackId="1" stroke="#007aff" fill="url(#lowGrad)" strokeWidth={1.5} name="Low" />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                          </AreaChart>
                        ) : (
                          <AreaChart data={findingTrends.trend}>
                            <defs>
                              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.1)" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => {
                                const d = new Date(v + "T00:00:00");
                                return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                              }}
                              interval={"preserveStartEnd"}
                              tickCount={7}
                            />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={tooltipStyle}
                              labelFormatter={(v) => {
                                const d = new Date(v + "T00:00:00");
                                return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                              }}
                            />
                            <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#totalGrad)" strokeWidth={2} name="New Findings" />
                            <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="none" strokeWidth={1.5} strokeDasharray="4 3" name="Resolved" />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-primary/60 uppercase tracking-wider mb-2">By Severity</div>
                      <div className="space-y-1.5">
                        {Object.entries(findingTrends.severityBreakdown || {})
                          .sort(([a], [b]) => {
                            const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
                            return (order[a] ?? 5) - (order[b] ?? 5);
                          })
                          .map(([sev, count]) => {
                            const pct = findingTrends.summary.total > 0
                              ? Math.round(((count as number) / findingTrends.summary.total) * 100)
                              : 0;
                            const color = severityColors[sev] || "#94a3b8";
                            return (
                              <div key={sev} className="flex items-center gap-2" data-testid={`trend-severity-${sev.toLowerCase()}`}>
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-xs text-foreground flex-1">{sev}</span>
                                <span className="text-xs font-mono text-muted-foreground">{count as number}</span>
                                <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="border-t border-border/30 pt-3">
                      <div className="text-xs text-primary/60 uppercase tracking-wider mb-2">Top Categories</div>
                      <div className="space-y-1.5">
                        {Object.entries(findingTrends.categoryBreakdown || {})
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 6)
                          .map(([cat, count]) => {
                            const pct = findingTrends.summary.total > 0
                              ? Math.round(((count as number) / findingTrends.summary.total) * 100)
                              : 0;
                            return (
                              <div key={cat} className="flex items-center gap-2" data-testid={`trend-category-${cat.toLowerCase()}`}>
                                <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{cat}</span>
                                <span className="text-xs font-mono text-muted-foreground ml-auto">{count as number}</span>
                                <div className="w-12 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                  <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          custom={4}
        >
          <Card className={`lg:col-span-2 ${cardClass}`} data-testid="risk-distribution-chart">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Model Risk Distribution</CardTitle>
              <CardDescription>Number of models by risk score range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.modelRiskDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.1)" vertical={false} />
                    <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Models" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass} data-testid="alert-severity-chart">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Alert Severity Breakdown</CardTitle>
              <CardDescription>Distribution by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono text-foreground">{alertTotal}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alertSeverityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fontSize={10}
                    >
                      {alertSeverityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          custom={5}
        >
          <Card className={cardClass} data-testid="resource-risk-chart">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Resource Risk Distribution</CardTitle>
              <CardDescription>Resources grouped by risk level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceRiskData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Resources" radius={[4, 4, 0, 0]}>
                      {resourceRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass} data-testid="activity-timeline">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
              <CardDescription>Latest alerts and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {recentAlerts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent alerts</p>
                )}
                {recentAlerts.map((item, i) => (
                  <div key={item.id} className="flex gap-3 items-start group" data-testid={`activity-item-${i}`}>
                    <div className="flex flex-col items-center mt-1">
                      <div className={`h-2.5 w-2.5 rounded-full ${severityDotColor[item.severity?.toLowerCase()] || "bg-gray-400"} ring-2 ring-background`} />
                      {i < recentAlerts.length - 1 && <div className="w-px h-full min-h-[24px] bg-border/50" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                      <Badge variant="outline" className={`mt-1 text-[10px] ${severityBadgeClass[item.severity] || ""}`}>
                        {item.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          custom={6}
        >
          <Card className={cardClass} data-testid="top-risks-table">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Top AI Risks
              </CardTitle>
              <CardDescription>Models with the highest risk scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="grid grid-cols-12 text-xs text-primary/60 uppercase tracking-wider mb-2 px-2">
                  <div className="col-span-5">Model</div>
                  <div className="col-span-2 text-center">Risk Score</div>
                  <div className="col-span-3 text-center">Vulnerabilities</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>
                {topRiskModels.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No models found</p>
                )}
                {topRiskModels.map((model, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 items-center p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                    data-testid={`risk-row-${i}`}
                  >
                    <div className="col-span-5 font-medium text-sm text-foreground truncate">{model.name}</div>
                    <div className="col-span-2 text-center font-mono text-foreground">{model.riskScore}</div>
                    <div className="col-span-3 text-center font-mono text-foreground">{model.vulnerabilities}</div>
                    <div className="col-span-2 text-right">
                      <Badge variant="outline" className={severityBadgeClass[model.status] || ""}>
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass} data-testid="connector-status-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <Radio className="h-5 w-5 text-cyan-500" />
                Connector Status
              </CardTitle>
              <CardDescription>Overview of connected data sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connectorStatusData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No connectors configured</p>
                )}
                {connectorStatusData.map((item, i) => {
                  const statusColor =
                    item.status === "connected" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" :
                    item.status === "error" ? "text-red-500 bg-red-500/10 border-red-500/30" :
                    item.status === "syncing" ? "text-blue-500 bg-blue-500/10 border-blue-500/30" :
                    "text-muted-foreground bg-muted/10 border-border";
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                      data-testid={`connector-status-${i}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${
                          item.status === "connected" ? "bg-emerald-500" :
                          item.status === "error" ? "bg-red-500" :
                          "bg-blue-500"
                        }`} />
                        <span className="text-sm font-medium text-foreground capitalize">{item.status}</span>
                      </div>
                      <span className="text-2xl font-bold font-mono text-foreground">{item.count}</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Connectors</span>
                    <span className="font-mono font-semibold text-foreground">
                      {connectorStatusData.reduce((sum, d) => sum + d.count, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
