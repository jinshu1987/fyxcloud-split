import React, { useEffect, useState, useRef, useMemo } from "react";
import { useSearch } from "wouter";
import Layout from "@/components/layout";
import { toast } from "@/hooks/use-toast";
import { useProject } from "@/hooks/use-project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Box, Database, Server, Layers, Plus, PackageOpen, AlertTriangle, Globe, Cloud, Brain, Bot, BookOpen, Workflow, Search, Filter, Shield, Key, Eye, EyeOff, Settings, Cpu, ExternalLink, Copy, Check, X, ChevronRight, Link2, Tag, Info, Clock, MapPin, Hexagon, Loader2, FileBox, GitBranch, Lock, Package } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Resource, AiModel, CloudConnector } from "@shared/schema";
import { usePermission } from "@/lib/auth";
import { PieChart, Pie, Cell as PieCell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const cardClass = "border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-sm";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const CATEGORY_ORDER = [
  "Foundation Models", "Custom Models", "Inference Endpoints", "AI Agents",
  "Vector Storage", "Knowledge Bases", "Training Data", "Development",
  "Guardrails", "Orchestration", "Feature Store", "Secrets/Keys",
  "Identity/Roles", "Monitoring/Logs",
  "AI/ML Platform", "AI Data", "AI Applications", "AI Endpoints",
  "Compute", "Database", "Storage", "API Management", "CDN",
  "Messaging", "Streaming", "Event Management", "Cache",
];

const NETWORK_ASSET_TYPES = new Set([
  "VPC", "Subnet", "Security Group", "Route Table", "NAT Gateway",
  "Internet Gateway", "VPC Endpoint", "Network Interface", "Network ACL",
  "VPC Peering Connection", "Transit Gateway",
]);

const CATEGORY_COLORS: Record<string, string> = {
  "Foundation Models": "#007aff", "Custom Models": "#8b5cf6",
  "Inference Endpoints": "#f59e0b", "AI Agents": "#10b981",
  "Vector Storage": "#06b6d4", "Knowledge Bases": "#6366f1",
  "Training Data": "#22c55e", "Development": "#f97316",
  "Guardrails": "#14b8a6", "Orchestration": "#ec4899",
  "Feature Store": "#a855f7", "Secrets/Keys": "#ef4444",
  "Identity/Roles": "#eab308", "Monitoring/Logs": "#64748b",
  "Compute": "#f97316", "Database": "#06b6d4", "Storage": "#22c55e",
  "API Management": "#8b5cf6", "CDN": "#ec4899", "Messaging": "#14b8a6",
  "Streaming": "#6366f1", "Event Management": "#a855f7", "Cache": "#f59e0b",
  "Networking": "#007aff", "Security": "#ef4444", "General": "#64748b",
  "AI/ML Platform": "#FFD21E", "AI Data": "#f59e0b",
  "AI Applications": "#ec4899", "AI Endpoints": "#06b6d4",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Foundation Models": "Base and provisioned AI models from Bedrock, Azure OpenAI, Vertex AI, or Hugging Face Hub.",
  "Custom Models": "Fine-tuned and custom-trained models across SageMaker, Azure ML, Vertex AI, or HF Model repos.",
  "Inference Endpoints": "Live model serving endpoints across SageMaker, Azure ML, Vertex AI, or HF Inference Endpoints.",
  "AI Agents": "Autonomous AI agents built with Bedrock Agents, Azure AI, or custom orchestration frameworks.",
  "Vector Storage": "Vector databases and indexes used for embedding storage, similarity search, and RAG pipelines.",
  "Knowledge Bases": "Knowledge Bases connecting data sources for retrieval-augmented generation (RAG).",
  "Training Data": "S3 buckets, Azure Blob, GCS, and HF Datasets used for model training and evaluation.",
  "Development": "SageMaker Notebooks, Azure ML Compute, Vertex AI Workbenches, and HF Spaces for model development.",
  "Guardrails": "Content filtering and safety guardrails across Bedrock Guardrails, Azure Content Safety, and Model Armor.",
  "Orchestration": "ML pipelines, Step Functions, Azure ML Pipelines, and Vertex AI Pipelines orchestrating AI workflows.",
  "Feature Store": "Feature Store groups providing curated features for model training and inference.",
  "Secrets/Keys": "API keys, tokens, and secrets for AI services across cloud providers.",
  "Identity/Roles": "IAM roles, Azure Managed Identities, and GCP Service Accounts with AI service permissions.",
  "Monitoring/Logs": "CloudWatch, Azure Monitor, and GCP Cloud Logging capturing AI service activity and audit logs.",
  "AI/ML Platform": "Hugging Face models, repositories, and related AI/ML platform resources.",
  "AI Data": "Hugging Face datasets and other AI-specific data repositories.",
  "AI Applications": "Hugging Face Spaces and other hosted AI application deployments.",
  "AI Endpoints": "Dedicated inference endpoints across Hugging Face and other AI platforms.",
};

const DETECTION_RULES: Record<string, string[]> = {
  "Foundation Models": ["GRD-024: Temperature/parameter validation", "INF-010: EOL version detection"],
  "Custom Models": ["INF-008: Encryption at rest check", "SUP-028: Model signature verification"],
  "Inference Endpoints": ["INF-006: Public access detection", "NET-072: Rate limit enforcement"],
  "AI Agents": ["RUN-043: SSRF vulnerability scan", "IAM-060: Privilege escalation check"],
  "Vector Storage": ["NET-061: Network exposure check", "NET-064: Tenant data leak detection"],
  "Knowledge Bases": ["SUP-077: PII in RAG pipeline", "SUP-079: RAG data integrity"],
  "Training Data": ["DAT-011: PII exposure scan", "SUP-076: Data poisoning detection"],
  "Development": ["DIS-002: Rogue notebook detection", "IAM-016: Overprivileged execution role"],
  "Guardrails": ["GRD-021: Disabled filter detection", "GRD-025: Grounding check"],
  "Orchestration": ["IAM-051: Excessive write permissions", "DIS-004: Untagged resources"],
  "Feature Store": ["DAT-015: Shadow pipeline detection", "INF-009: Insecure access patterns"],
  "Secrets/Keys": ["IAM-020: Leaked token detection", "IAM-017: Key age compliance"],
  "Identity/Roles": ["IAM-054: Permission boundary check", "IAM-046: Long-lived key detection"],
  "Monitoring/Logs": ["DAT-012: Unmasked log data", "MON-031: Usage spike detection"],
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
      if (start >= end) { setCount(end); clearInterval(timer); } else { setCount(Math.floor(start)); }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, value]);
  return <span ref={ref} className="font-mono">{count}{suffix}</span>;
}

