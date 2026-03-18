import type { DiscoveredAsset, DiscoveredModel, ScanResult } from "./aws-scanner";

export interface HuggingFaceCredentials {
  apiToken: string;
  organization: string;
}

const HF_API_BASE = "https://huggingface.co/api";
const HF_ENDPOINTS_API_BASE = "https://api.endpoints.huggingface.cloud/v2/endpoint";

export async function testHuggingFaceConnection(creds: HuggingFaceCredentials): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const resp = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: { Authorization: `Bearer ${creds.apiToken}` },
    });

    if (resp.status === 401) {
      return { success: false, error: "Invalid API token. Please check your Hugging Face token." };
    }

    if (!resp.ok) {
      return { success: false, error: `Hugging Face API error: ${resp.status} ${resp.statusText}` };
    }

    const data = await resp.json();
    const accountId = creds.organization || data.name || "unknown";
    return { success: true, accountId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to connect to Hugging Face" };
  }
}

async function fetchHF<T>(url: string, apiToken: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (resp.status === 401) {
      return { data: null, error: "Invalid API token (401)" };
    }
    if (resp.status === 403) {
      return { data: null, error: "No access to this organization (403)" };
    }
    if (resp.status === 404) {
      return { data: null, error: "Organization not found (404)" };
    }
    if (!resp.ok) {
      return { data: null, error: `API error: ${resp.status} ${resp.statusText}` };
    }

    const data = await resp.json();
    return { data: data as T, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Network error" };
  }
}

interface HFModel {
  id: string;
  modelId: string;
  pipeline_tag?: string;
  tags?: string[];
  private: boolean;
  downloads?: number;
  likes?: number;
  sha?: string;
  lastModified?: string;
  library_name?: string;
  gated?: boolean | string;
  cardData?: { license?: string };
}

interface HFDataset {
  id: string;
  private: boolean;
  downloads?: number;
  tags?: string[];
  lastModified?: string;
}

interface HFSpace {
  id: string;
  sdk?: string;
  private: boolean;
  runtime?: { stage?: string; hardware?: string };
  lastModified?: string;
}

interface HFEndpoint {
  name: string;
  model?: { repository?: string; image?: string; task?: string };
  status?: { state?: string };
  provider?: { vendor?: string; region?: string };
  type?: string;
  compute?: { accelerator?: string; instanceType?: string; scaling?: { minReplica?: number; maxReplica?: number } };
}

async function scanModels(creds: HuggingFaceCredentials): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];

  const url = `${HF_API_BASE}/models?author=${encodeURIComponent(creds.organization)}&limit=100`;
  const { data, error } = await fetchHF<HFModel[]>(url, creds.apiToken);

  if (error) {
    errors.push(`HF Models: ${error}`);
    return { assets, models, errors };
  }

  for (const m of data || []) {
    const tags = m.tags || [];
    const license = m.cardData?.license || tags.find(t => t.startsWith("license:"))?.replace("license:", "") || "";
    const isPrivate = m.private;
    const riskScore = isPrivate ? 25 : 50;

    models.push({
      name: m.modelId || m.id,
      type: "HF Model",
      category: "AI/ML Platform",
      externalId: m.id,
      serviceType: "Hugging Face",
      status: "Active",
      riskScore,
      tags: ["huggingface", "model", ...(m.pipeline_tag ? [m.pipeline_tag] : []), ...(isPrivate ? ["private"] : ["public"])],
      metadata: {
        id: m.id,
        modelId: m.modelId || m.id,
        pipeline_tag: m.pipeline_tag || "",
        private: String(isPrivate),
        downloads: String(m.downloads || 0),
        likes: String(m.likes || 0),
        sha: m.sha || "",
        lastModified: m.lastModified || "",
        library_name: m.library_name || "",
        license: license,
        gated: String(m.gated || false),
        tags: tags.join(","),
      },
    });

    assets.push({
      name: m.modelId || m.id,
      type: "HF Model",
      category: "AI/ML Platform",
      source: "Hugging Face",
      externalId: m.id,
      serviceType: "Hugging Face",
      risk: isPrivate ? "Low" : "Medium",
      exposure: isPrivate ? "Private" : "Public",
      tags: ["huggingface", "model", ...(m.pipeline_tag ? [m.pipeline_tag] : []), ...(isPrivate ? ["private"] : ["public"])],
      metadata: {
        id: m.id,
        modelId: m.modelId || m.id,
        pipeline_tag: m.pipeline_tag || "",
        private: String(isPrivate),
        downloads: String(m.downloads || 0),
        likes: String(m.likes || 0),
        sha: m.sha || "",
        lastModified: m.lastModified || "",
        library_name: m.library_name || "",
        license: license,
        gated: String(m.gated || false),
        tags: tags.join(","),
      },
    });
  }

  return { assets, models, errors };
}

