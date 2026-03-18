import { storage } from "./storage";
import type { Report } from "@shared/schema";

interface ReportFilters {
  dateRange?: string;
  severity?: string[];
  category?: string[];
  projectId?: string;
  status?: string[];
  accessibleProjectIds?: string[];
}

function getDateCutoff(range: string): string | null {
  const now = new Date();
  const days: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30, "60d": 60, "90d": 90 };
  if (range === "all" || !days[range]) return null;
  now.setDate(now.getDate() - days[range]);
  return now.toISOString();
}

export async function generateReport(
  reportId: string,
  orgId: string,
  type: string,
  filters: ReportFilters
): Promise<void> {
  try {
    const dateCutoff = filters.dateRange ? getDateCutoff(filters.dateRange) : null;

    const projectId = filters.projectId || undefined;
    const [allFindings, allResources, allModels, allPolicies, allConnectors] = await Promise.all([
      storage.getPolicyFindings(orgId, undefined, projectId),
      storage.getResources(orgId, projectId),
      storage.getAiModels(orgId, projectId),
      storage.getPolicies(orgId),
      storage.getCloudConnectors(orgId),
    ]);

    let findings = allFindings;
    if (dateCutoff) findings = findings.filter(f => (f.detectedAt || "") >= dateCutoff);
    if (filters.severity?.length) findings = findings.filter(f => filters.severity!.includes(f.severity));
    if (filters.status?.length) findings = findings.filter(f => filters.status!.includes(f.status));

    let resources = allResources;
    let models = allModels;

    if (!projectId && filters.accessibleProjectIds?.length) {
      const ids = new Set(filters.accessibleProjectIds);
      findings = findings.filter(f => !f.projectId || ids.has(f.projectId));
      resources = resources.filter(r => !r.projectId || ids.has(r.projectId));
      models = models.filter(m => !m.projectId || ids.has(m.projectId));
    }

    let data: Record<string, unknown> = {};

    switch (type) {
      case "executive_summary":
        data = buildExecutiveSummary(findings, resources, models, allPolicies, allConnectors);
        break;
      case "compliance":
        data = buildComplianceReport(findings, allPolicies);
        break;
      case "risk_assessment":
        data = buildRiskAssessment(findings, resources, models);
        break;
      case "finding_detail":
        data = buildFindingDetail(findings, allPolicies);
        break;
      case "asset_inventory":
        data = buildAssetInventory(resources, models, allConnectors);
        break;
      case "policy_coverage":
        data = buildPolicyCoverage(findings, allPolicies);
        break;
    }

    await storage.updateReport(reportId, {
      status: "completed",
      generatedAt: new Date().toISOString(),
      data: data as any,
    });
  } catch (err: any) {
    console.error("Report generation failed:", err);
    await storage.updateReport(reportId, {
      status: "failed",
      generatedAt: new Date().toISOString(),
      data: { error: err.message } as any,
    });
  }
}

function buildExecutiveSummary(findings: any[], resources: any[], models: any[], policies: any[], connectors: any[]) {
  const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
  const statusCounts = { open: 0, resolved: 0, acknowledged: 0, suppressed: 0 };
  findings.forEach(f => {
    severityCounts[f.severity as keyof typeof severityCounts] = (severityCounts[f.severity as keyof typeof severityCounts] || 0) + 1;
    statusCounts[f.status as keyof typeof statusCounts] = (statusCounts[f.status as keyof typeof statusCounts] || 0) + 1;
  });

  const riskScore = Math.min(100, Math.round(
    (severityCounts.Critical * 10 + severityCounts.High * 5 + severityCounts.Medium * 2 + severityCounts.Low * 0.5) / 
    Math.max(1, resources.length + models.length) * 10
  ));

  const categoryBreakdown: Record<string, number> = {};
  findings.forEach(f => {
    const cat = f.ruleId?.split("-")[0] || "OTHER";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  });

  return {
    reportType: "Executive Summary",
    generatedAt: new Date().toISOString(),
    summary: {
      totalFindings: findings.length,
      openFindings: statusCounts.open,
      resolvedFindings: statusCounts.resolved,
      totalAssets: resources.length + models.length,
      totalResources: resources.length,
      totalModels: models.length,
      totalPolicies: policies.length,
      enabledPolicies: policies.filter(p => p.enabled).length,
      totalConnectors: connectors.length,
      activeConnectors: connectors.filter(c => c.status === "Connected").length,
      overallRiskScore: riskScore,
    },
    severityBreakdown: severityCounts,
    statusBreakdown: statusCounts,
    categoryBreakdown,
    topFindings: findings
      .filter(f => f.status === "open")
      .sort((a, b) => {
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
        return (order[a.severity as keyof typeof order] || 4) - (order[b.severity as keyof typeof order] || 4);
      })
      .slice(0, 10)
      .map(f => ({ id: f.id, finding: f.finding, severity: f.severity, assetName: f.assetName, ruleId: f.ruleId })),
  };
}

