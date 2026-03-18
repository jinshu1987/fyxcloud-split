import { SageMakerClient, ListModelsCommand, ListEndpointsCommand, ListNotebookInstancesCommand, ListTrainingJobsCommand, ListPipelinesCommand, ListFeatureGroupsCommand, DescribeNotebookInstanceCommand, DescribeTrainingJobCommand, DescribeEndpointCommand, DescribeEndpointConfigCommand, DescribeFeatureGroupCommand, DescribeModelCommand, ListMonitoringSchedulesCommand, ListModelPackagesCommand, ListModelPackageGroupsCommand } from "@aws-sdk/client-sagemaker";
import { BedrockClient, ListCustomModelsCommand, GetCustomModelCommand, GetModelCustomizationJobCommand, ListProvisionedModelThroughputsCommand, ListGuardrailsCommand, GetModelInvocationLoggingConfigurationCommand } from "@aws-sdk/client-bedrock";
import { BedrockAgentClient, ListAgentsCommand, ListKnowledgeBasesCommand, ListFlowsCommand, ListPromptsCommand } from "@aws-sdk/client-bedrock-agent";
import { LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { S3Client, ListBucketsCommand, GetBucketTaggingCommand, GetBucketEncryptionCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { OpenSearchServerlessClient, ListCollectionsCommand } from "@aws-sdk/client-opensearchserverless";
import { SecretsManagerClient, ListSecretsCommand } from "@aws-sdk/client-secrets-manager";
import { SSMClient, DescribeParametersCommand } from "@aws-sdk/client-ssm";
import { IAMClient, ListRolesCommand, ListAttachedRolePoliciesCommand, ListRolePoliciesCommand, GetRoleCommand } from "@aws-sdk/client-iam";
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { CloudTrailClient, DescribeTrailsCommand } from "@aws-sdk/client-cloudtrail";
import { SFNClient, ListStateMachinesCommand } from "@aws-sdk/client-sfn";
import { GlueClient, GetCrawlersCommand, GetJobsCommand } from "@aws-sdk/client-glue";
import { AppflowClient, ListFlowsCommand as AppflowListFlowsCommand } from "@aws-sdk/client-appflow";
import { LexModelsV2Client, ListBotsCommand } from "@aws-sdk/client-lex-models-v2";
import { KendraClient, ListIndicesCommand } from "@aws-sdk/client-kendra";
import { NeptuneClient, DescribeDBClustersCommand as NeptuneDescribeDBClustersCommand } from "@aws-sdk/client-neptune";
import { RDSClient, DescribeDBClustersCommand, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { KinesisClient, ListStreamsCommand, DescribeStreamCommand } from "@aws-sdk/client-kinesis";
import { FirehoseClient, ListDeliveryStreamsCommand, DescribeDeliveryStreamCommand } from "@aws-sdk/client-firehose";
import { EMRClient, ListClustersCommand as EMRListClustersCommand, DescribeClusterCommand as EMRDescribeClusterCommand } from "@aws-sdk/client-emr";
import { APIGatewayClient, GetRestApisCommand, GetResourcesCommand } from "@aws-sdk/client-api-gateway";
import { EKSClient, ListClustersCommand as EKSListClustersCommand, DescribeClusterCommand } from "@aws-sdk/client-eks";
import { ECSClient, ListClustersCommand as ECSListClustersCommand, ListServicesCommand, DescribeServicesCommand } from "@aws-sdk/client-ecs";
import { EventBridgeClient, ListRulesCommand, ListTargetsByRuleCommand } from "@aws-sdk/client-eventbridge";
import { CloudFormationClient, ListStacksCommand, DescribeStackResourcesCommand } from "@aws-sdk/client-cloudformation";
import { ECRClient, DescribeRepositoriesCommand } from "@aws-sdk/client-ecr";
import { scanComprehend, scanTextract, scanRekognition, scanTranslate, scanTranscribe, scanPolly, scanPersonalize, scanForecast, scanKendra as scanKendraAdditions, scanLex as scanLexAdditions, scanQBusiness, scanSageMakerEdge, scanBedrockFlowsPrompts, scanCodeGuruDevOpsGuru } from "./aws-scanner-additions";

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
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

const SCAN_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-central-1", "eu-north-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-south-1",
  "sa-east-1", "ca-central-1",
];

function getClientConfig(creds: AwsCredentials, region: string) {
  return {
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  };
}

function isIgnorableError(msg: string): boolean {
  return msg.includes("AccessDenied") ||
    msg.includes("Unknown Operation") ||
    msg.includes("Unknown operation") ||
    msg.includes("UnknownOperationException") ||
    msg.includes("not supported") ||
    msg.includes("is not authorized") ||
    msg.includes("OptInRequired") ||
    msg.includes("SubscriptionRequiredException") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("getaddrinfo") ||
    msg.includes("NetworkingError") ||
    msg.includes("not available in this region") ||
    msg.includes("Could not connect");
}

export async function testAwsConnection(creds: AwsCredentials): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const sts = new STSClient(getClientConfig(creds, "us-east-1"));
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    return { success: true, accountId: identity.Account || "unknown" };
  } catch (err: any) {
    const msg = err.message || "Failed to connect to AWS";
    if (msg.includes("InvalidClientTokenId") || msg.includes("SignatureDoesNotMatch")) {
      return { success: false, error: "Invalid AWS credentials. Please check your Access Key ID and Secret Access Key." };
    }
    if (msg.includes("ExpiredToken")) {
      return { success: false, error: "AWS credentials have expired." };
    }
    return { success: false, error: msg };
  }
}

