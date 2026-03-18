import type { DiscoveredAsset, DiscoveredModel, ScanResult } from "./aws-scanner";

export interface GcpCredentials {
  projectId: string;
  serviceAccountKey: string;
}

const SCAN_LOCATIONS = [
  "us-central1",
  "us-east1",
  "us-west1",
  "europe-west1",
  "europe-west4",
  "asia-east1",
];

function parseServiceAccountKey(keyJson: string): any {
  try {
    return JSON.parse(keyJson);
  } catch {
    throw new Error("Invalid service account key JSON format");
  }
}

async function getAuthClient(creds: GcpCredentials) {
  const { GoogleAuth } = await import("google-auth-library");
  const parsedKey = parseServiceAccountKey(creds.serviceAccountKey);
  const auth = new GoogleAuth({
    credentials: parsedKey,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return auth;
}

export async function testGcpConnection(creds: GcpCredentials): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const auth = await getAuthClient(creds);
    const client = await auth.getClient();
    await client.getAccessToken();
    return { success: true, accountId: creds.projectId };
  } catch (err: any) {
    const msg = err.message || "Failed to connect to GCP";
    if (msg.includes("invalid_grant") || msg.includes("invalid_client")) {
      return { success: false, error: "Invalid GCP service account credentials. Please check your service account key JSON." };
    }
    if (msg.includes("Invalid service account key")) {
      return { success: false, error: msg };
    }
    return { success: false, error: msg };
  }
}

function isIgnorableError(msg: string): boolean {
  return msg.includes("PERMISSION_DENIED") ||
    msg.includes("403") ||
    msg.includes("NOT_FOUND") ||
    msg.includes("404") ||
    msg.includes("is not enabled") ||
    msg.includes("has not been used") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("getaddrinfo") ||
    msg.includes("Could not connect") ||
    msg.includes("SERVICE_DISABLED");
}

async function makeAuthedRequest(auth: any, url: string): Promise<any> {
  const client = await auth.getClient();
  const res = await client.request({ url });
  return res.data;
}