function buildComplianceReport(findings: any[], policies: any[]) {
  const compliancePolicies = policies.filter(p => p.category === "Compliance");
  const complianceFindings = findings.filter(f => f.ruleId?.startsWith("COM-"));
  
  const frameworkMapping: Record<string, string[]> = {
    "EU AI Act": ["COM-091", "COM-092", "COM-093", "COM-094", "COM-095", "COM-096", "COM-097", "COM-098"],
    "NIST AI RMF": ["COM-099"],
    "SOC 2": ["IAM-001", "IAM-002", "IAM-003", "MON-001", "MON-002"],
    "GDPR": ["DAT-001", "DAT-002", "DAT-003"],
    "ISO 27001": ["NET-001", "NET-002", "GOV-001", "GOV-002"],
  };

  const frameworks = Object.entries(frameworkMapping).map(([name, rules]) => {
    const relevantFindings = findings.filter(f => rules.includes(f.ruleId));
    const openFindings = relevantFindings.filter(f => f.status === "open");
    return {
      name,
      totalControls: rules.length,
      passedControls: rules.length - openFindings.length,
      failedControls: openFindings.length,
      complianceRate: Math.round(((rules.length - openFindings.length) / rules.length) * 100),
      openFindings: openFindings.map(f => ({ id: f.id, finding: f.finding, severity: f.severity, ruleId: f.ruleId })),
    };
  });

  return {
    reportType: "Compliance Report",
    generatedAt: new Date().toISOString(),
    totalCompliancePolicies: compliancePolicies.length,
    totalComplianceFindings: complianceFindings.length,
    openComplianceFindings: complianceFindings.filter(f => f.status === "open").length,
    frameworks,
    allComplianceFindings: complianceFindings.map(f => ({
      id: f.id, finding: f.finding, severity: f.severity, ruleId: f.ruleId,
      status: f.status, assetName: f.assetName, detectedAt: f.detectedAt,
    })),
  };
}

function buildRiskAssessment(findings: any[], resources: any[], models: any[]) {
  const assetRisks: Record<string, { name: string; type: string; findings: number; criticalCount: number; highCount: number; riskScore: number }> = {};
  
  findings.filter(f => f.status === "open").forEach(f => {
    const key = f.assetId || f.assetName;
    if (!assetRisks[key]) {
      assetRisks[key] = { name: f.assetName, type: f.assetType, findings: 0, criticalCount: 0, highCount: 0, riskScore: 0 };
    }
    assetRisks[key].findings++;
    if (f.severity === "Critical") assetRisks[key].criticalCount++;
    if (f.severity === "High") assetRisks[key].highCount++;
    assetRisks[key].riskScore += f.severity === "Critical" ? 10 : f.severity === "High" ? 5 : f.severity === "Medium" ? 2 : 1;
  });

  const sortedAssets = Object.values(assetRisks).sort((a, b) => b.riskScore - a.riskScore);

  const categoryRisks: Record<string, number> = {};
  resources.forEach(r => {
    categoryRisks[r.category] = (categoryRisks[r.category] || 0) + (r.risk === "Critical" ? 4 : r.risk === "High" ? 3 : r.risk === "Medium" ? 2 : 1);
  });

  return {
    reportType: "Risk Assessment",
    generatedAt: new Date().toISOString(),
    totalAssetsAtRisk: sortedAssets.length,
    criticalAssets: sortedAssets.filter(a => a.criticalCount > 0).length,
    highRiskAssets: sortedAssets.filter(a => a.highCount > 0).length,
    topRiskAssets: sortedAssets.slice(0, 20),
    categoryRiskDistribution: categoryRisks,
    riskTrend: { period: "current", totalRisk: sortedAssets.reduce((sum, a) => sum + a.riskScore, 0) },
  };
}

