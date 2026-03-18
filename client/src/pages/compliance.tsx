import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Scale, Shield, FileCheck, ShieldCheck, Bug,
  ChevronRight, CheckCircle2, XCircle, AlertTriangle,
  HelpCircle, ArrowLeft, TrendingUp, BarChart3,
  ExternalLink, FileText, Filter
} from "lucide-react";
import { HelpIcon } from "@/components/help-icon";

const FRAMEWORK_ICONS: Record<string, any> = {
  Scale, Shield, FileCheck, ShieldCheck, Bug,
};

interface FrameworkSummary {
  id: string;
  name: string;
  shortName: string;
  version: string;
  description: string;
  icon: string;
  overallScore: number;
  passCount: number;
  failCount: number;
  partialCount: number;
  notAssessedCount: number;
  totalControls: number;
}

interface ControlPosture {
  controlId: string;
  controlName: string;
  controlDescription: string;
  status: "pass" | "fail" | "partial" | "not_assessed";
  mappedRuleIds: string[];
  enabledPolicyCount: number;
  totalPolicyCount: number;
  findingsCount: number;
  openFindingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: { id: string; ruleId: string; severity: string; status: string; assetName: string; finding: string }[];
}

interface FrameworkPosture {
  framework: { id: string; name: string; shortName: string; version: string; description: string; icon: string; controls: any[] };
  overallScore: number;
  passCount: number;
  failCount: number;
  partialCount: number;
  notAssessedCount: number;
  totalControls: number;
  controls: ControlPosture[];
}

