import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { FyxLogo } from "@/components/fyx-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Search, Book, ChevronRight, ArrowLeft, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  group: string;
  requestBody?: Record<string, any>;
  responseExample: Record<string, any>;
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PATCH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
};

const groups = ["Authentication", "Resources", "Models", "Findings", "Policies", "Reports", "Webhooks", "Compliance"];

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/auth/login",
    description: "Authenticate a user with email and password. Returns a session cookie and user details including role and organization information.",
    group: "Authentication",
    requestBody: { email: "user@example.com", password: "your_password" },
    responseExample: { id: 1, email: "user@example.com", name: "John Doe", role: "Security Engineer", orgId: 1, orgName: "Acme Corp" },
  },
  {
    method: "GET",
    path: "/api/auth/me",
    description: "Get the currently authenticated user's profile, including role, organization, license status, and permissions.",
    group: "Authentication",
    responseExample: { id: 1, email: "user@example.com", name: "John Doe", role: "Security Engineer", orgId: 1, orgName: "Acme Corp", licenseStatus: "active" },
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    description: "End the current user session and invalidate the session cookie.",
    group: "Authentication",
    responseExample: { message: "Logged out successfully" },
  },
  {
    method: "POST",
    path: "/api/auth/signup",
    description: "Register a new user account. Creates a new organization and sends a verification email to the provided address.",
    group: "Authentication",
    requestBody: { email: "newuser@example.com", password: "secure_password", name: "Jane Doe", orgName: "New Organization" },
    responseExample: { message: "Account created. Please check your email to verify your account.", userId: 2 },
  },
  {
    method: "GET",
    path: "/api/resources",
    description: "List all resources in your organization. Returns an array of resource objects with their metadata, risk level, and exposure status.",
    group: "Resources",
    responseExample: [{ id: "res_abc123", name: "ml-endpoint-prod", type: "ML Endpoint", category: "Inference Endpoints", source: "AWS SageMaker", risk: "High", exposure: "Public", tags: ["production", "ml"] }],
  },
  {
    method: "GET",
    path: "/api/resources/:id",
    description: "Get detailed information about a specific resource by its ID, including full metadata and associated findings.",
    group: "Resources",
    responseExample: { id: "res_abc123", name: "ml-endpoint-prod", type: "ML Endpoint", category: "Inference Endpoints", source: "AWS SageMaker", risk: "High", exposure: "Public", owner: "ml-team", tags: ["production"], metadata: {} },
  },
  {
    method: "GET",
    path: "/api/resources/:id/bom",
    description: "Get the AI Bill of Materials (AI-BOM) for a specific resource. Returns a detailed breakdown of AI components, dependencies, and supply chain information.",
    group: "Resources",
    responseExample: { resourceId: "res_abc123", components: [{ name: "TensorFlow", version: "2.13.0", type: "framework", license: "Apache-2.0" }], datasets: [], dependencies: [] },
  },
  {
    method: "GET",
    path: "/api/ai-models",
    description: "List all AI models tracked in your organization. Returns model details including risk scores and vulnerability counts.",
    group: "Models",
    responseExample: [{ id: "mdl_xyz789", name: "fraud-detection-v3", type: "Classification", category: "Custom Models", status: "Active", riskScore: 72, vulnerabilities: 3 }],
  },
  {
    method: "GET",
    path: "/api/ai-models/:id",
    description: "Get detailed information about a specific AI model, including its full metadata, risk assessment, and associated vulnerabilities.",
    group: "Models",
    responseExample: { id: "mdl_xyz789", name: "fraud-detection-v3", type: "Classification", category: "Custom Models", status: "Active", riskScore: 72, vulnerabilities: 3, metadata: {}, tags: [] },
  },
  {
    method: "GET",
    path: "/api/policy-findings",
    description: "List policy findings. Supports filtering by policyId, severity, and status via query parameters. Example: ?policyId=xxx&severity=Critical&status=open",
    group: "Findings",
    responseExample: [{ id: "fnd_001", ruleId: "IAM-001", assetName: "ml-endpoint-prod", finding: "Overly permissive role attached to ML endpoint", severity: "High", status: "open", remediation: "Restrict role permissions to least privilege" }],
  },
  {
    method: "PATCH",
    path: "/api/policy-findings/:id",
    description: "Update the status of a specific finding. Use this to acknowledge, suppress, or resolve findings.",
    group: "Findings",
    requestBody: { status: "acknowledged", acknowledgedBy: "user@example.com", falsePositiveReason: "Known configuration" },
    responseExample: { id: "fnd_001", status: "acknowledged", acknowledgedBy: "user@example.com", acknowledgedAt: "2026-02-25T10:00:00Z" },
  },
  {
    method: "GET",
    path: "/api/policies",
    description: "List all security policies configured in your organization with their enabled/disabled status and severity levels.",
    group: "Policies",
    responseExample: [{ id: "pol_001", ruleId: "IAM-001", name: "Overly Permissive IAM Roles", description: "Detect IAM roles with excessive permissions", category: "IAM", severity: "High", enabled: true }],
  },
  {
    method: "PATCH",
    path: "/api/policies/:id",
    description: "Update a policy configuration. Use this to enable or disable specific policies.",
    group: "Policies",
    requestBody: { enabled: false },
    responseExample: { id: "pol_001", ruleId: "IAM-001", name: "Overly Permissive IAM Roles", enabled: false },
  },
  {
    method: "POST",
    path: "/api/policies/evaluate",
    description: "Trigger a policy evaluation scan across all resources. This will evaluate enabled policies against your inventory and generate new findings.",
    group: "Policies",
    requestBody: { policyIds: ["pol_001", "pol_002"] },
    responseExample: { scanId: "scan_abc", status: "started", policiesEvaluated: 2, message: "Policy evaluation scan started" },
  },
  {
    method: "GET",
    path: "/api/reports",
    description: "List all generated reports with their status, type, and generation metadata.",
    group: "Reports",
    responseExample: [{ id: "rpt_001", name: "Executive Summary - Q1 2026", type: "executive_summary", status: "completed", generatedAt: "2026-02-25T10:00:00Z", generatedBy: "admin@example.com" }],
  },
  {
    method: "POST",
    path: "/api/reports/generate",
    description: "Generate a new security report. Supported types: executive_summary, compliance, risk_assessment, finding_detail, asset_inventory, policy_coverage.",
    group: "Reports",
    requestBody: { type: "executive_summary", name: "Q1 2026 Executive Summary", filters: { dateRange: "30d" } },
    responseExample: { id: "rpt_002", name: "Q1 2026 Executive Summary", type: "executive_summary", status: "generating" },
  },
  {
    method: "GET",
    path: "/api/reports/:id",
    description: "Get the full details of a specific report, including the generated data and visualizations.",
    group: "Reports",
    responseExample: { id: "rpt_001", name: "Executive Summary", type: "executive_summary", status: "completed", data: { summary: { totalResources: 45, totalFindings: 128 } } },
  },
  {
    method: "GET",
    path: "/api/webhooks",
    description: "List all configured webhooks with their event subscriptions and delivery status.",
    group: "Webhooks",
    responseExample: [{ id: "wh_001", name: "Slack Notifications", url: "https://hooks.slack.com/...", type: "slack", events: ["finding.created", "scan.completed"], enabled: true }],
  },
  {
    method: "POST",
    path: "/api/webhooks",
    description: "Create a new webhook subscription. Specify the events you want to receive and the destination URL.",
    group: "Webhooks",
    requestBody: { name: "Jira Integration", url: "https://your-jira.atlassian.net/webhook", type: "jira", authType: "bearer", authConfig: "your_token", events: ["finding.created", "finding.resolved"] },
    responseExample: { id: "wh_002", name: "Jira Integration", url: "https://your-jira.atlassian.net/webhook", type: "jira", enabled: true },
  },
  {
    method: "GET",
    path: "/api/compliance/frameworks",
    description: "List all available compliance frameworks with their compliance scores and control counts.",
    group: "Compliance",
    responseExample: [{ id: "fw_001", name: "EU AI Act", description: "European Union AI regulation", complianceScore: 78, totalControls: 42, passedControls: 33, failedControls: 9 }],
  },
  {
    method: "GET",
    path: "/api/compliance/frameworks/:id",
    description: "Get detailed information about a specific compliance framework including individual control statuses and evidence.",
    group: "Compliance",
    responseExample: { id: "fw_001", name: "EU AI Act", complianceScore: 78, controls: [{ id: "ctrl_001", name: "Risk Management System", status: "passed", evidence: "Policy IAM-001 enabled" }] },
  },
];