type UnifiedAsset = {
  id: string;
  name: string;
  type: string;
  category: string;
  source: string;
  serviceType: string;
  risk: string;
  exposure: string;
  tags: string[];
  metadata: Record<string, string>;
  origin: "resource" | "model";
  connectorId: string | null;
  projectId: string | null;
  orgId: string | null;
  externalId: string | null;
  status?: string;
  riskScore?: number;
  lastScan?: string | null;
  excludedFromScanning?: boolean;
};

function getCategoryIcon(category: string, size = "h-4 w-4") {
  switch (category) {
    case "Foundation Models": return <Brain className={size} />;
    case "Custom Models": return <Cpu className={size} />;
    case "Inference Endpoints": return <Server className={size} />;
    case "AI Agents": return <Bot className={size} />;
    case "Vector Storage": return <Database className={size} />;
    case "Knowledge Bases": return <BookOpen className={size} />;
    case "Training Data": return <Database className={size} />;
    case "Development": return <Box className={size} />;
    case "Guardrails": return <Shield className={size} />;
    case "Orchestration": return <Workflow className={size} />;
    case "Feature Store": return <Layers className={size} />;
    case "Secrets/Keys": return <Key className={size} />;
    case "Identity/Roles": return <Settings className={size} />;
    case "Monitoring/Logs": return <Eye className={size} />;
    case "Compute": return <Server className={size} />;
    case "Database": return <Database className={size} />;
    case "Storage": return <FileBox className={size} />;
    case "API Management": return <Globe className={size} />;
    case "CDN": return <Globe className={size} />;
    case "Messaging": return <GitBranch className={size} />;
    case "Streaming": return <Workflow className={size} />;
    case "Event Management": return <Workflow className={size} />;
    case "Cache": return <Database className={size} />;
    default: return <Layers className={size} />;
  }
}

function riskFromScore(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value || value === "Unknown" || value === "") return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">{label}</span>
      <div className="flex items-center gap-2 group">
        <span className="text-sm font-mono text-foreground break-all leading-relaxed">{value}</span>
        <button
          data-testid={`button-copy-${label}`}
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/50 shrink-0"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

function MetadataLabel({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "" || value === "Unknown") return null;

  if (typeof value === "object") {
    const formatted = JSON.stringify(value, null, 2);
    return (
      <div className="py-2 border-b border-border/30 last:border-0">
        <span className="text-sm text-muted-foreground block mb-1.5">{label}</span>
        <pre className="text-[11px] font-mono text-foreground/80 bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed border border-border/30">{formatted}</pre>
      </div>
    );
  }

  const strValue = String(value);

  let isJson = false;
  let formatted = strValue;
  try {
    const parsed = JSON.parse(strValue);
    if (typeof parsed === "object" && parsed !== null) {
      isJson = true;
      formatted = JSON.stringify(parsed, null, 2);
    }
  } catch {}

  if (isJson) {
    return (
      <div className="py-2 border-b border-border/30 last:border-0">
        <span className="text-sm text-muted-foreground block mb-1.5">{label}</span>
        <pre className="text-[11px] font-mono text-foreground/80 bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed border border-border/30">{formatted}</pre>
      </div>
    );
  }

  const isLongValue = strValue.length > 60 || strValue.includes("arn:");
  if (isLongValue) {
    return (
      <div className="py-2 border-b border-border/30 last:border-0">
        <span className="text-sm text-muted-foreground block mb-0.5">{label}</span>
        <span className="text-[12px] font-medium text-foreground font-mono break-all leading-relaxed">{strValue}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground font-mono">{strValue}</span>
    </div>
  );
}

function formatMetadataKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/Arn$/, 'ARN')
    .replace(/Id$/, 'ID')
    .replace(/Kms/, 'KMS')
    .replace(/Vpc/, 'VPC')
    .replace(/Iam/, 'IAM')
    .trim();
}

