import { ClientSecretCredential } from "@azure/identity";
import { ResourceManagementClient } from "@azure/arm-resources";

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

export interface DiscoveredAsset {
  name: string;
  type: string;
  category: string;
  source: string;
  externalId: string;
  serviceType: string;
  risk: string;
  exposure: string;
  tags: string[];
  metadata: Record<string, string>;
}

export interface DiscoveredModel {
  name: string;
  type: string;
  category: string;
  externalId: string;
  serviceType: string;
  status: string;
  riskScore: number;
  tags: string[];
  metadata: Record<string, string>;
}

export interface ScanResult {
  assets: DiscoveredAsset[];
  models: DiscoveredModel[];
  accountId: string;
  regionsScanned: string[];
  errors: string[];
}

function getCredential(creds: AzureCredentials): ClientSecretCredential {
  return new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
}

export async function testAzureConnection(creds: AzureCredentials): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const credential = getCredential(creds);
    const resourceClient = new ResourceManagementClient(credential, creds.subscriptionId);
    const iterator = resourceClient.resourceGroups.list();
    await iterator.next();
    return { success: true, accountId: creds.subscriptionId };
  } catch (err: any) {
    const msg = err.message || "Failed to connect to Azure";
    if (msg.includes("AADSTS7000215") || msg.includes("invalid_client")) {
      return { success: false, error: "Invalid Azure credentials. Please check your Client ID and Client Secret." };
    }
    if (msg.includes("AADSTS90002") || msg.includes("tenant")) {
      return { success: false, error: "Invalid Tenant ID. Please verify your Azure AD Tenant ID." };
    }
    if (msg.includes("SubscriptionNotFound")) {
      return { success: false, error: "Subscription not found. Please verify your Subscription ID." };
    }
    return { success: false, error: msg };
  }
}

async function scanAzureML(creds: AzureCredentials, credential: ClientSecretCredential): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];

  try {
    const { AzureMachineLearningServicesManagementClient } = await import("@azure/arm-machinelearning");
    const client = new AzureMachineLearningServicesManagementClient(credential, creds.subscriptionId);

    try {
      for await (const workspace of client.workspaces.listBySubscription()) {
        const resourceId = workspace.id || "";
        const location = workspace.location || "unknown";
        const publicAccess = workspace.publicNetworkAccess || "Disabled";

        assets.push({
          name: workspace.friendlyName || workspace.name || "Unknown",
          type: "Azure ML Workspace",
          category: "AI/ML Platform",
          source: "Azure Machine Learning",
          externalId: resourceId,
          serviceType: "Azure ML",
          risk: publicAccess === "Enabled" ? "High" : "Medium",
          exposure: publicAccess === "Enabled" ? "Public" : "Private",
          tags: ["azure-ml", "workspace", location],
          metadata: {
            resourceId,
            location,
            sku: workspace.sku?.name || "",
            provisioningState: workspace.provisioningState || "",
            publicNetworkAccess: publicAccess,
            storageAccount: workspace.storageAccount || "",
            keyVault: workspace.keyVault || "",
            applicationInsights: workspace.applicationInsights || "",
            managedIdentity: workspace.identity?.type || "",
            encryption: workspace.encryption?.keyVaultProperties?.keyIdentifier || "platform-managed",
            hbiWorkspace: workspace.hbiWorkspace ? "true" : "false",
          },
        });

        try {
          for await (const endpoint of client.onlineEndpoints.list(
            extractResourceGroup(resourceId),
            workspace.name || ""
          )) {
            const epId = endpoint.id || "";
            const epPublicAccess = endpoint.properties?.publicNetworkAccess || "Disabled";

            assets.push({
              name: endpoint.name || "Unknown",
              type: "Azure ML Endpoint",
              category: "AI Endpoints",
              source: "Azure Machine Learning",
              externalId: epId,
              serviceType: "Azure ML",
              risk: epPublicAccess === "Enabled" ? "High" : "Medium",
              exposure: epPublicAccess === "Enabled" ? "Public" : "Private",
              tags: ["azure-ml", "endpoint", location],
              metadata: {
                resourceId: epId,
                location: endpoint.location || location,
                provisioningState: endpoint.properties?.provisioningState || "",
                publicNetworkAccess: epPublicAccess,
                authMode: endpoint.properties?.authMode || "",
                scoringUri: endpoint.properties?.scoringUri || "",
                workspaceName: workspace.name || "",
              },
            });
          }
        } catch (epErr: any) {
          if (!isIgnorableError(epErr.message || "")) {
            errors.push(`Azure ML Endpoints (${workspace.name}): ${epErr.message}`);
          }
        }

        try {
          for await (const compute of client.computeOperations.list(
            extractResourceGroup(resourceId),
            workspace.name || ""
          )) {
            const computeId = compute.id || "";

            assets.push({
              name: compute.name || "Unknown",
              type: "Azure ML Compute",
              category: "AI Compute",
              source: "Azure Machine Learning",
              externalId: computeId,
              serviceType: "Azure ML",
              risk: "Medium",
              exposure: "Private",
              tags: ["azure-ml", "compute", compute.properties?.computeType || "unknown", location],
              metadata: {
                resourceId: computeId,
                location: compute.location || location,
                computeType: compute.properties?.computeType || "",
                provisioningState: compute.properties?.provisioningState || "",
                workspaceName: workspace.name || "",
              },
            });
          }
        } catch (computeErr: any) {
          if (!isIgnorableError(computeErr.message || "")) {
            errors.push(`Azure ML Compute (${workspace.name}): ${computeErr.message}`);
          }
        }
      }
    } catch (err: any) {
      if (!isIgnorableError(err.message || "")) {
        errors.push(`Azure ML Workspaces: ${err.message}`);
      }
    }
  } catch (importErr: any) {
    errors.push(`Azure ML SDK import error: ${importErr.message}`);
  }

  return { assets, models, errors };
}

