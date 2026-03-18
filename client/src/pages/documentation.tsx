import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { FyxLogo } from "@/components/fyx-logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, BookOpen, LayoutDashboard, Network, CloudCog, ShieldAlert,
  AlertTriangle, Scale, Hexagon, FileText, Webhook, Users, KeyRound,
  Settings, Rocket, ArrowLeft
} from "lucide-react";

const cardClass = "bg-card/60 backdrop-blur-xl border border-white/10 rounded-xl";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    content: [
      "FYX Cloud AI Security is a comprehensive AI Security Posture Management (AI-SPM) platform designed to help organizations discover, monitor, and secure their AI and machine learning assets across cloud environments. The platform provides continuous visibility into AI model deployments, data pipelines, and associated infrastructure, enabling security teams to identify risks before they become incidents.",
      "To begin using FYX Cloud, start by navigating to the Dashboard after logging in. The dashboard provides a high-level overview of your security posture, including the total number of monitored AI models, active alerts, resources under management, and your overall security score. From the sidebar, you can access all major platform features including the Security Graph, Policy Engine, Findings, Compliance Mapping, and Reports.",
      "Your first step should be setting up a Cloud Connector to link your cloud accounts. Navigate to Cloud Connectors in the sidebar and click 'Add Connector.' FYX Cloud supports AWS, Microsoft Azure, Google Cloud Platform, and Hugging Face. For AWS, provide your Access Key ID and Secret Access Key. For Azure, provide your Service Principal credentials. For GCP, provide your Service Account JSON key. For Hugging Face, provide your API token and organization name. Once connected, FYX Cloud will automatically discover and inventory all AI-related resources in your environment.",
      "After your connector is synced, explore the Policy Engine to review the 170+ built-in security policies. These policies are organized into categories such as Discovery, Infrastructure, Data Security, Identity & Access, Guardrails, Supply Chain, Monitoring, Governance, Runtime Security, Network Security, and Compliance — with specialized rules for each cloud provider. You can enable or disable individual policies based on your organization's requirements and risk tolerance."
    ]
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    content: [
      "The Dashboard is the central command center of FYX Cloud, providing real-time visibility into your AI security posture at a glance. The top row displays four key metrics: Total Models (the number of AI/ML models discovered and monitored), Active Alerts (current unresolved security alerts), Resources Monitored (total cloud resources under surveillance), and Security Score (a composite score from 0-100% based on your overall risk posture).",
      "The Policy Finding Trends chart shows the volume and severity distribution of policy findings over time. You can toggle between 'By Severity' view (showing Critical, High, Medium, and Low findings as stacked areas) and 'Volume' view (showing total new findings versus resolved findings). The time range selector allows you to view trends across 7, 14, 30, 60, or 90 days. Below the chart, summary cards display total, open, resolved, acknowledged, and suppressed finding counts.",
      "The Model Risk Distribution bar chart visualizes how your AI models are distributed across risk score ranges (0-20, 21-40, 41-60, 61-80, 81-100). This helps identify clusters of high-risk models that need immediate attention. The Alert Severity Breakdown donut chart shows the proportion of alerts by severity level, giving you a quick sense of how critical your current alert queue is.",
      "The Resource Risk Overview section provides a horizontal bar chart breaking down resources by their risk classification. The Connector Status widget shows the health of your cloud integrations, indicating how many connectors are active, syncing, or experiencing errors. Recent Alerts and Top Risk Models tables at the bottom highlight the most urgent items requiring security team attention.",
      "Use the dashboard as your daily starting point to assess overnight changes, prioritize triage work, and track progress on remediation efforts. The security score trends over time help demonstrate improvements to stakeholders and compliance auditors."
    ]
  },
  {
    id: "security-graph",
    title: "Security Graph",
    icon: Network,
    content: [
      "The Security Graph provides an interactive, force-directed network visualization of all discovered AI assets and their relationships. Each node represents a cloud resource such as an AI model, data store, compute instance, IAM role, or network component. Edges between nodes indicate relationships like 'uses,' 'has access to,' 'stores data for,' or 'is deployed on,' creating a comprehensive map of your AI attack surface.",
      "Nodes are color-coded by resource type and sized proportionally to their risk score, making it easy to spot high-risk assets visually. You can click any node to view its details, including associated findings, policies, and relationships. The graph supports zoom, pan, and drag interactions for exploring complex environments with hundreds of interconnected resources.",
      "Use the filter panel on the left to narrow the graph by resource type (e.g., show only ML models and their data sources), severity level, or specific connector. The search bar at the top lets you find specific assets by name or identifier. The 'Blast Radius' feature, activated by right-clicking a node, highlights all resources that would be impacted if that asset were compromised, helping you understand the downstream risk of any vulnerability.",
      "The Security Graph is particularly valuable for understanding lateral movement paths an attacker could exploit. For example, you might discover that an overly permissive IAM role attached to a Lambda function grants access to an S3 bucket containing sensitive training data, which in turn feeds a production ML model. These chains of relationships are difficult to identify from individual resource views but become immediately apparent in the graph.",
      "Export the graph view as a PNG image for inclusion in security reports or presentations. The graph data can also be exported as JSON for integration with other security tools or custom analysis pipelines."
    ]
  },
  {
    id: "connectors",
    title: "Cloud Connectors",
    icon: CloudCog,
    content: [
      "Cloud Connectors are the integration points between FYX Cloud and your cloud provider accounts. FYX Cloud supports four connector types: AWS (SageMaker, Bedrock, Lambda, S3, and 20+ services), Microsoft Azure (Azure ML, Cognitive Services, Azure OpenAI, AI Search), Google Cloud Platform (Vertex AI endpoints, models, datasets, pipelines), and Hugging Face (models, datasets, spaces, inference endpoints). Each connector maintains a continuous sync to detect configuration changes and new resource deployments.",
      "To add a connector, navigate to Cloud Connectors and click 'Add Connector.' Select your provider and enter the required credentials: AWS Access Key ID and Secret Access Key, Azure Service Principal (Tenant ID, Client ID, Client Secret, Subscription ID), GCP Service Account JSON key, or Hugging Face API token with organization name. Credentials should have read-only access to the services you want to monitor.",
      "Once configured, the connector will perform an initial discovery scan that typically completes within 5-15 minutes depending on the size of your environment. Subsequent syncs run automatically at configurable intervals (default: every 6 hours). You can trigger a manual sync at any time from the connector card. The sync process inventories all AI-related resources, evaluates them against enabled policies, and generates findings for any violations detected.",
      "If a connector shows an error status, common causes include expired or rotated credentials, insufficient permissions, or network connectivity issues. The connector card shows the last error message and timestamp to help with troubleshooting.",
      "You can manage multiple connectors across different cloud providers and accounts, enabling centralized security monitoring across your entire multi-cloud AI footprint. Each connector's findings and resources are tagged with the connector name and account ID for easy filtering throughout the platform."
    ]
  },
  {
    id: "policies",
    title: "Policy Engine",
    icon: ShieldAlert,
    content: [
      "The Policy Engine is the core detection system in FYX Cloud, containing over 170 pre-built security policies specifically designed for AI and machine learning workloads across AWS, Azure, GCP, and Hugging Face. Each policy defines a specific security check—for example, 'SageMaker endpoint should have data encryption enabled,' 'Azure OpenAI endpoint should not be publicly accessible,' 'Vertex AI notebook should not have public IP,' or 'Hugging Face model should not use unsafe pickle format.' Policies are evaluated automatically during connector syncs and generate findings when violations are detected.",
      "Policies are organized into categories that map to AI security domains: Discovery (DIS) covers asset identification and classification, Infrastructure (INF) addresses compute and storage security, Data Security (DAT) focuses on encryption and data protection, Identity & Access (IAM) checks permissions and role configurations, Guardrails (GRD) validates model input/output controls, Supply Chain (SUP) examines model provenance and dependencies, Monitoring (MON) ensures logging and observability, Governance (GOV) covers model lifecycle management, Runtime Security (RUN) detects runtime anomalies, Network Security (NET) validates network isolation, and Compliance (COM) maps to regulatory requirements.",
      "Each policy has a severity level (Critical, High, Medium, or Low) that reflects the potential impact of the violation. You can enable or disable individual policies from the Policies page. When a policy is disabled, it will not generate new findings during future scans, but existing findings from that policy will remain visible until resolved or suppressed. You can also bulk-enable or bulk-disable policies by category.",
      "The Hex Scanner category (HEX) deserves special attention—these policies scan AI model container images and Python packages for known vulnerabilities, malicious code patterns, and insecure configurations. The Hex Scanner examines package manifests, checks for known CVEs in ML libraries (PyTorch, TensorFlow, Hugging Face Transformers, etc.), and identifies suspicious code patterns that could indicate supply chain attacks.",
      "For organizations with specific security requirements beyond the built-in policies, the platform supports custom policy definitions. Contact your FYX Cloud administrator to request custom policies that match your organization's unique compliance requirements or security baselines."
    ]
  },
  {
    id: "findings",
    title: "Findings",
    icon: AlertTriangle,
    content: [
      "Findings are the actionable security issues generated when a policy evaluation detects a violation. Each finding includes the affected asset name, asset type, the specific policy rule that was violated, severity level, detailed evidence of the violation, impact analysis, and recommended remediation steps. Findings are the primary workflow item for security teams using FYX Cloud.",
      "Findings have four severity levels: Critical (immediate threat requiring urgent action, such as publicly exposed model endpoints or unencrypted sensitive training data), High (significant risk that should be addressed within days, such as overly permissive IAM roles), Medium (moderate risk items for scheduled remediation, such as missing logging configurations), and Low (best practice improvements with minimal immediate risk, such as resource tagging gaps).",
      "The finding lifecycle follows a status workflow: Open → Acknowledged → Resolved, with additional states for Suppressed and False Positive. When a new finding is created, it starts in 'Open' status. A security engineer can 'Acknowledge' the finding to indicate they are aware and working on it. Once the underlying issue is fixed and verified in a subsequent scan, the finding moves to 'Resolved.' Findings that represent accepted risks can be 'Suppressed,' and incorrect detections can be marked as 'False Positive' with a required justification note.",
      "The Findings page provides powerful filtering and search capabilities. You can filter by severity, status, category, specific policy rule, asset type, or time range. The search bar supports free-text search across finding descriptions, asset names, and evidence. Bulk actions allow you to acknowledge, suppress, or mark multiple findings simultaneously, which is especially useful during initial onboarding when you may need to triage a large number of existing issues.",
      "Each finding includes an Automated Remediation section that provides executable scripts (AWS CLI, Azure CLI, gcloud CLI commands, Terraform configurations, IAM/RBAC policies, or Python scripts) to fix the underlying issue. These scripts include risk assessments, prerequisites, estimated execution time, and rollback steps. Scripts marked 'Approval Required' involve changes that could impact production workloads and should be reviewed before execution."
    ]
  },
  {
    id: "compliance",
    title: "Compliance Mapping",
    icon: Scale,
    content: [
      "FYX Cloud maps policy findings to five major compliance and security frameworks: NIST AI RMF (AI Risk Management Framework), OWASP ML Top 10 (Machine Learning Security Risks), MITRE ATLAS (Adversarial Threat Landscape for AI Systems), EU AI Act requirements, and ISO 27001 controls. This mapping enables organizations to demonstrate compliance posture to auditors and regulators using evidence directly from their AI security monitoring.",
      "The Compliance page displays each framework as a card showing the overall compliance score (percentage of mapped controls that are fully satisfied), the number of controls in compliant, partially compliant, and non-compliant states, and a trend indicator showing improvement or regression over time. Click on any framework card to drill into the specific controls and see which policies map to each control requirement.",
      "Compliance scores are calculated based on the status of policy findings mapped to each framework control. A control is 'Compliant' when all mapped policies have no open findings, 'Partially Compliant' when some findings exist but the most critical ones are resolved, and 'Non-Compliant' when critical or high-severity findings remain open for the mapped policies. The overall framework score is a weighted average of individual control scores.",
      "For each control, you can view the list of mapped policies, their current findings, and evidence of compliance or non-compliance. This evidence can be exported as part of a Compliance Report (see Reports section) for submission to auditors. The platform maintains a historical record of compliance scores, enabling you to demonstrate continuous improvement over time.",
      "The compliance mapping is updated automatically as new findings are created or resolved. When you remediate a finding, the corresponding compliance control score adjusts immediately, providing real-time feedback on how your remediation efforts impact your overall compliance posture."
    ]
  },
  {
    id: "ai-bom",
    title: "AI Bill of Materials",
    icon: Hexagon,
    content: [
      "The AI Bill of Materials (AI-BOM) provides a comprehensive inventory of all components that make up your AI/ML deployments, including model architectures, training frameworks, Python packages, container base images, data sources, and deployment configurations. Think of it as a software bill of materials (SBOM) specifically designed for AI systems, capturing not just code dependencies but also model provenance, training data lineage, and inference pipeline configurations.",
      "The Hex Scanner is the engine behind AI-BOM generation. It performs deep inspection of AI model containers and deployment artifacts by scanning Python package manifests (requirements.txt, setup.py, Pipfile), container image layers (Dockerfile analysis), model serialization formats (pickle files, ONNX models, SavedModel archives), and configuration files. The scanner checks each component against known vulnerability databases and malicious package registries.",
      "For each AI asset, the AI-BOM shows a hierarchical view of dependencies: the top-level model, its framework dependencies (e.g., PyTorch 2.1.0, Transformers 4.35.0), transitive dependencies (e.g., numpy, scipy, tokenizers), and any known vulnerabilities (CVEs) affecting those packages. Vulnerabilities are cross-referenced with severity ratings from the National Vulnerability Database (NVD) and annotated with AI-specific risk context.",
      "The Hex Scanner also identifies risky patterns in AI deployments, such as the use of pickle serialization (which can execute arbitrary code during deserialization), models downloaded from unverified sources, packages with known malicious versions (typosquatting attacks on popular ML libraries), and containers running as root with unnecessary privileges. These patterns are surfaced as Supply Chain (SUP) category findings with remediation guidance.",
      "AI-BOM data can be exported in standard SBOM formats (CycloneDX, SPDX) for integration with your organization's existing software composition analysis (SCA) tools and vulnerability management workflows. This enables unified tracking of both traditional software and AI-specific supply chain risks."
    ]
  },
  {
    id: "reports",
    title: "Reports",
    icon: FileText,
    content: [
      "FYX Cloud provides six built-in report types that cover different aspects of your AI security posture: Executive Summary (high-level metrics for leadership), Security Posture Report (detailed findings and trends), Compliance Report (framework-specific compliance evidence), Model Risk Assessment (per-model risk analysis), Asset Inventory Report (comprehensive resource listing), and Incident Report (specific finding deep-dives with timeline and remediation status).",
      "The Executive Summary report is designed for CISO-level consumption and includes key metrics like overall security score trend, critical finding counts, compliance posture across frameworks, and top risk areas. It provides month-over-month comparisons and highlights significant changes that require attention. This report can be scheduled for automatic generation and email delivery on a weekly or monthly basis.",
      "The Compliance Report is essential for audit preparation. It includes per-framework control mapping with evidence, gap analysis showing which controls are not fully satisfied, historical compliance score trends, and recommended remediation priorities to achieve compliance targets. Each control entry includes direct links to the relevant findings and policies for auditor verification.",
      "All reports can be exported as PDF documents with professional formatting, charts, and branding. Reports include a table of contents, executive summary, detailed sections with data tables and visualizations, and appendices with raw data. The PDF export includes all charts as high-resolution images and preserves the visual styling of the web interface.",
      "You can generate reports on-demand from the Reports page or schedule them for automatic generation. Scheduled reports can be configured with specific filters (e.g., only findings from a particular connector or project), time ranges, and delivery destinations (email, webhook, or downloadable archive). Report history is maintained for 90 days, allowing you to compare reports across different time periods."
    ]
  },
  {
    id: "webhooks",
    title: "Webhooks & Integrations",
    icon: Webhook,
    content: [
      "FYX Cloud supports outbound webhooks and integrations with popular DevOps, security, and incident management tools. Currently supported integrations include Jira (for creating tickets from findings), Slack (for real-time alert notifications), Splunk (for SIEM integration and log forwarding), and ArmorCode (for vulnerability management orchestration). Webhooks can also send raw JSON payloads to any HTTP endpoint for custom integrations.",
      "To set up a Jira integration, navigate to Integrations and select 'Add Integration.' Provide your Jira instance URL, project key, and an API token with ticket creation permissions. You can configure which finding severities automatically create Jira tickets, map finding fields to Jira fields (severity → priority, asset name → component, remediation → description), and set the default issue type. When a finding is resolved in FYX Cloud, the corresponding Jira ticket can be automatically transitioned to 'Done.'",
      "The Slack integration sends formatted alert messages to specified channels when new findings are detected. You can configure notification rules based on severity (e.g., only notify for Critical and High findings), category, or specific policy rules. Slack messages include the finding title, severity badge, affected asset, and a direct link back to the finding detail page in FYX Cloud. Use Slack's workflow builder to create automated triage processes triggered by these notifications.",
      "The Splunk integration forwards finding events as structured JSON to your Splunk HTTP Event Collector (HEC). Each event includes the full finding details, asset metadata, policy information, and compliance mapping references. This enables correlation of AI security events with other security telemetry in your SIEM, supporting unified incident investigation and threat hunting across your entire security ecosystem.",
      "Generic webhooks support custom payloads with configurable HTTP headers, authentication (API key, Bearer token, or Basic auth), and retry logic for failed deliveries. Webhook events are triggered for finding creation, status changes, connector sync completion, and compliance score changes. Each webhook delivery is logged with status, response code, and response time for troubleshooting."
    ]
  },
  {
    id: "users",
    title: "User Management",
    icon: Users,
    content: [
      "FYX Cloud implements role-based access control (RBAC) with five predefined roles: Owner, Admin, Security Engineer, Analyst, and Viewer. Each role provides a different level of access to platform features and data, enabling organizations to follow the principle of least privilege when granting access to their security team members.",
      "The Owner role has full platform access including organization settings, billing management, user administration, and all security features. There must be at least one Owner per organization. The Admin role has nearly identical permissions to Owner but cannot modify billing settings or transfer ownership. Admins can manage users, connectors, policies, and all security operations.",
      "The Security Engineer role is designed for hands-on security practitioners. Security Engineers can view all findings, triage findings (acknowledge, resolve, suppress, mark as false positive), manage policies (enable/disable), generate reports, and configure integrations. They cannot manage users, modify organization settings, or access the Superadmin panel. This role is ideal for SOC analysts and security operations team members.",
      "The Analyst role provides read access to all security data (dashboard, findings, compliance, reports, security graph) and limited write access for finding triage (acknowledge and add notes). Analysts cannot modify policies, manage connectors, or configure integrations. This role is suitable for compliance analysts, risk managers, and stakeholders who need visibility without operational control.",
      "The Viewer role is the most restricted, providing read-only access to the dashboard, findings list (without detail view), and compliance scores. Viewers cannot triage findings, access reports, or view the security graph. This role is appropriate for executive stakeholders who need high-level visibility into the security posture. User invitations and role assignments are managed from the User Management page, accessible to Owners and Admins."
    ]
  },
  {
    id: "api-keys",
    title: "API Keys",
    icon: KeyRound,
    content: [
      "FYX Cloud provides a REST API for programmatic access to platform data and operations. API keys are used to authenticate API requests and can be created from the Organization settings page. Each API key is associated with a specific user account and inherits that user's role-based permissions, ensuring that API access follows the same RBAC model as the web interface.",
      "To create an API key, navigate to Organization → API Keys and click 'Generate New Key.' You will be prompted to provide a name for the key (for identification purposes) and select the permission scope. Available scopes include Read Only (GET requests only), Read/Write (GET, POST, PUT, PATCH requests), and Full Access (all operations including DELETE). The API key is displayed only once upon creation—store it securely in your secrets management system.",
      "API requests are authenticated by including the API key in the Authorization header as a Bearer token: 'Authorization: Bearer your-api-key-here.' All API endpoints follow RESTful conventions and return JSON responses. Rate limiting is enforced at 100 requests per minute per API key for standard operations and 10 requests per minute for resource-intensive operations like report generation and connector sync triggers.",
      "Common API use cases include integrating FYX Cloud data into custom dashboards (fetching finding counts, compliance scores, and trend data), triggering connector syncs from CI/CD pipelines (ensuring security scans run after infrastructure deployments), exporting findings to external ticketing systems, and automating policy management (enabling/disabling policies based on environment or project context).",
      "API keys can be revoked at any time from the Organization settings page. Revocation is immediate and any in-flight requests using the revoked key will receive a 401 Unauthorized response. We recommend rotating API keys regularly (every 90 days) and using separate keys for different integration use cases to limit the blast radius if a key is compromised."
    ]
  },
  {
    id: "superadmin",
    title: "Superadmin",
    icon: Settings,
    content: [
      "The Superadmin panel is available only to users with the platform-level superadmin flag and provides capabilities for managing the FYX Cloud platform across all organizations. This includes organization lifecycle management (creating, suspending, and deleting organizations), platform-wide configuration, SMTP email settings, and user impersonation for support purposes.",
      "Organization management allows superadmins to view all organizations on the platform, their subscription status, user counts, connector counts, and usage metrics. Superadmins can create new organizations, assign initial owners, configure plan limits (maximum models, policies, connectors, and users), and manage subscription status (active, trial, suspended, cancelled).",
      "The User Impersonation feature enables superadmins to temporarily assume the identity of any user on the platform. This is essential for troubleshooting user-reported issues, verifying RBAC configurations, and providing support without requiring users to share their credentials. When impersonating, a prominent banner is displayed at the top of the screen indicating the active impersonation session, and all actions are logged in the audit trail with the superadmin's identity.",
      "SMTP configuration in the Superadmin panel controls the email delivery settings for the entire platform. This includes the SMTP server address, port, authentication credentials, TLS settings, and sender address. Email is used for user invitations, password reset flows, scheduled report delivery, and critical alert notifications. The panel includes a 'Send Test Email' function to verify configuration before enabling email features.",
      "The Superadmin panel also provides access to platform-level audit logs, system health metrics (database performance, API response times, background job status), and feature flag management. These tools enable platform operators to monitor system health, diagnose performance issues, and roll out new features gradually across organizations."
    ]
  },
];

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.some((p) => p.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background text-[14px] text-[#000] dark:text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FyxLogo className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">Fyx Cloud</span>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="text-[14px] font-medium text-muted-foreground">Documentation</span>
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
        <div className="flex gap-10">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 space-y-1">
              <div className="px-3 mb-3">
                <span className="text-[12px] font-semibold tracking-[0.15em] text-primary/60 uppercase">
                  Table of Contents
                </span>
              </div>
              {sections.map((section) => {
                const isVisible = filteredSections.some((s) => s.id === section.id);
                if (!isVisible) return null;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    data-testid={`toc-${section.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                      window.history.replaceState(null, "", `#${section.id}`);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] text-muted-foreground hover:text-[#007aff] hover:bg-[#007aff]/5 transition-colors"
                  >
                    <section.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{section.title}</span>
                  </a>
                );
              })}
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#007aff]/10">
                  <BookOpen className="h-6 w-6 text-[#007aff]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold" data-testid="text-docs-title">Documentation</h1>
                  <p className="text-[14px] text-muted-foreground mt-1">Everything you need to know about FYX Cloud AI Security</p>
                </div>
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-docs-search"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card/60 backdrop-blur-xl border-white/10 text-[14px]"
              />
            </div>

            {filteredSections.length === 0 && (
              <div className="text-center py-16">
                <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-[14px]" data-testid="text-no-results">No sections match your search.</p>
              </div>
            )}

            {filteredSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className={`${cardClass} p-8 scroll-mt-24`}
                data-testid={`section-${section.id}`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-[#007aff]/10">
                    <section.icon className="h-5 w-5 text-[#007aff]" />
                  </div>
                  <h2 className="text-xl font-bold">{section.title}</h2>
                </div>
                <div className="space-y-4">
                  {section.content.map((paragraph, i) => (
                    <p key={i} className="text-[14px] text-[#000] dark:text-foreground/80 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
