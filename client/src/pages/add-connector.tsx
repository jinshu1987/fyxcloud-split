import { useState } from "react";
import Layout from "@/components/layout";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Wifi, Clock, FolderOpen } from "lucide-react";
import { ProviderIcon } from "@/components/provider-icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import type { Project } from "@shared/schema";

function ConnectorProjectSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
        Assign to Project
        <span className="text-xs text-muted-foreground font-normal">(optional)</span>
      </Label>
      <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger data-testid="select-connector-project" className="h-10 bg-background border-border/60">
          <SelectValue placeholder="No project (organization-wide)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No project (organization-wide)</SelectItem>
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Assets discovered by this connector will be scoped to the selected project.
      </p>
    </div>
  );
}

const PROVIDERS = [
  {
    id: "AWS",
    name: "Amazon Web Services",
    shortLabel: "aws",
    color: "#FF9900",
    description: "Scan SageMaker, Bedrock, Lambda, and S3 across all regions for AI assets.",
    available: true,
  },
  {
    id: "Azure",
    name: "Microsoft Azure",
    shortLabel: "Az",
    color: "#0078D4",
    description: "Scan Azure ML, Cognitive Services, and OpenAI Service for AI assets.",
    available: true,
  },
  {
    id: "GCP",
    name: "Google Cloud Platform",
    shortLabel: "G",
    color: "#4285F4",
    description: "Scan Vertex AI, AI Platform, and Cloud Functions for AI assets.",
    available: true,
  },
  {
    id: "Hugging Face",
    name: "Hugging Face",
    shortLabel: "HF",
    color: "#FFD21E",
    description: "Connect to Hugging Face Hub to monitor your organization's models, datasets, spaces, and inference endpoints.",
    available: true,
  },
];

function AwsSetupForm() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [awsName, setAwsName] = useState("");
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [connectorProject, setConnectorProject] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [createError, setCreateError] = useState("");

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/aws/test", {
        name: awsName,
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTestStatus("success");
      setTestMessage(`Connected! AWS Account: ${data.accountId}`);
      toast({ title: "Connection successful", description: `AWS Account: ${data.accountId}`, variant: "success" });
    },
    onError: (err: any) => {
      setTestStatus("error");
      const msg = err.message || "Connection failed";
      setTestMessage(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, ""));
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    },
  });

  const createConnectorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/aws", {
        name: awsName,
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
        projectId: connectorProject || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      toast({ title: "Connector created", description: "Your cloud connector is ready.", variant: "success" });
      navigate("/connectors");
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to create connector";
      setCreateError(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, ""));
      toast({ title: "Failed to create connector", description: msg, variant: "destructive" });
    },
  });

  const canTest = awsName.length >= 2 && awsAccessKey.length >= 16 && awsSecretKey.length >= 20;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
        <p className="text-xs text-blue-400 leading-relaxed">
          Provide your AWS Access Key and Secret Key. We'll scan SageMaker, Bedrock, Lambda, and S3 across all regions for AI-related assets.
          Credentials are encrypted at rest and never exposed after saving.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aws-name" className="text-sm font-medium">Connection Name</Label>
        <Input
          id="aws-name"
          data-testid="input-aws-name"
          placeholder="e.g., Production AWS"
          value={awsName}
          onChange={(e) => setAwsName(e.target.value)}
          className="h-10 bg-background border-border/60"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="aws-access-key" className="text-sm font-medium">Access Key ID</Label>
        <Input
          id="aws-access-key"
          data-testid="input-aws-access-key"
          placeholder="AKIAIOSFODNN7EXAMPLE"
          value={awsAccessKey}
          onChange={(e) => setAwsAccessKey(e.target.value)}
          className="h-10 bg-background border-border/60 font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="aws-secret-key" className="text-sm font-medium">Secret Access Key</Label>
        <div className="relative">
          <Input
            id="aws-secret-key"
            data-testid="input-aws-secret-key"
            type={showSecret ? "text" : "password"}
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            value={awsSecretKey}
            onChange={(e) => setAwsSecretKey(e.target.value)}
            className="h-10 bg-background border-border/60 font-mono text-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-secret"
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <ConnectorProjectSelector value={connectorProject} onChange={setConnectorProject} />

      <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
        <p className="text-xs text-muted-foreground">All AWS regions will be scanned automatically when you sync.</p>
      </div>

      {testStatus === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-400">{testMessage}</p>
        </div>
      )}

      {testStatus === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{testMessage}</p>
        </div>
      )}

      {createError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{createError}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          data-testid="button-test-connection"
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10"
          disabled={!canTest || testConnectionMutation.isPending}
          onClick={() => {
            setTestStatus("testing");
            setTestMessage("");
            setCreateError("");
            testConnectionMutation.mutate();
          }}
        >
          {testConnectionMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
          ) : (
            <><Wifi className="mr-2 h-4 w-4" /> Test Connection</>
          )}
        </Button>
        <Button
          data-testid="button-save-connector"
          className="bg-primary hover:bg-primary/90"
          disabled={testStatus !== "success" || createConnectorMutation.isPending}
          onClick={() => {
            setCreateError("");
            createConnectorMutation.mutate();
          }}
        >
          {createConnectorMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Save & Connect"
          )}
        </Button>
      </div>
    </div>
  );
}

