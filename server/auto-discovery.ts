import { storage } from "./storage";
import { log } from "./index";
import { seedDefaultPolicies, evaluatePolicies } from "./policy-engine";
import { notifyOrgUsers } from "./notification-helper";
import { dispatchWebhookEvent } from "./webhook-dispatcher";
import { getPlanLimits, type PlanSlug } from "./stripe";

async function getOrgLimit(orgId: string, limitKey: "maxAssets" | "maxModels" | "maxRepoScans"): Promise<{ current: number; max: number }> {
  const license = await storage.getLicense(orgId);
  const subscription = await storage.getSubscription(orgId);
  let max: number;
  if (license && license.status === "active" && new Date(license.expiresAt) > new Date()) {
    max = license[limitKey] ?? Infinity;
  } else if (subscription && subscription.status === "active") {
    const limits = getPlanLimits((subscription.plan || "free") as PlanSlug);
    max = (limits as any)[limitKey] ?? Infinity;
  } else {
    const limits = getPlanLimits("free");
    max = (limits as any)[limitKey] ?? Infinity;
  }
  let current = 0;
  if (limitKey === "maxAssets") {
    current = (await storage.getResources(orgId)).filter(r => !r.excludedFromScanning).length;
  } else if (limitKey === "maxRepoScans") {
    const connectors = await storage.getCloudConnectors(orgId);
    const hfIds = connectors.filter(c => c.provider === "Hugging Face").map(c => c.id);
    if (hfIds.length === 0) { current = 0; } else {
      const models = await storage.getAiModels(orgId);
      current = models.filter(m => m.connectorId && hfIds.includes(m.connectorId)).length;
    }
  } else {
    current = (await storage.getAiModels(orgId)).length;
  }
  return { current, max };
}

let discoveryTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
const CHECK_INTERVAL = 60 * 1000;

