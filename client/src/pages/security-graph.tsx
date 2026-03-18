import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  Panel,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Users,
  Server,
  Brain,
  Shield,
  Database,
  Activity,
  Search,
  LayoutGrid,
  Table2,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  Key,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Layers,
  Box,
  ShieldAlert,
  Zap,
  Globe,
  FileText,
  FolderTree,
  Network,
  Target,
  X,
  ChevronUp,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpIcon } from "@/components/help-icon";
import { useProject } from "@/hooks/use-project";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RiskFinding {
  id: string;
  ruleId: string;
  finding: string;
  severity: string;
  status: string;
  impact: string | null;
  remediation: string | null;
  evidence: string | null;
  detectedAt: string | null;
  asset: {
    id: string;
    name: string;
    type: string;
    category: string;
    lane: string;
    risk: string;
    riskScore: number;
    serviceType: string;
    exposure: string;
    isModel: boolean;
  } | null;
  peerFindingsCount: number;
  relatedAssets: {
    id: string;
    name: string;
    type: string;
    category: string;
    lane: string;
    relationship: string;
    isModel: boolean;
    findingsCount: number;
  }[];
}

interface RiskGraphData {
  findings: RiskFinding[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    affectedAssets: number;
    totalResources: number;
    totalModels: number;
  };
}

interface GraphNode {
  id: string;
  type: string;
  label: string;
  subtitle?: string;
  data: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

interface InfraGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    totalResources: number;
    totalModels: number;
    totalFindings: number;
    connectorCount: number;
    lanes?: string[];
  };
}

