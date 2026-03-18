import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import Layout from "@/components/layout";
import { HelpIcon } from "@/components/help-icon";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, Search,
  Filter, Loader2, ChevronRight, Copy, Check, ExternalLink, Cloud,
  Clock, XCircle, Flag, EyeOff, Zap, Terminal, Code2, BookOpen, ChevronDown, ChevronUp,
  AlertCircle, Wrench, Fingerprint, UserCheck,
  Activity, Scale, Bug, Hexagon
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Policy, PolicyFinding } from "@shared/schema";
import { usePermission } from "@/lib/auth";
import { useProject } from "@/hooks/use-project";

interface RemediationScript {
  title: string;
  description: string;
  type: "aws-cli" | "iam-policy" | "terraform" | "python" | "shell" | "config";
  language: string;
  code: string;
  risk: "low" | "medium" | "high";
  riskNote: string;
  estimatedTime: string;
  requiresApproval: boolean;
}

interface RemediationSuggestion {
  findingId: string;
  ruleId: string;
  summary: string;
  scripts: RemediationScript[];
  prerequisites: string[];
  rollbackSteps: string[];
  references: { title: string; url: string }[];
}

const riskColors: Record<string, string> = {
  low: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  high: "text-red-500 bg-red-500/10 border-red-500/20",
};

const scriptTypeIcons: Record<string, { icon: typeof Terminal; label: string; color: string }> = {
  "aws-cli": { icon: Terminal, label: "AWS CLI", color: "#f59e0b" },
  "azure-cli": { icon: Terminal, label: "Azure CLI", color: "#0078D4" },
  "gcloud-cli": { icon: Terminal, label: "gcloud CLI", color: "#4285F4" },
  "iam-policy": { icon: Shield, label: "IAM Policy", color: "#8b5cf6" },
  "azure-policy": { icon: Shield, label: "Azure Policy", color: "#0078D4" },
  "gcp-policy": { icon: Shield, label: "GCP Org Policy", color: "#4285F4" },
  "terraform": { icon: Code2, label: "Terraform", color: "#7c3aed" },
  "python": { icon: Code2, label: "Python", color: "#007aff" },
  "shell": { icon: Terminal, label: "Shell", color: "#10b981" },
  "config": { icon: Code2, label: "Config", color: "#06b6d4" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      data-testid="button-copy-script"
      variant="ghost"
      size="sm"
      className="h-7 px-2 gap-1.5 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <><Check className="h-3 w-3 text-emerald-500" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </Button>
  );
}