async function runAutoDiscoveryForOrg(orgId: string) {
  try {
    const connectors = await storage.getCloudConnectors(orgId);
    const activeConnectors = connectors.filter(
      (c) => ["AWS", "Azure", "GCP", "Hugging Face"].includes(c.provider) && c.encryptedCredentials && (c.status === "Active" || c.status === "Connected")
    );

    if (activeConnectors.length === 0) {
      log(`Auto-discovery: No active connectors for org ${orgId}`, "auto-discovery");
      return;
    }

    log(`Auto-discovery: Scanning ${activeConnectors.length} connector(s) for org ${orgId}`, "auto-discovery");

    const { decrypt } = await import("./encryption");

    let anySuccess = false;

    for (const connector of activeConnectors) {
      if (connector.syncStatus === "syncing") {
        log(`Auto-discovery: Skipping ${connector.name} — already syncing`, "auto-discovery");
        continue;
      }

      try {
        await storage.updateCloudConnector(connector.id, {
          syncStatus: "syncing",
          syncError: null,
        } as any);

        const creds = JSON.parse(decrypt(connector.encryptedCredentials!));

        let scanResult: any;
        if (connector.provider === "Azure") {
          const { scanAzureAccount } = await import("./azure-scanner");
          scanResult = await scanAzureAccount(creds);
        } else if (connector.provider === "GCP") {
          const { scanGcpAccount } = await import("./gcp-scanner");
          scanResult = await scanGcpAccount(creds);
        } else if (connector.provider === "Hugging Face") {
          const { scanHuggingFaceAccount } = await import("./hf-scanner");
          scanResult = await scanHuggingFaceAccount(creds);
        } else {
          const { scanAwsAccount } = await import("./aws-scanner");
          scanResult = await scanAwsAccount(creds);
        }

        if (scanResult.errors.length > 0 && scanResult.assets.length === 0 && scanResult.models.length === 0) {
          await storage.updateCloudConnector(connector.id, {
            syncStatus: "error",
            syncError: scanResult.errors.join("; "),
            lastSync: new Date().toISOString(),
          } as any);
          log(`Auto-discovery: Connector ${connector.name} scan failed: ${scanResult.errors[0]}`, "auto-discovery");
          continue;
        }

        const assetLimit = await getOrgLimit(connector.orgId, "maxAssets");
        const modelLimit = await getOrgLimit(connector.orgId, "maxModels");
        const isHfConnector = connector.provider === "Hugging Face";
        const repoScanLimit = isHfConnector ? await getOrgLimit(connector.orgId, "maxRepoScans") : null;
        let assetsIngested = 0;
        let modelsIngested = 0;
        let repoScansIngested = 0;
        let assetsCapped = false;
        let modelsCapped = false;
        let repoScansCapped = false;

        for (const asset of scanResult.assets) {
          if (assetLimit.current + assetsIngested >= assetLimit.max) {
            assetsCapped = true;
            break;
          }
          const result = await storage.upsertResourceByExternalId({
            name: asset.name,
            type: asset.type,
            category: asset.category,
            source: asset.source,
            risk: asset.risk,
            exposure: asset.exposure,
            tags: asset.tags,
            metadata: asset.metadata,
            externalId: asset.externalId,
            serviceType: asset.serviceType,
            connectorId: connector.id,
            projectId: connector.projectId,
            orgId: connector.orgId,
          });
          if (result.wasCreated) assetsIngested++;
        }

        for (const model of scanResult.models) {
          if (modelLimit.current + modelsIngested >= modelLimit.max) {
            modelsCapped = true;
            break;
          }
          if (isHfConnector && repoScanLimit && (repoScanLimit.current + repoScansIngested) >= repoScanLimit.max) {
            repoScansCapped = true;
            break;
          }
          const result = await storage.upsertAiModelByExternalId({
            name: model.name,
            type: model.type,
            category: model.category,
            status: model.status,
            riskScore: model.riskScore,
            tags: model.tags,
            metadata: model.metadata,
            externalId: model.externalId,
            serviceType: model.serviceType,
            connectorId: connector.id,
            projectId: connector.projectId,
            orgId: connector.orgId,
            lastScan: new Date().toISOString(),
          });
          if (result.wasCreated) {
            modelsIngested++;
            if (isHfConnector) repoScansIngested++;
          }
        }

        if (assetsCapped) {
          const skipped = scanResult.assets.length - assetsIngested;
          notifyOrgUsers({
            orgId: connector.orgId,
            title: "Cloud Asset Limit Reached",
            message: `Auto-scan discovered ${scanResult.assets.length} assets but ${skipped} were skipped — your plan allows ${assetLimit.max} assets. Upgrade to import all.`,
            type: "info",
            link: "/billing",
            deduplicate: true,
          });
        }
        if (modelsCapped) {
          const skipped = scanResult.models.length - modelsIngested;
          notifyOrgUsers({
            orgId: connector.orgId,
            title: "AI Model Limit Reached",
            message: `Auto-scan discovered ${scanResult.models.length} models but ${skipped} were skipped — your plan allows ${modelLimit.max} models. Upgrade to import all.`,
            type: "info",
            link: "/billing",
            deduplicate: true,
          });
        }
        if (repoScansCapped && repoScanLimit) {
          const skipped = scanResult.models.length - modelsIngested;
          notifyOrgUsers({
            orgId: connector.orgId,
            title: "Repo Model Scan Limit Reached",
            message: `Auto-scan discovered ${scanResult.models.length} repo models but ${skipped} were skipped — your plan allows ${repoScanLimit.max} repo scans. Upgrade to scan all.`,
            type: "info",
            link: "/billing",
            deduplicate: true,
          });
        }

        const totalAssets = assetsIngested + modelsIngested;
        await storage.updateCloudConnector(connector.id, {
          syncStatus: "completed",
          syncError: scanResult.errors.length > 0 ? scanResult.errors.join("; ") : null,
          assetsFound: totalAssets,
          lastSync: new Date().toISOString(),
          accountId: scanResult.accountId || connector.accountId,
        } as any);

        anySuccess = true;
        log(`Auto-discovery: Connector ${connector.name} synced — ${totalAssets} assets found`, "auto-discovery");
      } catch (e: any) {
        await storage.updateCloudConnector(connector.id, {
          syncStatus: "error",
          syncError: e.message || "Auto-discovery sync failed",
          lastSync: new Date().toISOString(),
        } as any);
        log(`Auto-discovery: Connector ${connector.name} error: ${e.message}`, "auto-discovery");
      }
    }

    if (anySuccess) {
      await storage.updateOrganization(orgId, {
        lastAutoDiscovery: new Date().toISOString(),
      } as any);

      try {
        await seedDefaultPolicies(orgId, storage);
        const findings = await evaluatePolicies(orgId, storage);
        log(`Auto-discovery: Policy evaluation for org ${orgId} — ${findings.length} finding(s)`, "auto-discovery");

        if (findings.length > 0) {
          notifyOrgUsers({
            orgId,
            title: "Auto-Scan Complete",
            message: `Scheduled scan found ${findings.length} finding(s). Review the results in Findings.`,
            type: "scan_completed",
            link: "/findings",
            deduplicate: true,
          });

          const criticalFindings = findings.filter((f: any) => f.severity === "Critical" || f.severity === "High");
          for (const cf of criticalFindings.slice(0, 10)) {
            dispatchWebhookEvent(orgId, "finding.created", { finding: cf });
            notifyOrgUsers({
              orgId,
              title: `${cf.severity || "High"} — ${cf.ruleId || "Policy"}: ${cf.assetName || "Unknown asset"}`,
              message: cf.finding || "A critical policy violation was detected. Review immediately.",
              type: "policy_violated",
              link: "/findings",
              priority: cf.severity === "Critical" ? "critical" : "high",
              deduplicate: true,
            } as any);
          }
        }
      } catch (evalErr: any) {
        log(`Auto-discovery: Policy evaluation failed for org ${orgId}: ${evalErr.message}`, "auto-discovery");
      }
    }

    log(`Auto-discovery: Completed for org ${orgId}`, "auto-discovery");
  } catch (e: any) {
    log(`Auto-discovery: Error for org ${orgId}: ${e.message}`, "auto-discovery");
  }
}