const severityConfig: Record<string, { color: string; bg: string; border: string; ring: string; icon: any; label: string; order: number }> = {
  Critical: { color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/50", ring: "ring-red-500/30", icon: AlertCircle, label: "Critical", order: 0 },
  High: { color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/50", ring: "ring-blue-500/30", icon: AlertTriangle, label: "High", order: 1 },
  Medium: { color: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/50", ring: "ring-yellow-500/30", icon: ShieldAlert, label: "Medium", order: 2 },
  Low: { color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/50", ring: "ring-emerald-500/30", icon: Info, label: "Low", order: 3 },
};

const laneIcons: Record<string, any> = {
  access: Key,
  endpoints: Server,
  models: Brain,
  guardrails: Shield,
  data: Database,
  monitoring: Activity,
};

const laneColors: Record<string, { gradient: string; border: string; text: string; bg: string; glow: string }> = {
  access: { gradient: "from-amber-500/25 to-blue-500/25", border: "border-amber-500/50", text: "text-amber-400", bg: "bg-amber-500/15", glow: "shadow-amber-500/20" },
  endpoints: { gradient: "from-blue-500/25 to-cyan-500/25", border: "border-blue-500/50", text: "text-blue-400", bg: "bg-blue-500/15", glow: "shadow-blue-500/20" },
  models: { gradient: "from-violet-500/25 to-purple-500/25", border: "border-violet-500/50", text: "text-violet-400", bg: "bg-violet-500/15", glow: "shadow-violet-500/20" },
  guardrails: { gradient: "from-emerald-500/25 to-green-500/25", border: "border-emerald-500/50", text: "text-emerald-400", bg: "bg-emerald-500/15", glow: "shadow-emerald-500/20" },
  data: { gradient: "from-rose-500/25 to-pink-500/25", border: "border-rose-500/50", text: "text-rose-400", bg: "bg-rose-500/15", glow: "shadow-rose-500/20" },
  monitoring: { gradient: "from-teal-500/25 to-cyan-500/25", border: "border-teal-500/50", text: "text-teal-400", bg: "bg-teal-500/15", glow: "shadow-teal-500/20" },
};

const laneLabels: Record<string, string> = {
  access: "Access & Identity",
  endpoints: "Endpoints & Services",
  models: "AI Models",
  guardrails: "Security Controls",
  data: "Data & Storage",
  monitoring: "Observability",
};

function getRiskColor(risk: string) {
  switch (risk?.toLowerCase()) {
    case "critical": return { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-400", ring: "ring-red-500/30" };
    case "high": return { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-400", ring: "ring-blue-500/30" };
    case "medium": return { bg: "bg-yellow-500/20", border: "border-yellow-500", text: "text-yellow-400", ring: "ring-yellow-500/30" };
    default: return { bg: "bg-emerald-500/20", border: "border-emerald-500", text: "text-emerald-400", ring: "ring-emerald-500/30" };
  }
}


const assetTypeIcons: Record<string, any> = {
  "S3 Bucket": Database,
  "S3": Database,
  "IAM Role": Key,
  "IAM User": Key,
  "IAM Policy": Key,
  "Lambda Function": Zap,
  "Lambda": Zap,
  "SageMaker Notebook": Brain,
  "SageMaker Endpoint": Brain,
  "SageMaker Model": Brain,
  "SageMaker": Brain,
  "Bedrock Model": Brain,
  "Bedrock": Brain,
  "Bedrock Guardrail": Shield,
  "CloudWatch Log Group": Activity,
  "CloudWatch": Activity,
  "CloudTrail": Eye,
  "OpenSearch": Search,
  "ECS Cluster": Server,
  "ECS": Server,
  "API Gateway": Globe,
  "Secret": Lock,
  "Parameter": FileText,
  "Guardrail": Shield,
  "Account": Globe,
  "Cloud Account": Globe,
};

function getAssetIcon(type: string, lane: string) {
  for (const [key, icon] of Object.entries(assetTypeIcons)) {
    if (type?.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return laneIcons[lane] || Box;
}

function getSeverityCircleColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "critical": return { stroke: "#ef4444", fill: "#ef4444", bg: "bg-red-500/10", ring: "ring-red-500/40" };
    case "high": return { stroke: "#f97316", fill: "#f97316", bg: "bg-blue-500/10", ring: "ring-blue-500/40" };
    case "medium": return { stroke: "#eab308", fill: "#eab308", bg: "bg-yellow-500/10", ring: "ring-yellow-500/40" };
    default: return { stroke: "#22c55e", fill: "#22c55e", bg: "bg-emerald-500/10", ring: "ring-emerald-500/40" };
  }
}

const pathIconMap: Record<string, any> = {
  globe: Globe,
  user: Users,
  unlock: Lock,
  key: Key,
  brain: Brain,
  data: Database,
  alert: AlertTriangle,
  shield: Shield,
};

const roleColors: Record<string, { stroke: string; bg: string; ring: string }> = {
  source: { stroke: "#ef4444", bg: "bg-red-500/10", ring: "ring-red-500/30" },
  path: { stroke: "#f59e0b", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
  context: { stroke: "#6366f1", bg: "bg-indigo-500/10", ring: "ring-indigo-500/30" },
  asset: { stroke: "#22c55e", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  impact: { stroke: "#dc2626", bg: "bg-red-600/15", ring: "ring-red-600/40" },
  related: { stroke: "#6366f1", bg: "bg-indigo-500/10", ring: "ring-indigo-500/30" },
};

function AttackPathNode({ data }: { data: any }) {
  const nd = data.nodeData || {};
  const pathRole = nd.pathRole || (nd.isAffectedAsset ? "asset" : "related");
  const iconType = nd.iconType || "";
  const lane = nd.lane || "data";
  const assetType = nd.assetType || data.subtitle || "";
  const findingsCount = nd.findingsCount || 0;
  const severity = nd.severity || "";

  let NodeIcon;
  if (pathRole === "asset") {
    NodeIcon = getAssetIcon(assetType, lane);
  } else if (pathRole === "related") {
    NodeIcon = getAssetIcon(assetType, lane);
  } else {
    NodeIcon = pathIconMap[iconType] || Globe;
  }

  const color = pathRole === "asset" && severity
    ? getSeverityCircleColor(severity)
    : (roleColors[pathRole] || roleColors.related);

  const truncatedLabel = data.label?.length > 24 ? data.label.slice(0, 22) + "..." : data.label;

  return (
    <div className="flex flex-col items-center w-[140px]" data-testid={`attack-node-${data.label}`}>
      <Handle type="target" position={Position.Top} className="!w-0 !h-0 !border-0 !bg-transparent" />
      <Handle type="target" position={Position.Left} className="!w-0 !h-0 !border-0 !bg-transparent" />
      <div className="relative">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${color.bg}`}
          style={{ borderColor: color.stroke, borderWidth: 2, borderStyle: "solid" }}
        >
          <NodeIcon className="w-5 h-5" style={{ color: color.stroke }} />
        </div>
        {findingsCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border-2 border-background shadow-sm">
            {findingsCount > 9 ? "9+" : findingsCount}
          </div>
        )}
        {pathRole === "impact" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center border-2 border-background shadow-sm">
            <AlertCircle className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>
      <span className="mt-2 text-[11px] font-medium text-foreground text-center leading-tight max-w-[140px]">{truncatedLabel}</span>
      <span className="text-[10px] text-muted-foreground text-center">{data.subtitle}</span>
      <Handle type="source" position={Position.Bottom} className="!w-0 !h-0 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Right} className="!w-0 !h-0 !border-0 !bg-transparent" />
    </div>
  );
}

const riskNodeTypes: NodeTypes = {
  attack_path_node: AttackPathNode,
};

type PathStep = { id: string; label: string; subtitle: string; icon: string; role: "source" | "path" | "asset" | "impact" | "context" };

function extractEvidenceDetails(evidence: string | null): { key: string; detail: string } {
  if (!evidence) return { key: "", detail: "" };
  const gatedMatch = evidence.match(/Gated:\s*"([^"]+)"/i);
  const publicMatch = evidence.match(/is (public)/i);
  const permMatch = evidence.match(/(s3:\*|AdministratorAccess|Allow \*)/i);
  const regionMatch = evidence.match(/region[:\s]+"?([^",\s]+)"?/i);
  if (gatedMatch) return { key: "gated", detail: `Gated: ${gatedMatch[1]}` };
  if (permMatch) return { key: "perm", detail: permMatch[1] };
  if (publicMatch) return { key: "public", detail: "Public visibility" };
  if (regionMatch) return { key: "region", detail: regionMatch[1] };
  return { key: "", detail: evidence.slice(0, 40) };
}

function getAttackPath(finding: RiskFinding): PathStep[] {
  const ruleId = finding.ruleId;
  const cat = ruleId.split("-")[0];
  const fLower = finding.finding.toLowerCase();
  const assetName = finding.asset?.name || "Unknown Asset";
  const assetType = finding.asset?.type || finding.asset?.serviceType || finding.asset?.category || "Asset";
  const serviceType = finding.asset?.serviceType || "";
  const evidence = extractEvidenceDetails(finding.evidence);
  const exposure = finding.asset?.exposure || "";
  const isModel = finding.asset?.isModel;

  const sourceLabel = serviceType || (isModel ? "Model Registry" : "Cloud Platform");

  if (fLower.includes("gated") || fLower.includes("access control")) {
    return [
      { id: "internet", label: "Public Internet", subtitle: "Any User", icon: "globe", role: "source" },
      { id: "platform", label: sourceLabel, subtitle: evidence.detail || "Public Repository", icon: "data", role: "context" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "download", label: "Direct Download", subtitle: "No Approval Gate", icon: "unlock", role: "path" },
      { id: "impact", label: isModel ? "Model Weights Stolen" : "Data Exfiltration", subtitle: "Intellectual Property Loss", icon: "alert", role: "impact" },
    ];
  }

  if (fLower.includes("public") && (fLower.includes("model") || fLower.includes("repository") || fLower.includes("dataset"))) {
    return [
      { id: "internet", label: "Public Internet", subtitle: "Unauthenticated", icon: "globe", role: "source" },
      { id: "platform", label: sourceLabel, subtitle: "Public Listing", icon: "data", role: "context" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: "IP Theft", subtitle: "Model Architecture Exposed", icon: "alert", role: "impact" },
    ];
  }

  if (fLower.includes("public") && (fLower.includes("bucket") || fLower.includes("storage") || fLower.includes("blob"))) {
    return [
      { id: "internet", label: "Public Internet", subtitle: "Any IP Address", icon: "globe", role: "source" },
      { id: "policy", label: "Bucket Policy", subtitle: evidence.detail || "Allow *", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "data", label: "Stored Data", subtitle: "Training / Model Files", icon: "data", role: "context" },
      { id: "impact", label: "Data Breach", subtitle: "Sensitive Data Exfiltrated", icon: "alert", role: "impact" },
    ];
  }

  if (fLower.includes("public") && (fLower.includes("endpoint") || fLower.includes("inference"))) {
    return [
      { id: "internet", label: "Public Internet", subtitle: "Open Network", icon: "globe", role: "source" },
      { id: "api", label: "API Gateway", subtitle: "No Auth / ACL", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: "Unauthorized Inference", subtitle: "Cost Abuse / Data Leak", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "INF" && (fLower.includes("encrypt") || fLower.includes("cmek"))) {
    return [
      { id: "insider", label: "Insider Threat", subtitle: "Compromised Creds", icon: "user", role: "source" },
      { id: "storage", label: "Storage Layer", subtitle: "No CMEK Configured", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: "Plaintext Exposure", subtitle: "Data Readable at Rest", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "INF" && (fLower.includes("private") || fLower.includes("privatelink"))) {
    return [
      { id: "internet", label: "Network Path", subtitle: "Public Internet", icon: "globe", role: "source" },
      { id: "transit", label: "Unencrypted Transit", subtitle: "No PrivateLink", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: "MITM Attack", subtitle: "Traffic Interception", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "INF" && fLower.includes("vector")) {
    return [
      { id: "internet", label: "Public Internet", subtitle: "0.0.0.0/0", icon: "globe", role: "source" },
      { id: "firewall", label: "Open Firewall", subtitle: "No IP Restriction", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: "Vector DB Dump", subtitle: "Embedding Data Theft", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "IAM") {
    const weaknessLabel = fLower.includes("cross") ? "Cross-Account Trust" :
      fLower.includes("admin") ? "Admin Privileges" :
      fLower.includes("token") ? "Long-Lived Credentials" : "Excess Permissions";
    const weaknessSubtitle = fLower.includes("cross") ? "AssumeRole Policy" :
      evidence.detail || "Overly Permissive";
    return [
      { id: "attacker", label: "Threat Actor", subtitle: "Credential Theft", icon: "user", role: "source" },
      { id: "iam", label: weaknessLabel, subtitle: weaknessSubtitle, icon: "key", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "lateral", label: "Lateral Movement", subtitle: "Access Other Services", icon: "data", role: "context" },
      { id: "impact", label: "Account Takeover", subtitle: "Full Privilege Escalation", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "DAT") {
    const dataSource = fLower.includes("pii") ? "Training Pipeline" :
      fLower.includes("prompt") ? "AI Application" :
      fLower.includes("embedding") ? "Embedding Pipeline" : "Data Flow";
    const impactLabel = fLower.includes("pii") ? "Privacy Violation" :
      fLower.includes("prompt") ? "Prompt Leak" :
      fLower.includes("cross-region") ? "Compliance Violation" : "Data Breach";
    return [
      { id: "source", label: dataSource, subtitle: "Data Ingestion", icon: "data", role: "source" },
      { id: "weakness", label: "Missing Controls", subtitle: evidence.detail || "No Protection", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: impactLabel, subtitle: "Regulatory Exposure", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "GRD") {
    return [
      { id: "user", label: "Malicious User", subtitle: "Prompt Injection", icon: "user", role: "source" },
      { id: "input", label: "Unfiltered Input", subtitle: "No Content Filter", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "output", label: "Unfiltered Output", subtitle: "No Response Guard", icon: "unlock", role: "path" },
      { id: "impact", label: "Harmful Output", subtitle: "Jailbreak / Data Leak", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "RUN") {
    const vectorLabel = fLower.includes("sql") ? "SQL Injection" :
      fLower.includes("ssrf") ? "SSRF via Tools" :
      fLower.includes("xss") ? "XSS Attack" :
      fLower.includes("inversion") ? "Model Probing" : "Runtime Exploit";
    return [
      { id: "attacker", label: "Adversarial Input", subtitle: "Crafted Payload", icon: "user", role: "source" },
      { id: "llm", label: "LLM Processing", subtitle: "Unsafe Output Gen", icon: "brain", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: vectorLabel, subtitle: "System Compromise", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "DIS") {
    return [
      { id: "shadow", label: "Shadow AI", subtitle: "Unmanaged Usage", icon: "globe", role: "source" },
      { id: "blind", label: "Visibility Gap", subtitle: "Not Inventoried", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: "Uncontrolled Risk", subtitle: "Compliance Gap", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "MON") {
    return [
      { id: "attacker", label: "Threat Actor", subtitle: "Stealth Attack", icon: "user", role: "source" },
      { id: "gap", label: "No Monitoring", subtitle: "Missing Alerts", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "persist", label: "Persistent Access", subtitle: "Undetected", icon: "data", role: "context" },
      { id: "impact", label: "Silent Breach", subtitle: "Ongoing Data Loss", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "GOV") {
    return [
      { id: "gap", label: "Governance Gap", subtitle: "Missing Policy", icon: "data", role: "source" },
      { id: "control", label: "No Compliance Tag", subtitle: evidence.detail || "Missing Controls", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: "Regulatory Risk", subtitle: "Fine / Penalty", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "NET") {
    return [
      { id: "internet", label: "External Attacker", subtitle: "Public Internet", icon: "globe", role: "source" },
      { id: "network", label: "Network Exposure", subtitle: evidence.detail || "Open Port / SG", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "lateral", label: "Lateral Movement", subtitle: "Internal Network", icon: "data", role: "context" },
      { id: "impact", label: "Network Breach", subtitle: "Data Exfiltration", icon: "alert", role: "impact" },
    ];
  }

  if (cat === "SUP") {
    return [
      { id: "supply", label: "Supply Chain", subtitle: "Third-Party Source", icon: "globe", role: "source" },
      { id: "trust", label: "Unverified Source", subtitle: "No Signature Check", icon: "unlock", role: "path" },
      { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
      { id: "impact", label: "Backdoored Model", subtitle: "Poisoned Weights", icon: "alert", role: "impact" },
    ];
  }

  return [
    { id: "source", label: "Threat Source", subtitle: "Attack Vector", icon: "globe", role: "source" },
    { id: "weakness", label: "Security Gap", subtitle: evidence.detail || "Missing Control", icon: "unlock", role: "path" },
    { id: "asset", label: assetName, subtitle: assetType, icon: "asset", role: "asset" },
    { id: "impact", label: "Security Impact", subtitle: "Risk Outcome", icon: "alert", role: "impact" },
  ];
}

function buildRiskGraph(finding: RiskFinding): { nodes: Node[]; edges: Edge[] } {
  const path = getAttackPath(finding);

  const graphNodes = path.map((step) => ({
    id: step.id,
    type: "attack_path_node" as const,
    label: step.label,
    subtitle: step.subtitle,
    data: {
      pathRole: step.role,
      iconType: step.icon,
      lane: step.role === "asset" ? (finding.asset?.lane || "data") : "",
      assetType: step.role === "asset" ? (finding.asset?.type || finding.asset?.serviceType || "") : step.icon,
      isAffectedAsset: step.role === "asset",
      severity: step.role === "asset" ? finding.severity : undefined,
      findingsCount: step.role === "asset" ? (finding.peerFindingsCount + 1) : 0,
    },
  }));

  const graphEdges: { id: string; source: string; target: string }[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    graphEdges.push({
      id: `edge-${path[i].id}-${path[i + 1].id}`,
      source: path[i].id,
      target: path[i + 1].id,
    });
  }

  if (finding.relatedAssets.length > 0) {
    for (const ra of finding.relatedAssets.slice(0, 4)) {
      const nodeId = `related-${ra.id}`;
      graphNodes.push({
        id: nodeId,
        type: "attack_path_node" as const,
        label: ra.name,
        subtitle: ra.type || laneLabels[ra.lane] || ra.category,
        data: {
          lane: ra.lane,
          assetType: ra.type,
          findingsCount: ra.findingsCount,
          pathRole: "related",
        },
      });
      graphEdges.push({
        id: `edge-asset-${ra.id}`,
        source: "asset",
        target: nodeId,
      });
    }
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 100, nodesep: 50, edgesep: 25 });

  const nodeW = 150;
  const nodeH = 100;
  for (const n of graphNodes) {
    g.setNode(n.id, { width: nodeW, height: nodeH });
  }
  for (const e of graphEdges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  const nodes: Node[] = graphNodes.map(n => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: n.type,
      position: { x: (pos?.x || 0) - nodeW / 2, y: (pos?.y || 0) - nodeH / 2 },
      data: { label: n.label, subtitle: n.subtitle, nodeData: n.data },
    };
  });

  const edges: Edge[] = graphEdges.map(e => {
    const isAttackFlow = !e.source.startsWith("related") && !e.target.startsWith("related");
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "default",
      animated: isAttackFlow,
      style: {
        stroke: isAttackFlow ? "#ef4444" : "#64748b",
        strokeWidth: isAttackFlow ? 2 : 1.5,
        opacity: isAttackFlow ? 0.6 : 0.4,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isAttackFlow ? "#ef4444" : "#64748b",
        width: 12,
        height: 12,
      },
    };
  });

  return { nodes, edges };
}


function UsersEntryNode({ data }: { data: any }) {
  return (
    <div className="flex flex-col items-center" data-testid="node-users-entry">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400/60 flex items-center justify-center shadow-lg shadow-cyan-500/20 backdrop-blur-sm">
        <Users className="w-8 h-8 text-cyan-400" />
      </div>
      <span className="mt-2 text-sm font-semibold text-foreground">{data.label}</span>
      <span className="text-[10px] text-muted-foreground">{data.subtitle}</span>
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-2.5 !h-2.5 !border-0" />
    </div>
  );
}

function FlowLaneNode({ data }: { data: any }) {
  const lane = data.nodeData?.lane || "data";
  const colors = laneColors[lane] || laneColors.data;
  const IconComp = laneIcons[lane] || Layers;
  const findings = data.nodeData?.findings || { critical: 0, high: 0, medium: 0, low: 0 };
  const totalFindings = findings.critical + findings.high + findings.medium + findings.low;
  const hasIssues = findings.critical > 0 || findings.high > 0;
  const categories = data.nodeData?.categories || [];

  return (
    <div className="flex flex-col items-center" data-testid={`node-lane-${lane}`}>
      <Handle type="target" position={Position.Left} className={`!w-2.5 !h-2.5 !border-0 ${colors.bg}`} />
      <div className={`relative px-5 py-3 rounded-xl bg-gradient-to-br ${colors.gradient} border-2 ${hasIssues ? "border-red-500/60" : colors.border} flex flex-col items-center shadow-lg ${colors.glow} backdrop-blur-sm min-w-[140px]`}>
        <div className="flex items-center gap-2 mb-1">
          <IconComp className={`w-5 h-5 ${hasIssues ? "text-red-400" : colors.text}`} />
          <span className={`text-sm font-bold ${hasIssues ? "text-red-400" : colors.text}`}>{data.label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{data.subtitle}</span>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 justify-center max-w-[180px]">
            {categories.slice(0, 3).map((c: string) => (
              <span key={c} className="px-1.5 py-0.5 text-[8px] rounded bg-background/40 text-muted-foreground">{c}</span>
            ))}
            {categories.length > 3 && <span className="px-1.5 py-0.5 text-[8px] rounded bg-background/40 text-muted-foreground">+{categories.length - 3}</span>}
          </div>
        )}
        {totalFindings > 0 && (
          <div className="absolute -top-2 -right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold shadow-md">
            <AlertTriangle className="w-2.5 h-2.5" />
            {totalFindings}
          </div>
        )}
      </div>
      <FindingsBadges findings={findings} />
      <Handle type="source" position={Position.Right} className={`!w-2.5 !h-2.5 !border-0 ${colors.bg}`} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={`!w-2 !h-2 !border-0 ${colors.bg}`} />
    </div>
  );
}

function FindingsBadges({ findings }: { findings: { critical: number; high: number; medium: number; low: number } }) {
  const total = findings.critical + findings.high + findings.medium + findings.low;
  if (total === 0) return null;
  return (
    <div className="flex gap-1 mt-1">
      {findings.critical > 0 && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-500/30 text-red-300">{findings.critical}C</span>}
      {findings.high > 0 && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-500/30 text-orange-300">{findings.high}H</span>}
      {findings.medium > 0 && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-yellow-500/30 text-yellow-300">{findings.medium}M</span>}
      {findings.low > 0 && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/30 text-emerald-300">{findings.low}L</span>}
    </div>
  );
}

function FlowAssetNode({ data }: { data: any }) {
  const nodeData = data.nodeData || {};
  const risk = nodeData.risk || "Low";
  const colors = getRiskColor(risk);
  const findings = nodeData.findings || { critical: 0, high: 0, medium: 0, low: 0 };
  const totalFindings = findings.critical + findings.high + findings.medium + findings.low;

  return (
    <div className="flex flex-col items-center" data-testid={`node-asset-${data.label}`}>
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-1.5 !h-1.5 !border-0" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-slate-400 !w-1.5 !h-1.5 !border-0" />
      <div className={`relative w-10 h-10 rounded-lg ${colors.bg} border ${colors.border}/50 flex items-center justify-center shadow-sm backdrop-blur-sm ring-1 ${colors.ring}`}>
        <Box className={`w-5 h-5 ${colors.text}`} />
        {totalFindings > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[7px] font-bold flex items-center justify-center">
            {totalFindings > 9 ? "9+" : totalFindings}
          </span>
        )}
      </div>
      <span className="mt-1 text-[10px] font-medium text-foreground max-w-[110px] truncate text-center">{data.label}</span>
      <span className="text-[8px] text-muted-foreground max-w-[110px] truncate text-center">{data.subtitle}</span>
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-1.5 !h-1.5 !border-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-slate-400 !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

function AssetGroupNode({ data }: { data: any }) {
  const nodeData = data.nodeData || {};
  const findings = nodeData.findings || { critical: 0, high: 0, medium: 0, low: 0 };
  const totalFindings = findings.critical + findings.high + findings.medium + findings.low;
  const hasIssues = findings.critical > 0 || findings.high > 0;
  const lane = nodeData.lane || "data";
  const laneColor = laneColors[lane] || laneColors.data;

  return (
    <div className="flex flex-col items-center" data-testid={`node-group-${data.label}`}>
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2 !border-0" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-slate-400 !w-1.5 !h-1.5 !border-0" />
      <div className={`relative px-3 py-2 rounded-lg bg-gradient-to-br ${hasIssues ? "from-red-500/15 to-blue-500/15 border-red-500/40" : `${laneColor.gradient} ${laneColor.border}`} border flex flex-col items-center shadow-sm backdrop-blur-sm min-w-[100px]`}>
        <div className="flex items-center gap-1.5">
          <FolderTree className={`w-4 h-4 ${hasIssues ? "text-red-400" : laneColor.text}`} />
          <span className="text-[11px] font-semibold text-foreground">{data.label}</span>
        </div>
        <span className="text-[9px] text-muted-foreground">{nodeData.count} assets</span>
        {totalFindings > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold">
            {totalFindings}
          </span>
        )}
      </div>
      <FindingsBadges findings={findings} />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-slate-400 !w-1.5 !h-1.5 !border-0" />
    </div>
  );
}

const infraNodeTypes: NodeTypes = {
  users_entry: UsersEntryNode,
  flow_lane: FlowLaneNode,
  flow_asset: FlowAssetNode,
  asset_group: AssetGroupNode,
};

const nodeWidth: Record<string, number> = { users_entry: 160, flow_lane: 200, flow_asset: 120, asset_group: 140 };
const nodeHeight: Record<string, number> = { users_entry: 100, flow_lane: 120, flow_asset: 80, asset_group: 80 };

function buildInfraLayout(graphNodes: GraphNode[], graphEdges: GraphEdge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 120, nodesep: 30, edgesep: 15 });

  for (const n of graphNodes) {
    g.setNode(n.id, { width: nodeWidth[n.type] || 120, height: nodeHeight[n.type] || 80 });
  }
  for (const e of graphEdges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  const EDGE_STYLES: Record<string, { stroke: string; strokeWidth: number; animated: boolean; showLabel: boolean; dashArray?: string }> = {
    data_flow: { stroke: "#007aff", strokeWidth: 2.5, animated: true, showLabel: true },
    permission: { stroke: "#ef4444", strokeWidth: 1.5, animated: true, showLabel: true, dashArray: "5 3" },
    observes: { stroke: "#22c55e", strokeWidth: 1.5, animated: true, showLabel: true, dashArray: "8 4" },
    invocation: { stroke: "#f59e0b", strokeWidth: 1.5, animated: true, showLabel: true },
    protection: { stroke: "#a855f7", strokeWidth: 1.5, animated: true, showLabel: true, dashArray: "4 4" },
    contains: { stroke: "#6366f1", strokeWidth: 1, animated: false, showLabel: false },
  };

  const nodes: Node[] = graphNodes.map(n => {
    const pos = g.node(n.id);
    const w = nodeWidth[n.type] || 120;
    const h = nodeHeight[n.type] || 80;
    return {
      id: n.id,
      type: n.type,
      position: { x: (pos?.x || 0) - w / 2, y: (pos?.y || 0) - h / 2 },
      data: { label: n.label, subtitle: n.subtitle, nodeData: n.data },
    };
  });

  const edges: Edge[] = graphEdges.map(e => {
    const edgeType = e.type || "contains";
    const style = EDGE_STYLES[edgeType] || EDGE_STYLES.contains;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "default",
      animated: style.animated,
      style: { stroke: style.stroke, strokeWidth: style.strokeWidth, opacity: edgeType === "contains" ? 0.4 : 0.7, strokeDasharray: style.dashArray },
      markerEnd: edgeType === "contains" ? undefined : { type: MarkerType.ArrowClosed, color: style.stroke, width: 14, height: 14 },
      label: style.showLabel ? e.label : undefined,
      labelStyle: { fill: "#94a3b8", fontSize: edgeType === "data_flow" ? 10 : 9, fontWeight: edgeType === "data_flow" ? 600 : 400 },
      labelBgStyle: { fill: "rgba(15,23,42,0.7)", rx: 4 },
      labelBgPadding: [6, 3] as [number, number],
    };
  });

  return { nodes, edges };
}


function InfraGraphView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenLanes, setHiddenLanes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const { selectedProjectId } = useProject();
  const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";
  const { data: graphData, isLoading, refetch } = useQuery<InfraGraphData>({
    queryKey: ["/api/security-graph", selectedProjectId],
    queryFn: () => fetch(`/api/security-graph${projectParam}`, { credentials: "include" }).then(r => r.json()),
  });

  const allLanes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter(n => n.type === "flow_lane").map(n => ({ id: n.data.lane, label: n.label }));
  }, [graphData]);

  const filteredGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [], stats: { totalNodes: 0, totalEdges: 0, totalResources: 0, totalModels: 0, totalFindings: 0, connectorCount: 0 } };
    let filteredNodes = graphData.nodes;
    let filteredEdges = graphData.edges;
    if (hiddenLanes.size > 0) {
      const hiddenLaneNodeIds = new Set(filteredNodes.filter(n => n.type === "flow_lane" && hiddenLanes.has(n.data.lane)).map(n => n.id));
      const hiddenChildIds = new Set<string>();
      filteredEdges.forEach(e => { if (hiddenLaneNodeIds.has(e.source)) hiddenChildIds.add(e.target); });
      const allHidden = new Set([...hiddenLaneNodeIds, ...hiddenChildIds]);
      filteredNodes = filteredNodes.filter(n => !allHidden.has(n.id));
      filteredEdges = filteredEdges.filter(e => !allHidden.has(e.source) && !allHidden.has(e.target));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchingIds = new Set(filteredNodes.filter(n => n.label.toLowerCase().includes(q) || n.subtitle?.toLowerCase().includes(q) || n.type === "users_entry").map(n => n.id));
      const parentIds = new Set<string>();
      filteredEdges.forEach(e => { if (matchingIds.has(e.target)) parentIds.add(e.source); if (matchingIds.has(e.source)) parentIds.add(e.target); });
      const visible = new Set([...matchingIds, ...parentIds]);
      filteredNodes = filteredNodes.filter(n => visible.has(n.id));
      filteredEdges = filteredEdges.filter(e => visible.has(e.source) && visible.has(e.target));
    }
    return { ...graphData, nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, hiddenLanes, searchQuery]);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!filteredGraphData || filteredGraphData.nodes.length === 0) return { nodes: [], edges: [] };
    return buildInfraLayout(filteredGraphData.nodes, filteredGraphData.edges);
  }, [filteredGraphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => { setNodes(layoutNodes); setEdges(layoutEdges); }, [layoutNodes, layoutEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    const origNode = graphData?.nodes.find(n => n.id === node.id);
    if (origNode) setSelectedNode(origNode);
  }, [graphData]);

  return (
    <>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search assets, services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs bg-card/50 border-border/50" data-testid="search-graph" />
        </div>
        {allLanes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" data-testid="filter-lanes">
                <Filter className="w-3.5 h-3.5" /> Flow Stages
                {hiddenLanes.size > 0 && <Badge variant="secondary" className="ml-1 px-1 py-0 text-[9px]">{allLanes.length - hiddenLanes.size}/{allLanes.length}</Badge>}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {allLanes.map(lane => (
                <DropdownMenuCheckboxItem key={lane.id} checked={!hiddenLanes.has(lane.id)} onCheckedChange={(checked) => { const next = new Set(hiddenLanes); if (checked) next.delete(lane.id); else next.add(lane.id); setHiddenLanes(next); }}>
                  {lane.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()} data-testid="refresh-infra-graph">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh graph data</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><div className="flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 text-primary/40 animate-spin" /><p className="text-sm text-muted-foreground">Building infrastructure graph...</p></div></div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full"><div className="flex flex-col items-center gap-3 text-center max-w-md"><Globe className="w-12 h-12 text-primary/20" /><h3 className="text-lg font-semibold">No Cloud Assets</h3><p className="text-sm text-muted-foreground">Connect a cloud account and run a scan to visualize your infrastructure.</p></div></div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={infraNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
            minZoom={0.1}
            maxZoom={3}
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
          >
            <Background color="#6366f120" gap={30} size={1} />
            <Controls className="!bg-card/80 !backdrop-blur-sm !border-border/50 !rounded-lg !shadow-lg" />
            <MiniMap
              nodeColor={(n) => {
                switch (n.type) {
                  case "users_entry": return "#06b6d4";
                  case "flow_lane": return "#8b5cf6";
                  case "flow_asset": return "#64748b";
                  case "asset_group": return "#6366f1";
                  default: return "#64748b";
                }
              }}
              className="!bg-card/80 !backdrop-blur-sm !border-border/50 !rounded-lg"
              maskColor="rgba(0,0,0,0.3)"
            />
            <Panel position="bottom-left" className="!m-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border/50 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-blue-500 rounded" style={{ display: "inline-block" }} />Data Flow</span>
                <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-red-500 rounded" style={{ display: "inline-block", borderTop: "1px dashed #ef4444" }} />Permission</span>
                <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-green-500 rounded" style={{ display: "inline-block", borderTop: "1px dashed #22c55e" }} />Observes</span>
                <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-amber-500 rounded" style={{ display: "inline-block" }} />Invocation</span>
                <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-purple-500 rounded" style={{ display: "inline-block", borderTop: "1px dashed #a855f7" }} />Protection</span>
                <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-indigo-500 rounded opacity-50" style={{ display: "inline-block" }} />Contains</span>
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>

      {selectedNode && (
        <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
          <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] bg-background/95 backdrop-blur-xl border-l border-border/50 overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-border/50">
              <SheetTitle className="text-lg font-semibold">{selectedNode.label}</SheetTitle>
              {selectedNode.subtitle && <p className="text-sm text-muted-foreground">{selectedNode.subtitle}</p>}
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary/60 mb-3">Data Flow Stage</h4>
                <Badge variant="outline" className="capitalize">{laneLabels[selectedNode.data.lane] || selectedNode.type.replace(/_/g, " ")}</Badge>
              </div>
              {selectedNode.data.risk && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary/60 mb-3">Risk Level</h4>
                  <Badge className={`${getRiskColor(selectedNode.data.risk).bg} ${getRiskColor(selectedNode.data.risk).text} border ${getRiskColor(selectedNode.data.risk).border}/50`}>
                    {selectedNode.data.risk}{selectedNode.data.riskScore !== undefined && ` (${selectedNode.data.riskScore}/100)`}
                  </Badge>
                </div>
              )}
              {selectedNode.data.metadata && typeof selectedNode.data.metadata === "object" && Object.keys(selectedNode.data.metadata).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary/60 mb-3">Metadata</h4>
                  <div className="space-y-1.5">
                    {Object.entries(selectedNode.data.metadata).slice(0, 15).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="font-mono text-[10px] max-w-[300px] truncate">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}


function RiskGraphFullView({ finding }: { finding: RiskFinding }) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => buildRiskGraph(finding), [finding]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => { setNodes(layoutNodes); setEdges(layoutEdges); }, [layoutNodes, layoutEdges]);

  const sev = severityConfig[finding.severity] || severityConfig.Medium;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-border/30 bg-card/30 backdrop-blur-sm flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Attack Path Visualization</span>
        <div className="flex items-center gap-2">
          <Badge className={`${sev.bg} ${sev.color} border ${sev.border} text-[10px] px-1.5`}>{finding.severity}</Badge>
          <span className="text-[10px] font-mono text-muted-foreground">{finding.ruleId}</span>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={riskNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.4, maxZoom: 0.9 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background color="#64748b10" gap={30} size={1} />
          <Controls
            showInteractive={false}
            className="!bg-card/80 !backdrop-blur-sm !border-border/50 !rounded-lg !shadow-lg"
          />
          <Panel position="bottom-center" className="!m-3">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur-sm border border-border/50 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: "#ef4444" }} />Source</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: "#f59e0b" }} />Weakness</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: "#6366f1" }} />Context</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: "#22c55e" }} />Asset</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: "#dc2626" }} />Impact</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-red-500 rounded" style={{ display: "inline-block" }} /><ArrowRight className="w-2.5 h-2.5" />Flow</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <div className="border-t border-border/30 bg-card/20 backdrop-blur-sm">
        <div className="px-4 py-2.5">
          <p className="text-xs font-medium text-foreground leading-tight">{finding.finding}</p>
          {finding.asset && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {finding.asset.name} ({finding.asset.type})
              {finding.relatedAssets.length > 0 && ` + ${finding.relatedAssets.length} connected`}
            </p>
          )}
        </div>
        {(finding.impact || finding.remediation) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-x divide-border/20 border-t border-border/20">
            {finding.impact && (
              <div className="px-4 py-2">
                <h5 className="text-[9px] font-semibold uppercase tracking-wider text-red-400/80 mb-0.5">Impact</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{finding.impact}</p>
              </div>
            )}
            {finding.remediation && (
              <div className="px-4 py-2">
                <h5 className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-0.5">Remediation</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3">{finding.remediation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function SecurityGraphPage() {
  const [viewMode, setViewMode] = useState<"risks" | "infrastructure">("risks");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  const { selectedProjectId } = useProject();
  const projectParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";
  const { data: riskData, isLoading: risksLoading, refetch: refetchRisks } = useQuery<RiskGraphData>({
    queryKey: ["/api/security-graph/risks", selectedProjectId],
    queryFn: () => fetch(`/api/security-graph/risks${projectParam}`, { credentials: "include" }).then(r => r.json()),
    enabled: viewMode === "risks",
  });

  const filteredFindings = useMemo(() => {
    if (!riskData?.findings) return [];
    let findings = riskData.findings;
    if (severityFilter.size > 0) {
      findings = findings.filter(f => severityFilter.has(f.severity));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      findings = findings.filter(f =>
        f.finding.toLowerCase().includes(q) ||
        f.ruleId.toLowerCase().includes(q) ||
        f.asset?.name.toLowerCase().includes(q) ||
        f.asset?.type?.toLowerCase().includes(q) ||
        f.relatedAssets.some(ra => ra.name.toLowerCase().includes(q))
      );
    }
    findings.sort((a, b) => {
      const aOrder = (severityConfig[a.severity] || severityConfig.Medium).order;
      const bOrder = (severityConfig[b.severity] || severityConfig.Medium).order;
      return aOrder - bOrder;
    });
    return findings;
  }, [riskData, severityFilter, searchQuery]);

  const selectedFinding = useMemo(() => {
    if (!selectedRiskId) return filteredFindings[0] || null;
    return filteredFindings.find(f => f.id === selectedRiskId) || filteredFindings[0] || null;
  }, [filteredFindings, selectedRiskId]);

  useEffect(() => {
    if (filteredFindings.length > 0 && !selectedRiskId) {
      setSelectedRiskId(filteredFindings[0].id);
    }
  }, [filteredFindings]);

  const stats = riskData?.stats;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-2rem)]" data-testid="security-graph-page">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3 px-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Security Graph <HelpIcon section="security-graph" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {viewMode === "risks"
                ? "Risk-based visibility — select a risk to see its attack graph"
                : "Infrastructure data flow — how users, models, and data connect across your AI infrastructure"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
              <Button
                variant={viewMode === "risks" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("risks")}
                className="h-7 px-3 text-xs gap-1.5"
                data-testid="view-risks"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Risk Graph
              </Button>
              <Button
                variant={viewMode === "infrastructure" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("infrastructure")}
                className="h-7 px-3 text-xs gap-1.5"
                data-testid="view-infrastructure"
              >
                <Network className="w-3.5 h-3.5" />
                Infrastructure
              </Button>
            </div>
            {viewMode === "risks" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetchRisks()} data-testid="refresh-risks">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh risk data</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {viewMode === "risks" && (
          <>
            {stats && (
              <div className="flex flex-wrap gap-2 mb-3 px-1">
                {[
                  { label: "Total Risks", value: stats.total, icon: ShieldAlert, color: "text-foreground", filterKey: "" },
                  { label: "Critical", value: stats.critical, icon: AlertCircle, color: "text-red-400", filterKey: "Critical" },
                  { label: "High", value: stats.high, icon: AlertTriangle, color: "text-blue-400", filterKey: "High" },
                  { label: "Medium", value: stats.medium, icon: ShieldAlert, color: "text-yellow-400", filterKey: "Medium" },
                  { label: "Low", value: stats.low, icon: Info, color: "text-emerald-400", filterKey: "Low" },
                  { label: "Affected Assets", value: stats.affectedAssets, icon: Target, color: "text-primary/60", filterKey: "" },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      if (s.filterKey) {
                        setSeverityFilter(prev => {
                          const next = new Set(prev);
                          if (next.has(s.filterKey)) next.delete(s.filterKey);
                          else next.add(s.filterKey);
                          return next;
                        });
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border backdrop-blur-sm transition-all text-xs ${
                      s.filterKey && severityFilter.has(s.filterKey)
                        ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30"
                        : "bg-card/50 border-border/50 hover:bg-card/80"
                    } ${s.filterKey ? "cursor-pointer" : "cursor-default"}`}
                    data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <s.icon className={`w-3 h-3 ${s.color}`} />
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </button>
                ))}
                {severityFilter.size > 0 && (
                  <button onClick={() => setSeverityFilter(new Set())} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="clear-severity-filter">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 flex gap-0 overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
              <div className="w-[340px] flex-shrink-0 border-r border-border/30 flex flex-col bg-card/20">
                <div className="p-2 border-b border-border/30">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search risks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background/50 border-border/30"
                      data-testid="search-risks"
                    />
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  {risksLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="w-5 h-5 text-primary/40 animate-spin" />
                    </div>
                  ) : filteredFindings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
                      <p className="text-xs text-muted-foreground text-center">
                        {severityFilter.size > 0 || searchQuery.trim() ? "No matching risks" : "No open risks found"}
                      </p>
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-0.5">
                      {filteredFindings.map(finding => {
                        const sev = severityConfig[finding.severity] || severityConfig.Medium;
                        const SevIcon = sev.icon;
                        const isSelected = selectedFinding?.id === finding.id;
                        return (
                          <button
                            key={finding.id}
                            onClick={() => setSelectedRiskId(finding.id)}
                            className={`w-full text-left p-2.5 rounded-lg transition-all cursor-pointer group ${
                              isSelected
                                ? `${sev.bg} border ${sev.border} shadow-sm`
                                : "hover:bg-muted/30 border border-transparent"
                            }`}
                            data-testid={`risk-item-${finding.id}`}
                          >
                            <div className="flex items-start gap-2">
                              <SevIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${sev.color}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`text-[9px] font-bold uppercase ${sev.color}`}>{finding.severity}</span>
                                  <span className="text-[9px] font-mono text-muted-foreground">{finding.ruleId}</span>
                                </div>
                                <p className="text-[11px] font-medium text-foreground leading-tight line-clamp-2">{finding.finding}</p>
                                {finding.asset && (
                                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                    {finding.asset.name}
                                    {finding.relatedAssets.length > 0 && (
                                      <span className="text-primary/50 ml-1">+{finding.relatedAssets.length} connected</span>
                                    )}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className={`w-3 h-3 flex-shrink-0 mt-1 transition-colors ${isSelected ? sev.color : "text-muted-foreground/30 group-hover:text-muted-foreground"}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-2 border-t border-border/30 text-center">
                  <span className="text-[10px] text-muted-foreground">{filteredFindings.length} risk{filteredFindings.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                {selectedFinding ? (
                  <RiskGraphFullView finding={selectedFinding} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3 text-center max-w-md">
                      <Network className="w-12 h-12 text-primary/20" />
                      <h3 className="text-lg font-semibold">Select a Risk</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a risk from the panel to view its attack graph showing the affected asset and connected resources.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {viewMode === "infrastructure" && <InfraGraphView />}
      </div>
    </Layout>
  );
}