function AzureSetupForm() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [azureName, setAzureName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [connectorProject, setConnectorProject] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [createError, setCreateError] = useState("");

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/azure/test", {
        name: azureName,
        tenantId,
        clientId,
        clientSecret,
        subscriptionId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTestStatus("success");
      setTestMessage(`Connected! Subscription: ${data.accountId}`);
      toast({ title: "Connection successful", description: `Subscription: ${data.accountId}`, variant: "success" });
    },
    onError: (err: any) => {
      setTestStatus("error");
      const msg = err.message || "Connection failed";
      setTestMessage(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, ""));
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    },
  });

  const createConnectorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/azure", {
        name: azureName,
        tenantId,
        clientId,
        clientSecret,
        subscriptionId,
        projectId: connectorProject || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      toast({ title: "Connector created", description: "Your Azure connector is ready.", variant: "success" });
      navigate("/connectors");
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to create connector";
      setCreateError(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, ""));
      toast({ title: "Failed to create connector", description: msg, variant: "destructive" });
    },
  });

  const canTest = azureName.length >= 2 && tenantId.length >= 8 && clientId.length >= 8 && clientSecret.length >= 8 && subscriptionId.length >= 8;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
        <p className="text-xs text-blue-400 leading-relaxed">
          Provide your Azure Service Principal credentials. We'll scan Azure ML, Cognitive Services (including OpenAI), and AI Search for AI-related assets.
          Credentials are encrypted at rest.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="azure-name" className="text-sm font-medium">Connection Name</Label>
        <Input
          id="azure-name"
          data-testid="input-azure-name"
          placeholder="e.g., Production Azure"
          value={azureName}
          onChange={(e) => setAzureName(e.target.value)}
          className="h-10 bg-background border-border/60"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="azure-tenant-id" className="text-sm font-medium">Tenant ID</Label>
        <Input
          id="azure-tenant-id"
          data-testid="input-azure-tenant-id"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="h-10 bg-background border-border/60 font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="azure-client-id" className="text-sm font-medium">Client (Application) ID</Label>
        <Input
          id="azure-client-id"
          data-testid="input-azure-client-id"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="h-10 bg-background border-border/60 font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="azure-client-secret" className="text-sm font-medium">Client Secret</Label>
        <div className="relative">
          <Input
            id="azure-client-secret"
            data-testid="input-azure-client-secret"
            type={showSecret ? "text" : "password"}
            placeholder="Enter your client secret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="h-10 bg-background border-border/60 font-mono text-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-azure-secret"
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="azure-subscription-id" className="text-sm font-medium">Subscription ID</Label>
        <Input
          id="azure-subscription-id"
          data-testid="input-azure-subscription-id"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={subscriptionId}
          onChange={(e) => setSubscriptionId(e.target.value)}
          className="h-10 bg-background border-border/60 font-mono text-sm"
        />
      </div>

      <ConnectorProjectSelector value={connectorProject} onChange={setConnectorProject} />

      <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
        <p className="text-xs text-muted-foreground">All Azure resource groups will be scanned automatically.</p>
      </div>

      {testStatus === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-400">{testMessage}</p>
        </div>
      )}

      {testStatus === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{testMessage}</p>
        </div>
      )}

      {createError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{createError}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          data-testid="button-test-azure-connection"
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10"
          disabled={!canTest || testConnectionMutation.isPending}
          onClick={() => {
            setTestStatus("testing");
            setTestMessage("");
            setCreateError("");
            testConnectionMutation.mutate();
          }}
        >
          {testConnectionMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
          ) : (
            <><Wifi className="mr-2 h-4 w-4" /> Test Connection</>
          )}
        </Button>
        <Button
          data-testid="button-save-azure-connector"
          className="bg-primary hover:bg-primary/90"
          disabled={testStatus !== "success" || createConnectorMutation.isPending}
          onClick={() => {
            setCreateError("");
            createConnectorMutation.mutate();
          }}
        >
          {createConnectorMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Save & Connect"
          )}
        </Button>
      </div>
    </div>
  );
}