async function checkAndRunAutoDiscovery() {
  if (isRunning) {
    log("Auto-discovery: Previous run still in progress, skipping", "auto-discovery");
    return;
  }

  isRunning = true;
  try {
    const orgs = await storage.getOrganizations();

    for (const org of orgs) {
      if (org.autoDiscovery !== "true") continue;

      const interval = Math.max((org.autoDiscoveryInterval || 20), 10) * 60 * 1000;
      const lastRun = org.lastAutoDiscovery ? new Date(org.lastAutoDiscovery).getTime() : 0;
      const now = Date.now();

      if (now - lastRun >= interval) {
        await runAutoDiscoveryForOrg(org.id);
      }
    }
  } catch (e: any) {
    log(`Auto-discovery check error: ${e.message}`, "auto-discovery");
  } finally {
    isRunning = false;
  }
}

async function recoverStaleSyncs() {
  try {
    const orgs = await storage.getOrganizations();
    for (const org of orgs) {
      const connectors = await storage.getCloudConnectors(org.id);
      for (const connector of connectors) {
        if ((connector as any).syncStatus === "syncing") {
          log(`Recovering stale sync for connector "${connector.name}" (${connector.id})`, "auto-discovery");
          await storage.updateCloudConnector(connector.id, {
            syncStatus: "error",
            syncError: "Sync interrupted — server restarted during sync",
          } as any);
        }
      }
    }
  } catch (e: any) {
    log(`Stale sync recovery error: ${e.message}`, "auto-discovery");
  }
}

export function startAutoDiscoveryScheduler() {
  if (discoveryTimer) return;

  log("Auto-discovery scheduler started (checking every 60s)", "auto-discovery");

  recoverStaleSyncs().then(() => {
    discoveryTimer = setInterval(checkAndRunAutoDiscovery, CHECK_INTERVAL);
    setTimeout(checkAndRunAutoDiscovery, 5000);
  });
}

export function stopAutoDiscoveryScheduler() {
  if (discoveryTimer) {
    clearInterval(discoveryTimer);
    discoveryTimer = null;
    log("Auto-discovery scheduler stopped", "auto-discovery");
  }
}
