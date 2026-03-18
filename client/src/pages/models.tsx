import { useEffect, useState, useRef, useMemo } from "react";
import Layout from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, ShieldAlert, ShieldCheck, Plus, Bug, Clock, AlertTriangle, MoreHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { AiModel } from "@shared/schema";
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion, useInView } from "framer-motion";
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

function AnimatedCount({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const increment = end / (1.5 * 60);
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
  }, [isInView, value]);

  return <span ref={ref} className="font-mono">{count}{suffix}</span>;
}

export default function ModelsPage() {
  const { selectedProjectId } = useProject();
  const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";
  const { data: modelsData = [], isLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/models", selectedProjectId],
    queryFn: () => fetch(`/api/models${projectParam}`, { credentials: "include" }).then(r => r.json()),
  });

  const chartColors = ["#007aff", "#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#f97316"];
  const computedTypeBreakdown = useMemo(() => {
    const typeMap: Record<string, number> = {};
    for (const m of modelsData) {
      const baseType = m.type.split(" (")[0] || m.type;
      typeMap[baseType] = (typeMap[baseType] || 0) + 1;
    }
    return Object.entries(typeMap).map(([name, value], i) => ({
      name, value, color: chartColors[i % chartColors.length]
    }));
  }, [modelsData]);

  const computedRiskDistribution = useMemo(() => {
    const buckets = [
      { range: "0-20", count: 0 },
      { range: "21-40", count: 0 },
      { range: "41-60", count: 0 },
      { range: "61-80", count: 0 },
      { range: "81-100", count: 0 },
    ];
    for (const m of modelsData) {
      const s = m.riskScore;
      if (s <= 20) buckets[0].count++;
      else if (s <= 40) buckets[1].count++;
      else if (s <= 60) buckets[2].count++;
      else if (s <= 80) buckets[3].count++;
      else buckets[4].count++;
    }
    return buckets;
  }, [modelsData]);

  const totalModels = modelsData.length;
  const criticalRisk = modelsData.filter(m => m.riskScore > 80).length;
  const activeVulnerabilities = modelsData.reduce((sum, m) => sum + m.vulnerabilities, 0);

  const stats = [
    { label: "Total Models", value: totalModels, icon: Brain, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Critical Risk", value: criticalRisk, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Active Vulnerabilities", value: activeVulnerabilities, icon: Bug, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Last Scan", value: "2 mins ago", icon: Clock, color: "text-emerald-500", bg: "bg-emerald-500/10", isText: true },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold tracking-tight text-foreground font-mono">AI Models Inventory</h1>
            <p data-testid="text-page-subtitle" className="text-muted-foreground">
              Manage and monitor all discovered AI models across your organization.
            </p>
          </div>
          <Button data-testid="button-onboard-model" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
            <Plus className="mr-2 h-4 w-4" /> Onboard Model
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <Card data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`} className={cardClass}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">
                        {stat.isText ? (
                          <span data-testid={`text-stat-value-${stat.label.toLowerCase().replace(/\s+/g, '-')}`} className="font-mono text-lg">{stat.value}</span>
                        ) : (
                          <span data-testid={`text-stat-value-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                            <AnimatedCount value={stat.value as number} />
                          </span>
                        )}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div custom={4} initial="hidden" animate="visible" variants={fadeIn}>
            <Card data-testid="card-model-types" className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg">Model Types</CardTitle>
                <CardDescription>Breakdown by model category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-center">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie
                        data={computedTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {computedTypeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2 w-1/2">
                    {computedTypeBreakdown.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="ml-auto font-mono font-medium">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={5} initial="hidden" animate="visible" variants={fadeIn}>
            <Card data-testid="card-risk-distribution" className={cardClass}>
              <CardHeader>
                <CardTitle className="text-lg">Risk Score Distribution</CardTitle>
                <CardDescription>Models grouped by risk score range</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computedRiskDistribution} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="range" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {computedRiskDistribution.map((entry, index) => {
                          const colors = ['#10b981', '#007aff', '#f59e0b', '#f97316', '#ef4444'];
                          return <Cell key={`cell-${index}`} fill={colors[index]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div custom={6} initial="hidden" animate="visible" variants={fadeIn}>
          <Card data-testid="card-models-table" className={cardClass}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">All Models</CardTitle>
                  <CardDescription>Complete list of discovered and onboarded AI models</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-muted-foreground font-semibold">Model Name</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Type</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Risk Score</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Vulnerabilities</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Last Scan</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelsData.map((model) => (
                        <TableRow
                          key={model.id}
                          data-testid={`row-model-${model.id}`}
                          className="border-border/50 hover:bg-muted/40 transition-all duration-200 group"
                        >
                          <TableCell className="font-medium text-foreground">
                            <div className="flex flex-col">
                              <span data-testid={`text-model-name-${model.id}`}>{model.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{model.id}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span data-testid={`text-model-type-${model.id}`} className="text-sm">{model.type}</span>
                          </TableCell>
                          <TableCell>
                            <Badge data-testid={`badge-model-status-${model.id}`} variant="outline" className={`
                              ${model.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                model.status === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}
                            `}>
                              {model.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-muted/30 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    model.riskScore > 80 ? 'bg-red-500' : 
                                    model.riskScore > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                                  }`} 
                                  style={{ width: `${model.riskScore}%` }}
                                ></div>
                              </div>
                              <span data-testid={`text-model-risk-${model.id}`} className="font-mono text-sm font-medium">{model.riskScore}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {model.vulnerabilities > 0 ? (
                                <>
                                  <ShieldAlert className="h-4 w-4 text-red-500" />
                                  <span data-testid={`text-model-vulns-${model.id}`} className="text-red-500 font-medium font-mono">{model.vulnerabilities}</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                  <span data-testid={`text-model-vulns-${model.id}`} className="text-emerald-500 font-medium">Safe</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span data-testid={`text-model-scan-${model.id}`} className="text-muted-foreground text-sm font-mono">{model.lastScan || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Button data-testid={`button-model-actions-${model.id}`} variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}