function GcpSetupForm() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [gcpName, setGcpName] = useState("");
  const [gcpProjectId, setGcpProjectId] = useState("");
  const [serviceAccountKey, setServiceAccountKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connectorProject, setConnectorProject] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [createError, setCreateError] = useState("");

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/gcp/test", {
        name: gcpName,
        projectId: gcpProjectId,
        serviceAccountKey,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTestStatus("success");
      setTestMessage(`Connected! Project: ${data.accountId}`);
      toast({ title: "Connection successful", description: `Project: ${data.accountId}`, variant: "success" });
    },
    onError: (err: any) => {
      setTestStatus("error");
      const msg = err.message || "Connection failed";
      setTestMessage(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, ""));
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    },
  });

  const createConnectorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/gcp", {
        name: gcpName,
        projectId: gcpProjectId,
        serviceAccountKey,
        connectorProjectId: connectorProject || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      toast({ title: "Connector created", description: "Your GCP connector is ready.", variant: "success" });
      navigate("/connectors");
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to create connector";
      setCreateError(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, ""));
      toast({ title: "Failed to create connector", description: msg, variant: "destructive" });
    },
  });

  const canTest = gcpName.length >= 2 && gcpProjectId.length >= 4 && serviceAccountKey.length >= 50;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
        <p className="text-xs text-blue-400 leading-relaxed">
          Provide your GCP Service Account key JSON. We'll scan Vertex AI endpoints, models, datasets, and pipelines.
          Credentials are encrypted at rest.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gcp-name" className="text-sm font-medium">Connection Name</Label>
        <Input
          id="gcp-name"
          data-testid="input-gcp-name"
          placeholder="e.g., Production GCP"
          value={gcpName}
          onChange={(e) => setGcpName(e.target.value)}
          className="h-10 bg-background border-border/60"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gcp-project-id" className="text-sm font-medium">GCP Project ID</Label>
        <Input
          id="gcp-project-id"
          data-testid="input-gcp-project-id"
          placeholder="my-project-id"
          value={gcpProjectId}
          onChange={(e) => setGcpProjectId(e.target.value)}
          className="h-10 bg-background border-border/60 font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gcp-service-account-key" className="text-sm font-medium">Service Account Key JSON</Label>
        <div className="relative">
          <textarea
            id="gcp-service-account-key"
            data-testid="input-gcp-service-account-key"
            rows={6}
            placeholder={showKey ? '{\n  "type": "service_account",\n  "project_id": "my-project",\n  "private_key_id": "key-id",\n  "private_key": "<your-private-key>",\n  "client_email": "name@project.iam.gserviceaccount.com"\n}' : "Paste your service account JSON key here..."}
            value={showKey ? serviceAccountKey : serviceAccountKey ? "•".repeat(Math.min(serviceAccountKey.length, 200)) : ""}
            onChange={(e) => {
              if (showKey) {
                setServiceAccountKey(e.target.value);
              }
            }}
            onFocus={() => {
              if (!showKey) setShowKey(true);
            }}
            className="flex w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-gcp-key"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <ConnectorProjectSelector value={connectorProject} onChange={setConnectorProject} />

      <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
        <p className="text-xs text-muted-foreground">Vertex AI resources will be scanned across common regions.</p>
      </div>

      {testStatus === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-400">{testMessage}</p>
        </div>
      )}

      {testStatus === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{testMessage}</p>
        </div>
      )}

      {createError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{createError}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          data-testid="button-test-gcp-connection"
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10"
          disabled={!canTest || testConnectionMutation.isPending}
          onClick={() => {
            setTestStatus("testing");
            setTestMessage("");
            setCreateError("");
            testConnectionMutation.mutate();
          }}
        >
          {testConnectionMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
          ) : (
            <><Wifi className="mr-2 h-4 w-4" /> Test Connection</>
          )}
        </Button>
        <Button
          data-testid="button-save-gcp-connector"
          className="bg-primary hover:bg-primary/90"
          disabled={testStatus !== "success" || createConnectorMutation.isPending}
          onClick={() => {
            setCreateError("");
            createConnectorMutation.mutate();
          }}
        >
          {createConnectorMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Save & Connect"
          )}
        </Button>
      </div>
    </div>
  );
}

