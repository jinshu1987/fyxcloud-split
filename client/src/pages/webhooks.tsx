import { useState } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Webhook, Plus, Trash2, Edit, Zap, CheckCircle, XCircle, Loader2,
  Send, AlertTriangle, Clock, ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { webhookTypes, webhookEvents, type Webhook as WebhookType } from "@shared/schema";
import { HelpIcon } from "@/components/help-icon";

const typeLabels: Record<string, { label: string; color: string; description: string }> = {
  jira: { label: "Jira", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", description: "Create Jira tickets from findings" },
  splunk: { label: "Splunk", color: "bg-green-500/10 text-green-400 border-green-500/20", description: "Send events to Splunk HEC" },
  armorcode: { label: "ArmorCode", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", description: "Push findings to ArmorCode" },
  slack: { label: "Slack", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", description: "Send alerts to Slack channels" },
  custom: { label: "Custom", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", description: "Custom HTTP webhook endpoint" },
};

const eventLabels: Record<string, string> = {
  "finding.created": "Finding Created",
  "finding.resolved": "Finding Resolved",
  "finding.acknowledged": "Finding Acknowledged",
  "finding.suppressed": "Finding Suppressed",
  "scan.completed": "Scan Completed",
  "scan.failed": "Scan Failed",
  "connector.synced": "Connector Synced",
  "policy.violated": "Policy Violated",
};

function getStatusDot(webhook: WebhookType) {
  if (!webhook.lastTriggered) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-500/50" title="Never tested" data-testid={`status-dot-${webhook.id}`} />;
  }
  if (webhook.lastStatus === "success") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" title="Last test succeeded" data-testid={`status-dot-${webhook.id}`} />;
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" title="Last test failed" data-testid={`status-dot-${webhook.id}`} />;
}

export default function WebhooksPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookType | null>(null);
  const [form, setForm] = useState({
    name: "",
    url: "",
    type: "custom" as string,
    authType: "none" as string,
    authConfig: "",
    events: [] as string[],
    enabled: true,
  });
  const [jiraForm, setJiraForm] = useState({
    siteUrl: "",
    projectKey: "",
    issueType: "Bug",
    apiToken: "",
    email: "",
  });
  const [testResult, setTestResult] = useState<{ success: boolean; status: number | null; message: string; responseBody?: string | null } | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: webhooksList = [], isLoading } = useQuery<WebhookType[]>({
    queryKey: ["/api/webhooks"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/webhooks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setSheetOpen(false);
      resetForm();
      toast({ title: "Webhook created", variant: "success" });
    },
    onError: () => toast({ title: "Failed to create webhook", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/webhooks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setSheetOpen(false);
      setEditing(null);
      resetForm();
      toast({ title: "Webhook updated", variant: "success" });
    },
    onError: () => toast({ title: "Failed to update webhook", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook deleted", variant: "success" });
    },
    onError: () => toast({ title: "Failed to delete webhook", variant: "destructive" }),
  });

  const testMut = useMutation({
    mutationFn: (id: string) => {
      setTestingWebhookId(id);
      setTestResult(null);
      return apiRequest("POST", `/api/webhooks/${id}/test`).then(r => r.json());
    },
    onSuccess: (data: any) => {
      setTestResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
    onError: (err: any) => {
      setTestResult({ success: false, status: null, message: err.message || "Connection failed" });
    },
  });

  function resetForm() {
    setForm({ name: "", url: "", type: "custom", authType: "none", authConfig: "", events: [], enabled: true });
    setJiraForm({ siteUrl: "", projectKey: "", issueType: "Bug", apiToken: "", email: "" });
    setTestResult(null);
    setTestingWebhookId(null);
  }

  function openCreate() {
    resetForm();
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(webhook: WebhookType) {
    setEditing(webhook);

    if (webhook.type === "jira") {
      let siteUrl = "";
      let projectKey = "";
      let issueType = "Bug";
      let email = "";
      let apiToken = "";
      try {
        const urlMatch = webhook.url.match(/^https?:\/\/([^/]+)/);
        if (urlMatch) siteUrl = urlMatch[1];
      } catch {}
      if (webhook.authConfig) {
        try {
          const config = JSON.parse(webhook.authConfig);
          projectKey = config.projectKey || "";
          issueType = config.issueType || "Bug";
          email = config.username || "";
        } catch {}
      }
      setJiraForm({ siteUrl, projectKey, issueType, apiToken, email });
      setForm({
        name: webhook.name,
        url: webhook.url,
        type: webhook.type,
        authType: "basic",
        authConfig: "",
        events: webhook.events,
        enabled: webhook.enabled,
      });
    } else {
      setJiraForm({ siteUrl: "", projectKey: "", issueType: "Bug", apiToken: "", email: "" });
      setForm({
        name: webhook.name,
        url: webhook.url,
        type: webhook.type,
        authType: webhook.authType,
        authConfig: "",
        events: webhook.events,
        enabled: webhook.enabled,
      });
    }
    setSheetOpen(true);
  }

  function handleSubmit() {
    let payload: any;

    if (form.type === "jira") {
      const composedUrl = jiraForm.siteUrl
        ? `https://${jiraForm.siteUrl.replace(/^https?:\/\//, "")}/rest/api/3/issue`
        : form.url;
      const authConfigObj: Record<string, string> = {
        projectKey: jiraForm.projectKey,
        issueType: jiraForm.issueType,
      };
      if (jiraForm.email) authConfigObj.username = jiraForm.email;
      if (jiraForm.apiToken) authConfigObj.password = jiraForm.apiToken;
      payload = {
        name: form.name,
        url: composedUrl,
        type: "jira",
        authType: "basic",
        events: form.events,
        enabled: form.enabled,
        authConfig: JSON.stringify(authConfigObj),
      };
    } else {
      payload = { ...form };
      if (!payload.authConfig) delete payload.authConfig;
    }

    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  function handleTypeChange(key: string) {
    if (key === "jira") {
      setForm(prev => ({ ...prev, type: key, authType: "basic" }));
    } else {
      setForm(prev => ({ ...prev, type: key }));
      setJiraForm({ siteUrl: "", projectKey: "", issueType: "Bug", apiToken: "", email: "" });
    }
  }

  function toggleEvent(event: string) {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  }

  const isJira = form.type === "jira";
  const canSubmit = isJira
    ? form.name && jiraForm.siteUrl && jiraForm.email && jiraForm.projectKey && form.events.length > 0 && (editing || jiraForm.apiToken)
    : form.name && form.url && form.events.length > 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-webhooks-title">Integrations <HelpIcon section="webhooks" /></h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send findings and events to external services
            </p>
          </div>
          <Button className="gap-2 bg-[#007aff] hover:bg-[#0066d6] text-white" onClick={openCreate} data-testid="button-add-webhook">
            <Plus className="h-4 w-4" />
            Add Integration
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(typeLabels).map(([key, config]) => {
            const count = webhooksList.filter(w => w.type === key).length;
            return (
              <Card key={key} className="glass-panel border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.color}`}>
                      <Webhook className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{count} configured</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {testResult && testingWebhookId && (
          <Card className={`border ${testResult.success ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`} data-testid="card-test-result">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold" data-testid="text-test-result-title">
                    {testResult.success ? "Test Successful" : "Test Failed"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-test-result-message">
                    {testResult.message}
                  </p>
                  {testResult.status !== null && (
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-test-result-status">
                      HTTP Status: <span className="font-mono font-semibold">{testResult.status}</span>
                    </p>
                  )}
                  {testResult.responseBody && (
                    <details className="mt-1.5">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground" data-testid="text-test-response-toggle">
                        Response Details
                      </summary>
                      <pre className="text-[10px] text-muted-foreground mt-1 p-2 bg-muted/30 rounded overflow-x-auto max-h-[120px] overflow-y-auto font-mono" data-testid="text-test-response-body">
                        {testResult.responseBody}
                      </pre>
                    </details>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setTestResult(null); setTestingWebhookId(null); }}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-panel border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-[#007aff]" />
              <CardTitle className="text-base">
                <span className="text-[10px] font-semibold tracking-[0.15em] text-primary/60 uppercase">CONFIGURED WEBHOOKS</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : webhooksList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Webhook className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No webhooks configured</p>
                <p className="text-xs mt-1">Add a webhook to start sending events to external services</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">URL</TableHead>
                    <TableHead className="text-xs">Events</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Last Triggered</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooksList.map((webhook) => {
                    const typeConfig = typeLabels[webhook.type] || typeLabels.custom;
                    return (
                      <TableRow key={webhook.id} className="border-border/30 hover:bg-muted/20" data-testid={`row-webhook-${webhook.id}`}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusDot(webhook)}
                            {webhook.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${typeConfig.color}`}>
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{webhook.url}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.slice(0, 2).map(e => (
                              <Badge key={e} variant="outline" className="text-[9px] px-1.5 py-0">
                                {eventLabels[e] || e}
                              </Badge>
                            ))}
                            {webhook.events.length > 2 && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">+{webhook.events.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {webhook.enabled ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20 text-[10px]">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {webhook.lastTriggered ? (
                            <div className="flex items-center gap-1">
                              {webhook.lastStatus === "success" ? (
                                <CheckCircle className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-400" />
                              )}
                              {new Date(webhook.lastTriggered).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-[#007aff]"
                              onClick={() => testMut.mutate(webhook.id)}
                              disabled={testMut.isPending}
                              data-testid={`button-test-webhook-${webhook.id}`}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-[#007aff]"
                              onClick={() => openEdit(webhook)}
                              data-testid={`button-edit-webhook-${webhook.id}`}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMut.mutate(webhook.id)}
                              data-testid={`button-delete-webhook-${webhook.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:w-[50vw] sm:max-w-[50vw] bg-card/95 backdrop-blur-xl border-l border-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">
                {editing ? "Edit Integration" : "Add Integration"}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Integration Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(typeLabels).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                        form.type === key
                          ? "border-[#007aff] bg-[#007aff]/10 ring-1 ring-[#007aff]/30"
                          : "border-border/50 hover:border-border hover:bg-muted/30"
                      }`}
                      onClick={() => handleTypeChange(key)}
                      data-testid={`button-type-${key}`}
                    >
                      <div className={`h-8 w-8 rounded flex items-center justify-center ${config.color}`}>
                        <Webhook className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-[10px] text-muted-foreground">{config.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Jira Integration"
                    className="bg-muted/30 border-border/50"
                    data-testid="input-webhook-name"
                  />
                </div>

                {isJira ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Jira Site URL</Label>
                      <Input
                        value={jiraForm.siteUrl}
                        onChange={e => setJiraForm(prev => ({ ...prev, siteUrl: e.target.value }))}
                        placeholder="yourcompany.atlassian.net"
                        className="bg-muted/30 border-border/50"
                        data-testid="input-jira-site-url"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Webhook URL: https://{jiraForm.siteUrl || "yourcompany.atlassian.net"}/rest/api/3/issue
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Project Key</Label>
                        <Input
                          value={jiraForm.projectKey}
                          onChange={e => setJiraForm(prev => ({ ...prev, projectKey: e.target.value.toUpperCase() }))}
                          placeholder="SEC"
                          className="bg-muted/30 border-border/50"
                          data-testid="input-jira-project-key"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Issue Type</Label>
                        <Select value={jiraForm.issueType} onValueChange={v => setJiraForm(prev => ({ ...prev, issueType: v }))}>
                          <SelectTrigger className="bg-muted/30 border-border/50" data-testid="select-jira-issue-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bug">Bug</SelectItem>
                            <SelectItem value="Task">Task</SelectItem>
                            <SelectItem value="Story">Story</SelectItem>
                            <SelectItem value="Epic">Epic</SelectItem>
                            <SelectItem value="Sub-task">Sub-task</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Jira Email</Label>
                      <Input
                        value={jiraForm.email}
                        onChange={e => setJiraForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="you@company.com"
                        className="bg-muted/30 border-border/50"
                        data-testid="input-jira-email"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">API Token</Label>
                      <Input
                        type="password"
                        value={jiraForm.apiToken}
                        onChange={e => setJiraForm(prev => ({ ...prev, apiToken: e.target.value }))}
                        placeholder={editing ? "Leave blank to keep existing token" : "Your Jira API token"}
                        className="bg-muted/30 border-border/50"
                        data-testid="input-jira-api-token"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {editing && !jiraForm.apiToken
                          ? "Existing credentials will be preserved. Enter a new token to update."
                          : "Generate at id.atlassian.com/manage-profile/security/api-tokens"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={form.url}
                        onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://example.com/webhook"
                        className="bg-muted/30 border-border/50"
                        data-testid="input-webhook-url"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Authentication</Label>
                      <Select value={form.authType} onValueChange={v => setForm(prev => ({ ...prev, authType: v }))}>
                        <SelectTrigger className="bg-muted/30 border-border/50" data-testid="select-auth-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Authentication</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                          <SelectItem value="custom_header">Custom Header</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.authType !== "none" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Auth Configuration (JSON)</Label>
                        <Input
                          value={form.authConfig}
                          onChange={e => setForm(prev => ({ ...prev, authConfig: e.target.value }))}
                          placeholder={
                            editing
                              ? "Leave blank to keep existing credentials"
                              : form.authType === "bearer" ? '{"token": "your-token"}' :
                                form.authType === "basic" ? '{"username": "user", "password": "pass"}' :
                                form.authType === "api_key" ? '{"headerName": "X-API-Key", "key": "your-key"}' :
                                '{"headerName": "X-Custom", "headerValue": "value"}'
                          }
                          className="bg-muted/30 border-border/50 font-mono text-xs"
                          data-testid="input-auth-config"
                        />
                        {editing && !form.authConfig && (
                          <p className="text-[10px] text-muted-foreground">
                            Existing credentials will be preserved. Enter new JSON to update.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Event Triggers</Label>
                <div className="grid grid-cols-1 gap-2">
                  {webhookEvents.map(event => (
                    <label
                      key={event}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={form.events.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                        data-testid={`checkbox-event-${event}`}
                      />
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-sm">{eventLabels[event] || event}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="flex items-center justify-between">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={v => setForm(prev => ({ ...prev, enabled: v }))}
                  data-testid="switch-webhook-enabled"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#007aff] hover:bg-[#0066d6] text-white gap-2"
                  onClick={handleSubmit}
                  disabled={!canSubmit || createMut.isPending || updateMut.isPending}
                  data-testid="button-save-webhook"
                >
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Update" : "Create"} Webhook
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