async function scanCognitiveServices(creds: AzureCredentials, credential: ClientSecretCredential): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];

  try {
    const { CognitiveServicesManagementClient } = await import("@azure/arm-cognitiveservices");
    const client = new CognitiveServicesManagementClient(credential, creds.subscriptionId);

    try {
      for await (const account of client.accounts.list()) {
        const resourceId = account.id || "";
        const location = account.location || "unknown";
        const kind = account.kind || "Unknown";
        const isOpenAI = kind === "OpenAI";
        const typeName = isOpenAI ? "Azure OpenAI Service" : "Cognitive Services Account";
        const publicAccess = account.properties?.publicNetworkAccess || "Disabled";

        assets.push({
          name: account.name || "Unknown",
          type: typeName,
          category: "AI Services",
          source: "Azure Cognitive Services",
          externalId: resourceId,
          serviceType: isOpenAI ? "Azure OpenAI" : "Cognitive Services",
          risk: publicAccess === "Enabled" ? "High" : "Medium",
          exposure: publicAccess === "Enabled" ? "Public" : "Private",
          tags: ["cognitive-services", kind.toLowerCase(), location],
          metadata: {
            resourceId,
            location,
            kind,
            sku: account.sku?.name || "",
            provisioningState: account.properties?.provisioningState || "",
            publicNetworkAccess: publicAccess,
            endpoint: account.properties?.endpoint || "",
            customSubDomainName: account.properties?.customSubDomainName || "",
            encryption: account.properties?.encryption?.keySource || "Microsoft.CognitiveServices",
            managedIdentity: account.identity?.type || "",
            networkRuleSet: account.properties?.networkAcls?.defaultAction || "",
            disableLocalAuth: account.properties?.disableLocalAuth ? "true" : "false",
          },
        });

        if (isOpenAI) {
          models.push({
            name: `${account.name} (OpenAI)`,
            type: "Azure OpenAI Service",
            category: "Foundation Models",
            externalId: resourceId,
            serviceType: "Azure OpenAI",
            status: account.properties?.provisioningState === "Succeeded" ? "Active" : (account.properties?.provisioningState || "Unknown"),
            riskScore: publicAccess === "Enabled" ? 55 : 30,
            tags: ["azure-openai", location],
            metadata: {
              resourceId,
              location,
              sku: account.sku?.name || "",
              endpoint: account.properties?.endpoint || "",
              publicNetworkAccess: publicAccess,
            },
          });
        }
      }
    } catch (err: any) {
      if (!isIgnorableError(err.message || "")) {
        errors.push(`Cognitive Services Accounts: ${err.message}`);
      }
    }
  } catch (importErr: any) {
    errors.push(`Cognitive Services SDK import error: ${importErr.message}`);
  }

  return { assets, models, errors };
}