async function scanVertexAIEndpoints(
  auth: any,
  projectId: string,
  location: string
): Promise<{ assets: DiscoveredAsset[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  try {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/endpoints`;
    const data = await makeAuthedRequest(auth, url);

    for (const ep of data.endpoints || []) {
      const resourceName = ep.name || "";
      const displayName = ep.displayName || resourceName.split("/").pop() || "Unknown";
      const deployedModels = ep.deployedModels || [];
      const hasEncryption = !!ep.encryptionSpec?.kmsKeyName;
      const hasNetwork = !!ep.network;

      assets.push({
        name: displayName,
        type: "Vertex AI Endpoint",
        category: "AI Endpoints",
        source: "GCP Vertex AI",
        externalId: resourceName,
        serviceType: "Vertex AI",
        risk: hasEncryption && hasNetwork ? "Low" : "Medium",
        exposure: hasNetwork ? "Private" : "Public",
        tags: ["vertex-ai", "endpoint", ep.state || "unknown", location],
        metadata: {
          resourceName,
          displayName,
          state: ep.state || "",
          deployedModelsCount: String(deployedModels.length),
          deployedModels: deployedModels.map((m: any) => m.model || "").join(", "),
          encryptionSpec: ep.encryptionSpec?.kmsKeyName || "",
          network: ep.network || "",
          createTime: ep.createTime || "",
          location,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) {
      errors.push(`Vertex AI Endpoints (${location}): ${err.message}`);
    }
  }

  return { assets, errors };
}

async function scanVertexAIModels(
  auth: any,
  projectId: string,
  location: string
): Promise<{ models: DiscoveredModel[]; errors: string[] }> {
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];

  try {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/models`;
    const data = await makeAuthedRequest(auth, url);

    for (const model of data.models || []) {
      const resourceName = model.name || "";
      const displayName = model.displayName || resourceName.split("/").pop() || "Unknown";
      const hasEncryption = !!model.encryptionSpec?.kmsKeyName;

      models.push({
        name: displayName,
        type: "Vertex AI Model",
        category: "AI/ML Platform",
        externalId: resourceName,
        serviceType: "Vertex AI",
        status: model.state === "ACTIVE" ? "Active" : (model.state || "Unknown"),
        riskScore: hasEncryption ? 25 : 40,
        tags: ["vertex-ai", "model", model.state || "unknown", location],
        metadata: {
          resourceName,
          displayName,
          state: model.state || "",
          encryptionSpec: model.encryptionSpec?.kmsKeyName || "",
          createTime: model.createTime || "",
          updateTime: model.updateTime || "",
          versionId: model.versionId || "",
          location,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) {
      errors.push(`Vertex AI Models (${location}): ${err.message}`);
    }
  }

  return { models, errors };
}

async function scanVertexAIDatasets(
  auth: any,
  projectId: string,
  location: string
): Promise<{ assets: DiscoveredAsset[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  try {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/datasets`;
    const data = await makeAuthedRequest(auth, url);

    for (const ds of data.datasets || []) {
      const resourceName = ds.name || "";
      const displayName = ds.displayName || resourceName.split("/").pop() || "Unknown";
      const hasEncryption = !!ds.encryptionSpec?.kmsKeyName;

      assets.push({
        name: displayName,
        type: "Vertex AI Dataset",
        category: "AI Data",
        source: "GCP Vertex AI",
        externalId: resourceName,
        serviceType: "Vertex AI",
        risk: hasEncryption ? "Low" : "Medium",
        exposure: "Private",
        tags: ["vertex-ai", "dataset", location],
        metadata: {
          resourceName,
          displayName,
          metadataSchemaUri: ds.metadataSchemaUri || "",
          encryptionSpec: ds.encryptionSpec?.kmsKeyName || "",
          createTime: ds.createTime || "",
          location,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) {
      errors.push(`Vertex AI Datasets (${location}): ${err.message}`);
    }
  }

  return { assets, errors };
}

async function scanVertexAIPipelines(
  auth: any,
  projectId: string,
  location: string
): Promise<{ assets: DiscoveredAsset[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  try {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/trainingPipelines`;
    const data = await makeAuthedRequest(auth, url);

    for (const pipeline of data.trainingPipelines || []) {
      const resourceName = pipeline.name || "";
      const displayName = pipeline.displayName || resourceName.split("/").pop() || "Unknown";
      const hasEncryption = !!pipeline.encryptionSpec?.kmsKeyName;

      assets.push({
        name: displayName,
        type: "Vertex AI Pipeline",
        category: "AI Orchestration",
        source: "GCP Vertex AI",
        externalId: resourceName,
        serviceType: "Vertex AI",
        risk: hasEncryption ? "Low" : "Medium",
        exposure: "Private",
        tags: ["vertex-ai", "pipeline", pipeline.state || "unknown", location],
        metadata: {
          resourceName,
          displayName,
          state: pipeline.state || "",
          encryptionSpec: pipeline.encryptionSpec?.kmsKeyName || "",
          createTime: pipeline.createTime || "",
          startTime: pipeline.startTime || "",
          endTime: pipeline.endTime || "",
          location,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) {
      errors.push(`Vertex AI Pipelines (${location}): ${err.message}`);
    }
  }

  return { assets, errors };
}

export async function scanGcpAccount(creds: GcpCredentials): Promise<ScanResult> {
  const allAssets: DiscoveredAsset[] = [];
  const allModels: DiscoveredModel[] = [];
  const allErrors: string[] = [];
  const regionsScanned: string[] = [];

  let auth: any;
  try {
    auth = await getAuthClient(creds);
  } catch (err: any) {
    return {
      assets: [],
      models: [],
      accountId: creds.projectId,
      regionsScanned: [],
      errors: [`Authentication failed: ${err.message}`],
    };
  }

  for (const location of SCAN_LOCATIONS) {
    regionsScanned.push(location);

    const [endpointsResult, modelsResult, datasetsResult, pipelinesResult] = await Promise.all([
      scanVertexAIEndpoints(auth, creds.projectId, location),
      scanVertexAIModels(auth, creds.projectId, location),
      scanVertexAIDatasets(auth, creds.projectId, location),
      scanVertexAIPipelines(auth, creds.projectId, location),
    ]);

    allAssets.push(...endpointsResult.assets);
    allErrors.push(...endpointsResult.errors);

    allModels.push(...modelsResult.models);
    allErrors.push(...modelsResult.errors);

    allAssets.push(...datasetsResult.assets);
    allErrors.push(...datasetsResult.errors);

    allAssets.push(...pipelinesResult.assets);
    allErrors.push(...pipelinesResult.errors);
  }

  return {
    assets: allAssets,
    models: allModels,
    accountId: creds.projectId,
    regionsScanned,
    errors: allErrors,
  };
}