function buildFindingDetail(findings: any[], policies: any[]) {
  const policyMap = new Map(policies.map(p => [p.id, p]));
  
  return {
    reportType: "Finding Detail Report",
    generatedAt: new Date().toISOString(),
    totalFindings: findings.length,
    findings: findings.map(f => ({
      id: f.id,
      ruleId: f.ruleId,
      policyName: policyMap.get(f.policyId)?.name || "Unknown",
      finding: f.finding,
      severity: f.severity,
      status: f.status,
      assetName: f.assetName,
      assetType: f.assetType,
      impact: f.impact,
      remediation: f.remediation,
      evidence: f.evidence,
      detectedAt: f.detectedAt,
      resolvedAt: f.resolvedAt,
      acknowledgedBy: f.acknowledgedBy,
    })),
  };
}

function buildAssetInventory(resources: any[], models: any[], connectors: any[]) {
  const categoryBreakdown: Record<string, number> = {};
  resources.forEach(r => {
    categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;
  });

  const riskBreakdown = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  resources.forEach(r => {
    riskBreakdown[r.risk as keyof typeof riskBreakdown] = (riskBreakdown[r.risk as keyof typeof riskBreakdown] || 0) + 1;
  });

  return {
    reportType: "Asset Inventory",
    generatedAt: new Date().toISOString(),
    totalResources: resources.length,
    totalModels: models.length,
    totalConnectors: connectors.length,
    categoryBreakdown,
    riskBreakdown,
    resources: resources.map(r => ({
      id: r.id, name: r.name, type: r.type, category: r.category, risk: r.risk,
      exposure: r.exposure, source: r.source, tags: r.tags,
    })),
    models: models.map(m => ({
      id: m.id, name: m.name, type: m.type, category: m.category, status: m.status,
      riskScore: m.riskScore, vulnerabilities: m.vulnerabilities,
    })),
  };
}

function buildPolicyCoverage(findings: any[], policies: any[]) {
  const policyResults = policies.map(p => {
    const pFindings = findings.filter(f => f.policyId === p.id);
    const openFindings = pFindings.filter(f => f.status === "open");
    return {
      id: p.id,
      ruleId: p.ruleId,
      name: p.name,
      category: p.category,
      severity: p.severity,
      enabled: p.enabled,
      totalFindings: pFindings.length,
      openFindings: openFindings.length,
      resolvedFindings: pFindings.filter(f => f.status === "resolved").length,
    };
  });

  const categoryCoverage: Record<string, { total: number; enabled: number; withFindings: number }> = {};
  policyResults.forEach(p => {
    if (!categoryCoverage[p.category]) categoryCoverage[p.category] = { total: 0, enabled: 0, withFindings: 0 };
    categoryCoverage[p.category].total++;
    if (p.enabled) categoryCoverage[p.category].enabled++;
    if (p.totalFindings > 0) categoryCoverage[p.category].withFindings++;
  });

  return {
    reportType: "Policy Coverage",
    generatedAt: new Date().toISOString(),
    totalPolicies: policies.length,
    enabledPolicies: policies.filter(p => p.enabled).length,
    disabledPolicies: policies.filter(p => !p.enabled).length,
    policiesWithFindings: policyResults.filter(p => p.totalFindings > 0).length,
    categoryCoverage,
    policies: policyResults,
  };
}