function HuggingFaceSetupForm() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [hfName, setHfName] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [organization, setOrganization] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connectorProject, setConnectorProject] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [createError, setCreateError] = useState("");

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/huggingface/test", {
        name: hfName,
        apiToken,
        organization,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTestStatus("success");
      setTestMessage(`Connected! Organization: ${data.accountId}`);
      toast({ title: "Connection successful", description: `Organization: ${data.accountId}`, variant: "success" });
    },
    onError: (err: any) => {
      setTestStatus("error");
      const msg = err.message || "Connection failed";
      setTestMessage(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, ""));
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    },
  });

  const createConnectorMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/huggingface", {
        name: hfName,
        apiToken,
        organization,
        connectorProjectId: connectorProject || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors"] });
      toast({ title: "Connector created", description: "Your Hugging Face connector is ready.", variant: "success" });
      navigate("/connectors");
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to create connector";
      setCreateError(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, ""));
      toast({ title: "Failed to create connector", description: msg, variant: "destructive" });
    },
  });

  const canTest = hfName.length >= 2 && apiToken.length >= 8 && organization.length >= 1;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
        <p className="text-xs text-blue-400 leading-relaxed">
          Provide your Hugging Face API token and organization name. We'll discover all models, datasets, spaces, and inference endpoints.
          Get your token from huggingface.co/settings/tokens.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hf-name" className="text-sm font-medium">Connection Name</Label>
        <Input
          id="hf-name"
          data-testid="input-hf-name"
          placeholder="e.g., Production Hugging Face"
          value={hfName}
          onChange={(e) => setHfName(e.target.value)}
          className="h-10 bg-background border-border/60"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hf-api-token" className="text-sm font-medium">API Token</Label>
        <div className="relative">
          <Input
            id="hf-api-token"
            data-testid="input-hf-api-token"
            type={showToken ? "text" : "password"}
            placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            className="h-10 bg-background border-border/60 font-mono text-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-hf-token"
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hf-organization" className="text-sm font-medium">Organization / Username</Label>
        <Input
          id="hf-organization"
          data-testid="input-hf-organization"
          placeholder="your-org-name"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="h-10 bg-background border-border/60 font-mono text-sm"
        />
      </div>

      <ConnectorProjectSelector value={connectorProject} onChange={setConnectorProject} />

      <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
        <p className="text-xs text-muted-foreground">All repositories and inference endpoints under the organization will be scanned.</p>
      </div>

      {testStatus === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-400">{testMessage}</p>
        </div>
      )}

      {testStatus === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{testMessage}</p>
        </div>
      )}

      {createError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/15">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{createError}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          data-testid="button-test-hf-connection"
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10"
          disabled={!canTest || testConnectionMutation.isPending}
          onClick={() => {
            setTestStatus("testing");
            setTestMessage("");
            setCreateError("");
            testConnectionMutation.mutate();
          }}
        >
          {testConnectionMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
          ) : (
            <><Wifi className="mr-2 h-4 w-4" /> Test Connection</>
          )}
        </Button>
        <Button
          data-testid="button-save-hf-connector"
          className="bg-primary hover:bg-primary/90"
          disabled={testStatus !== "success" || createConnectorMutation.isPending}
          onClick={() => {
            setCreateError("");
            createConnectorMutation.mutate();
          }}
        >
          {createConnectorMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Save & Connect"
          )}
        </Button>
      </div>
    </div>
  );
}

export default function AddConnectorPage() {
  const [, navigate] = useLocation();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button
            data-testid="button-back-connectors"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate("/connectors")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold tracking-tight text-foreground font-mono">
              {selectedProvider ? `Connect ${PROVIDERS.find(p => p.id === selectedProvider)?.name}` : "Add Connector"}
            </h1>
            <p className="text-muted-foreground">
              {selectedProvider ? "Configure your cloud provider credentials below." : "Select a cloud provider to connect."}
            </p>
          </div>
        </div>

        {!selectedProvider ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
            {PROVIDERS.map((provider, i) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  data-testid={`card-provider-${provider.id.toLowerCase()}`}
                  className={`glass-panel border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-xl transition-all duration-300 ${
                    provider.available
                      ? "hover:border-primary/40 cursor-pointer hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)]"
                      : "opacity-60"
                  }`}
                  onClick={() => provider.available && setSelectedProvider(provider.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${provider.color}15` }}
                      >
                        <ProviderIcon provider={provider.id} size={32} />
                      </div>
                      {provider.available ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border/30 text-[10px]">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-base font-semibold mb-1">{provider.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{provider.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-panel border-white/5 bg-card/40 dark:border-white/5 dark:bg-card/40 border-border/60 bg-white/60 backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/40">
                  {(() => {
                    const p = PROVIDERS.find(pr => pr.id === selectedProvider)!;
                    return (
                      <>
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${p.color}15` }}
                        >
                          <ProviderIcon provider={p.id} size={28} />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">{p.name}</h2>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        </div>
                      </>
                    );
                  })()}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedProvider(null)}
                    data-testid="button-change-provider"
                  >
                    Change Provider
                  </Button>
                </div>

                {selectedProvider === "AWS" && <AwsSetupForm />}
                {selectedProvider === "Azure" && <AzureSetupForm />}
                {selectedProvider === "GCP" && <GcpSetupForm />}
                {selectedProvider === "Hugging Face" && <HuggingFaceSetupForm />}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
