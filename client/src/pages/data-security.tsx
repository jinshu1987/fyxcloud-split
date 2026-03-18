import { useEffect, useState, useRef, useMemo } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import type { Resource, Alert } from "@shared/schema";
import {
  ShieldCheck, FileWarning, Lock, Eye, Database, ArrowRight
} from "lucide-react";
import { motion, useInView } from "framer-motion";

const cardClass = "border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-sm";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const severityBadgeClass: Record<string, string> = {
  Critical: "text-red-500 border-red-500/30 bg-red-500/10",
  High: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  Medium: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
  Low: "text-blue-400 border-blue-400/30 bg-blue-400/10",
};

const riskColor: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#60a5fa",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  color: "hsl(var(--foreground))",
  borderRadius: "8px",
  fontSize: "12px",
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

const dataFlowStages = [
  { label: "Training Data", icon: Database, desc: "Raw datasets" },
  { label: "Model Training", icon: Lock, desc: "Fine-tuning & training" },
  { label: "Inference", icon: Eye, desc: "Real-time predictions" },
  { label: "API Response", icon: ShieldCheck, desc: "Filtered output" },
];

export default function DataSecurityPage() {
  const { data: resourcesData = [] } = useQuery<Resource[]>({ queryKey: ["/api/resources"] });
  const { data: alertsData = [] } = useQuery<Alert[]>({ queryKey: ["/api/alerts"] });

  const resourcesByType = useMemo(() => {
    const typeMap: Record<string, number> = {};
    for (const r of resourcesData) {
      typeMap[r.type] = (typeMap[r.type] || 0) + 1;
    }
    return Object.entries(typeMap).map(([category, count]) => ({
      category, count, risk: "Medium"
    }));
  }, [resourcesData]);

  const resourcesBySourceAndRisk = useMemo(() => {
    const sourceMap: Record<string, { critical: number; high: number; medium: number; low: number }> = {};
    for (const r of resourcesData) {
      const src = r.source.split(" ")[0] || r.source;
      if (!sourceMap[src]) sourceMap[src] = { critical: 0, high: 0, medium: 0, low: 0 };
      const key = r.risk.toLowerCase() as "critical" | "high" | "medium" | "low";
      if (key in sourceMap[src]) sourceMap[src][key]++;
    }
    return Object.entries(sourceMap).map(([source, risks]) => ({ source, ...risks }));
  }, [resourcesData]);

  const uniqueTypes = useMemo(() => new Set(resourcesData.map(r => r.type)).size, [resourcesData]);
  const highRiskCount = useMemo(() => resourcesData.filter(r => r.risk === "Critical" || r.risk === "High").length, [resourcesData]);

  const stats = [
    { label: "Total Resources", value: resourcesData.length, icon: Database, color: "text-blue-500", desc: "Tracked resources" },
    { label: "Resource Types", value: uniqueTypes, icon: Eye, color: "text-cyan-500", desc: "Unique types" },
    { label: "Active Alerts", value: alertsData.length, icon: FileWarning, color: "text-blue-500", desc: "Current alerts" },
    { label: "High Risk", value: highRiskCount, icon: ShieldCheck, color: "text-emerald-500", desc: "Critical & High risk" },
  ];

  return (
    <Layout>
      <div className="space-y-8" data-testid="data-security-page">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">Data Security</h1>
          <p className="text-muted-foreground mt-1" data-testid="page-subtitle">Monitor and protect sensitive data across AI pipelines</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-row">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} custom={i} variants={fadeIn} initial="hidden" animate="visible">
              <Card className={cardClass} data-testid={`stat-card-${i}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-bold">
                    <AnimatedCount value={stat.value} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="charts-row">
          <motion.div custom={4} variants={fadeIn} initial="hidden" animate="visible">
            <Card className={cardClass} data-testid="data-classification-chart">
              <CardHeader>
                <CardTitle className="text-lg">Resources by Type</CardTitle>
                <CardDescription>Resource categories and counts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resourcesByType} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis type="category" dataKey="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={80} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                        {resourcesByType.map((entry, index) => (
                          <Cell key={index} fill={riskColor[entry.risk] || "#60a5fa"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={5} variants={fadeIn} initial="hidden" animate="visible">
            <Card className={cardClass} data-testid="sensitivity-by-source-chart">
              <CardHeader>
                <CardTitle className="text-lg">Risk Distribution by Source</CardTitle>
                <CardDescription>Risk level distribution across sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resourcesBySourceAndRisk} margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="source" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
                      <Bar dataKey="medium" stackId="a" fill="#eab308" name="Medium" />
                      <Bar dataKey="low" stackId="a" fill="#60a5fa" name="Low" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div custom={6} variants={fadeIn} initial="hidden" animate="visible">
          <Card className={cardClass} data-testid="exposed-secrets-table">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-blue-500" />
                Recent Alerts
              </CardTitle>
              <CardDescription>Recent security alerts across AI pipelines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertsData.map((alert, i) => (
                  <div key={alert.id || i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors" data-testid={`secret-row-${i}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.description}</p>
                    </div>
                    <Badge variant="outline" className={severityBadgeClass[alert.severity] || ""}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
                {alertsData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No alerts found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div custom={7} variants={fadeIn} initial="hidden" animate="visible">
          <Card className={cardClass} data-testid="data-flow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-500" />
                Data Flow Pipeline
              </CardTitle>
              <CardDescription>Sensitive data flow through AI pipeline stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 py-6">
                {dataFlowStages.map((stage, i) => (
                  <div key={i} className="flex items-center" data-testid={`flow-stage-${i}`}>
                    <motion.div
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors min-w-[140px]"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.15, duration: 0.4 }}
                    >
                      <div className="p-2.5 rounded-lg bg-primary/10">
                        <stage.icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-center">{stage.label}</span>
                      <span className="text-xs text-muted-foreground text-center">{stage.desc}</span>
                    </motion.div>
                    {i < dataFlowStages.length - 1 && (
                      <motion.div
                        className="mx-2 hidden sm:block"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.15 + 0.3 }}
                      >
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