function ScoreRing({ score, size = 120, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pass": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "fail": return <XCircle className="h-4 w-4 text-red-500" />;
    case "partial": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default: return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    fail: "bg-red-500/10 text-red-500 border-red-500/20",
    partial: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    not_assessed: "bg-muted/50 text-muted-foreground border-border/50",
  };
  const labels: Record<string, string> = {
    pass: "Compliant",
    fail: "Non-Compliant",
    partial: "Partial",
    not_assessed: "Not Assessed",
  };
  return <Badge variant="outline" className={`text-[10px] ${styles[status] || styles.not_assessed}`}>{labels[status] || "Unknown"}</Badge>;
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Critical: "bg-red-500",
    High: "bg-blue-500",
    Medium: "bg-amber-500",
    Low: "bg-blue-500",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[severity] || "bg-gray-400"}`} />;
}

export default function CompliancePage() {
  const [, navigate] = useLocation();
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [selectedControl, setSelectedControl] = useState<ControlPosture | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: frameworks = [], isLoading } = useQuery<FrameworkSummary[]>({
    queryKey: ["/api/compliance/frameworks"],
  });

  const { data: frameworkDetail } = useQuery<FrameworkPosture>({
    queryKey: ["/api/compliance/frameworks", selectedFramework],
    queryFn: () => fetch(`/api/compliance/frameworks/${selectedFramework}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedFramework,
  });

  const overallScore = frameworks.length > 0
    ? Math.round(frameworks.reduce((s, f) => s + f.overallScore, 0) / frameworks.length)
    : 0;

  const totalPass = frameworks.reduce((s, f) => s + f.passCount, 0);
  const totalFail = frameworks.reduce((s, f) => s + f.failCount, 0);
  const totalPartial = frameworks.reduce((s, f) => s + f.partialCount, 0);
  const totalNotAssessed = frameworks.reduce((s, f) => s + f.notAssessedCount, 0);
  const totalControls = frameworks.reduce((s, f) => s + f.totalControls, 0);

  const filteredControls = frameworkDetail?.controls.filter(c =>
    statusFilter === "all" ? true : c.status === statusFilter
  ) || [];

  if (selectedFramework && frameworkDetail) {
    return (
      <Layout>
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedFramework(null); setSelectedControl(null); }} className="gap-1.5" data-testid="button-back-frameworks">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="h-5 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{frameworkDetail.framework.name}</h1>
              <p className="text-sm text-muted-foreground">v{frameworkDetail.framework.version} — {frameworkDetail.framework.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="backdrop-blur-xl bg-card/60 border-border/50 shadow-lg">
              <CardContent className="p-5 flex flex-col items-center justify-center">
                <ScoreRing score={frameworkDetail.overallScore} size={100} strokeWidth={8} />
                <span className="text-xs text-muted-foreground mt-2">Overall Compliance</span>
              </CardContent>
            </Card>
            {[
              { label: "Compliant", count: frameworkDetail.passCount, color: "text-emerald-500", icon: CheckCircle2 },
              { label: "Non-Compliant", count: frameworkDetail.failCount, color: "text-red-500", icon: XCircle },
              { label: "Partial", count: frameworkDetail.partialCount, color: "text-amber-500", icon: AlertTriangle },
              { label: "Not Assessed", count: frameworkDetail.notAssessedCount, color: "text-muted-foreground", icon: HelpCircle },
            ].map(item => (
              <Card key={item.label} className="backdrop-blur-xl bg-card/60 border-border/50 shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">{item.label}</span>
                  </div>
                  <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">of {frameworkDetail.totalControls} controls</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
            {["all", "fail", "partial", "pass", "not_assessed"].map(f => (
              <Button
                key={f}
                size="sm"
                variant={statusFilter === f ? "default" : "outline"}
                className="text-xs h-7"
                onClick={() => setStatusFilter(f)}
                data-testid={`button-filter-${f}`}
              >
                {f === "all" ? "All" : f === "fail" ? "Non-Compliant" : f === "partial" ? "Partial" : f === "pass" ? "Compliant" : "Not Assessed"}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredControls.map((control, i) => (
              <motion.div key={control.controlId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card
                  className="backdrop-blur-xl bg-card/60 border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setSelectedControl(control)}
                  data-testid={`card-control-${control.controlId}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <StatusIcon status={control.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{control.controlName}</span>
                          <StatusBadge status={control.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{control.controlDescription}</p>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-muted-foreground shrink-0">
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{control.enabledPolicyCount}/{control.totalPolicyCount}</p>
                          <p>Policies</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-semibold ${control.openFindingsCount > 0 ? "text-red-500" : "text-foreground"}`}>{control.openFindingsCount}</p>
                          <p>Open</p>
                        </div>
                        {control.criticalCount > 0 && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                            {control.criticalCount} Critical
                          </Badge>
                        )}
                        {control.highCount > 0 && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">
                            {control.highCount} High
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Sheet open={!!selectedControl} onOpenChange={() => setSelectedControl(null)}>
            <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] backdrop-blur-2xl bg-background/95 border-l border-border/50 p-0">
              <SheetHeader className="p-6 pb-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  {selectedControl && <StatusIcon status={selectedControl.status} />}
                  <div>
                    <SheetTitle className="text-lg">{selectedControl?.controlName}</SheetTitle>
                    <p className="text-xs text-muted-foreground mt-1">{selectedControl?.controlDescription}</p>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)]">
                {selectedControl && (
                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={selectedControl.status} />
                      <span className="text-sm text-muted-foreground">
                        {selectedControl.enabledPolicyCount} of {selectedControl.totalPolicyCount} policies enabled
                      </span>
                    </div>

                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-3">Mapped Policies</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedControl.mappedRuleIds.map(rid => (
                          <Badge key={rid} variant="outline" className="text-xs bg-primary/5 border-primary/20">{rid}</Badge>
                        ))}
                      </div>
                    </div>

                    {selectedControl.openFindingsCount > 0 && (
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "Critical", count: selectedControl.criticalCount, color: "text-red-500" },
                          { label: "High", count: selectedControl.highCount, color: "text-blue-500" },
                          { label: "Medium", count: selectedControl.mediumCount, color: "text-amber-500" },
                          { label: "Low", count: selectedControl.lowCount, color: "text-blue-500" },
                        ].map(s => (
                          <div key={s.label} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                            <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-3">
                        Findings ({selectedControl.findingsCount})
                      </h4>
                      {selectedControl.findings.length === 0 ? (
                        <div className="p-4 rounded-lg bg-muted/20 border border-border/50 text-center">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                          <p className="text-sm font-medium">No findings detected</p>
                          <p className="text-xs text-muted-foreground mt-1">All mapped policies are passing for this control</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedControl.findings.map((f, i) => (
                            <div
                              key={f.id || i}
                              className="p-3 rounded-lg bg-muted/20 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group/finding"
                              onClick={() => navigate(`/findings?highlight=${f.id}`)}
                              data-testid={`finding-link-${f.id}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20">{f.ruleId}</Badge>
                                <SeverityDot severity={f.severity} />
                                <span className="text-[10px] text-muted-foreground">{f.severity}</span>
                                <Badge variant="outline" className={`text-[10px] ml-auto ${f.status === "open" ? "bg-red-500/10 text-red-500 border-red-500/20" : f.status === "resolved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                                  {f.status}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium">{f.assetName}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.finding}</p>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/finding:opacity-100 transition-opacity shrink-0 ml-2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">Compliance Mapping <HelpIcon section="compliance" /></h1>
          <p className="text-sm text-muted-foreground mt-1">Map your security posture against industry regulatory frameworks and standards</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="backdrop-blur-xl bg-card/60 border-border/50 shadow-lg animate-pulse">
                <CardContent className="p-6 h-48" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="backdrop-blur-xl bg-card/60 border-border/50 shadow-lg md:row-span-2">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                  <ScoreRing score={overallScore} size={140} strokeWidth={12} />
                  <h3 className="text-sm font-semibold mt-4">Overall Compliance</h3>
                  <p className="text-xs text-muted-foreground text-center mt-1">Across {frameworks.length} frameworks</p>
                  <div className="mt-4 w-full space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Compliant</div>
                      <span className="font-semibold">{totalPass}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-500" /> Partial</div>
                      <span className="font-semibold">{totalPartial}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><XCircle className="h-3 w-3 text-red-500" /> Non-Compliant</div>
                      <span className="font-semibold">{totalFail}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><HelpCircle className="h-3 w-3 text-muted-foreground" /> Not Assessed</div>
                      <span className="font-semibold">{totalNotAssessed}</span>
                    </div>
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total Controls</span>
                      <span className="font-semibold">{totalControls}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {frameworks.map((fw, i) => {
                const IconComponent = FRAMEWORK_ICONS[fw.icon] || Shield;
                const scoreColor = fw.overallScore >= 80 ? "text-emerald-500" : fw.overallScore >= 60 ? "text-amber-500" : fw.overallScore >= 40 ? "text-blue-500" : "text-red-500";
                const progressColor = fw.overallScore >= 80 ? "bg-emerald-500" : fw.overallScore >= 60 ? "bg-amber-500" : fw.overallScore >= 40 ? "bg-blue-500" : "bg-red-500";

                return (
                  <motion.div key={fw.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card
                      className="backdrop-blur-xl bg-card/60 border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer group"
                      onClick={() => setSelectedFramework(fw.id)}
                      data-testid={`card-framework-${fw.id}`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${scoreColor}`}>{fw.overallScore}%</p>
                          </div>
                        </div>
                        <h3 className="font-semibold text-sm">{fw.name}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">v{fw.version}</p>

                        <div className="mt-3 mb-2">
                          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <div className={`h-full rounded-full ${progressColor} transition-all duration-1000`} style={{ width: `${fw.overallScore}%` }} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{fw.passCount}</span>
                            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />{fw.partialCount}</span>
                            <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />{fw.failCount}</span>
                          </div>
                          <span>{fw.totalControls} controls</span>
                        </div>

                        <div className="mt-3 flex items-center justify-end text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details <ChevronRight className="h-3 w-3 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <Card className="backdrop-blur-xl bg-card/60 border-border/50 shadow-lg">
              <CardContent className="p-5">
                <h3 className="text-[11px] uppercase tracking-wider text-primary/60 font-medium mb-4">Framework Comparison</h3>
                <div className="space-y-3">
                  {frameworks.map(fw => {
                    const assessed = fw.passCount + fw.failCount + fw.partialCount;
                    const total = fw.totalControls;
                    return (
                      <div key={fw.id} className="flex items-center gap-4">
                        <span className="text-sm font-medium w-32 truncate">{fw.shortName}</span>
                        <div className="flex-1 h-4 rounded-full bg-muted/30 overflow-hidden flex">
                          {fw.passCount > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(fw.passCount / total) * 100}%` }} />}
                          {fw.partialCount > 0 && <div className="h-full bg-amber-500" style={{ width: `${(fw.partialCount / total) * 100}%` }} />}
                          {fw.failCount > 0 && <div className="h-full bg-red-500" style={{ width: `${(fw.failCount / total) * 100}%` }} />}
                          {fw.notAssessedCount > 0 && <div className="h-full bg-muted/40" style={{ width: `${(fw.notAssessedCount / total) * 100}%` }} />}
                        </div>
                        <span className="text-sm font-semibold w-12 text-right">{fw.overallScore}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Compliant</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Partial</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Non-Compliant</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted/40" /> Not Assessed</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
