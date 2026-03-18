import { storage } from "./storage";
import type { PolicyFinding, Webhook } from "@shared/schema";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

function buildJiraPayload(finding: PolicyFinding, webhook?: Webhook): Record<string, unknown> {
  const severityToJiraPriority: Record<string, string> = {
    Critical: "Highest",
    High: "High",
    Medium: "Medium",
    Low: "Low",
    Info: "Lowest",
  };

  let projectKey: string | undefined;
  let issueType: string | undefined;
  if (webhook?.authConfig) {
    try {
      const config = JSON.parse(webhook.authConfig);
      projectKey = config.projectKey;
      issueType = config.issueType;
    } catch {}
  }

  const fields: Record<string, unknown> = {
    summary: `[${finding.severity}] ${finding.finding}`,
    description: `*Asset:* ${finding.assetName} (${finding.assetType})\n*Rule:* ${finding.ruleId}\n*Severity:* ${finding.severity}\n*Status:* ${finding.status}\n\n*Impact:*\n${finding.impact || "N/A"}\n\n*Remediation:*\n${finding.remediation || "N/A"}\n\n*Evidence:*\n${finding.evidence || "N/A"}`,
    priority: { name: severityToJiraPriority[finding.severity] || "Medium" },
    labels: ["ai-spm", finding.ruleId, finding.severity.toLowerCase()],
  };

  if (projectKey) {
    fields.project = { key: projectKey };
  }
  if (issueType) {
    fields.issuetype = { name: issueType };
  }

  return { fields };
}

function buildSplunkPayload(event: string, data: Record<string, unknown>): Record<string, unknown> {
  return {
    event: {
      sourcetype: "ai-spm",
      event_type: event,
      ...data,
    },
    source: "fyx-cloud",
    sourcetype: "ai-spm:finding",
  };
}

function buildArmorCodePayload(finding: PolicyFinding): Record<string, unknown> {
  return {
    tool: "fyx-cloud",
    finding: {
      id: finding.id,
      title: finding.finding,
      severity: finding.severity,
      status: finding.status,
      asset: finding.assetName,
      assetType: finding.assetType,
      ruleId: finding.ruleId,
      impact: finding.impact,
      remediation: finding.remediation,
      evidence: finding.evidence,
      detectedAt: finding.detectedAt,
    },
  };
}

function buildPayloadForType(webhook: Webhook, event: string, data: Record<string, unknown>): Record<string, unknown> {
  const finding = data.finding as PolicyFinding | undefined;
  
  switch (webhook.type) {
    case "jira":
      if (finding) return buildJiraPayload(finding, webhook);
      return { fields: { summary: `AI-SPM Event: ${event}`, description: JSON.stringify(data, null, 2) } };
    case "splunk":
      return buildSplunkPayload(event, data);
    case "armorcode":
      if (finding) return buildArmorCodePayload(finding);
      return { tool: "fyx-cloud", event, data };
    case "slack":
      return {
        text: finding 
          ? `:warning: *${finding.severity} Finding*: ${finding.finding}\nAsset: ${finding.assetName} | Rule: ${finding.ruleId}`
          : `:information_source: AI-SPM Event: ${event}`,
      };
    default:
      return { event, timestamp: new Date().toISOString(), data };
  }
}

function buildHeaders(webhook: Webhook): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "FyxCloud-Webhook/1.0",
  };

  if (webhook.authType === "none" || !webhook.authConfig) return headers;

  try {
    const config = JSON.parse(webhook.authConfig);
    switch (webhook.authType) {
      case "bearer":
        headers["Authorization"] = `Bearer ${config.token}`;
        break;
      case "basic":
        headers["Authorization"] = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
        break;
      case "api_key":
        headers[config.headerName || "X-API-Key"] = config.key;
        break;
      case "custom_header":
        headers[config.headerName] = config.headerValue;
        break;
    }
  } catch {}

  return headers;
}

export async function dispatchWebhookEvent(orgId: string, event: string, data: Record<string, unknown>): Promise<void> {
  try {
    const matchingWebhooks = await storage.getWebhooksByEvent(orgId, event);
    if (matchingWebhooks.length === 0) return;

    await Promise.allSettled(
      matchingWebhooks.map(webhook => sendWebhook(webhook, event, data))
    );
  } catch (err) {
    console.error("Webhook dispatch error:", err);
  }
}

async function sendWebhook(webhook: Webhook, event: string, data: Record<string, unknown>): Promise<void> {
  const payload = buildPayloadForType(webhook, event, data);
  const headers = buildHeaders(webhook);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const status = response.ok ? "success" : `error:${response.status}`;
    await storage.updateWebhook(webhook.id, {
      lastTriggered: new Date().toISOString(),
      lastStatus: status,
      failureCount: response.ok ? 0 : (webhook.failureCount || 0) + 1,
    });

    if (!response.ok) {
      console.error(`Webhook ${webhook.name} failed with status ${response.status}`);
    }
  } catch (err: any) {
    await storage.updateWebhook(webhook.id, {
      lastTriggered: new Date().toISOString(),
      lastStatus: `error:${err.message}`,
      failureCount: (webhook.failureCount || 0) + 1,
    });
    console.error(`Webhook ${webhook.name} dispatch error:`, err.message);
  }
}

export async function testWebhook(webhook: Webhook): Promise<{ success: boolean; status: number | null; message: string; responseBody: string | null }> {
  const testPayload = buildPayloadForType(webhook, "test.ping", {
    message: "This is a test webhook from Fyx Cloud AI-SPM",
    timestamp: new Date().toISOString(),
  });
  const headers = buildHeaders(webhook);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });
    let responseBody = "";
    try {
      responseBody = await response.text();
      if (responseBody.length > 500) responseBody = responseBody.substring(0, 500) + "...";
    } catch {}

    const status = response.ok ? "success" : `error:${response.status}`;
    await storage.updateWebhook(webhook.id, {
      lastTriggered: new Date().toISOString(),
      lastStatus: status,
      failureCount: response.ok ? 0 : (webhook.failureCount || 0) + 1,
    });

    return {
      success: response.ok,
      status: response.status,
      message: response.ok
        ? "Webhook delivered successfully"
        : `Failed with HTTP ${response.status}: ${response.statusText}`,
      responseBody,
    };
  } catch (err: any) {
    await storage.updateWebhook(webhook.id, {
      lastTriggered: new Date().toISOString(),
      lastStatus: `error:${err.message}`,
      failureCount: (webhook.failureCount || 0) + 1,
    });

    return {
      success: false,
      status: null,
      message: err.message || "Connection failed",
      responseBody: null,
    };
  }
}