async function scanAISearch(creds: AzureCredentials, credential: ClientSecretCredential): Promise<{ assets: DiscoveredAsset[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  try {
    const { SearchManagementClient } = await import("@azure/arm-search");
    const client = new SearchManagementClient(credential, creds.subscriptionId);

    try {
      for await (const service of client.services.listBySubscription()) {
        const resourceId = service.id || "";
        const location = service.location || "unknown";
        const publicAccess = service.publicNetworkAccess || "disabled";

        assets.push({
          name: service.name || "Unknown",
          type: "Azure AI Search",
          category: "Search & Analytics",
          source: "Azure AI Search",
          externalId: resourceId,
          serviceType: "Azure AI Search",
          risk: publicAccess === "enabled" ? "High" : "Medium",
          exposure: publicAccess === "enabled" ? "Public" : "Private",
          tags: ["ai-search", location],
          metadata: {
            resourceId,
            location,
            sku: service.sku?.name || "",
            provisioningState: service.provisioningState || "",
            publicNetworkAccess: publicAccess,
            replicaCount: String(service.replicaCount || 0),
            partitionCount: String(service.partitionCount || 0),
            hostingMode: service.hostingMode || "",
            status: service.status || "",
            encryptionWithCmk: service.encryptionWithCmk?.enforcement || "Unspecified",
            managedIdentity: service.identity?.type || "",
          },
        });
      }
    } catch (err: any) {
      if (!isIgnorableError(err.message || "")) {
        errors.push(`Azure AI Search: ${err.message}`);
      }
    }
  } catch (importErr: any) {
    errors.push(`Azure AI Search SDK import error: ${importErr.message}`);
  }

  return { assets, errors };
}

export async function scanAzureAccount(creds: AzureCredentials): Promise<ScanResult> {
  const allAssets: DiscoveredAsset[] = [];
  const allModels: DiscoveredModel[] = [];
  const allErrors: string[] = [];
  const regionsScanned = new Set<string>();

  const credential = getCredential(creds);

  const [mlResult, cogResult, searchResult] = await Promise.allSettled([
    scanAzureML(creds, credential),
    scanCognitiveServices(creds, credential),
    scanAISearch(creds, credential),
  ]);

  if (mlResult.status === "fulfilled") {
    allAssets.push(...mlResult.value.assets);
    allModels.push(...mlResult.value.models);
    allErrors.push(...mlResult.value.errors);
  } else {
    allErrors.push(`Azure ML scan failed: ${mlResult.reason}`);
  }

  if (cogResult.status === "fulfilled") {
    allAssets.push(...cogResult.value.assets);
    allModels.push(...cogResult.value.models);
    allErrors.push(...cogResult.value.errors);
  } else {
    allErrors.push(`Cognitive Services scan failed: ${cogResult.reason}`);
  }

  if (searchResult.status === "fulfilled") {
    allAssets.push(...searchResult.value.assets);
    allErrors.push(...searchResult.value.errors);
  } else {
    allErrors.push(`AI Search scan failed: ${searchResult.reason}`);
  }

  for (const asset of allAssets) {
    const loc = asset.metadata.location;
    if (loc && loc !== "unknown") regionsScanned.add(loc);
  }

  return {
    assets: allAssets,
    models: allModels,
    accountId: creds.subscriptionId,
    regionsScanned: regionsScanned.size > 0 ? Array.from(regionsScanned) : ["All Regions"],
    errors: allErrors,
  };
}

function extractResourceGroup(resourceId: string): string {
  const match = resourceId.match(/\/resourceGroups\/([^/]+)/i);
  return match ? match[1] : "";
}

function isIgnorableError(msg: string): boolean {
  return msg.includes("AuthorizationFailed") ||
    msg.includes("AuthenticationFailed") ||
    msg.includes("ResourceNotFound") ||
    msg.includes("SubscriptionNotFound") ||
    msg.includes("NoRegisteredProviderFound") ||
    msg.includes("MissingSubscriptionRegistration") ||
    msg.includes("not registered") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("getaddrinfo") ||
    msg.includes("Could not connect");
}