function RemediationPanel({ findingId }: { findingId: string }) {
  const [expandedScript, setExpandedScript] = useState<number>(0);
  const [showPrereqs, setShowPrereqs] = useState(false);
  const [showRollback, setShowRollback] = useState(false);

  const { data: remediation, isLoading, isError } = useQuery<RemediationSuggestion>({
    queryKey: ["/api/policy-findings", findingId, "remediation"],
    queryFn: async () => {
      const res = await fetch(`/api/policy-findings/${findingId}/remediation`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load remediation");
      return res.json();
    },
    enabled: !!findingId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6 flex items-center justify-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
        <span className="text-sm text-cyan-600 dark:text-cyan-400">Generating remediation scripts...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500">
        Failed to load remediation suggestions. Try refreshing.
      </div>
    );
  }

  if (!remediation || !remediation.scripts?.length) {
    return (
      <div className="rounded-xl border border-muted/30 bg-muted/5 p-4 text-sm text-muted-foreground">
        No automated remediation scripts available for this finding type.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">{remediation.summary}</p>
      </div>

      {remediation.scripts.map((script, idx) => {
        const typeInfo = scriptTypeIcons[script.type] || scriptTypeIcons.shell;
        const TypeIcon = typeInfo.icon;
        const isExpanded = expandedScript === idx;
        return (
          <div key={idx} className="rounded-xl border border-border/50 bg-muted/5 overflow-hidden">
            <button
              data-testid={`button-expand-script-${idx}`}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/10 transition-colors"
              onClick={() => setExpandedScript(isExpanded ? -1 : idx)}
            >
              <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}>
                <TypeIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold">{script.title}</span>
                  {script.requiresApproval && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/10">Approval Required</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{typeInfo.label}</span>
                  <span>·</span>
                  <span>{script.estimatedTime}</span>
                  <span>·</span>
                  <Badge variant="outline" className={`text-[10px] ${riskColors[script.risk]}`}>
                    {script.risk} risk
                  </Badge>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
            {isExpanded && (
              <div className="border-t border-border/30">
                <div className="px-4 py-3 text-xs text-muted-foreground">{script.description}</div>
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <CopyButton text={script.code} />
                  </div>
                  <pre className="bg-gray-950 text-gray-100 p-4 text-xs font-mono overflow-x-auto max-h-[400px] overflow-y-auto leading-relaxed">
                    <code>{script.code}</code>
                  </pre>
                </div>
                {script.riskNote && (
                  <div className={`mx-4 my-3 p-3 rounded-lg border text-xs ${riskColors[script.risk]}`}>
                    <span className="font-semibold">Risk Note:</span> {script.riskNote}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {(remediation.prerequisites.length > 0 || remediation.rollbackSteps.length > 0) && (
        <div className="space-y-2">
          {remediation.prerequisites.length > 0 && (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <button
                data-testid="button-toggle-prereqs"
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/10 transition-colors"
                onClick={() => setShowPrereqs(!showPrereqs)}
              >
                <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Prerequisites ({remediation.prerequisites.length})</span>
                {showPrereqs ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showPrereqs && (
                <div className="px-3 pb-3">
                  <ul className="space-y-1">
                    {remediation.prerequisites.map((p, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-cyan-500 mt-0.5">•</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {remediation.rollbackSteps.length > 0 && (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <button
                data-testid="button-toggle-rollback"
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/10 transition-colors"
                onClick={() => setShowRollback(!showRollback)}
              >
                <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Rollback Steps ({remediation.rollbackSteps.length})</span>
                {showRollback ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showRollback && (
                <div className="px-3 pb-3">
                  <ul className="space-y-1">
                    {remediation.rollbackSteps.map((s, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {remediation.references.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">References</span>
          {remediation.references.map((ref, i) => (
            <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
              data-testid={`link-reference-${i}`}
            >
              <BookOpen className="h-3 w-3 shrink-0" /> {ref.title}
              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const cardClass = "border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-sm";

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

function EvidenceBlock({ text }: { text: string }) {
  const tryParseJson = (s: string) => {
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {}
    return null;
  };

  const jsonData = tryParseJson(text);
  if (jsonData) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
        <div className="px-4 py-2 border-b border-blue-500/10 flex items-center gap-2">
          <Code2 className="h-3 w-3 text-blue-400" />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">JSON</span>
        </div>
        <pre className="p-4 text-[12px] font-mono text-foreground/80 leading-relaxed overflow-x-auto whitespace-pre">{JSON.stringify(jsonData, null, 2)}</pre>
      </div>
    );
  }

  const kvPattern = /^(.+?)(?:=|:\s)(.+)$/;
  const lines = text.split(/\.\s+(?=[A-Z])|(?<=\.)$/).map(s => s.trim()).filter(Boolean);
  const kvPairs: { key: string; value: string }[] = [];
  const plainLines: string[] = [];

  for (const line of lines) {
    const parts = line.split(/\.\s*/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const kvMatches = trimmed.match(/(\w[\w\s]*?)(?:="|:\s*)([^"]*"?)/);
      if (kvMatches) {
        const subParts = trimmed.split(/(?<=["'])\s*[.,]\s*|\.\s+/);
        for (const sp of subParts) {
          const m = sp.trim().match(/^(.+?)(?:="|=|:\s+)(.+?)(?:"|\.)?$/);
          if (m) {
            kvPairs.push({ key: m[1].trim(), value: m[2].replace(/^"|"$/g, '').trim() });
          } else if (sp.trim()) {
            plainLines.push(sp.trim());
          }
        }
      } else {
        plainLines.push(trimmed);
      }
    }
  }

  if (kvPairs.length >= 2) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
        <div className="px-4 py-2 border-b border-blue-500/10 flex items-center gap-2">
          <Fingerprint className="h-3 w-3 text-blue-400" />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">Evidence Details</span>
        </div>
        <div className="p-4 space-y-2">
          {kvPairs.map((kv, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground min-w-[120px] shrink-0">{kv.key}</span>
              <span className="text-[12px] font-mono text-foreground/80 break-all">{kv.value}</span>
            </div>
          ))}
          {plainLines.length > 0 && (
            <div className="pt-2 mt-2 border-t border-blue-500/10">
              {plainLines.map((line, i) => (
                <p key={i} className="text-[12px] text-foreground/70 leading-relaxed">{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <p className="text-[13px] font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-all">{text}</p>
    </div>
  );
}

const severityColor: Record<string, string> = {
  Critical: "bg-red-500/10 text-red-500 border-red-500/20",
  High: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const statusConfig: Record<string, { color: string; label: string; icon: typeof CheckCircle }> = {
  open: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Open", icon: AlertCircle },
  acknowledged: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Acknowledged", icon: UserCheck },
  resolved: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Resolved", icon: CheckCircle },
  suppressed: { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: "Suppressed", icon: EyeOff },
  false_positive: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "False Positive", icon: Flag },
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  color: "hsl(var(--foreground))",
  borderRadius: "8px",
  fontSize: "12px",
};

function FindingDetailDrawer({ finding: f, policy, onClose, onAction, canTriage, onExcludeAsset, canManage }: {
  finding: PolicyFinding | null;
  policy: Policy | undefined;
  onClose: () => void;
  onAction: (id: string, status: string, reason?: string) => void;
  canTriage: boolean;
  onExcludeAsset: (assetId: string) => void;
  canManage: boolean;
}) {
  const [fpReason, setFpReason] = useState("");
  const [showFpForm, setShowFpForm] = useState(false);

  if (!f) return null;

  const catMeta = CATEGORY_META[policy?.category || "DIS"] || CATEGORY_META.DIS;
  const stConfig = statusConfig[f.status] || statusConfig.open;
  const StatusIcon = stConfig.icon;

  return (
    <Sheet open={!!f} onOpenChange={(open) => { if (!open) { onClose(); setShowFpForm(false); setFpReason(""); } }}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${catMeta.color}15`, color: catMeta.color }}>
                <catMeta.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-mono" style={{ borderColor: `${catMeta.color}40`, color: catMeta.color, backgroundColor: `${catMeta.color}10` }}>
                    {f.ruleId}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${severityColor[f.severity]}`}>
                    {f.severity}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${stConfig.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {stConfig.label}
                  </Badge>
                </div>
                <SheetTitle className="text-base font-bold leading-tight pr-8">
                  {f.finding}
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" /> Affected Asset
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Asset Name</span>
                <span className="text-sm font-medium">{f.assetName}</span>
              </div>
              <Separator className="opacity-30" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Asset Type</span>
                <span className="text-sm font-medium">{f.assetType}</span>
              </div>
              {f.assetId && (
                <>
                  <Separator className="opacity-30" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Asset ID</span>
                    <span className="text-xs font-mono text-muted-foreground">{f.assetId.substring(0, 20)}...</span>
                  </div>
                </>
              )}
              <Separator className="opacity-30" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Policy</span>
                <span className="text-sm font-medium">{policy?.name || f.ruleId}</span>
              </div>
              {f.detectedAt && (
                <>
                  <Separator className="opacity-30" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Detected At</span>
                    <span className="text-sm font-mono">{new Date(f.detectedAt).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {f.impact && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-red-500" /> Impact Analysis
              </h3>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{f.impact}</p>
              </div>
            </section>
          )}

          {f.remediation && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-emerald-500" /> Remediation Steps
              </h3>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-sm text-foreground leading-relaxed space-y-2">
                  {f.remediation.split("\n").map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    const isStep = /^\d+\./.test(trimmed);
                    return (
                      <div key={i} className={`flex items-start gap-2 ${isStep ? "" : "pl-0"}`}>
                        {isStep && <span className="text-emerald-500 font-mono text-xs mt-0.5 shrink-0">{trimmed.match(/^\d+/)?.[0]}.</span>}
                        <span>{isStep ? trimmed.replace(/^\d+\.\s*/, "") : trimmed}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {f.evidence && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Fingerprint className="h-3.5 w-3.5 text-blue-500" /> Evidence
              </h3>
              <EvidenceBlock text={f.evidence} />
            </section>
          )}

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-cyan-500" /> Automated Remediation
            </h3>
            <RemediationPanel findingId={f.id} />
          </section>

          {f.acknowledgedBy && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5" /> Acknowledgment
              </h3>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Acknowledged By</span>
                  <span className="text-sm font-medium">{f.acknowledgedBy}</span>
                </div>
                {f.acknowledgedAt && (
                  <>
                    <Separator className="opacity-30" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Acknowledged At</span>
                      <span className="text-sm font-mono">{new Date(f.acknowledgedAt).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {f.falsePositiveReason && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-amber-500" /> False Positive Reason
              </h3>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm text-foreground leading-relaxed">{f.falsePositiveReason}</p>
              </div>
            </section>
          )}

          {f.resolvedAt && (
            <section>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Resolved</p>
                  <p className="text-xs text-muted-foreground">{new Date(f.resolvedAt).toLocaleString()}</p>
                </div>
              </div>
            </section>
          )}

          {canTriage && (
          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3">Actions</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {f.status === "open" && (
                  <Button
                    data-testid="button-acknowledge-finding"
                    variant="outline"
                    className="gap-2 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                    onClick={() => onAction(f.id, "acknowledged")}
                  >
                    <UserCheck className="h-4 w-4" /> Acknowledge
                  </Button>
                )}
                {(f.status === "open" || f.status === "acknowledged") && (
                  <Button
                    data-testid="button-resolve-finding"
                    variant="outline"
                    className="gap-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => onAction(f.id, "resolved")}
                  >
                    <CheckCircle className="h-4 w-4" /> Resolve
                  </Button>
                )}
                {f.status !== "suppressed" && (
                  <Button
                    data-testid="button-suppress-finding"
                    variant="outline"
                    className="gap-2 border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                    onClick={() => onAction(f.id, "suppressed")}
                  >
                    <EyeOff className="h-4 w-4" /> Suppress
                  </Button>
                )}
                {f.status !== "false_positive" && !showFpForm && (
                  <Button
                    data-testid="button-false-positive-finding"
                    variant="outline"
                    className="gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                    onClick={() => setShowFpForm(true)}
                  >
                    <Flag className="h-4 w-4" /> False Positive
                  </Button>
                )}
                {(f.status === "resolved" || f.status === "suppressed" || f.status === "false_positive" || f.status === "acknowledged") && (
                  <Button
                    data-testid="button-reopen-finding"
                    variant="outline"
                    className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                    onClick={() => onAction(f.id, "open")}
                  >
                    <AlertCircle className="h-4 w-4" /> Reopen
                  </Button>
                )}
              </div>
              {canManage && f.assetId && (
                <Button
                  data-testid="button-not-ai-asset-finding"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-gray-500/30 text-gray-400 hover:bg-gray-500/10 mt-1"
                  onClick={() => onExcludeAsset(f.assetId!)}
                >
                  <XCircle className="h-4 w-4" /> Not an AI Asset
                </Button>
              )}

              {showFpForm && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Report as False Positive</p>
                  <p className="text-xs text-muted-foreground">Please explain why this finding is a false positive. This helps improve detection accuracy.</p>
                  <Textarea
                    data-testid="input-fp-reason"
                    placeholder="e.g., This endpoint is intentionally public for a demo environment..."
                    value={fpReason}
                    onChange={(e) => setFpReason(e.target.value)}
                    className="min-h-[80px] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      data-testid="button-submit-fp"
                      size="sm"
                      className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => { onAction(f.id, "false_positive", fpReason); setShowFpForm(false); setFpReason(""); }}
                      disabled={!fpReason.trim()}
                    >
                      <Flag className="h-3.5 w-3.5" /> Submit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowFpForm(false); setFpReason(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function FindingsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedFinding, setSelectedFinding] = useState<PolicyFinding | null>(null);
  const canTriage = usePermission("triage_findings");
  const canManage = usePermission("manage_connectors");
  const searchString = useSearch();
  const { selectedProjectId } = useProject();
  const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";

  const { data: policiesData = [] } = useQuery<Policy[]>({ queryKey: ["/api/policies"] });
  const { data: findingsData = [], isLoading } = useQuery<PolicyFinding[]>({ queryKey: ["/api/policy-findings", selectedProjectId], queryFn: () => fetch(`/api/policy-findings${projectParam}`, { credentials: "include" }).then(r => r.json()) });

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const highlightId = params.get("highlight");
    if (highlightId && findingsData.length > 0 && !selectedFinding) {
      const match = findingsData.find(f => f.id === highlightId);
      if (match) {
        setSelectedFinding(match);
        window.history.replaceState({}, "", "/findings");
      }
    }
  }, [searchString, findingsData]);

  const findingActionMutation = useMutation({
    mutationFn: async ({ id, status, falsePositiveReason }: { id: string; status: string; falsePositiveReason?: string }) => {
      const res = await apiRequest("PATCH", `/api/policy-findings/${id}`, { status, falsePositiveReason });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-findings"] });
      if (selectedFinding && data) {
        setSelectedFinding(data);
      }
      const statusLabel = data?.status === "resolved" ? "Resolved" : data?.status === "suppressed" ? "Suppressed" : data?.status === "acknowledged" ? "Acknowledged" : "Updated";
      toast({ title: `Finding ${statusLabel}`, variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update finding", variant: "destructive" });
    },
  });

  const handleFindingAction = (id: string, status: string, reason?: string) => {
    findingActionMutation.mutate({ id, status, falsePositiveReason: reason });
  };

  const excludeAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      await apiRequest("PATCH", `/api/resources/${assetId}/exclude`, { excluded: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policy-findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setSelectedFinding(null);
      toast({
        title: "Asset excluded from scanning",
        description: "This asset has been marked as not an AI asset and will no longer be scanned.",
        variant: "success",
      });
    },
    onError: () => {
      toast({ title: "Failed to exclude asset", variant: "destructive" });
    },
  });

  const policyMap = useMemo(() => {
    const map: Record<string, Policy> = {};
    for (const p of policiesData) {
      map[p.id] = p;
      map[p.ruleId] = p;
    }
    return map;
  }, [policiesData]);

  const getFindingProvider = (f: PolicyFinding): string => {
    const rule = (f.ruleId || "").toUpperCase();
    if (rule.startsWith("HF-")) return "Hugging Face";
    if (rule.startsWith("AZ-AI-") || rule.startsWith("AZ-")) return "Azure";
    if (rule.startsWith("GC-AI-") || rule.startsWith("GC-")) return "GCP";
    return "AWS";
  };

  const availableProviders = useMemo(() => {
    const providers = new Set(findingsData.map(f => getFindingProvider(f)));
    return ["AWS", "Azure", "GCP", "Hugging Face"].filter(p => providers.has(p));
  }, [findingsData]);

  const filtered = useMemo(() => {
    return findingsData.filter(f => {
      if (search) {
        const q = search.toLowerCase();
        if (!f.assetName.toLowerCase().includes(q) && !f.finding.toLowerCase().includes(q) && !f.ruleId.toLowerCase().includes(q)) return false;
      }
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (categoryFilter !== "all") {
        const policy = policyMap[f.policyId || ""] || policyMap[f.ruleId || ""];
        if (!policy || policy.category !== categoryFilter) return false;
      }
      if (providerFilter !== "all" && getFindingProvider(f) !== providerFilter) return false;
      return true;
    });
  }, [findingsData, search, severityFilter, statusFilter, categoryFilter, providerFilter, policyMap]);

  const selectedFindingPolicy = useMemo(() => {
    if (!selectedFinding) return undefined;
    return policyMap[selectedFinding.policyId || ""] || policyMap[selectedFinding.ruleId || ""];
  }, [selectedFinding, policyMap]);

  const totalFindings = findingsData.length;
  const openFindings = findingsData.filter(f => f.status === "open").length;
  const criticalOpen = findingsData.filter(f => f.severity === "Critical" && f.status === "open").length;
  const highOpen = findingsData.filter(f => f.severity === "High" && f.status === "open").length;
  const resolvedFindings = findingsData.filter(f => f.status === "resolved").length;
  const suppressedFindings = findingsData.filter(f => f.status === "suppressed" || f.status === "false_positive").length;

  const severityBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of findingsData) {
      if (f.status === "open" || f.status === "acknowledged") {
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

  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of findingsData) {
      map[f.status] = (map[f.status] || 0) + 1;
    }
    return [
      { name: "Open", value: map["open"] || 0, color: "#ef4444" },
      { name: "Acknowledged", value: map["acknowledged"] || 0, color: "#007aff" },
      { name: "Resolved", value: map["resolved"] || 0, color: "#10b981" },
      { name: "Suppressed", value: map["suppressed"] || 0, color: "#6b7280" },
      { name: "False Positive", value: map["false_positive"] || 0, color: "#f59e0b" },
    ].filter(s => s.value > 0);
  }, [findingsData]);

  const stats = [
    { label: "Total Findings", value: totalFindings, icon: AlertTriangle, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Open", value: openFindings, icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Critical Open", value: criticalOpen, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-600/10" },
    { label: "High Open", value: highOpen, icon: AlertTriangle, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Resolved", value: resolvedFindings, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Suppressed", value: suppressedFindings, icon: EyeOff, color: "text-gray-400", bg: "bg-gray-500/10" },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="findings-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2" data-testid="text-page-title">Security Findings <HelpIcon section="findings" /></h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            {totalFindings} findings detected across your AI assets — click any finding for details, impact analysis, and remediation
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
              <Card data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`} className={cardClass}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon className={`h-4 w-4 ${stat.color}`} /></div>
                    <div>
                      <p className="text-2xl font-bold font-mono">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {(severityBreakdown.length > 0 || statusBreakdown.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card data-testid="card-severity-chart" className={`${cardClass} h-full`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Active Findings by Severity</CardTitle>
                  <CardDescription>Open and acknowledged findings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center">
                    {severityBreakdown.length === 0 ? (
                      <div className="text-center">
                        <CheckCircle className="h-10 w-10 text-emerald-500/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No active findings</p>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="55%" height="100%">
                          <PieChart>
                            <Pie data={severityBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} strokeWidth={0}>
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

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card data-testid="card-status-chart" className={`${cardClass} h-full`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Findings by Status</CardTitle>
                  <CardDescription>Lifecycle status of all findings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center">
                    {statusBreakdown.length === 0 ? (
                      <div className="text-center">
                        <CheckCircle className="h-10 w-10 text-emerald-500/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No findings yet</p>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="55%" height="100%">
                          <PieChart>
                            <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} strokeWidth={0}>
                              {statusBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-2 min-w-[120px]">
                          {statusBreakdown.map(r => (
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card data-testid="card-findings-table" className={cardClass}>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle className="text-xl">All Findings</CardTitle>
                  <CardDescription>Click any finding to view full details, impact analysis, and take action</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      data-testid="input-search-findings"
                      placeholder="Search findings, assets, rules..."
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
                  <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <SelectTrigger data-testid="select-provider-filter" className="w-[180px] h-9">
                      <Cloud className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      {availableProviders.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter" className="w-[150px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="suppressed">Suppressed</SelectItem>
                      <SelectItem value="false_positive">False Positive</SelectItem>
                    </SelectContent>
                  </Select>
                  {(categoryFilter !== "all" || providerFilter !== "all" || severityFilter !== "all" || statusFilter !== "all" || search) && (
                    <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setCategoryFilter("all"); setProviderFilter("all"); setSeverityFilter("all"); setStatusFilter("all"); setSearch(""); }}>
                      Clear filters
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {filtered.length} of {totalFindings} findings
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No findings match your filters</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-muted-foreground font-semibold w-[80px]">Rule</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Asset</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Finding</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Severity</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Detected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.slice(0, 100).map((f, i) => {
                        const policy = policyMap[f.policyId || ""] || policyMap[f.ruleId || ""];
                        const catMeta = CATEGORY_META[policy?.category || "DIS"] || CATEGORY_META.DIS;
                        const sc = statusConfig[f.status] || statusConfig.open;
                        const StatusIcon = sc.icon;
                        return (
                          <TableRow
                            key={f.id || i}
                            data-testid={`row-finding-${f.id || i}`}
                            className="border-border/50 hover:bg-primary/5 transition-all duration-200 group cursor-pointer"
                            onClick={() => setSelectedFinding(f)}
                          >
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[10px]" style={{ borderColor: `${catMeta.color}40`, color: catMeta.color, backgroundColor: `${catMeta.color}10` }}>
                                {f.ruleId}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{f.assetName}</span>
                                <span className="text-xs text-muted-foreground">{f.assetType}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <span className="text-sm text-muted-foreground truncate block">{f.finding}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${severityColor[f.severity]}`}>
                                {f.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${sc.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                  {f.detectedAt ? new Date(f.detectedAt).toLocaleDateString() : "—"}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filtered.length > 100 && (
                    <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/50">
                      Showing 100 of {filtered.length} findings
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <FindingDetailDrawer
        finding={selectedFinding}
        policy={selectedFindingPolicy}
        onClose={() => setSelectedFinding(null)}
        onAction={handleFindingAction}
        canTriage={canTriage}
        onExcludeAsset={(assetId) => excludeAssetMutation.mutate(assetId)}
        canManage={canManage}
      />
    </Layout>
  );
}