async function scanDatasets(creds: HuggingFaceCredentials): Promise<{ assets: DiscoveredAsset[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  const url = `${HF_API_BASE}/datasets?author=${encodeURIComponent(creds.organization)}&limit=100`;
  const { data, error } = await fetchHF<HFDataset[]>(url, creds.apiToken);

  if (error) {
    errors.push(`HF Datasets: ${error}`);
    return { assets, errors };
  }

  for (const d of data || []) {
    const isPrivate = d.private;
    const tags = d.tags || [];

    assets.push({
      name: d.id,
      type: "HF Dataset",
      category: "AI Data",
      source: "Hugging Face",
      externalId: d.id,
      serviceType: "Hugging Face",
      risk: isPrivate ? "Low" : "Medium",
      exposure: isPrivate ? "Private" : "Public",
      tags: ["huggingface", "dataset", ...(isPrivate ? ["private"] : ["public"])],
      metadata: {
        id: d.id,
        private: String(isPrivate),
        downloads: String(d.downloads || 0),
        lastModified: d.lastModified || "",
        tags: tags.join(","),
      },
    });
  }

  return { assets, errors };
}

async function scanSpaces(creds: HuggingFaceCredentials): Promise<{ assets: DiscoveredAsset[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  const url = `${HF_API_BASE}/spaces?author=${encodeURIComponent(creds.organization)}&limit=100`;
  const { data, error } = await fetchHF<HFSpace[]>(url, creds.apiToken);

  if (error) {
    errors.push(`HF Spaces: ${error}`);
    return { assets, errors };
  }

  for (const s of data || []) {
    const isPrivate = s.private;
    const runtimeStage = s.runtime?.stage || "";

    assets.push({
      name: s.id,
      type: "HF Space",
      category: "AI Applications",
      source: "Hugging Face",
      externalId: s.id,
      serviceType: "Hugging Face",
      risk: isPrivate ? "Low" : "Medium",
      exposure: isPrivate ? "Private" : "Public",
      tags: ["huggingface", "space", ...(s.sdk ? [s.sdk] : []), ...(isPrivate ? ["private"] : ["public"])],
      metadata: {
        id: s.id,
        sdk: s.sdk || "",
        private: String(isPrivate),
        runtimeStage,
        runtimeHardware: s.runtime?.hardware || "",
        lastModified: s.lastModified || "",
      },
    });
  }

  return { assets, errors };
}

async function scanInferenceEndpoints(creds: HuggingFaceCredentials): Promise<{ assets: DiscoveredAsset[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  const url = `${HF_ENDPOINTS_API_BASE}/${encodeURIComponent(creds.organization)}`;
  const { data, error } = await fetchHF<{ items?: HFEndpoint[] } | HFEndpoint[]>(url, creds.apiToken);

  if (error) {
    if (error.includes("404") || error.includes("401") || error.includes("403")) {
      return { assets, errors };
    }
    errors.push(`HF Inference Endpoints: ${error}`);
    return { assets, errors };
  }

  const endpoints: HFEndpoint[] = Array.isArray(data) ? data : (data as any)?.items || [];

  for (const ep of endpoints) {
    const endpointType = ep.type || "protected";
    const isPublic = endpointType === "public";
    const state = ep.status?.state || "unknown";

    assets.push({
      name: ep.name,
      type: "HF Inference Endpoint",
      category: "AI Endpoints",
      source: "Hugging Face",
      externalId: ep.name,
      serviceType: "Hugging Face",
      risk: isPublic ? "High" : "Medium",
      exposure: isPublic ? "Public" : "Private",
      tags: ["huggingface", "inference-endpoint", state, endpointType],
      metadata: {
        name: ep.name,
        modelRepository: ep.model?.repository || "",
        modelImage: ep.model?.image || "",
        modelTask: ep.model?.task || "",
        state,
        provider: ep.provider?.vendor || "",
        region: ep.provider?.region || "",
        type: endpointType,
        accelerator: ep.compute?.accelerator || "",
        instanceType: ep.compute?.instanceType || "",
        scalingMin: String(ep.compute?.scaling?.minReplica ?? ""),
        scalingMax: String(ep.compute?.scaling?.maxReplica ?? ""),
      },
    });
  }

  return { assets, errors };
}

export async function scanHuggingFaceAccount(creds: HuggingFaceCredentials): Promise<ScanResult> {
  const allAssets: DiscoveredAsset[] = [];
  const allModels: DiscoveredModel[] = [];
  const allErrors: string[] = [];

  const [modelsResult, datasetsResult, spacesResult, endpointsResult] = await Promise.all([
    scanModels(creds),
    scanDatasets(creds),
    scanSpaces(creds),
    scanInferenceEndpoints(creds),
  ]);

  allAssets.push(...modelsResult.assets, ...datasetsResult.assets, ...spacesResult.assets, ...endpointsResult.assets);
  allModels.push(...modelsResult.models);
  allErrors.push(...modelsResult.errors, ...datasetsResult.errors, ...spacesResult.errors, ...endpointsResult.errors);

  return {
    assets: allAssets,
    models: allModels,
    accountId: creds.organization,
    regionsScanned: ["Global"],
    errors: allErrors,
  };
}