function HexScanSection({ resourceId, assetName, modelFileCount, canRunScans }: { resourceId: string; assetName: string; modelFileCount: number; canRunScans: boolean }) {
  const [scanResult, setScanResult] = useState<any>(null);

  const hexScanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resources/${resourceId}/hex-scan`);
      return res.json();
    },
    onSuccess: (data) => {
      setScanResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/policy-findings"] });
      toast({ title: "Hex scan complete", description: "Model security scan finished.", variant: "success" });
    },
    onError: () => {
      toast({ title: "Hex scan failed", variant: "destructive" });
    },
  });

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
        <Hexagon className="h-3.5 w-3.5 text-indigo-500" /> Hex Model Security Scan
      </h3>
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Scan with <a href="https://hex.layerd.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Hex Scanner</a></p>
            <p className="text-xs text-muted-foreground mt-0.5">{modelFileCount} model file{modelFileCount !== 1 ? "s" : ""} detected in this bucket</p>
          </div>
          {canRunScans && (
          <Button
            data-testid="button-hex-scan"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            onClick={() => hexScanMutation.mutate()}
            disabled={hexScanMutation.isPending}
          >
            {hexScanMutation.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning...</>
            ) : (
              <><Hexagon className="h-3.5 w-3.5" /> Run Scan</>
            )}
          </Button>
          )}
        </div>

        {hexScanMutation.isError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
            {(hexScanMutation.error as Error)?.message || "Scan failed. Docker may not be available in this environment."}
          </div>
        )}

        {scanResult && (
          <div className="space-y-2 pt-1">
            {scanResult.error && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                <span className="font-semibold">Note:</span> {scanResult.error}
              </div>
            )}
            {scanResult.summary && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/30 bg-background/50 p-2 text-center">
                  <p className="text-lg font-bold" style={{ color: scanResult.summary.security_score >= 80 ? '#10b981' : scanResult.summary.security_score >= 60 ? '#eab308' : '#ef4444' }}>
                    {scanResult.summary.security_grade}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Security Grade</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-background/50 p-2 text-center">
                  <p className="text-lg font-bold font-mono">{scanResult.summary.total_issues}</p>
                  <p className="text-[10px] text-muted-foreground">Total Issues</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-background/50 p-2 text-center">
                  <p className="text-lg font-bold text-red-500">{scanResult.summary.critical}</p>
                  <p className="text-[10px] text-muted-foreground">Critical</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-background/50 p-2 text-center">
                  <p className="text-lg font-bold text-blue-500">{scanResult.summary.high}</p>
                  <p className="text-[10px] text-muted-foreground">High</p>
                </div>
              </div>
            )}
            {scanResult.findingsCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {scanResult.findingsCount} finding{scanResult.findingsCount !== 1 ? "s" : ""} added to the Findings page with HEX- rule IDs.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

type BomData = {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  source: string;
  modelFiles: { name: string; key: string; size: number; sizeMB: number; format: string; framework: string }[];
  modelFileCount: number;
  totalSizeMB: number;
  fileComposition: Record<string, number>;
  frameworks: string[];
  vulnerabilities: { id: string; ruleId: string; title: string; severity: string; status: string; cvss: { score: number; severity: string } | null; cwe: string[]; confidence: number | null; remediation: string; impact: string; detectedAt: string | null }[];
  vulnerabilitySummary: { total: number; critical: number; high: number; medium: number; low: number; open: number; resolved: number };
  dependencies: { name: string; severity: string; details: string; remediation: string }[];
  licenses: { finding: string; severity: string; details: string }[];
  securityGrade: string | null;
  securityScore: number | null;
  bucketName: string | null;
  region: string | null;
  lastScanned: string | null;
};

const FILE_FORMAT_COLORS: Record<string, string> = {
  ".safetensors": "#10b981",
  ".bin": "#007aff",
  ".pt": "#8b5cf6",
  ".pth": "#a855f7",
  ".onnx": "#f59e0b",
  ".h5": "#06b6d4",
  ".pb": "#ec4899",
  ".gguf": "#14b8a6",
  ".ggml": "#22c55e",
  ".json": "#64748b",
  ".other": "#94a3b8",
};

function AiBomTab({ resourceId }: { resourceId: string }) {
  const { data: bom, isLoading, isError } = useQuery<BomData>({
    queryKey: ["/api/resources", resourceId, "bom"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/resources/${resourceId}/bom`);
      return res.json();
    },
    enabled: !!resourceId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading AI Bill of Materials...</span>
      </div>
    );
  }

  if (isError || !bom) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Failed to load AI-BOM data</p>
      </div>
    );
  }

  const compositionData = Object.entries(bom.fileComposition).map(([format, count]) => ({
    name: format,
    value: count,
    color: FILE_FORMAT_COLORS[format] || "#94a3b8",
  }));

  const sevBreakdownData = [
    { name: "Critical", value: bom.vulnerabilitySummary.critical, color: "#ef4444" },
    { name: "High", value: bom.vulnerabilitySummary.high, color: "#f97316" },
    { name: "Medium", value: bom.vulnerabilitySummary.medium, color: "#eab308" },
    { name: "Low", value: bom.vulnerabilitySummary.low, color: "#007aff" },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
          <p data-testid="text-bom-security-grade" className="text-2xl font-bold" style={{
            color: bom.securityGrade === 'A' || bom.securityGrade === 'B' ? '#10b981' :
              bom.securityGrade === 'C' ? '#eab308' : bom.securityGrade ? '#ef4444' : '#64748b'
          }}>
            {bom.securityGrade || "N/A"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Security Grade</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
          <p data-testid="text-bom-file-count" className="text-2xl font-bold font-mono text-foreground">{bom.modelFileCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Model Files</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
          <p data-testid="text-bom-total-size" className="text-2xl font-bold font-mono text-foreground">{bom.totalSizeMB.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total Size (MB)</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
          <p data-testid="text-bom-vuln-count" className="text-2xl font-bold font-mono" style={{
            color: bom.vulnerabilitySummary.total > 0 ? '#ef4444' : '#10b981'
          }}>{bom.vulnerabilitySummary.total}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Vulnerabilities</p>
        </div>
      </div>

      {bom.frameworks.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5" /> Frameworks
          </h3>
          <div className="flex flex-wrap gap-2">
            {bom.frameworks.map(fw => (
              <Badge key={fw} data-testid={`badge-bom-framework-${fw}`} variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-xs px-3 py-1">
                {fw}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {bom.modelFiles.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
            <FileBox className="h-3.5 w-3.5" /> Model Files
          </h3>
          <div className="rounded-xl border border-border/50 bg-muted/10 divide-y divide-border/30">
            {bom.modelFiles.map((file, idx) => (
              <div key={idx} data-testid={`row-bom-file-${idx}`} className="flex items-center gap-3 p-3">
                <div className="p-1.5 rounded-lg bg-indigo-500/10">
                  <FileBox className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-mono truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{file.format}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{file.sizeMB.toFixed(2)} MB</span>
                    {file.framework !== "Unknown" && (
                      <>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-indigo-500">{file.framework}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {compositionData.length > 1 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
            <Package className="h-3.5 w-3.5" /> File Composition
          </h3>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
            <div className="h-[180px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={compositionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                    {compositionData.map((entry, index) => (
                      <PieCell key={`comp-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 min-w-[100px]">
                {compositionData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-mono font-semibold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {bom.vulnerabilities.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" /> Vulnerabilities ({bom.vulnerabilitySummary.total})
          </h3>

          {sevBreakdownData.length > 0 && (
            <div className="flex gap-2 mb-3">
              {sevBreakdownData.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-background/50 px-2.5 py-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] text-muted-foreground">{s.name}</span>
                  <span className="text-[11px] font-mono font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border/50 bg-muted/10 divide-y divide-border/30">
            {bom.vulnerabilities.map((vuln) => (
              <div key={vuln.id} data-testid={`row-bom-vuln-${vuln.id}`} className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                        {vuln.ruleId}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${
                        vuln.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        vuln.severity === 'High' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        vuln.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {vuln.severity}
                      </Badge>
                      {vuln.status !== "open" && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          {vuln.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-1">{vuln.title}</p>
                  </div>
                  {vuln.cvss && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold" style={{
                        color: vuln.cvss.score >= 9 ? '#ef4444' : vuln.cvss.score >= 7 ? '#f97316' : vuln.cvss.score >= 4 ? '#eab308' : '#007aff'
                      }}>{vuln.cvss.score}</p>
                      <p className="text-[10px] text-muted-foreground">CVSS</p>
                    </div>
                  )}
                </div>
                {vuln.cwe.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {vuln.cwe.map(cwe => (
                      <Badge key={cwe} variant="secondary" className="text-[10px] bg-muted/30 text-muted-foreground border-border py-0">{cwe}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {bom.dependencies.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5" /> Dependencies ({bom.dependencies.length})
          </h3>
          <div className="rounded-xl border border-border/50 bg-muted/10 divide-y divide-border/30">
            {bom.dependencies.map((dep, idx) => (
              <div key={idx} data-testid={`row-bom-dep-${idx}`} className="p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${
                    dep.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    dep.severity === 'High' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    dep.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                    {dep.severity}
                  </Badge>
                  <span className="text-sm text-foreground">{dep.name}</span>
                </div>
                {dep.details && <p className="text-xs text-muted-foreground mt-1">{dep.details}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {bom.licenses.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" /> License Information
          </h3>
          <div className="rounded-xl border border-border/50 bg-muted/10 divide-y divide-border/30">
            {bom.licenses.map((lic, idx) => (
              <div key={idx} data-testid={`row-bom-license-${idx}`} className="p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${
                    lic.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    lic.severity === 'High' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}>
                    {lic.severity}
                  </Badge>
                  <span className="text-sm text-foreground">{lic.finding}</span>
                </div>
                {lic.details && <p className="text-xs text-muted-foreground mt-1">{lic.details}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {bom.lastScanned && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2">
          <Clock className="h-3 w-3" /> Last scanned: {new Date(bom.lastScanned).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function AssetDetailDrawer({ asset, connector, relatedAssets, onClose, canRunScans, onExclude, canManage }: {
  asset: UnifiedAsset | null;
  connector: CloudConnector | undefined;
  relatedAssets: UnifiedAsset[];
  onClose: () => void;
  canRunScans: boolean;
  onExclude: (id: string, excluded: boolean) => void;
  canManage: boolean;
}) {
  if (!asset) return null;

  const metadataEntries = Object.entries(asset.metadata || {}).filter(([_, v]) => v && v !== "" && v !== "Unknown");
  const rules = DETECTION_RULES[asset.category] || [];
  const categoryDesc = CATEGORY_DESCRIPTIONS[asset.category] || "";
  const catColor = CATEGORY_COLORS[asset.category] || "#64748b";

  const hasModelFiles = asset.origin === "resource" && !!asset.metadata &&
    parseInt((asset.metadata as Record<string, string>).modelFileCount || "0") > 0;
  const hasHexResults = asset.origin === "resource" && !!asset.metadata &&
    !!((asset.metadata as Record<string, string>).hexSecurityGrade || (asset.metadata as Record<string, string>).hexSecurityScore);
  const showBomTab = !!(hasModelFiles || hasHexResults);

  return (
    <Sheet open={!!asset} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] overflow-y-auto p-0 border-l border-border/50 bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${catColor}15`, color: catColor }}>
                {getCategoryIcon(asset.category, "h-6 w-6")}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg font-bold leading-tight break-words pr-8">
                  {asset.name}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs" style={{ borderColor: `${catColor}40`, color: catColor, backgroundColor: `${catColor}10` }}>
                    {asset.category}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${
                    asset.risk === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    asset.risk === 'High' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    asset.risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                    {asset.risk} Risk
                  </Badge>
                  <Badge variant="secondary" className={`text-xs ${
                    asset.exposure === 'Public' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-muted/30 text-muted-foreground border-border'
                  }`}>
                    {asset.exposure}
                  </Badge>
                  {asset.status && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {asset.status}
                    </Badge>
                  )}
                  {asset.excludedFromScanning && (
                    <Badge variant="secondary" className="text-xs bg-gray-500/10 text-gray-400 border-gray-500/20">
                      Excluded
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {canManage && asset.origin === "resource" && (
              <div className="mt-3 pt-3 border-t border-border/30">
                {asset.excludedFromScanning ? (
                  <Button
                    data-testid="button-include-asset"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => onExclude(asset.id, false)}
                  >
                    <Shield className="h-4 w-4" /> Include in Scanning
                  </Button>
                ) : (
                  <Button
                    data-testid="button-not-ai-asset"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                    onClick={() => onExclude(asset.id, true)}
                  >
                    <X className="h-4 w-4" /> Not an AI Asset
                  </Button>
                )}
              </div>
            )}
          </SheetHeader>
        </div>

        <DrawerTabContent asset={asset} showBomTab={showBomTab} categoryDesc={categoryDesc} metadataEntries={metadataEntries} connector={connector} canRunScans={canRunScans} rules={rules} relatedAssets={relatedAssets} />
      </SheetContent>
    </Sheet>
  );
}

function DrawerTabContent({ asset, showBomTab, categoryDesc, metadataEntries, connector, canRunScans, rules, relatedAssets }: {
  asset: UnifiedAsset;
  showBomTab: boolean;
  categoryDesc: string;
  metadataEntries: [string, any][];
  connector: CloudConnector | undefined;
  canRunScans: boolean;
  rules: string[];
  relatedAssets: UnifiedAsset[];
}) {
  const [activeTab, setActiveTab] = useState<"details" | "bom">("details");

  return (
    <>
      {showBomTab && (
        <div className="bg-background/95 backdrop-blur-md border-b border-border/50 px-6 py-2">
          <div className="w-full grid grid-cols-2 h-9 bg-muted/50 rounded-lg p-0.5">
            <button
              data-testid="tab-asset-details"
              onClick={() => setActiveTab("details")}
              className={`rounded-md text-xs font-medium transition-all ${activeTab === "details" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Details
            </button>
            <button
              data-testid="tab-asset-bom"
              onClick={() => setActiveTab("bom")}
              className={`rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === "bom" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <FileBox className="h-3.5 w-3.5" /> AI-BOM
            </button>
          </div>
        </div>
      )}

      {activeTab === "bom" && showBomTab ? (
        <AiBomTab resourceId={asset.id} />
      ) : (
        <div className="p-6 space-y-6">

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Overview
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{categoryDesc}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Asset Details
            </h3>
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
              <CopyableField label="Asset ID" value={asset.id} />
              {asset.externalId && <CopyableField label="External ID / ARN" value={asset.externalId} />}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">Type</span>
                  <p className="text-sm font-medium mt-0.5">{asset.type}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">Service</span>
                  <p className="text-sm font-medium mt-0.5">{asset.serviceType}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">Source</span>
                  <p className="text-sm font-medium mt-0.5">{asset.source}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">Origin</span>
                  <p className="text-sm font-medium mt-0.5 capitalize">{asset.origin}</p>
                </div>
              </div>
              {asset.riskScore !== undefined && (
                <div className="pt-2">
                  <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium">Risk Score</span>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${asset.riskScore}%`,
                          backgroundColor: asset.riskScore >= 80 ? '#ef4444' : asset.riskScore >= 60 ? '#f97316' : asset.riskScore >= 40 ? '#eab308' : '#007aff'
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono font-bold">{asset.riskScore}/100</span>
                  </div>
                </div>
              )}
              {asset.lastScan && (
                <div className="pt-1">
                  <span className="text-[11px] uppercase tracking-wider text-primary/60 font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Last Scanned</span>
                  <p className="text-sm font-mono mt-0.5">{new Date(asset.lastScan).toLocaleString()}</p>
                </div>
              )}
            </div>
          </section>

          {metadataEntries.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Settings className="h-3.5 w-3.5" /> Configuration & Metadata
              </h3>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                {metadataEntries.map(([key, value]) => (
                  <MetadataLabel key={key} label={formatMetadataKey(key)} value={value} />
                ))}
              </div>
            </section>
          )}

          {connector && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5" /> Connected Via
              </h3>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Cloud className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{connector.name}</p>
                      <p className="text-xs text-muted-foreground">{connector.provider} · {connector.accountId}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`text-xs ${
                    connector.status === 'Connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {connector.status}
                  </Badge>
                </div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Region</span>
                    <p className="font-medium">{connector.region || "All Regions"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Sync Status</span>
                    <p className="font-medium capitalize">{connector.syncStatus}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Assets Found</span>
                    <p className="font-mono font-medium">{connector.assetsFound}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Last Sync</span>
                    <p className="font-medium text-xs">{connector.lastSync ? new Date(connector.lastSync).toLocaleString() : "Never"}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {asset.origin === "resource" && asset.metadata &&
            parseInt((asset.metadata as Record<string, string>).modelFileCount || "0") > 0 && (
            <HexScanSection resourceId={asset.id} assetName={asset.name} modelFileCount={parseInt((asset.metadata as Record<string, string>).modelFileCount || "0")} canRunScans={canRunScans} />
          )}

          {(asset.tags || []).length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {asset.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {rules.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Related Detection Rules
              </h3>
              <div className="rounded-xl border border-border/50 bg-muted/10 divide-y divide-border/30">
                {rules.map((rule) => {
                  const [code, ...descParts] = rule.split(": ");
                  return (
                    <div key={rule} className="flex items-start gap-3 p-3">
                      <Badge variant="outline" className="shrink-0 text-[10px] font-mono mt-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                        {code}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{descParts.join(": ")}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {relatedAssets.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-primary/70 font-semibold mb-3 flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5" /> Related Assets ({relatedAssets.length})
              </h3>
              <div className="rounded-xl border border-border/50 bg-muted/10 divide-y divide-border/30">
                {relatedAssets.slice(0, 10).map((rel) => {
                  const relColor = CATEGORY_COLORS[rel.category] || "#64748b";
                  return (
                    <div key={`${rel.origin}-${rel.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors">
                      <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${relColor}15`, color: relColor }}>
                        {getCategoryIcon(rel.category, "h-3.5 w-3.5")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{rel.name}</p>
                        <p className="text-[11px] text-muted-foreground">{rel.category} · {rel.type}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${
                        rel.risk === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        rel.risk === 'High' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        rel.risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {rel.risk}
                      </Badge>
                    </div>
                  );
                })}
                {relatedAssets.length > 10 && (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    +{relatedAssets.length - 10} more related assets
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function AssetTableRow({ item, onSelect }: { item: UnifiedAsset; onSelect: (a: UnifiedAsset) => void }) {
  return (
    <TableRow
      data-testid={`row-asset-${item.id}`}
      className={`border-border/50 hover:bg-primary/5 transition-all duration-200 group cursor-pointer ${item.excludedFromScanning ? 'opacity-50' : ''}`}
      onClick={() => onSelect(item)}
    >
      <TableCell className="font-medium text-foreground max-w-[300px]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/20" style={{ color: CATEGORY_COLORS[item.category] || "#64748b" }}>
            {getCategoryIcon(item.category)}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span data-testid={`text-asset-name-${item.id}`} className="truncate font-medium group-hover:text-primary transition-colors">{item.name}</span>
              {item.excludedFromScanning && (
                <Badge variant="secondary" className="text-[10px] py-0 bg-gray-500/10 text-gray-400 border-gray-500/20 shrink-0">Excluded</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">{item.type} · {item.source}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors ml-auto shrink-0" />
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs whitespace-nowrap" style={{ borderColor: `${CATEGORY_COLORS[item.category]}40`, color: CATEGORY_COLORS[item.category], backgroundColor: `${CATEGORY_COLORS[item.category]}10` }}>
          {item.category}
        </Badge>
      </TableCell>
      <TableCell><span className="text-sm text-muted-foreground">{item.serviceType}</span></TableCell>
      <TableCell className="max-w-[200px]">
        <div className="flex flex-wrap gap-1 items-center">
          {(item.tags || []).slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0">{tag}</Badge>
          ))}
          {(item.tags || []).length > 3 && (
            <Badge variant="secondary" className="bg-muted/20 text-muted-foreground text-[10px] py-0">+{item.tags.length - 3}</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge data-testid={`badge-asset-risk-${item.id}`} variant="outline" className={`
          ${item.risk === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
            item.risk === 'High' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
            item.risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
            'bg-blue-500/10 text-blue-500 border-blue-500/20'}
        `}>{item.risk}</Badge>
      </TableCell>
      <TableCell>
        <Badge data-testid={`badge-asset-exposure-${item.id}`} variant="secondary" className={`
          ${item.exposure === 'Public' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
            item.exposure === 'Internal' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
            'bg-muted/30 text-muted-foreground border-border'}
        `}>{item.exposure}</Badge>
      </TableCell>
    </TableRow>
  );
}

type GroupBy = "none" | "category" | "region" | "vpc" | "service" | "provider";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [selectedAsset, setSelectedAsset] = useState<UnifiedAsset | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const canRunScans = usePermission("run_scans");
  const canManage = usePermission("manage_connectors");
  const searchString = useSearch();
  const [showExcluded, setShowExcluded] = useState(false);
  const { selectedProjectId } = useProject();
  const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";

  const { data: resources = [], isLoading: loadingResources } = useQuery<Resource[]>({ queryKey: ["/api/resources", selectedProjectId], queryFn: () => fetch(`/api/resources${projectParam}`).then(r => r.json()) });
  const { data: models = [], isLoading: loadingModels } = useQuery<AiModel[]>({ queryKey: ["/api/models", selectedProjectId], queryFn: () => fetch(`/api/models${projectParam}`).then(r => r.json()) });
  const { data: connectors = [] } = useQuery<CloudConnector[]>({ queryKey: ["/api/connectors", selectedProjectId], queryFn: () => fetch(`/api/connectors${projectParam}`).then(r => r.json()) });
  const isLoading = loadingResources || loadingModels;

  const excludeMutation = useMutation({
    mutationFn: async ({ id, excluded }: { id: string; excluded: boolean }) => {
      await apiRequest("PATCH", `/api/resources/${id}/exclude`, { excluded });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (selectedAsset) {
        setSelectedAsset({ ...selectedAsset, excludedFromScanning: variables.excluded });
      }
      toast({
        title: variables.excluded ? "Asset excluded from scanning" : "Asset included in scanning",
        description: variables.excluded ? "This asset will no longer be monitored or scanned for issues." : "This asset will now be monitored and scanned for issues.",
        variant: "success",
      });
    },
    onError: () => {
      toast({ title: "Failed to update asset", variant: "destructive" });
    },
  });

  const tagMutation = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      await apiRequest("PATCH", `/api/resources/${id}/tags`, { tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Tags updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update tags", variant: "destructive" });
    },
  });

  const addTag = (id: string, tag: string) => {
    if (!tag) return;
    const item = resources.find(d => d.id === id);
    if (!item) return;
    tagMutation.mutate({ id, tags: [...(item.tags || []), tag] });
  };

  const removeTag = (id: string, tagToRemove: string) => {
    const item = resources.find(d => d.id === id);
    if (!item) return;
    tagMutation.mutate({ id, tags: (item.tags || []).filter(t => t !== tagToRemove) });
  };

  const unifiedAssets: UnifiedAsset[] = useMemo(() => {
    const items: UnifiedAsset[] = [];
    for (const r of resources) {
      if (NETWORK_ASSET_TYPES.has(r.type)) continue;
      if (r.category === "Networking" || r.category === "Network Infrastructure") continue;
      items.push({
        id: r.id, name: r.name, type: r.type,
        category: r.category || "General", source: r.source,
        serviceType: r.serviceType || "Unknown", risk: r.risk,
        exposure: r.exposure, tags: r.tags || [],
        metadata: (r.metadata as Record<string, string>) || {},
        origin: "resource", connectorId: r.connectorId,
        projectId: r.projectId, orgId: r.orgId,
        externalId: r.externalId,
        excludedFromScanning: r.excludedFromScanning,
      });
    }
    for (const m of models) {
      items.push({
        id: m.id, name: m.name, type: m.type,
        category: m.category || "Custom Models",
        source: m.serviceType === "Hugging Face" ? "Hugging Face" : m.serviceType === "Azure" ? "Azure" : m.serviceType === "GCP" ? "GCP" : `AWS ${m.serviceType || "Bedrock"}`,
        serviceType: m.serviceType || "Bedrock",
        risk: riskFromScore(m.riskScore), exposure: "Private",
        tags: m.tags || [],
        metadata: (m.metadata as Record<string, string>) || {},
        origin: "model", connectorId: m.connectorId,
        projectId: m.projectId, orgId: m.orgId,
        externalId: m.externalId, status: m.status,
        riskScore: m.riskScore, lastScan: m.lastScan,
      });
    }
    return items;
  }, [resources, models]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const highlightId = params.get("highlight");
    if (highlightId && unifiedAssets.length > 0 && !selectedAsset) {
      const match = unifiedAssets.find(a => a.id === highlightId);
      if (match) {
        setSelectedAsset(match);
        window.history.replaceState({}, "", "/inventory");
      }
    }
  }, [searchString, unifiedAssets]);

  const excludedCount = useMemo(() => unifiedAssets.filter(a => a.excludedFromScanning).length, [unifiedAssets]);

  const getAssetProvider = (a: UnifiedAsset): string => {
    const src = (a.source || "").toLowerCase();
    const svc = (a.serviceType || "").toLowerCase();
    if (src.includes("hugging face") || svc.includes("hugging face")) return "Hugging Face";
    if (src.includes("azure") || svc.includes("azure") || svc.includes("cognitive")) return "Azure";
    if (src.includes("gcp") || svc.includes("gcp") || svc.includes("vertex")) return "GCP";
    return "AWS";
  };

  const availableProviders = useMemo(() => {
    const providers = new Set(unifiedAssets.map(a => getAssetProvider(a)));
    return ["AWS", "Azure", "GCP", "Hugging Face"].filter(p => providers.has(p));
  }, [unifiedAssets]);

  const filteredAssets = useMemo(() => {
    return unifiedAssets.filter(a => {
      if (!showExcluded && a.excludedFromScanning) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.type.toLowerCase().includes(q) && !a.category.toLowerCase().includes(q) && !a.serviceType.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (riskFilter !== "all" && a.risk !== riskFilter) return false;
      if (providerFilter !== "all" && getAssetProvider(a) !== providerFilter) return false;
      return true;
    });
  }, [unifiedAssets, search, categoryFilter, riskFilter, providerFilter, showExcluded]);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const groupedAssets = useMemo(() => {
    if (groupBy === "none") return null;
    const groups: Record<string, UnifiedAsset[]> = {};
    for (const a of filteredAssets) {
      let key: string;
      switch (groupBy) {
        case "category":
          key = a.category;
          break;
        case "region":
          key = a.metadata?.region || "Global";
          break;
        case "vpc":
          key = a.metadata?.vpcId || "No VPC";
          break;
        case "service":
          key = a.serviceType || "Unknown";
          break;
        case "provider":
          key = getAssetProvider(a);
          break;
        default:
          key = "Other";
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    const sorted = Object.entries(groups).sort((a, b) => {
      if (a[0] === "No VPC" || a[0] === "Global" || a[0] === "Unknown") return 1;
      if (b[0] === "No VPC" || b[0] === "Global" || b[0] === "Unknown") return -1;
      return b[1].length - a[1].length;
    });
    return sorted;
  }, [filteredAssets, groupBy]);

  const availableCategories = useMemo(() => {
    const cats = new Set(unifiedAssets.map(a => a.category));
    return CATEGORY_ORDER.filter(c => cats.has(c));
  }, [unifiedAssets]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of unifiedAssets) map[a.category] = (map[a.category] || 0) + 1;
    return CATEGORY_ORDER.filter(c => map[c]).map(name => ({ name, count: map[name], color: CATEGORY_COLORS[name] || "#64748b" }));
  }, [unifiedAssets]);

  const riskBreakdown = useMemo(() => {
    const map = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const a of unifiedAssets) if (a.risk in map) map[a.risk as keyof typeof map]++;
    return [
      { name: "Critical", count: map.Critical, color: "#ef4444" },
      { name: "High", count: map.High, color: "#f97316" },
      { name: "Medium", count: map.Medium, color: "#eab308" },
      { name: "Low", count: map.Low, color: "#007aff" },
    ].filter(r => r.count > 0);
  }, [unifiedAssets]);

  const selectedConnector = useMemo(() => {
    if (!selectedAsset?.connectorId) return undefined;
    return connectors.find(c => c.id === selectedAsset.connectorId);
  }, [selectedAsset, connectors]);

  const relatedAssets = useMemo(() => {
    if (!selectedAsset) return [];
    return unifiedAssets.filter(a => {
      if (a.id === selectedAsset.id && a.origin === selectedAsset.origin) return false;
      if (a.connectorId && a.connectorId === selectedAsset.connectorId && a.category === selectedAsset.category) return true;
      const region = selectedAsset.metadata?.region;
      if (region && a.metadata?.region === region && a.category !== selectedAsset.category) return true;
      return false;
    }).slice(0, 20);
  }, [selectedAsset, unifiedAssets]);

  const totalAssets = unifiedAssets.length;
  const highRiskCount = unifiedAssets.filter(r => r.risk === "Critical" || r.risk === "High").length;
  const publicExposed = unifiedAssets.filter(r => r.exposure === "Public").length;
  const categoryCount = new Set(unifiedAssets.map(r => r.category)).size;

  const stats = [
    { label: "Total Assets", value: totalAssets, icon: PackageOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "High/Critical Risk", value: highRiskCount, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Public Exposed", value: publicExposed, icon: Globe, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Categories", value: categoryCount, icon: Cloud, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold tracking-tight text-foreground font-mono">Asset Inventory</h1>
            <p data-testid="text-page-subtitle" className="text-muted-foreground">
              Comprehensive view of all AI-related assets across connected cloud environments.
            </p>
          </div>
          <Button data-testid="button-export-csv" variant="outline" className="border-border bg-muted/10 hover:bg-muted/20" onClick={() => {
            if (filteredAssets.length === 0) return;
            const headers = ["Name", "Type", "Category", "Service", "Source", "Risk", "Exposure", "Tags"];
            const rows = filteredAssets.map(a => [
              a.name, a.type, a.category, a.serviceType, a.source, a.risk, a.exposure, (a.tags || []).join("; ")
            ]);
            const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `asset-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}>
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeIn}>
              <Card data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`} className={cardClass}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">
                        <span data-testid={`text-stat-value-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <AnimatedCount value={stat.value} />
                        </span>
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {categoryBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div custom={4} initial="hidden" animate="visible" variants={fadeIn}>
              <Card data-testid="card-category-chart" className={`${cardClass} h-full`}>
                <CardHeader>
                  <CardTitle className="text-lg">Assets by Category</CardTitle>
                  <CardDescription>Distribution across AI asset categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryBreakdown} layout="vertical" barSize={18} margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {categoryBreakdown.map((entry, index) => (
                            <PieCell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div custom={5} initial="hidden" animate="visible" variants={fadeIn}>
              <Card data-testid="card-risk-chart" className={`${cardClass} h-full`}>
                <CardHeader>
                  <CardTitle className="text-lg">Risk Distribution</CardTitle>
                  <CardDescription>Assets grouped by risk level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={riskBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} strokeWidth={0}>
                          {riskBreakdown.map((entry, index) => (
                            <PieCell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      {riskBreakdown.map(r => (
                        <div key={r.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="text-muted-foreground">{r.name}</span>
                          <span className="font-mono font-semibold ml-auto">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        <motion.div custom={6} initial="hidden" animate="visible" variants={fadeIn}>
          <Card data-testid="card-assets-table" className={cardClass}>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle className="text-xl">All Discovered Assets</CardTitle>
                  <CardDescription>Click any row to view full details, metadata, connection info, and related assets</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input data-testid="input-search-assets" placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger data-testid="select-category-filter" className="w-[200px] h-9">
                      <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {availableCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
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
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger data-testid="select-risk-filter" className="w-[150px] h-9">
                      <AlertTriangle className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={groupBy} onValueChange={(v) => { setGroupBy(v as GroupBy); setCollapsedGroups(new Set()); }}>
                    <SelectTrigger data-testid="select-group-by" className="w-[170px] h-9">
                      <Layers className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Group by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="category">Group by Category</SelectItem>
                      <SelectItem value="provider">Group by Provider</SelectItem>
                      <SelectItem value="region">Group by Region</SelectItem>
                      <SelectItem value="vpc">Group by VPC</SelectItem>
                      <SelectItem value="service">Group by Service</SelectItem>
                    </SelectContent>
                  </Select>
                  {excludedCount > 0 && (
                    <Button
                      data-testid="button-toggle-excluded"
                      variant={showExcluded ? "secondary" : "ghost"}
                      size="sm"
                      className={`h-9 gap-1.5 ${showExcluded ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' : 'text-muted-foreground'}`}
                      onClick={() => setShowExcluded(!showExcluded)}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      {excludedCount} excluded
                    </Button>
                  )}
                  {(categoryFilter !== "all" || riskFilter !== "all" || providerFilter !== "all" || search || groupBy !== "none") && (
                    <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setCategoryFilter("all"); setRiskFilter("all"); setProviderFilter("all"); setSearch(""); setGroupBy("none"); }}>
                      Clear filters
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">{filteredAssets.length} of {totalAssets} assets</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Loading...</p></div>
              ) : filteredAssets.length === 0 && totalAssets === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <PackageOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No assets discovered yet</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Connect a cloud account and run a sync to discover AI assets</p>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No assets match your filters</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-muted-foreground font-semibold">Asset</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Category</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Service</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Tags</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Risk</TableHead>
                        <TableHead className="text-muted-foreground font-semibold">Exposure</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedAssets ? (
                        groupedAssets.map(([groupName, items]) => {
                          const isCollapsed = collapsedGroups.has(groupName);
                          const highRisk = items.filter(i => i.risk === "Critical" || i.risk === "High").length;
                          const publicCount = items.filter(i => i.exposure === "Public").length;
                          return (
                            <React.Fragment key={groupName}>
                              <TableRow
                                data-testid={`row-group-${groupName}`}
                                className="border-border bg-muted/20 hover:bg-muted/30 cursor-pointer"
                                onClick={() => toggleGroup(groupName)}
                              >
                                <TableCell colSpan={6}>
                                  <div className="flex items-center gap-3">
                                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
                                    <span className="font-semibold text-foreground">{groupName}</span>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">{items.length} asset{items.length !== 1 ? 's' : ''}</Badge>
                                    {highRisk > 0 && (
                                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />{highRisk} high risk
                                      </Badge>
                                    )}
                                    {publicCount > 0 && (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                                        <Globe className="h-3 w-3 mr-1" />{publicCount} public
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                              {!isCollapsed && items.map((item) => (
                                <AssetTableRow key={`${item.origin}-${item.id}`} item={item} onSelect={setSelectedAsset} />
                              ))}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        filteredAssets.map((item) => (
                          <AssetTableRow key={`${item.origin}-${item.id}`} item={item} onSelect={setSelectedAsset} />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AssetDetailDrawer
        asset={selectedAsset}
        connector={selectedConnector}
        relatedAssets={relatedAssets}
        onClose={() => setSelectedAsset(null)}
        canRunScans={canRunScans}
        onExclude={(id, excluded) => excludeMutation.mutate({ id, excluded })}
        canManage={canManage}
      />
    </Layout>
  );
}