// ─── 1. Provisioned / In-Use Models (Bedrock Provisioned Throughput + Invocation Logging) ───
// NOTE: We intentionally do NOT call ListFoundationModelsCommand because it returns
// the entire AWS model catalog (~800+ models). These are globally available and are
// NOT assets in the customer's environment. We only track models that are explicitly
// provisioned (costing money) or referenced by agents/flows.
async function scanBedrockFoundationModels(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const models: DiscoveredModel[] = [];
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new BedrockClient(getClientConfig(creds, region));

  try {
    const provisioned = await client.send(new ListProvisionedModelThroughputsCommand({}));
    for (const pt of provisioned.provisionedModelSummaries || []) {
      models.push({
        name: pt.provisionedModelName || "Unknown",
        type: "Provisioned Model",
        category: "Foundation Models",
        externalId: pt.provisionedModelArn || pt.provisionedModelName || "",
        serviceType: "Bedrock",
        status: pt.status === "InService" ? "Active" : (pt.status || "Unknown"),
        riskScore: 35,
        tags: ["bedrock", "provisioned", pt.status || "Unknown", region],
        metadata: {
          provisionedModelArn: pt.provisionedModelArn || "",
          status: pt.status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Provisioned Models (${region}): ${err.message}`);
  }

  try {
    const loggingConfig = await client.send(new GetModelInvocationLoggingConfigurationCommand({}));
    const cfg = loggingConfig.loggingConfig;
    const loggingEnabled = cfg && (cfg.textDataDeliveryEnabled || cfg.imageDataDeliveryEnabled || cfg.embeddingDataDeliveryEnabled);
    assets.push({
      name: `Bedrock Invocation Logging (${region})`,
      type: "Invocation Logging",
      category: "Monitoring/Logs",
      source: "AWS Bedrock",
      externalId: `bedrock-invocation-logging-${region}`,
      serviceType: "Bedrock",
      risk: loggingEnabled ? "Low" : "Medium",
      exposure: "Private",
      tags: ["bedrock", "invocation-logging", loggingEnabled ? "enabled" : "disabled", region],
      metadata: {
        loggingEnabled: loggingEnabled ? "true" : "false",
        textLogging: cfg?.textDataDeliveryEnabled ? "true" : "false",
        imageLogging: cfg?.imageDataDeliveryEnabled ? "true" : "false",
        embeddingLogging: cfg?.embeddingDataDeliveryEnabled ? "true" : "false",
        s3Destination: (cfg?.s3Config as any)?.bucketName || "",
        cloudWatchDestination: (cfg?.cloudWatchConfig as any)?.logGroupName || "",
        region,
      },
    });
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Invocation Logging (${region}): ${err.message}`);
  }

  return { assets, models, errors };
}

// ─── 2. Custom Models (SageMaker / Bedrock Custom) ───
async function scanCustomModels(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];

  const bedrockClient = new BedrockClient(getClientConfig(creds, region));
  try {
    const custom = await bedrockClient.send(new ListCustomModelsCommand({ maxResults: 50 }));
    for (const m of custom.modelSummaries || []) {
      let modelKmsKeyArn = "";
      let jobArn = "";
      let vpcConfig: any = null;
      let outputModelKmsKeyArn = "";
      let baseModelArn = m.baseModelArn || "";

      try {
        const detail = await bedrockClient.send(new GetCustomModelCommand({ modelIdentifier: m.modelArn || m.modelName || "" }));
        modelKmsKeyArn = detail.modelKmsKeyArn || "";
        jobArn = detail.jobArn || "";

        if (jobArn) {
          try {
            const jobDetail = await bedrockClient.send(new GetModelCustomizationJobCommand({ jobIdentifier: jobArn }));
            vpcConfig = jobDetail.vpcConfig || null;
            outputModelKmsKeyArn = jobDetail.outputModelKmsKeyArn || "";
          } catch (_jobErr: any) {}
        }
      } catch (_detailErr: any) {}

      const hasKms = !!(modelKmsKeyArn || outputModelKmsKeyArn);
      const hasVpc = !!(vpcConfig && vpcConfig.subnetIds && vpcConfig.subnetIds.length > 0);
      const riskScore = hasKms && hasVpc ? 25 : hasKms || hasVpc ? 40 : 55;

      models.push({
        name: m.modelName || "Unknown",
        type: "Custom Model",
        category: "Custom Models",
        externalId: m.modelArn || m.modelName || "",
        serviceType: "Bedrock",
        status: "Active",
        riskScore,
        tags: ["bedrock", "custom-model", hasKms ? "encrypted" : "no-cmk", hasVpc ? "vpc" : "no-vpc", region],
        metadata: {
          modelArn: m.modelArn || "",
          baseModelArn,
          modelKmsKeyArn,
          outputModelKmsKeyArn,
          jobArn,
          vpcConfigured: hasVpc ? "true" : "false",
          vpcSubnetIds: vpcConfig?.subnetIds?.join(",") || "",
          vpcSecurityGroupIds: vpcConfig?.securityGroupIds?.join(",") || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Custom Models (${region}): ${err.message}`);
  }

  const smClient = new SageMakerClient(getClientConfig(creds, region));
  try {
    const modelsResp = await smClient.send(new ListModelsCommand({ MaxResults: 100 }));
    for (const m of modelsResp.Models || []) {
      let primaryContainerImage = "";
      let executionRoleArn = "";
      let vpcConfigured = "false";
      let enableNetworkIsolation = "false";

      try {
        const detail = await smClient.send(new DescribeModelCommand({ ModelName: m.ModelName || "" }));
        primaryContainerImage = detail.PrimaryContainer?.Image || "";
        executionRoleArn = detail.ExecutionRoleArn || "";
        vpcConfigured = detail.VpcConfig?.Subnets?.length ? "true" : "false";
        enableNetworkIsolation = detail.EnableNetworkIsolation ? "true" : "false";
      } catch (_err: any) {}

      models.push({
        name: m.ModelName || "Unknown",
        type: "SageMaker Model",
        category: "Custom Models",
        externalId: m.ModelArn || m.ModelName || "",
        serviceType: "SageMaker",
        status: "Active",
        riskScore: 30,
        tags: ["sagemaker", "model", region],
        metadata: {
          modelArn: m.ModelArn || "",
          primaryContainerImage,
          executionRoleArn,
          vpcConfigured,
          enableNetworkIsolation,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`SageMaker Models (${region}): ${err.message}`);
  }

  return { assets: [], models, errors };
}

// ─── 3. Inference Endpoints (SageMaker / Bedrock Endpoints) ───
async function scanInferenceEndpoints(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new SageMakerClient(getClientConfig(creds, region));

  try {
    const endpoints = await client.send(new ListEndpointsCommand({ MaxResults: 100 }));

    const monitoringSchedules = new Set<string>();
    try {
      const monitors = await client.send(new ListMonitoringSchedulesCommand({ MaxResults: 100 }));
      for (const ms of monitors.MonitoringScheduleSummaries || []) {
        if (ms.EndpointName) monitoringSchedules.add(ms.EndpointName);
      }
    } catch (_err: any) {}

    for (const ep of endpoints.Endpoints || []) {
      const isPublic = ep.EndpointName?.toLowerCase().includes("public") || false;
      let vpcConfigured = "false";
      let dataCaptureEnabled = "false";
      let kmsKeyId = "";
      let hasMonitoring = monitoringSchedules.has(ep.EndpointName || "") ? "true" : "false";

      try {
        const detail = await client.send(new DescribeEndpointCommand({ EndpointName: ep.EndpointName || "" }));
        const configName = detail.EndpointConfigName || "";
        if (detail.DataCaptureConfig?.EnableCapture) {
          dataCaptureEnabled = "true";
        }
        if (configName) {
          try {
            const config = await client.send(new DescribeEndpointConfigCommand({ EndpointConfigName: configName }));
            kmsKeyId = config.KmsKeyId || "";
            if (config.VpcConfig?.Subnets?.length) {
              vpcConfigured = "true";
            }
          } catch (_err: any) {}
        }
      } catch (_err: any) {}

      assets.push({
        name: ep.EndpointName || "Unknown",
        type: "Inference Endpoint",
        category: "Inference Endpoints",
        source: "AWS SageMaker",
        externalId: ep.EndpointArn || ep.EndpointName || "",
        serviceType: "SageMaker",
        risk: isPublic ? "High" : "Medium",
        exposure: isPublic ? "Public" : "Private",
        tags: ["sagemaker", "endpoint", ep.EndpointStatus || "Unknown", region],
        metadata: {
          arn: ep.EndpointArn || "",
          status: ep.EndpointStatus || "",
          authType: "IAM",
          exposure: isPublic ? "Public" : "Private",
          vpcConfigured,
          dataCaptureEnabled,
          kmsKeyId,
          hasMonitoring,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`SageMaker Endpoints (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 4. AI Agents (Bedrock Agents) ───
async function scanAiAgents(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];
  const client = new BedrockAgentClient(getClientConfig(creds, region));

  try {
    const agents = await client.send(new ListAgentsCommand({ maxResults: 50 }));
    for (const agent of agents.agentSummaries || []) {
      models.push({
        name: agent.agentName || "Unknown",
        type: "Bedrock Agent",
        category: "AI Agents",
        externalId: agent.agentId ? `arn:aws:bedrock:${region}::agent/${agent.agentId}` : "",
        serviceType: "Bedrock Agent",
        status: agent.agentStatus === "PREPARED" ? "Active" : (agent.agentStatus || "Unknown"),
        riskScore: 45,
        tags: ["bedrock", "agent", agent.agentStatus || "Unknown", region],
        metadata: {
          agentId: agent.agentId || "",
          status: agent.agentStatus || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Agents (${region}): ${err.message}`);
  }

  return { assets: [], models, errors };
}

// ─── 5. Vector Storage (OpenSearch Serverless) ───
async function scanVectorStorage(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new OpenSearchServerlessClient(getClientConfig(creds, region));

  try {
    const resp = await client.send(new ListCollectionsCommand({ maxResults: 50 }));
    for (const col of resp.collectionSummaries || []) {
      const isVector = col.name?.toLowerCase().includes("vector") || col.name?.toLowerCase().includes("embedding") || col.name?.toLowerCase().includes("bedrock") || col.name?.toLowerCase().includes("ai") || col.name?.toLowerCase().includes("rag") || true;
      if (isVector) {
        assets.push({
          name: col.name || "Unknown",
          type: "Vector Store",
          category: "Vector Storage",
          source: "AWS OpenSearch",
          externalId: col.arn || col.id || "",
          serviceType: "OpenSearch",
          risk: "Medium",
          exposure: "Private",
          tags: ["opensearch", "vector-store", col.status || "Unknown", region],
          metadata: {
            collectionId: col.id || "",
            status: col.status || "",
            region,
          },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`OpenSearch Collections (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 6. Knowledge Bases (Bedrock Knowledge Bases) ───
async function scanKnowledgeBases(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new BedrockAgentClient(getClientConfig(creds, region));

  try {
    const kbs = await client.send(new ListKnowledgeBasesCommand({ maxResults: 50 }));
    for (const kb of kbs.knowledgeBaseSummaries || []) {
      assets.push({
        name: kb.name || "Unknown",
        type: "Knowledge Base",
        category: "Knowledge Bases",
        source: "AWS Bedrock",
        externalId: kb.knowledgeBaseId ? `arn:aws:bedrock:${region}::knowledge-base/${kb.knowledgeBaseId}` : "",
        serviceType: "Bedrock",
        risk: "Medium",
        exposure: "Private",
        tags: ["bedrock", "knowledge-base", kb.status || "Unknown", region],
        metadata: {
          knowledgeBaseId: kb.knowledgeBaseId || "",
          status: kb.status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Knowledge Bases (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 7. Training Data & Model Artifacts (S3 Buckets) ───

const MODEL_FILE_EXTENSIONS = [
  ".pkl", ".safetensors", ".pth", ".onnx", ".bin", ".h5",
  ".joblib", ".tf", ".tflite", ".mlmodel", ".pt", ".model",
  ".weights", ".caffemodel", ".pb",
];

function isModelFile(key: string): boolean {
  const lower = key.toLowerCase();
  return MODEL_FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function inferModelFramework(ext: string): string {
  const map: Record<string, string> = {
    ".pkl": "Scikit-learn/Pickle", ".safetensors": "Hugging Face",
    ".pth": "PyTorch", ".pt": "PyTorch", ".onnx": "ONNX",
    ".bin": "Hugging Face/PyTorch", ".h5": "Keras/TensorFlow",
    ".joblib": "Scikit-learn", ".tf": "TensorFlow",
    ".tflite": "TensorFlow Lite", ".mlmodel": "Core ML",
    ".model": "XGBoost/LightGBM", ".weights": "Darknet/YOLO",
    ".caffemodel": "Caffe", ".pb": "TensorFlow (Protobuf)",
  };
  return map[ext.toLowerCase()] || "Unknown";
}

async function scanModelFilesInBucket(client: S3Client, bucketName: string): Promise<{
  modelFiles: { key: string; size: number; lastModified: string; extension: string; framework: string }[];
  totalObjectsScanned: number;
}> {
  const modelFiles: { key: string; size: number; lastModified: string; extension: string; framework: string }[] = [];
  let totalObjectsScanned = 0;
  let continuationToken: string | undefined;

  try {
    do {
      const resp = await client.send(new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }));
      for (const obj of resp.Contents || []) {
        totalObjectsScanned++;
        const key = obj.Key || "";
        if (isModelFile(key)) {
          const ext = "." + key.split(".").pop()!.toLowerCase();
          modelFiles.push({
            key,
            size: obj.Size || 0,
            lastModified: obj.LastModified?.toISOString() || "Unknown",
            extension: ext,
            framework: inferModelFramework(ext),
          });
        }
      }
      continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
      if (modelFiles.length >= 200) break;
      if (totalObjectsScanned >= 10000) break;
    } while (continuationToken);
  } catch {}

  return { modelFiles, totalObjectsScanned };
}

async function scanTrainingData(creds: AwsCredentials): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new S3Client(getClientConfig(creds, "us-east-1"));

  const AI_KEYWORDS = ["ml", "ai", "model", "dataset", "training", "sagemaker", "data-lake", "embedding", "llm", "inference", "bedrock", "feature"];

  try {
    const resp = await client.send(new ListBucketsCommand({}));
    for (const bucket of resp.Buckets || []) {
      const name = (bucket.Name || "").toLowerCase();
      const nameMatch = AI_KEYWORDS.some(kw => name.includes(kw));

      let tagMatch = false;
      let sensitivity = "Unknown";
      let encryption = "Unknown";
      let tagMap: Record<string, string> = {};
      try {
        const tags = await client.send(new GetBucketTaggingCommand({ Bucket: bucket.Name }));
        for (const t of tags.TagSet || []) {
          tagMap[(t.Key || "").toLowerCase()] = t.Value || "";
        }
        tagMatch = tagMap["purpose"] === "ai" || tagMap["purpose"] === "ml" || tagMap["use"] === "training" || tagMap["environment"] === "ai";
        sensitivity = tagMap["sensitivity"] || tagMap["classification"] || "Unknown";
      } catch {}

      try {
        const enc = await client.send(new GetBucketEncryptionCommand({ Bucket: bucket.Name }));
        const rules = enc.ServerSideEncryptionConfiguration?.Rules || [];
        if (rules.length > 0) {
          const algo = rules[0].ApplyServerSideEncryptionByDefault?.SSEAlgorithm;
          encryption = algo === "aws:kms" ? "KMS" : algo || "SSE";
        }
      } catch {}

      const { modelFiles, totalObjectsScanned } = await scanModelFilesInBucket(client, bucket.Name || "");

      const hasModelFiles = modelFiles.length > 0;
      const isAiBucket = nameMatch || tagMatch;

      if (!isAiBucket && !hasModelFiles) continue;

      const totalModelSizeBytes = modelFiles.reduce((sum, f) => sum + f.size, 0);
      const totalModelSizeMB = Math.round(totalModelSizeBytes / (1024 * 1024));

      const frameworkCounts: Record<string, number> = {};
      const extensionCounts: Record<string, number> = {};
      for (const mf of modelFiles) {
        frameworkCounts[mf.framework] = (frameworkCounts[mf.framework] || 0) + 1;
        extensionCounts[mf.extension] = (extensionCounts[mf.extension] || 0) + 1;
      }

      const largestFiles = [...modelFiles]
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(f => ({
          key: f.key,
          sizeMB: Math.round(f.size / (1024 * 1024) * 100) / 100,
          framework: f.framework,
          lastModified: f.lastModified,
        }));

      if (isAiBucket) {
        assets.push({
          name: bucket.Name || "Unknown",
          type: "Training Data",
          category: "Training Data",
          source: "AWS S3",
          externalId: `arn:aws:s3:::${bucket.Name}`,
          serviceType: "S3",
          risk: sensitivity === "high" || sensitivity === "sensitive" ? "High" : "Medium",
          exposure: "Private",
          tags: ["s3", "data-store", ...(tagMatch ? ["ai-tagged"] : []), ...(hasModelFiles ? ["contains-models"] : [])],
          metadata: {
            bucketArn: `arn:aws:s3:::${bucket.Name}`,
            sensitivity,
            encryption,
            totalObjectsScanned,
            modelFileCount: modelFiles.length,
            modelFileSizeMB: totalModelSizeMB,
            modelExtensions: JSON.stringify(extensionCounts),
            modelFrameworks: JSON.stringify(frameworkCounts),
            largestModelFiles: JSON.stringify(largestFiles),
          },
        });
      }

      if (hasModelFiles) {
        const riskLevel = encryption === "Unknown" || encryption === "None" ? "High" :
          modelFiles.some(f => f.extension === ".pkl") ? "High" : "Medium";

        const linkedModel = false;

        assets.push({
          name: `${bucket.Name} [Model Artifacts]`,
          type: "Model Artifact Store",
          category: "Custom Models",
          source: "AWS S3",
          externalId: `arn:aws:s3:::${bucket.Name}::model-artifacts`,
          serviceType: "S3",
          risk: riskLevel,
          exposure: "Private",
          tags: ["s3", "model-artifacts", ...Object.keys(frameworkCounts).map(f => f.toLowerCase().replace(/[^a-z0-9]/g, "-"))],
          metadata: {
            bucketArn: `arn:aws:s3:::${bucket.Name}`,
            bucketName: bucket.Name || "",
            encryption,
            modelFileCount: modelFiles.length,
            modelFileSizeMB: totalModelSizeMB,
            modelExtensions: JSON.stringify(extensionCounts),
            modelFrameworks: JSON.stringify(frameworkCounts),
            largestModelFiles: JSON.stringify(largestFiles),
            linkedToDeployedModel: linkedModel ? "true" : "false",
            containsPickleFiles: modelFiles.some(f => f.extension === ".pkl") ? "true" : "false",
            containsUnsafeFormats: modelFiles.some(f => [".pkl", ".bin", ".joblib"].includes(f.extension)) ? "true" : "false",
            oldestModelFile: modelFiles.length > 0 ? modelFiles.reduce((oldest, f) => f.lastModified < oldest ? f.lastModified : oldest, modelFiles[0].lastModified) : "Unknown",
            newestModelFile: modelFiles.length > 0 ? modelFiles.reduce((newest, f) => f.lastModified > newest ? f.lastModified : newest, modelFiles[0].lastModified) : "Unknown",
          },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`S3 Training Data: ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 8. Development (SageMaker Notebooks) ───
async function scanDevelopment(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new SageMakerClient(getClientConfig(creds, region));

  try {
    const notebooks = await client.send(new ListNotebookInstancesCommand({ MaxResults: 100 }));
    for (const nb of notebooks.NotebookInstances || []) {
      let directInternetAccess = (nb as any).DirectInternetAccess || "";
      let rootAccess = "";
      let volumeSizeInGB = "";
      let lifecycleConfigName = "";

      try {
        const detail = await client.send(new DescribeNotebookInstanceCommand({ NotebookInstanceName: nb.NotebookInstanceName || "" }));
        directInternetAccess = detail.DirectInternetAccess || directInternetAccess;
        rootAccess = detail.RootAccess || "Disabled";
        volumeSizeInGB = String(detail.VolumeSizeInGB || "");
        lifecycleConfigName = detail.NotebookInstanceLifecycleConfigName || "";
      } catch (_err: any) {}

      const isPublic = directInternetAccess === "Enabled";
      const subnetId = (nb as any).SubnetId || "";
      const vpcSecurityGroupIds = ((nb as any).SecurityGroups || []).join(", ");
      assets.push({
        name: nb.NotebookInstanceName || "Unknown",
        type: "Notebook",
        category: "Development",
        source: "AWS SageMaker",
        externalId: nb.NotebookInstanceArn || nb.NotebookInstanceName || "",
        serviceType: "SageMaker",
        risk: isPublic ? "High" : "Low",
        exposure: isPublic ? "Public" : "Private",
        tags: ["sagemaker", "notebook", nb.NotebookInstanceStatus || "Unknown", region],
        metadata: {
          instanceType: nb.InstanceType || "",
          status: nb.NotebookInstanceStatus || "",
          publicAccess: isPublic ? "Yes" : "No",
          directInternetAccess,
          rootAccess,
          volumeSizeInGB,
          lifecycleConfigName,
          vpcId: subnetId ? "configured" : "",
          subnetId,
          securityGroups: vpcSecurityGroupIds,
          roleArn: (nb as any).RoleArn || "",
          kmsKeyId: (nb as any).KmsKeyId || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`SageMaker Notebooks (${region}): ${err.message}`);
  }

  try {
    const jobs = await client.send(new ListTrainingJobsCommand({ MaxResults: 50 }));
    for (const job of jobs.TrainingJobSummaries || []) {
      let volumeKmsKeyId = "";
      let enableInterContainerTrafficEncryption = "false";
      let roleArn = "";
      let vpcConfigured = "false";
      let enableManagedSpotTraining = "false";

      try {
        const detail = await client.send(new DescribeTrainingJobCommand({ TrainingJobName: job.TrainingJobName || "" }));
        volumeKmsKeyId = detail.ResourceConfig?.VolumeKmsKeyId || "";
        enableInterContainerTrafficEncryption = detail.EnableInterContainerTrafficEncryption ? "true" : "false";
        roleArn = detail.RoleArn || "";
        vpcConfigured = detail.VpcConfig?.Subnets?.length ? "true" : "false";
        enableManagedSpotTraining = detail.EnableManagedSpotTraining ? "true" : "false";
      } catch (_err: any) {}

      assets.push({
        name: job.TrainingJobName || "Unknown",
        type: "Training Job",
        category: "Development",
        source: "AWS SageMaker",
        externalId: job.TrainingJobArn || job.TrainingJobName || "",
        serviceType: "SageMaker",
        risk: volumeKmsKeyId ? "Low" : "Medium",
        exposure: "Private",
        tags: ["sagemaker", "training", job.TrainingJobStatus || "Unknown", region],
        metadata: {
          status: job.TrainingJobStatus || "",
          volumeKmsKeyId,
          enableInterContainerTrafficEncryption,
          roleArn,
          vpcConfigured,
          enableManagedSpotTraining,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`SageMaker Training Jobs (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 9. Guardrails (Bedrock Guardrails) ───
async function scanGuardrails(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new BedrockClient(getClientConfig(creds, region));

  try {
    const resp = await client.send(new ListGuardrailsCommand({ maxResults: 50 }));
    for (const gr of resp.guardrails || []) {
      assets.push({
        name: gr.name || "Unknown",
        type: "Guardrail",
        category: "Guardrails",
        source: "AWS Bedrock",
        externalId: gr.arn || gr.id || "",
        serviceType: "Bedrock",
        risk: "Low",
        exposure: "Private",
        tags: ["bedrock", "guardrail", gr.status || "Unknown", region],
        metadata: {
          guardrailId: gr.id || "",
          status: gr.status || "",
          version: gr.version || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Guardrails (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 10. Orchestration (SageMaker Pipelines / Step Functions) ───
async function scanOrchestration(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  const smClient = new SageMakerClient(getClientConfig(creds, region));
  try {
    const pipelines = await smClient.send(new ListPipelinesCommand({ MaxResults: 100 }));
    for (const p of pipelines.PipelineSummaries || []) {
      assets.push({
        name: p.PipelineName || "Unknown",
        type: "ML Pipeline",
        category: "Orchestration",
        source: "AWS SageMaker",
        externalId: p.PipelineArn || p.PipelineName || "",
        serviceType: "SageMaker",
        risk: "Medium",
        exposure: "Private",
        tags: ["sagemaker", "pipeline", region],
        metadata: {
          pipelineArn: p.PipelineArn || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`SageMaker Pipelines (${region}): ${err.message}`);
  }

  const AI_SM_KEYWORDS = ["ml", "ai", "model", "sagemaker", "bedrock", "inference", "training", "llm"];
  const sfnClient = new SFNClient(getClientConfig(creds, region));
  try {
    const machines = await sfnClient.send(new ListStateMachinesCommand({ maxResults: 100 }));
    for (const sm of machines.stateMachines || []) {
      const name = (sm.name || "").toLowerCase();
      const isAiRelated = AI_SM_KEYWORDS.some(kw => name.includes(kw));
      if (isAiRelated) {
        assets.push({
          name: sm.name || "Unknown",
          type: "Step Function",
          category: "Orchestration",
          source: "AWS Step Functions",
          externalId: sm.stateMachineArn || sm.name || "",
          serviceType: "Step Functions",
          risk: "Medium",
          exposure: "Private",
          tags: ["step-functions", "orchestration", region],
          metadata: {
            stateMachineArn: sm.stateMachineArn || "",
            type: sm.type || "",
            region,
          },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Step Functions (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 11. Feature Store (SageMaker Feature Store) ───
async function scanFeatureStore(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new SageMakerClient(getClientConfig(creds, region));

  try {
    const features = await client.send(new ListFeatureGroupsCommand({ MaxResults: 100 }));
    for (const fg of features.FeatureGroupSummaries || []) {
      let onlineStoreKmsKeyId = "";
      let offlineStoreKmsKeyId = "";
      let roleArn = "";
      let onlineStoreEnabled = "false";

      try {
        const detail = await client.send(new DescribeFeatureGroupCommand({ FeatureGroupName: fg.FeatureGroupName || "" }));
        onlineStoreKmsKeyId = detail.OnlineStoreConfig?.SecurityConfig?.KmsKeyId || "";
        offlineStoreKmsKeyId = detail.OfflineStoreConfig?.S3StorageConfig?.KmsKeyId || "";
        roleArn = detail.RoleArn || "";
        onlineStoreEnabled = detail.OnlineStoreConfig ? "true" : "false";
      } catch (_err: any) {}

      assets.push({
        name: fg.FeatureGroupName || "Unknown",
        type: "Feature Store",
        category: "Feature Store",
        source: "AWS SageMaker",
        externalId: fg.FeatureGroupArn || fg.FeatureGroupName || "",
        serviceType: "SageMaker",
        risk: "Medium",
        exposure: "Private",
        tags: ["sagemaker", "feature-store", fg.FeatureGroupStatus || "Unknown", region],
        metadata: {
          featureGroupArn: fg.FeatureGroupArn || "",
          status: fg.FeatureGroupStatus || "",
          onlineStoreKmsKeyId,
          offlineStoreKmsKeyId,
          roleArn,
          onlineStoreEnabled,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`SageMaker Feature Store (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 12. Secrets/Keys (Secrets Manager / Parameter Store) ───
async function scanSecretsAndKeys(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  const AI_SECRET_KEYWORDS = ["openai", "anthropic", "bedrock", "sagemaker", "hugging", "cohere", "ai21", "replicate", "azure_openai", "model", "llm", "ml_", "ai_"];

  const smClient = new SecretsManagerClient(getClientConfig(creds, region));
  try {
    const secrets = await smClient.send(new ListSecretsCommand({ MaxResults: 100 }));
    for (const s of secrets.SecretList || []) {
      const name = (s.Name || "").toLowerCase();
      const isAiRelated = AI_SECRET_KEYWORDS.some(kw => name.includes(kw));
      if (isAiRelated) {
        const rotationEnabled = s.RotationEnabled || false;
        assets.push({
          name: s.Name || "Unknown",
          type: "Secret",
          category: "Secrets/Keys",
          source: "AWS Secrets Manager",
          externalId: s.ARN || s.Name || "",
          serviceType: "Secrets Manager",
          risk: rotationEnabled ? "Low" : "High",
          exposure: "Private",
          tags: ["secrets-manager", ...(rotationEnabled ? ["rotation-enabled"] : ["no-rotation"]), region],
          metadata: {
            secretArn: s.ARN || "",
            rotationEnabled: rotationEnabled ? "Yes" : "No",
            lastRotated: s.LastRotatedDate?.toISOString() || "Never",
            region,
          },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Secrets Manager (${region}): ${err.message}`);
  }

  const ssmClient = new SSMClient(getClientConfig(creds, region));
  try {
    const params = await ssmClient.send(new DescribeParametersCommand({ MaxResults: 50 }));
    for (const p of params.Parameters || []) {
      const name = (p.Name || "").toLowerCase();
      const isAiRelated = AI_SECRET_KEYWORDS.some(kw => name.includes(kw));
      if (isAiRelated) {
        assets.push({
          name: p.Name || "Unknown",
          type: "Parameter",
          category: "Secrets/Keys",
          source: "AWS Parameter Store",
          externalId: `arn:aws:ssm:${region}::parameter${p.Name}`,
          serviceType: "SSM",
          risk: p.Type === "SecureString" ? "Medium" : "High",
          exposure: "Private",
          tags: ["ssm", "parameter", p.Type || "String", region],
          metadata: {
            type: p.Type || "",
            tier: p.Tier || "",
            region,
          },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Parameter Store (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 13. Identity/Roles (IAM Roles for AI services) ───
async function scanIdentityRoles(creds: AwsCredentials): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new IAMClient(getClientConfig(creds, "us-east-1"));

  const AI_PRINCIPALS = ["sagemaker.amazonaws.com", "bedrock.amazonaws.com", "lambda.amazonaws.com"];

  try {
    const roles = await client.send(new ListRolesCommand({ MaxItems: 300 }));
    for (const role of roles.Roles || []) {
      let trustPolicy = "";
      try {
        trustPolicy = decodeURIComponent(role.AssumeRolePolicyDocument || "");
      } catch {
        trustPolicy = role.AssumeRolePolicyDocument || "";
      }

      const isAiRole = AI_PRINCIPALS.some(p => trustPolicy.includes(p));
      if (isAiRole) {
        const trustedServices = AI_PRINCIPALS.filter(p => trustPolicy.includes(p)).map(p => p.split(".")[0]);
        const hasBoundary = !!(role as any).PermissionsBoundary;
        const boundaryArn = (role as any).PermissionsBoundary?.PermissionsBoundaryArn || "";

        let attachedPolicyNames: string[] = [];
        let inlinePolicyNames: string[] = [];
        let lastUsed = "";

        try {
          const attached = await client.send(new ListAttachedRolePoliciesCommand({ RoleName: role.RoleName }));
          attachedPolicyNames = (attached.AttachedPolicies || []).map(p => p.PolicyName || "").filter(Boolean);
        } catch {}

        try {
          const inline = await client.send(new ListRolePoliciesCommand({ RoleName: role.RoleName }));
          inlinePolicyNames = inline.PolicyNames || [];
        } catch {}

        try {
          const roleDetail = await client.send(new GetRoleCommand({ RoleName: role.RoleName }));
          const lastUsedDate = roleDetail.Role?.RoleLastUsed?.LastUsedDate;
          if (lastUsedDate) {
            const daysSince = Math.floor((Date.now() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24));
            lastUsed = daysSince > 30 ? `inactive (${daysSince} days ago)` : `active (${daysSince} days ago)`;
          } else {
            lastUsed = "never";
          }
        } catch {}

        const allPolicies = [...attachedPolicyNames, ...inlinePolicyNames];
        const allPoliciesStr = allPolicies.join(", ");
        const allPoliciesLower = allPoliciesStr.toLowerCase();

        const isOverprivileged = allPoliciesLower.includes("administratoraccess") || allPoliciesLower.includes("admin") || allPoliciesLower.includes("fullaccess");

        let hasCrossAccount = false;
        let externalPrincipals = "";
        try {
          const parsedTrust = JSON.parse(trustPolicy);
          const statements = parsedTrust.Statement || [];
          for (const stmt of statements) {
            const principal = stmt.Principal || {};
            const awsPrincipal = principal.AWS || "";
            const principals = Array.isArray(awsPrincipal) ? awsPrincipal : [awsPrincipal];
            const external = principals.filter((p: string) => p && !p.includes(":root") ? false : p.includes(":root") && !p.includes("sts"));
            if (external.length > 0) {
              hasCrossAccount = true;
              externalPrincipals = external.join(", ");
            }
          }
        } catch {}

        const hasDeletePerms = allPoliciesLower.includes("delete") || allPoliciesLower.includes("sagemaker-full");
        const hasLambdaUpdate = allPoliciesLower.includes("lambda") && (allPoliciesLower.includes("fullaccess") || allPoliciesLower.includes("update"));
        const hasSecretsAccess = allPoliciesLower.includes("secretsmanager") || allPoliciesLower.includes("secrets");
        const hasBedrockInvoke = allPoliciesLower.includes("bedrock") || trustedServices.includes("bedrock");
        const hasS3Access = allPoliciesLower.includes("s3") || allPoliciesLower.includes("amazons3");
        const hasDbWrite = allPoliciesLower.includes("dynamodb") || allPoliciesLower.includes("rds");

        const riskLevel = isOverprivileged ? "Critical" : (!hasBoundary ? "Medium" : "Low");

        const metadata: Record<string, string> = {
          roleArn: role.Arn || "",
          trustedServices: trustedServices.join(", "),
          permissionBoundary: hasBoundary ? boundaryArn || "Yes" : "none",
          permissions: allPoliciesStr || "none",
          policyNames: allPoliciesStr || "none",
          lastActivity: lastUsed || "unknown",
          trustPolicy: trustPolicy.substring(0, 500),
          createdDate: role.CreateDate?.toISOString() || "",
        };

        if (hasCrossAccount) {
          metadata.trustRelationship = "cross-account";
          metadata.externalPrincipals = externalPrincipals;
        }
        if (hasDeletePerms) {
          metadata.mfaCondition = trustPolicy.includes("MultiFactorAuthPresent") ? "required" : "none";
        }
        if (hasSecretsAccess) {
          metadata.secretsScope = allPoliciesLower.includes("fullaccess") || allPoliciesLower.includes("*") ? "*" : "scoped";
        }
        if (hasBedrockInvoke && (allPoliciesLower.includes("fullaccess") || allPoliciesLower.includes("bedrock"))) {
          metadata.bedrockScope = allPoliciesLower.includes("fullaccess") ? 'resource: "*"' : "scoped";
        }
        if (hasS3Access) {
          metadata.s3Permissions = allPoliciesLower.includes("fullaccess") || allPoliciesLower.includes("s3full")
            ? "s3:* on arn:aws:s3:::*" : "s3:GetObject (scoped)";
        }
        if (hasDbWrite) {
          metadata.approvalWorkflow = "false";
        }
        if (hasLambdaUpdate) {
          metadata.lambdaPermissions = "lambda:UpdateFunctionCode";
        }

        const roleTags = [...trustedServices];
        if (isOverprivileged) roleTags.push("overprivileged");
        if (!hasBoundary) roleTags.push("no-boundary");

        assets.push({
          name: role.RoleName || "Unknown",
          type: "IAM Role",
          category: "Identity/Roles",
          source: "AWS IAM",
          externalId: role.Arn || role.RoleName || "",
          serviceType: "IAM",
          risk: riskLevel,
          exposure: "Private",
          tags: ["iam", "role", ...roleTags],
          metadata,
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`IAM Roles: ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── 14. Monitoring/Logs (CloudWatch / CloudTrail) ───
async function scanMonitoringLogs(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  const AI_LOG_KEYWORDS = ["sagemaker", "bedrock", "ml", "ai", "model", "inference"];

  const cwlClient = new CloudWatchLogsClient(getClientConfig(creds, region));
  try {
    const logGroups = await cwlClient.send(new DescribeLogGroupsCommand({ limit: 50 }));
    for (const lg of logGroups.logGroups || []) {
      const name = (lg.logGroupName || "").toLowerCase();
      const isAiRelated = AI_LOG_KEYWORDS.some(kw => name.includes(kw));
      if (isAiRelated) {
        const kmsKeyId = (lg as any).kmsKeyId || "";
        const hasEncryption = !!kmsKeyId;
        assets.push({
          name: lg.logGroupName || "Unknown",
          type: "Log Group",
          category: "Monitoring/Logs",
          source: "AWS CloudWatch",
          externalId: lg.arn || lg.logGroupName || "",
          serviceType: "CloudWatch",
          risk: hasEncryption ? "Low" : (lg.retentionInDays ? "Medium" : "High"),
          exposure: "Private",
          tags: ["cloudwatch", "logs", region, ...(hasEncryption ? ["encrypted"] : ["unencrypted"])],
          metadata: {
            logGroupArn: lg.arn || "",
            retentionDays: lg.retentionInDays?.toString() || "Never expires",
            storedBytes: lg.storedBytes?.toString() || "0",
            encryption: hasEncryption ? "KMS" : "none",
            kmsKeyId: kmsKeyId || "",
            region,
          },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`CloudWatch Logs (${region}): ${err.message}`);
  }

  const ctClient = new CloudTrailClient(getClientConfig(creds, region));
  try {
    const trails = await ctClient.send(new DescribeTrailsCommand({}));
    for (const trail of trails.trailList || []) {
      if (trail.HomeRegion === region) {
        assets.push({
          name: trail.Name || "Unknown",
          type: "CloudTrail",
          category: "Monitoring/Logs",
          source: "AWS CloudTrail",
          externalId: trail.TrailARN || trail.Name || "",
          serviceType: "CloudTrail",
          risk: trail.LogFileValidationEnabled ? "Low" : "Medium",
          exposure: "Private",
          tags: ["cloudtrail", "audit", region],
          metadata: {
            trailArn: trail.TrailARN || "",
            s3Bucket: trail.S3BucketName || "",
            logValidation: trail.LogFileValidationEnabled ? "Enabled" : "Disabled",
            isMultiRegion: trail.IsMultiRegionTrail ? "Yes" : "No",
            region,
          },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`CloudTrail (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Lambda (AI-related functions) ───
async function scanLambdaRegion(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new LambdaClient(getClientConfig(creds, region));

  const AI_RUNTIMES = ["python3.9", "python3.10", "python3.11", "python3.12"];
  const AI_NAME_PATTERNS = [
    /\b(sagemaker|bedrock|openai|llm|gpt|claude|huggingface|langchain)\b/i,
    /\b(inference|predict|embedding|torch|tensorflow|pytorch|ml[-_]|ai[-_])/i,
    /\b(model[-_]serving|model[-_]deploy|model[-_]train|ml[-_]pipeline)\b/i,
  ];
  const AI_ENV_KEYWORDS = ["sagemaker", "bedrock", "openai", "huggingface", "model_endpoint", "llm", "langchain"];

  try {
    const resp = await client.send(new ListFunctionsCommand({ MaxItems: 200 }));
    for (const fn of resp.Functions || []) {
      const name = fn.FunctionName || "";
      const runtime = fn.Runtime || "";
      const envVars = JSON.stringify(fn.Environment?.Variables || {}).toLowerCase();
      const nameMatchesAi = AI_NAME_PATTERNS.some(pattern => pattern.test(name));
      const envMatchesAi = AI_ENV_KEYWORDS.some(kw => envVars.includes(kw));
      const isAiRelated = nameMatchesAi ||
        envMatchesAi ||
        (AI_RUNTIMES.includes(runtime) && (fn.MemorySize || 0) >= 1024 && (fn.Timeout || 0) >= 60);

      if (isAiRelated) {
        assets.push({
          name: fn.FunctionName || "Unknown",
          type: "Lambda Function",
          category: "Orchestration",
          source: "AWS Lambda",
          externalId: fn.FunctionArn || fn.FunctionName || "",
          serviceType: "Lambda",
          risk: (fn.MemorySize || 0) >= 1024 ? "Medium" : "Low",
          exposure: "Private",
          tags: ["lambda", runtime, region],
          metadata: {
            functionArn: fn.FunctionArn || "",
            runtime,
            memorySize: `${fn.MemorySize || 128}MB`,
            region,
          },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Lambda Functions (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Bedrock Flows ───
async function scanBedrockFlows(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new BedrockAgentClient(getClientConfig(creds, region));

  try {
    const flows = await client.send(new ListFlowsCommand({ maxResults: 50 }));
    for (const flow of flows.flowSummaries || []) {
      assets.push({
        name: flow.name || "Unknown",
        type: "Bedrock Flow",
        category: "Orchestration",
        source: "AWS Bedrock",
        externalId: flow.arn || flow.id || "",
        serviceType: "Bedrock",
        risk: "Medium",
        exposure: "Private",
        tags: ["bedrock", "flow", flow.status || "Unknown", region],
        metadata: {
          flowId: flow.id || "",
          status: flow.status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Flows (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── AWS Glue (ETL/Data Ingestion) ───
async function scanGlueETL(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new GlueClient(getClientConfig(creds, region));

  try {
    const crawlers = await client.send(new GetCrawlersCommand({ MaxResults: 100 }));
    for (const crawler of crawlers.Crawlers || []) {
      const targets = crawler.Targets;
      const targetCount = (targets?.S3Targets?.length || 0) + (targets?.JdbcTargets?.length || 0) + (targets?.DynamoDBTargets?.length || 0);
      assets.push({
        name: crawler.Name || "Unknown",
        type: "Glue Crawler",
        category: "Data Ingestion/ETL",
        source: "AWS Glue",
        externalId: `arn:aws:glue:${region}:crawler/${crawler.Name}`,
        serviceType: "Glue",
        risk: targetCount > 3 ? "High" : "Medium",
        exposure: "Private",
        tags: ["glue", "crawler", "etl", "data-ingestion", region, crawler.State || "unknown"],
        metadata: {
          state: crawler.State || "",
          databaseName: crawler.DatabaseName || "",
          targetCount: String(targetCount),
          schedule: crawler.Schedule?.ScheduleExpression || "none",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Glue Crawlers (${region}): ${err.message}`);
  }

  try {
    const jobs = await client.send(new GetJobsCommand({ MaxResults: 100 }));
    for (const job of jobs.Jobs || []) {
      const hasAiRelatedArgs = JSON.stringify(job.DefaultArguments || {}).toLowerCase().match(/sagemaker|bedrock|ml|model|train/);
      assets.push({
        name: job.Name || "Unknown",
        type: "Glue Job",
        category: "Data Ingestion/ETL",
        source: "AWS Glue",
        externalId: `arn:aws:glue:${region}:job/${job.Name}`,
        serviceType: "Glue",
        risk: hasAiRelatedArgs ? "High" : "Medium",
        exposure: "Private",
        tags: ["glue", "job", "etl", "data-movement", region, ...(hasAiRelatedArgs ? ["ai-data-pipeline"] : [])],
        metadata: {
          role: job.Role || "",
          glueVersion: job.GlueVersion || "",
          workerType: job.WorkerType || "",
          maxCapacity: String(job.MaxCapacity || ""),
          aiRelated: hasAiRelatedArgs ? "true" : "false",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Glue Jobs (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Amazon AppFlow (SaaS Data Flows) ───
async function scanAppFlow(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new AppflowClient(getClientConfig(creds, region));

  try {
    const flows = await client.send(new AppflowListFlowsCommand({ maxResults: 100 }));
    for (const flow of flows.flows || []) {
      const destTypes = flow.destinationConnectorType || "unknown";
      const srcType = flow.sourceConnectorType || "unknown";
      const isAiDestination = destTypes.toLowerCase().match(/s3|sagemaker|bedrock/);
      assets.push({
        name: flow.flowName || "Unknown",
        type: "AppFlow Integration",
        category: "Data Ingestion/ETL",
        source: "AWS AppFlow",
        externalId: flow.flowArn || `arn:aws:appflow:${region}:flow/${flow.flowName}`,
        serviceType: "AppFlow",
        risk: isAiDestination ? "High" : "Medium",
        exposure: srcType === "SAPOData" || srcType === "Salesforce" ? "External" : "Private",
        tags: ["appflow", "saas-integration", "data-flow", region, srcType, destTypes, ...(isAiDestination ? ["ai-data-source"] : [])],
        metadata: {
          sourceType: srcType,
          destinationType: destTypes,
          status: flow.flowStatus || "",
          triggerType: flow.triggerType || "",
          aiDestination: isAiDestination ? "true" : "false",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`AppFlow (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Amazon Lex (AI Chatbots) ───
async function scanLexBots(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];
  const client = new LexModelsV2Client(getClientConfig(creds, region));

  try {
    const bots = await client.send(new ListBotsCommand({ maxResults: 50 }));
    for (const bot of bots.botSummaries || []) {
      assets.push({
        name: bot.botName || "Unknown",
        type: "Lex Chatbot",
        category: "AI Services/Conversational",
        source: "AWS Lex",
        externalId: `arn:aws:lex:${region}:bot/${bot.botId}`,
        serviceType: "Lex",
        risk: "High",
        exposure: "Public",
        tags: ["lex", "chatbot", "conversational-ai", "prompt-injection-risk", region, bot.botStatus || "unknown"],
        metadata: {
          botId: bot.botId || "",
          botStatus: bot.botStatus || "",
          region,
        },
      });
      models.push({
        name: bot.botName || "Unknown",
        type: "Conversational AI",
        category: "NLP/Chatbot",
        externalId: `arn:aws:lex:${region}:bot/${bot.botId}`,
        serviceType: "Lex",
        status: bot.botStatus || "Unknown",
        riskScore: 75,
        tags: ["lex", "chatbot", region],
        metadata: {
          botId: bot.botId || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Lex Bots (${region}): ${err.message}`);
  }

  return { assets, models, errors };
}

// ─── Amazon Kendra (RAG Search) ───
async function scanKendraIndices(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new KendraClient(getClientConfig(creds, region));

  try {
    const indices = await client.send(new ListIndicesCommand({ MaxResults: 50 }));
    for (const idx of indices.IndexConfigurationSummaryItems || []) {
      assets.push({
        name: idx.Name || "Unknown",
        type: "Kendra Index",
        category: "AI Services/Search",
        source: "AWS Kendra",
        externalId: `arn:aws:kendra:${region}:index/${idx.Id}`,
        serviceType: "Kendra",
        risk: "High",
        exposure: "Private",
        tags: ["kendra", "rag", "search-index", "retrieval-augmented", region, idx.Status || "unknown"],
        metadata: {
          indexId: idx.Id || "",
          status: idx.Status || "",
          edition: idx.Edition || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Kendra (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Bedrock Prompt Management ───
async function scanBedrockPrompts(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new BedrockAgentClient(getClientConfig(creds, region));

  try {
    const prompts = await client.send(new ListPromptsCommand({ maxResults: 50 }));
    for (const prompt of prompts.promptSummaries || []) {
      assets.push({
        name: prompt.name || "Unknown",
        type: "Bedrock Prompt",
        category: "AI Governance/Prompts",
        source: "AWS Bedrock",
        externalId: prompt.arn || `arn:aws:bedrock:${region}:prompt/${prompt.id}`,
        serviceType: "Bedrock",
        risk: "Critical",
        exposure: "Private",
        tags: ["bedrock", "prompt-management", "system-prompt", "jailbreak-risk", region],
        metadata: {
          promptId: prompt.id || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Prompts (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Neptune Analytics (GraphRAG) ───
async function scanNeptuneGraphDB(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new NeptuneClient(getClientConfig(creds, region));

  try {
    const clusters = await client.send(new NeptuneDescribeDBClustersCommand({}));
    for (const cluster of clusters.DBClusters || []) {
      const isEncrypted = cluster.StorageEncrypted || false;
      const isPublic = cluster.Endpoint?.includes("public") || false;
      assets.push({
        name: cluster.DBClusterIdentifier || "Unknown",
        type: "Neptune Graph DB",
        category: "Vector/Graph Storage",
        source: "AWS Neptune",
        externalId: cluster.DBClusterArn || "",
        serviceType: "Neptune",
        risk: !isEncrypted || isPublic ? "Critical" : "Medium",
        exposure: isPublic ? "Public" : "Private",
        tags: ["neptune", "graph-db", "graphrag", region, ...(isEncrypted ? ["encrypted"] : ["unencrypted"]), ...(isPublic ? ["public-endpoint"] : [])],
        metadata: {
          engine: cluster.Engine || "",
          engineVersion: cluster.EngineVersion || "",
          status: cluster.Status || "",
          encrypted: String(isEncrypted),
          endpoint: cluster.Endpoint || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Neptune (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Aurora/RDS pgvector (Vector Storage) ───
async function scanAuroraVectorDB(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new RDSClient(getClientConfig(creds, region));

  try {
    const clusters = await client.send(new DescribeDBClustersCommand({}));
    for (const cluster of clusters.DBClusters || []) {
      const isAurora = (cluster.Engine || "").startsWith("aurora");
      const isPostgres = (cluster.Engine || "").includes("postgres");
      if (!isAurora && !isPostgres) continue;
      const isEncrypted = cluster.StorageEncrypted || false;
      const isPublic = cluster.PubliclyAccessible || false;
      assets.push({
        name: cluster.DBClusterIdentifier || "Unknown",
        type: isAurora ? "Aurora Cluster" : "RDS PostgreSQL",
        category: "Vector/Graph Storage",
        source: "AWS RDS",
        externalId: cluster.DBClusterArn || "",
        serviceType: "RDS",
        risk: !isEncrypted || isPublic ? "Critical" : "Medium",
        exposure: isPublic ? "Public" : "Private",
        tags: ["rds", isAurora ? "aurora" : "postgres", "pgvector-candidate", region, ...(isEncrypted ? ["encrypted"] : ["unencrypted"]), ...(isPublic ? ["public-endpoint"] : [])],
        metadata: {
          engine: cluster.Engine || "",
          engineVersion: cluster.EngineVersion || "",
          status: cluster.Status || "",
          encrypted: String(isEncrypted),
          publicAccess: String(isPublic),
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Aurora/RDS (${region}): ${err.message}`);
  }

  try {
    const instances = await client.send(new DescribeDBInstancesCommand({}));
    for (const instance of instances.DBInstances || []) {
      const engine = instance.Engine || "";
      if (!engine.includes("postgres")) continue;
      if (instance.DBClusterIdentifier) continue;
      const isEncrypted = instance.StorageEncrypted || false;
      const isPublic = instance.PubliclyAccessible || false;
      assets.push({
        name: instance.DBInstanceIdentifier || "Unknown",
        type: "RDS PostgreSQL Instance",
        category: "Vector/Graph Storage",
        source: "AWS RDS",
        externalId: instance.DBInstanceArn || "",
        serviceType: "RDS",
        risk: !isEncrypted || isPublic ? "Critical" : "Medium",
        exposure: isPublic ? "Public" : "Private",
        tags: ["rds", "postgres", "pgvector-candidate", "standalone", region, ...(isEncrypted ? ["encrypted"] : ["unencrypted"]), ...(isPublic ? ["public-endpoint"] : [])],
        metadata: {
          engine: engine,
          engineVersion: instance.EngineVersion || "",
          status: instance.DBInstanceStatus || "",
          encrypted: String(isEncrypted),
          publicAccess: String(isPublic),
          instanceClass: instance.DBInstanceClass || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`RDS Instances (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Kinesis Data Streams & Firehose ───
async function scanKinesis(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const kinesisClient = new KinesisClient(getClientConfig(creds, region));
  const firehoseClient = new FirehoseClient(getClientConfig(creds, region));
  const AI_STREAM_PATTERNS = [/\b(model|inference|prediction|embedding|feature|training|sagemaker|bedrock|ml[-_]|ai[-_])\b/i];

  try {
    const streams = await kinesisClient.send(new ListStreamsCommand({ Limit: 100 }));
    for (const streamName of streams.StreamNames || []) {
      const isAiStream = AI_STREAM_PATTERNS.some(p => p.test(streamName));
      if (!isAiStream) continue;
      try {
        const details = await kinesisClient.send(new DescribeStreamCommand({ StreamName: streamName }));
        const desc = details.StreamDescription;
        assets.push({
          name: streamName,
          type: "Data Stream",
          category: "Real-time Data Pipeline",
          source: "AWS Kinesis",
          externalId: desc?.StreamARN || "",
          serviceType: "Kinesis",
          risk: desc?.EncryptionType === "NONE" ? "High" : "Medium",
          exposure: "Private",
          tags: ["kinesis", "data-stream", "real-time", region],
          metadata: { arn: desc?.StreamARN || "", status: desc?.StreamStatus || "", shardCount: String(desc?.Shards?.length || 0), encryption: desc?.EncryptionType || "NONE", region },
        });
      } catch {}
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Kinesis Streams (${region}): ${err.message}`);
  }

  try {
    const deliveryStreams = await firehoseClient.send(new ListDeliveryStreamsCommand({ Limit: 100 }));
    for (const streamName of deliveryStreams.DeliveryStreamNames || []) {
      const isAiStream = AI_STREAM_PATTERNS.some(p => p.test(streamName));
      if (!isAiStream) continue;
      try {
        const details = await firehoseClient.send(new DescribeDeliveryStreamCommand({ DeliveryStreamName: streamName }));
        const desc = details.DeliveryStreamDescription;
        const destinations: string[] = [];
        for (const dest of desc?.Destinations || []) {
          if (dest.S3DestinationDescription) destinations.push("S3");
          if (dest.RedshiftDestinationDescription) destinations.push("Redshift");
          if (dest.ElasticsearchDestinationDescription) destinations.push("Elasticsearch");
          if (dest.HttpEndpointDestinationDescription) destinations.push("HTTP");
        }
        assets.push({
          name: streamName,
          type: "Data Firehose",
          category: "Data Ingestion/ETL",
          source: "AWS Kinesis Firehose",
          externalId: desc?.DeliveryStreamARN || "",
          serviceType: "Firehose",
          risk: "Medium",
          exposure: "Private",
          tags: ["firehose", "data-pipeline", "etl", ...destinations.map(d => d.toLowerCase()), region],
          metadata: { arn: desc?.DeliveryStreamARN || "", status: desc?.DeliveryStreamStatus || "", destinations: destinations.join(","), region },
        });
      } catch {}
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Kinesis Firehose (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── EMR Clusters (ML Workloads) ───
async function scanEMR(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new EMRClient(getClientConfig(creds, region));

  try {
    const clusters = await client.send(new EMRListClustersCommand({ ClusterStates: ["RUNNING", "WAITING", "STARTING"] }));
    for (const cluster of clusters.Clusters || []) {
      try {
        const details = await client.send(new EMRDescribeClusterCommand({ ClusterId: cluster.Id }));
        const cd = details.Cluster;
        const applications = (cd?.Applications || []).map(a => a.Name).filter(Boolean);
        const hasMLApps = applications.some(app => ["Spark", "TensorFlow", "MXNet", "PyTorch", "Zeppelin", "JupyterHub"].includes(app || ""));
        if (hasMLApps) {
          assets.push({
            name: cluster.Name || "Unknown",
            type: "EMR Cluster",
            category: "Distributed ML",
            source: "AWS EMR",
            externalId: cd?.ClusterArn || cluster.Id || "",
            serviceType: "EMR",
            risk: cd?.VisibleToAllUsers ? "High" : "Medium",
            exposure: "Private",
            tags: ["emr", "distributed-ml", ...applications.map(a => a?.toLowerCase() || ""), region],
            metadata: { clusterId: cluster.Id || "", arn: cd?.ClusterArn || "", status: cluster.Status?.State || "", applications: applications.join(","), visibleToAll: String(cd?.VisibleToAllUsers || false), region },
          });
        }
      } catch {}
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`EMR Clusters (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── API Gateway (Model Serving Endpoints) ───
async function scanAPIGateway(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new APIGatewayClient(getClientConfig(creds, region));
  const AI_API_PATTERNS = [/\b(model|predict|inference|classify|embed|sagemaker|bedrock|ml[-_]|ai[-_])\b/i];

  try {
    const apis = await client.send(new GetRestApisCommand({ limit: 100 }));
    for (const api of apis.items || []) {
      const combined = `${api.name || ""} ${api.description || ""}`;
      const isAiApi = AI_API_PATTERNS.some(p => p.test(combined));
      if (!isAiApi) continue;
      let hasAuth = false;
      try {
        const resources = await client.send(new GetResourcesCommand({ restApiId: api.id, limit: 100 }));
        for (const resource of resources.items || []) {
          if (resource.resourceMethods) {
            for (const method of Object.values(resource.resourceMethods)) {
              if (method.authorizationType && method.authorizationType !== "NONE") hasAuth = true;
            }
          }
        }
      } catch {}
      assets.push({
        name: api.name || "Unknown",
        type: "API Gateway",
        category: "Model Serving",
        source: "AWS API Gateway",
        externalId: `arn:aws:apigateway:${region}::/restapis/${api.id}`,
        serviceType: "API Gateway",
        risk: !hasAuth ? "Critical" : "Medium",
        exposure: api.endpointConfiguration?.types?.includes("EDGE") ? "Public" : "Private",
        tags: ["api-gateway", "model-serving", "endpoint", region],
        metadata: { apiId: api.id || "", endpointType: (api.endpointConfiguration?.types || []).join(","), hasAuthentication: String(hasAuth), region },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`API Gateway (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── EKS/ECS Clusters (Container Orchestration for AI) ───
async function scanContainerOrchestration(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const AI_PATTERNS = [/\b(ml[-_]|ai[-_]|model|kubeflow|inference|serving)\b/i];

  const eksClient = new EKSClient(getClientConfig(creds, region));
  try {
    const clusters = await eksClient.send(new EKSListClustersCommand({ maxResults: 100 }));
    for (const clusterName of clusters.clusters || []) {
      if (!AI_PATTERNS.some(p => p.test(clusterName))) continue;
      try {
        const details = await eksClient.send(new DescribeClusterCommand({ name: clusterName }));
        const cluster = details.cluster;
        assets.push({
          name: clusterName,
          type: "EKS Cluster",
          category: "Container Orchestration",
          source: "AWS EKS",
          externalId: cluster?.arn || "",
          serviceType: "EKS",
          risk: cluster?.resourcesVpcConfig?.endpointPublicAccess ? "High" : "Medium",
          exposure: cluster?.resourcesVpcConfig?.endpointPublicAccess ? "Public" : "Private",
          tags: ["eks", "kubernetes", "container-orchestration", region],
          metadata: { arn: cluster?.arn || "", status: cluster?.status || "", version: cluster?.version || "", publicAccess: String(cluster?.resourcesVpcConfig?.endpointPublicAccess || false), region },
        });
      } catch {}
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`EKS Clusters (${region}): ${err.message}`);
  }

  const ecsClient = new ECSClient(getClientConfig(creds, region));
  try {
    const clusters = await ecsClient.send(new ECSListClustersCommand({ maxResults: 100 }));
    for (const clusterArn of clusters.clusterArns || []) {
      const clusterName = clusterArn.split('/').pop() || "";
      if (!AI_PATTERNS.some(p => p.test(clusterName))) continue;
      assets.push({
        name: clusterName,
        type: "ECS Cluster",
        category: "Container Orchestration",
        source: "AWS ECS",
        externalId: clusterArn,
        serviceType: "ECS",
        risk: "Medium",
        exposure: "Private",
        tags: ["ecs", "container-orchestration", region],
        metadata: { arn: clusterArn, region },
      });
      try {
        const services = await ecsClient.send(new ListServicesCommand({ cluster: clusterArn, maxResults: 50 }));
        for (const serviceArn of services.serviceArns || []) {
          const serviceName = serviceArn.split('/').pop() || "";
          if (!/\b(model|inference|serving|prediction)\b/i.test(serviceName)) continue;
          try {
            const serviceDetails = await ecsClient.send(new DescribeServicesCommand({ cluster: clusterArn, services: [serviceArn] }));
            const service = serviceDetails.services?.[0];
            if (service) {
              assets.push({
                name: serviceName,
                type: "ECS Service",
                category: "Model Serving",
                source: "AWS ECS",
                externalId: serviceArn,
                serviceType: "ECS",
                risk: service.networkConfiguration?.awsvpcConfiguration?.assignPublicIp === "ENABLED" ? "High" : "Medium",
                exposure: service.networkConfiguration?.awsvpcConfiguration?.assignPublicIp === "ENABLED" ? "Public" : "Private",
                tags: ["ecs", "model-serving", "container", region],
                metadata: { arn: serviceArn, cluster: clusterName, taskDefinition: service.taskDefinition || "", desiredCount: String(service.desiredCount || 0), runningCount: String(service.runningCount || 0), region },
              });
            }
          } catch {}
        }
      } catch {}
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`ECS Clusters (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── EventBridge Rules (AI Workflow Triggers) ───
async function scanEventBridge(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new EventBridgeClient(getClientConfig(creds, region));
  const AI_PATTERNS = [/\b(sagemaker|bedrock|model|training|inference|ml[-_]|ai[-_])\b/i];

  try {
    const rules = await client.send(new ListRulesCommand({ Limit: 100 }));
    for (const rule of rules.Rules || []) {
      const combined = `${rule.Name || ""} ${rule.Description || ""} ${rule.EventPattern || ""}`;
      if (!AI_PATTERNS.some(p => p.test(combined))) continue;
      assets.push({
        name: rule.Name || "Unknown",
        type: "EventBridge Rule",
        category: "Workflow Automation",
        source: "AWS EventBridge",
        externalId: rule.Arn || "",
        serviceType: "EventBridge",
        risk: rule.State === "ENABLED" ? "Medium" : "Low",
        exposure: "Private",
        tags: ["eventbridge", "workflow", "automation", region],
        metadata: { arn: rule.Arn || "", state: rule.State || "", schedule: rule.ScheduleExpression || "", region },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`EventBridge Rules (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── CloudFormation Stacks (AI Infrastructure) ───
async function scanCloudFormation(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new CloudFormationClient(getClientConfig(creds, region));
  const AI_PATTERNS = [/\b(sagemaker|bedrock|ml[-_]|ai[-_]|model|inference|training)\b/i];

  try {
    const stacks = await client.send(new ListStacksCommand({ StackStatusFilter: ["CREATE_COMPLETE", "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE"] }));
    for (const stack of stacks.StackSummaries || []) {
      if (!AI_PATTERNS.some(p => p.test(stack.StackName || ""))) continue;
      const aiResources: string[] = [];
      try {
        const resources = await client.send(new DescribeStackResourcesCommand({ StackName: stack.StackName }));
        for (const resource of resources.StackResources || []) {
          const rt = resource.ResourceType || "";
          if (rt.includes("SageMaker") || rt.includes("Bedrock") || rt.includes("Comprehend") || rt.includes("Rekognition") || rt.includes("Personalize") || rt.includes("Forecast")) {
            aiResources.push(`${rt}:${resource.LogicalResourceId}`);
          }
        }
      } catch {}
      if (aiResources.length > 0) {
        assets.push({
          name: stack.StackName || "Unknown",
          type: "CloudFormation Stack",
          category: "Infrastructure as Code",
          source: "AWS CloudFormation",
          externalId: stack.StackId || "",
          serviceType: "CloudFormation",
          risk: "Low",
          exposure: "Private",
          tags: ["cloudformation", "iac", "infrastructure", region],
          metadata: { stackId: stack.StackId || "", status: stack.StackStatus || "", aiResourceCount: String(aiResources.length), aiResources: aiResources.slice(0, 10).join(","), region },
        });
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`CloudFormation Stacks (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── ECR Repositories (Container Images) ───
async function scanECR(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new ECRClient(getClientConfig(creds, region));
  const AI_PATTERNS = [/\b(model|inference|sagemaker|bedrock|ml[-_]|ai[-_]|torch|tensorflow|huggingface|training)\b/i];

  try {
    const repos = await client.send(new DescribeRepositoriesCommand({ maxResults: 100 }));
    for (const repo of repos.repositories || []) {
      if (!AI_PATTERNS.some(p => p.test(repo.repositoryName || ""))) continue;
      const isEncrypted = repo.encryptionConfiguration?.encryptionType !== "AES256";
      const isMutable = repo.imageTagMutability === "MUTABLE";
      assets.push({
        name: repo.repositoryName || "Unknown",
        type: "Container Repository",
        category: "Container Registry",
        source: "AWS ECR",
        externalId: repo.repositoryArn || "",
        serviceType: "ECR",
        risk: isMutable ? "High" : "Medium",
        exposure: "Private",
        tags: ["ecr", "container-registry", "docker", region, ...(isMutable ? ["mutable-tags"] : ["immutable-tags"])],
        metadata: { arn: repo.repositoryArn || "", uri: repo.repositoryUri || "", encryption: repo.encryptionConfiguration?.encryptionType || "", tagMutability: repo.imageTagMutability || "", region },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`ECR Repositories (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Main Scanner with Comprehensive Relationship Mapping ───
// Import the comprehensive scanner functions
async function loadComprehensiveScanners() {
  try {
    const integrated = await import('./aws-scanner-integrated');
    return integrated;
  } catch (err) {
    // Fallback if comprehensive scanners are not available
    console.warn('Comprehensive scanners not available, using legacy scanners');
    return null;
  }
}

export async function scanAwsAccount(creds: AwsCredentials): Promise<ScanResult> {
  // Try to use the comprehensive scanner first
  const comprehensiveScanner = await loadComprehensiveScanners();

  if (comprehensiveScanner && comprehensiveScanner.performEnhancedAwsScan) {
    try {
      console.log('Using comprehensive AWS scanner with relationship mapping...');

      // Use the enhanced scanner that includes ALL services and relationships
      const enhancedResult = await comprehensiveScanner.performEnhancedAwsScan(creds, {
        includeRelationships: true,
        includeDataFlows: true,
        regions: SCAN_REGIONS,
        services: ['all'], // Scan all services, not just AI/ML
      });

      // Log summary of relationships if found
      if (enhancedResult.relationships && enhancedResult.relationships.length > 0) {
        console.log(`Discovered ${enhancedResult.relationships.length} relationships between resources`);
      }

      if (enhancedResult.dataFlowPaths && enhancedResult.dataFlowPaths.length > 0) {
        console.log(`Traced ${enhancedResult.dataFlowPaths.length} data flow paths`);
      }

      // Return the result (backward compatible format)
      return {
        assets: enhancedResult.assets,
        models: enhancedResult.models,
        accountId: enhancedResult.accountId,
        regionsScanned: enhancedResult.regionsScanned,
        errors: enhancedResult.errors,
      };
    } catch (err: any) {
      console.error('Enhanced scanner failed, falling back to legacy scanner:', err.message);
      // Fall through to legacy scanner
    }
  }

  // Legacy scanner fallback (original implementation)
  console.log('Using legacy AWS scanner (AI/ML focused)...');
  const allAssets: DiscoveredAsset[] = [];
  const allModels: DiscoveredModel[] = [];
  const allErrors: string[] = [];

  const connectionTest = await testAwsConnection(creds);
  if (!connectionTest.success) {
    return { assets: [], models: [], accountId: "", regionsScanned: [], errors: [connectionTest.error || "Connection failed"] };
  }

  const regionScanners = SCAN_REGIONS.flatMap(region => [
    scanBedrockFoundationModels(creds, region),
    scanCustomModels(creds, region),
    scanInferenceEndpoints(creds, region),
    scanAiAgents(creds, region),
    scanVectorStorage(creds, region),
    scanKnowledgeBases(creds, region),
    scanDevelopment(creds, region),
    scanGuardrails(creds, region),
    scanOrchestration(creds, region),
    scanFeatureStore(creds, region),
    scanSecretsAndKeys(creds, region),
    scanMonitoringLogs(creds, region),
    scanLambdaRegion(creds, region),
    // scanBedrockFlows/scanBedrockPrompts replaced by enriched scanBedrockFlowsPrompts below
    scanGlueETL(creds, region),
    scanAppFlow(creds, region),
    // scanLexBots replaced by enriched scanLexAdditions below
    // scanKendraIndices replaced by enriched scanKendraAdditions below
    scanNeptuneGraphDB(creds, region),
    scanAuroraVectorDB(creds, region),
    scanComprehend(creds, region),
    scanTextract(creds, region),
    scanRekognition(creds, region),
    scanTranslate(creds, region),
    scanTranscribe(creds, region),
    scanPolly(creds, region),
    scanPersonalize(creds, region),
    scanForecast(creds, region),
    scanKinesis(creds, region),
    scanEMR(creds, region),
    scanAPIGateway(creds, region),
    scanContainerOrchestration(creds, region),
    scanEventBridge(creds, region),
    scanCloudFormation(creds, region),
    scanECR(creds, region),
    scanKendraAdditions(creds, region),
    scanLexAdditions(creds, region),
    scanQBusiness(creds, region),
    scanSageMakerEdge(creds, region),
    scanBedrockFlowsPrompts(creds, region),
    scanCodeGuruDevOpsGuru(creds, region),
  ]);

  regionScanners.push(scanTrainingData(creds));
  regionScanners.push(scanIdentityRoles(creds));

  const results = await Promise.allSettled(regionScanners);

  const seenExternalIds = new Set<string>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const asset of result.value.assets) {
        if (asset.externalId && !seenExternalIds.has(asset.externalId)) {
          seenExternalIds.add(asset.externalId);
          allAssets.push(asset);
        }
      }
      for (const model of result.value.models) {
        if (model.externalId && !seenExternalIds.has(model.externalId)) {
          seenExternalIds.add(model.externalId);
          allModels.push(model);
        }
      }
      allErrors.push(...result.value.errors);
    } else {
      allErrors.push(result.reason?.message || "Unknown scanner error");
    }
  }

  return {
    assets: allAssets,
    models: allModels,
    accountId: connectionTest.accountId || "",
    regionsScanned: SCAN_REGIONS,
    errors: allErrors,
  };
}