function getCurlExample(ep: Endpoint): string {
  let curl = `curl -X ${ep.method} \\
  "https://api.fyxcloud.net${ep.path}" \\
  -H "Authorization: Bearer fyx_your_api_key" \\
  -H "Content-Type: application/json"`;
  if (ep.requestBody) {
    curl += ` \\
  -d '${JSON.stringify(ep.requestBody, null, 2)}'`;
  }
  return curl;
}

export default function ApiDocsPage() {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const { toast } = useToast();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const filtered = endpoints.filter(ep => {
    const q = search.toLowerCase();
    if (q && !ep.path.toLowerCase().includes(q) && !ep.description.toLowerCase().includes(q) && !ep.group.toLowerCase().includes(q)) return false;
    if (activeGroup && ep.group !== activeGroup) return false;
    return true;
  });

  function copyToClipboard(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast({ title: "Copied to clipboard", variant: "info" });
  }

  const groupedEndpoints = groups.map(g => ({
    name: g,
    endpoints: filtered.filter(ep => ep.group === g),
  })).filter(g => g.endpoints.length > 0);

  return (
    <div className="min-h-screen bg-background text-[14px] text-[#000] dark:text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FyxLogo className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">Fyx Cloud</span>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="text-[14px] font-medium text-muted-foreground">API Reference</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-[14px]"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#007aff]/10">
              <Code2 className="h-6 w-6 text-[#007aff]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-api-docs-title">API Documentation</h1>
              <p className="text-[14px] text-muted-foreground mt-1">Interactive API reference for Fyx Cloud</p>
            </div>
          </div>

          <Card className="bg-card/60 backdrop-blur-xl border-white/10 p-5">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-[12px] bg-[#007aff]/10 text-[#007aff] border-[#007aff]/30">Base URL</Badge>
                <code className="text-[14px] font-mono text-[#000] dark:text-foreground">https://api.fyxcloud.net</code>
              </div>
              <p className="text-[14px] text-[#000] dark:text-foreground/80">
                All API requests require authentication via a Bearer token. Include your API key in the Authorization header:
                <code className="ml-1 bg-muted/30 px-1.5 py-0.5 rounded text-[#007aff] text-[13px]">Authorization: Bearer fyx_your_api_key</code>
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-8">
            <div className="w-64 shrink-0 hidden lg:block">
              <div className="sticky top-24 space-y-2">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search endpoints..."
                    className="pl-9 h-9 text-[14px] bg-muted/30 border-border/50"
                    data-testid="input-search-endpoints"
                  />
                </div>

                <button
                  className={`w-full text-left text-[14px] px-3 py-2 rounded-md transition-colors ${
                    !activeGroup ? "bg-[#007aff]/10 text-[#007aff]" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                  onClick={() => setActiveGroup(null)}
                  data-testid="button-filter-all"
                >
                  All Endpoints
                </button>

                {groups.map(group => {
                  const count = endpoints.filter(ep => ep.group === group && (!search || ep.path.toLowerCase().includes(search.toLowerCase()) || ep.description.toLowerCase().includes(search.toLowerCase()))).length;
                  if (count === 0 && search) return null;
                  return (
                    <button
                      key={group}
                      className={`w-full text-left text-[14px] px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                        activeGroup === group ? "bg-[#007aff]/10 text-[#007aff]" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                      onClick={() => setActiveGroup(activeGroup === group ? null : group)}
                      data-testid={`button-filter-${group.toLowerCase()}`}
                    >
                      <span>{group}</span>
                      <span className="text-[12px] opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-6" ref={contentRef}>
              <div className="lg:hidden mb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search endpoints..."
                    className="pl-9 h-9 text-[14px] bg-muted/30 border-border/50"
                    data-testid="input-search-endpoints-mobile"
                  />
                </div>
                <ScrollArea className="mt-2">
                  <div className="flex gap-1 pb-2">
                    <Badge
                      variant="outline"
                      className={`cursor-pointer text-[12px] whitespace-nowrap ${!activeGroup ? "bg-[#007aff]/10 text-[#007aff] border-[#007aff]/30" : ""}`}
                      onClick={() => setActiveGroup(null)}
                    >
                      All
                    </Badge>
                    {groups.map(g => (
                      <Badge
                        key={g}
                        variant="outline"
                        className={`cursor-pointer text-[12px] whitespace-nowrap ${activeGroup === g ? "bg-[#007aff]/10 text-[#007aff] border-[#007aff]/30" : ""}`}
                        onClick={() => setActiveGroup(activeGroup === g ? null : g)}
                      >
                        {g}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {groupedEndpoints.map(group => (
                <div key={group.name} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Book className="h-5 w-5 text-[#007aff]" />
                    <h2 className="text-[16px] font-semibold" data-testid={`text-group-${group.name.toLowerCase()}`}>{group.name}</h2>
                  </div>

                  {group.endpoints.map((ep, idx) => {
                    const globalIdx = endpoints.indexOf(ep);
                    const curl = getCurlExample(ep);
                    return (
                      <Card key={`${ep.method}-${ep.path}`} className="bg-card/60 backdrop-blur-xl border-white/10 overflow-hidden" data-testid={`card-endpoint-${globalIdx}`}>
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`text-[12px] font-mono font-bold ${methodColors[ep.method]}`}>
                              {ep.method}
                            </Badge>
                            <code className="text-[14px] font-mono font-medium">{ep.path}</code>
                          </div>

                          <p className="text-[14px] text-[#000] dark:text-foreground/80 leading-relaxed">{ep.description}</p>

                          {ep.requestBody && (
                            <div className="space-y-2">
                              <span className="text-[12px] font-semibold tracking-[0.15em] text-primary/60 uppercase">Request Body</span>
                              <pre className="text-[13px] font-mono bg-muted/20 border border-border/30 rounded-lg p-4 overflow-x-auto">
                                {JSON.stringify(ep.requestBody, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div className="space-y-2">
                            <span className="text-[12px] font-semibold tracking-[0.15em] text-primary/60 uppercase">Response Example</span>
                            <pre className="text-[13px] font-mono bg-muted/20 border border-border/30 rounded-lg p-4 overflow-x-auto max-h-56">
                              {JSON.stringify(ep.responseExample, null, 2)}
                            </pre>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-semibold tracking-[0.15em] text-primary/60 uppercase">cURL Example</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[12px] gap-1 text-muted-foreground"
                                onClick={() => copyToClipboard(curl, globalIdx)}
                                data-testid={`button-copy-curl-${globalIdx}`}
                              >
                                {copiedIdx === globalIdx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copiedIdx === globalIdx ? "Copied" : "Copy"}
                              </Button>
                            </div>
                            <pre className="text-[13px] font-mono bg-muted/20 border border-border/30 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                              {curl}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-[14px] font-medium">No endpoints found</p>
                  <p className="text-[14px] mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
