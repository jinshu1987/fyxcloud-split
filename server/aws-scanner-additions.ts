// Additional AWS AI Service Scanners to be added to aws-scanner.ts

import { ComprehendClient, ListDocumentClassifiersCommand, ListEntityRecognizersCommand, ListEndpointsCommand as ComprehendListEndpointsCommand, ListPiiEntitiesDetectionJobsCommand } from "@aws-sdk/client-comprehend";
import { TextractClient, ListAdaptersCommand } from "@aws-sdk/client-textract";
import { RekognitionClient, DescribeProjectsCommand, ListCollectionsCommand, ListStreamProcessorsCommand } from "@aws-sdk/client-rekognition";
import { TranslateClient, ListTextTranslationJobsCommand, ListParallelDataCommand } from "@aws-sdk/client-translate";
import { TranscribeClient, ListTranscriptionJobsCommand, ListVocabulariesCommand, ListLanguageModelsCommand } from "@aws-sdk/client-transcribe";
import { PollyClient, ListLexiconsCommand } from "@aws-sdk/client-polly";
import { PersonalizeClient, ListDatasetGroupsCommand, ListSolutionsCommand, ListCampaignsCommand, ListRecommendersCommand } from "@aws-sdk/client-personalize";
import { ForecastClient, ListDatasetGroupsCommand as ForecastListDatasetGroupsCommand, ListPredictorsCommand, ListForecastsCommand } from "@aws-sdk/client-forecast";
import { ECRClient, DescribeRepositoriesCommand, DescribeImagesCommand } from "@aws-sdk/client-ecr";
import { SageMakerClient, ListModelPackageGroupsCommand, ListModelPackagesCommand, ListDeviceFleetsCommand, ListEdgePackagingJobsCommand, DescribeDeviceFleetCommand, DescribeEdgePackagingJobCommand } from "@aws-sdk/client-sagemaker";
import { BedrockClient, ListModelCustomizationJobsCommand, ListEvaluationJobsCommand } from "@aws-sdk/client-bedrock";
import { BedrockAgentClient, ListFlowsCommand as BedrockListFlowsCommand, ListPromptsCommand, GetFlowCommand, GetPromptCommand } from "@aws-sdk/client-bedrock-agent";
import { CodeGuruReviewerClient, ListRepositoryAssociationsCommand } from "@aws-sdk/client-codeguru-reviewer";
import { DevOpsGuruClient, DescribeAccountHealthCommand } from "@aws-sdk/client-devops-guru";
import { KinesisClient, ListStreamsCommand, DescribeStreamCommand } from "@aws-sdk/client-kinesis";
import { EMRClient, ListClustersCommand as EMRListClustersCommand, DescribeClusterCommand as EMRDescribeClusterCommand } from "@aws-sdk/client-emr";
import { APIGatewayClient, GetRestApisCommand } from "@aws-sdk/client-api-gateway";
import { EKSClient, ListClustersCommand as EKSListClustersCommand, DescribeClusterCommand } from "@aws-sdk/client-eks";
import { ECSClient, ListClustersCommand, ListServicesCommand, DescribeServicesCommand } from "@aws-sdk/client-ecs";
import { KendraClient, ListIndicesCommand as KendraListIndicesCommand, ListDataSourcesCommand, DescribeIndexCommand as KendraDescribeIndexCommand, DescribeDataSourceCommand as KendraDescribeDataSourceCommand } from "@aws-sdk/client-kendra";
import { LexModelsV2Client, ListBotsCommand as LexListBotsCommand, ListBotAliasesCommand, DescribeBotCommand, DescribeBotAliasCommand } from "@aws-sdk/client-lex-models-v2";
import { QBusinessClient, ListApplicationsCommand, GetApplicationCommand } from "@aws-sdk/client-qbusiness";

// Import the necessary types from the main scanner
import type { AwsCredentials, DiscoveredAsset, DiscoveredModel } from "./aws-scanner";

// Helper function to get client config (same as in aws-scanner.ts)
function getClientConfig(creds: AwsCredentials, region: string) {
  return {
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  };
}

// Helper function to check ignorable errors (same as in aws-scanner.ts)
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

// ─── Amazon Comprehend (NLP) ───
export async function scanComprehend(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];
  const client = new ComprehendClient(getClientConfig(creds, region));

  try {
    const classifiers = await client.send(new ListDocumentClassifiersCommand({ MaxResults: 100 }));
    for (const classifier of classifiers.DocumentClassifierPropertiesList || []) {
      models.push({
        name: classifier.DocumentClassifierArn?.split('/').pop() || "Unknown",
        type: "Document Classifier",
        category: "NLP",
        externalId: classifier.DocumentClassifierArn || "",
        serviceType: "Comprehend",
        status: classifier.Status || "Unknown",
        riskScore: 50,
        tags: ["comprehend", "nlp", "classifier", region],
        metadata: {
          arn: classifier.DocumentClassifierArn || "",
          languageCode: classifier.LanguageCode || "",
          mode: classifier.Mode || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Comprehend Classifiers (${region}): ${err.message}`);
  }

  try {
    const recognizers = await client.send(new ListEntityRecognizersCommand({ MaxResults: 100 }));
    for (const recognizer of recognizers.EntityRecognizerPropertiesList || []) {
      models.push({
        name: recognizer.EntityRecognizerArn?.split('/').pop() || "Unknown",
        type: "Entity Recognizer",
        category: "NLP",
        externalId: recognizer.EntityRecognizerArn || "",
        serviceType: "Comprehend",
        status: recognizer.Status || "Unknown",
        riskScore: 50,
        tags: ["comprehend", "nlp", "entity-recognition", region],
        metadata: {
          arn: recognizer.EntityRecognizerArn || "",
          languageCode: recognizer.LanguageCode || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Comprehend Entity Recognizers (${region}): ${err.message}`);
  }

  try {
    const endpoints = await client.send(new ComprehendListEndpointsCommand({ MaxResults: 100 }));
    for (const endpoint of endpoints.EndpointPropertiesList || []) {
      assets.push({
        name: endpoint.EndpointArn?.split('/').pop() || "Unknown",
        type: "Comprehend Endpoint",
        category: "NLP Endpoints",
        source: "AWS Comprehend",
        externalId: endpoint.EndpointArn || "",
        serviceType: "Comprehend",
        risk: "Medium",
        exposure: "Private",
        tags: ["comprehend", "endpoint", "nlp", region],
        metadata: {
          arn: endpoint.EndpointArn || "",
          status: endpoint.Status || "",
          modelArn: endpoint.ModelArn || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Comprehend Endpoints (${region}): ${err.message}`);
  }

  try {
    const piiJobs = await client.send(new ListPiiEntitiesDetectionJobsCommand({ MaxResults: 50 }));
    for (const job of piiJobs.PiiEntitiesDetectionJobPropertiesList || []) {
      assets.push({
        name: job.JobName || job.JobId || "Unknown",
        type: "PII Detection Job",
        category: "Data Privacy",
        source: "AWS Comprehend",
        externalId: `comprehend-pii-job-${job.JobId}`,
        serviceType: "Comprehend",
        risk: "High",
        exposure: "Private",
        tags: ["comprehend", "pii", "data-privacy", region],
        metadata: {
          jobId: job.JobId || "",
          status: job.JobStatus || "",
          languageCode: job.LanguageCode || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Comprehend PII Jobs (${region}): ${err.message}`);
  }

  return { assets, models, errors };
}

// ─── Amazon Textract (Document AI) ───
export async function scanTextract(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new TextractClient(getClientConfig(creds, region));

  try {
    const adapters = await client.send(new ListAdaptersCommand({ MaxResults: 50 }));
    for (const adapter of adapters.Adapters || []) {
      assets.push({
        name: adapter.AdapterId || "Unknown",
        type: "Textract Adapter",
        category: "Document AI",
        source: "AWS Textract",
        externalId: `arn:aws:textract:${region}:adapter/${adapter.AdapterId}`,
        serviceType: "Textract",
        risk: "Medium",
        exposure: "Private",
        tags: ["textract", "document-ai", "ocr", "custom-adapter", region],
        metadata: {
          adapterId: adapter.AdapterId || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Textract (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Amazon Rekognition (Computer Vision) ───
export async function scanRekognition(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];
  const client = new RekognitionClient(getClientConfig(creds, region));

  try {
    const projects = await client.send(new DescribeProjectsCommand({ MaxResults: 100 }));
    for (const project of projects.ProjectDescriptions || []) {
      models.push({
        name: project.ProjectArn?.split('/').pop() || "Unknown",
        type: "Custom Labels Model",
        category: "Computer Vision",
        externalId: project.ProjectArn || "",
        serviceType: "Rekognition",
        status: project.Status || "Unknown",
        riskScore: 55,
        tags: ["rekognition", "computer-vision", "custom-labels", region],
        metadata: {
          arn: project.ProjectArn || "",
          status: project.Status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Rekognition Projects (${region}): ${err.message}`);
  }

  try {
    const collections = await client.send(new ListCollectionsCommand({ MaxResults: 100 }));
    for (const collectionId of collections.CollectionIds || []) {
      assets.push({
        name: collectionId,
        type: "Face Collection",
        category: "Biometric Data",
        source: "AWS Rekognition",
        externalId: `arn:aws:rekognition:${region}:collection/${collectionId}`,
        serviceType: "Rekognition",
        risk: "Critical",
        exposure: "Private",
        tags: ["rekognition", "face-recognition", "biometric", "pii", region],
        metadata: {
          collectionId,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Rekognition Collections (${region}): ${err.message}`);
  }

  try {
    const streams = await client.send(new ListStreamProcessorsCommand({ MaxResults: 100 }));
    for (const processor of streams.StreamProcessors || []) {
      assets.push({
        name: processor.Name || "Unknown",
        type: "Stream Processor",
        category: "Real-time Vision",
        source: "AWS Rekognition",
        externalId: `arn:aws:rekognition:${region}:streamprocessor/${processor.Name}`,
        serviceType: "Rekognition",
        risk: "High",
        exposure: "Private",
        tags: ["rekognition", "stream-processing", "real-time", region],
        metadata: {
          name: processor.Name || "",
          status: processor.Status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Rekognition Stream Processors (${region}): ${err.message}`);
  }

  return { assets, models, errors };
}

// ─── Amazon Translate ───
export async function scanTranslate(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];
  const client = new TranslateClient(getClientConfig(creds, region));

  try {
    const jobs = await client.send(new ListTextTranslationJobsCommand({ MaxResults: 50 }));
    for (const job of jobs.TextTranslationJobPropertiesList || []) {
      assets.push({
        name: job.JobName || job.JobId || "Unknown",
        type: "Translation Job",
        category: "Translation",
        source: "AWS Translate",
        externalId: `translate-job-${job.JobId}`,
        serviceType: "Translate",
        risk: "Medium",
        exposure: "Private",
        tags: ["translate", "nlp", "translation", region],
        metadata: {
          jobId: job.JobId || "",
          status: job.JobStatus || "",
          sourceLang: job.SourceLanguageCode || "",
          targetLangs: (job.TargetLanguageCodes || []).join(","),
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Translate Jobs (${region}): ${err.message}`);
  }

  try {
    const parallelData = await client.send(new ListParallelDataCommand({ MaxResults: 50 }));
    for (const data of parallelData.ParallelDataPropertiesList || []) {
      models.push({
        name: data.Name || "Unknown",
        type: "Custom Terminology",
        category: "Translation",
        externalId: data.Arn || "",
        serviceType: "Translate",
        status: data.Status || "Unknown",
        riskScore: 30,
        tags: ["translate", "custom-terminology", region],
        metadata: {
          arn: data.Arn || "",
          status: data.Status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Translate Parallel Data (${region}): ${err.message}`);
  }

  return { assets, models, errors };
}

// ─── Amazon Transcribe (Speech-to-Text) ───
export async function scanTranscribe(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];
  const client = new TranscribeClient(getClientConfig(creds, region));

  try {
    const jobs = await client.send(new ListTranscriptionJobsCommand({ MaxResults: 50 }));
    for (const job of jobs.TranscriptionJobSummaries || []) {
      assets.push({
        name: job.TranscriptionJobName || "Unknown",
        type: "Transcription Job",
        category: "Speech AI",
        source: "AWS Transcribe",
        externalId: `transcribe-job-${job.TranscriptionJobName}`,
        serviceType: "Transcribe",
        risk: job.OutputLocationType === "CUSTOMER_BUCKET" ? "Medium" : "Low",
        exposure: "Private",
        tags: ["transcribe", "speech-to-text", "audio", region],
        metadata: {
          jobName: job.TranscriptionJobName || "",
          status: job.TranscriptionJobStatus || "",
          languageCode: job.LanguageCode || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Transcribe Jobs (${region}): ${err.message}`);
  }

  try {
    const vocabularies = await client.send(new ListVocabulariesCommand({ MaxResults: 50 }));
    for (const vocab of vocabularies.Vocabularies || []) {
      models.push({
        name: vocab.VocabularyName || "Unknown",
        type: "Custom Vocabulary",
        category: "Speech AI",
        externalId: `transcribe-vocab-${vocab.VocabularyName}`,
        serviceType: "Transcribe",
        status: vocab.VocabularyState || "Unknown",
        riskScore: 25,
        tags: ["transcribe", "custom-vocabulary", region],
        metadata: {
          vocabularyName: vocab.VocabularyName || "",
          languageCode: vocab.LanguageCode || "",
          state: vocab.VocabularyState || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Transcribe Vocabularies (${region}): ${err.message}`);
  }

  try {
    const models_list = await client.send(new ListLanguageModelsCommand({ MaxResults: 50 }));
    for (const model of models_list.Models || []) {
      models.push({
        name: model.ModelName || "Unknown",
        type: "Custom Language Model",
        category: "Speech AI",
        externalId: `transcribe-model-${model.ModelName}`,
        serviceType: "Transcribe",
        status: model.ModelStatus || "Unknown",
        riskScore: 35,
        tags: ["transcribe", "custom-model", "language-model", region],
        metadata: {
          modelName: model.ModelName || "",
          languageCode: model.LanguageCode || "",
          status: model.ModelStatus || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Transcribe Language Models (${region}): ${err.message}`);
  }

  return { assets, models, errors };
}

// ─── Amazon Polly (Text-to-Speech) ───
export async function scanPolly(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new PollyClient(getClientConfig(creds, region));

  try {
    const lexicons = await client.send(new ListLexiconsCommand({}));
    for (const lexicon of lexicons.Lexicons || []) {
      assets.push({
        name: lexicon.Name || "Unknown",
        type: "Custom Lexicon",
        category: "Speech Synthesis",
        source: "AWS Polly",
        externalId: `polly-lexicon-${lexicon.Name}`,
        serviceType: "Polly",
        risk: "Low",
        exposure: "Private",
        tags: ["polly", "text-to-speech", "lexicon", region],
        metadata: {
          lexiconName: lexicon.Name || "",
          languageCode: lexicon.LanguageCode || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Polly Lexicons (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Amazon Personalize (Recommendation Systems) ───
export async function scanPersonalize(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];
  const client = new PersonalizeClient(getClientConfig(creds, region));

  try {
    const datasetGroups = await client.send(new ListDatasetGroupsCommand({ maxResults: 50 }));
    for (const group of datasetGroups.datasetGroups || []) {
      assets.push({
        name: group.name || "Unknown",
        type: "Dataset Group",
        category: "Recommendation System",
        source: "AWS Personalize",
        externalId: group.datasetGroupArn || "",
        serviceType: "Personalize",
        risk: "Medium",
        exposure: "Private",
        tags: ["personalize", "recommendation", "dataset", region],
        metadata: {
          arn: group.datasetGroupArn || "",
          status: group.status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Personalize Dataset Groups (${region}): ${err.message}`);
  }

  try {
    const solutions = await client.send(new ListSolutionsCommand({ maxResults: 50 }));
    for (const solution of solutions.solutions || []) {
      models.push({
        name: solution.name || "Unknown",
        type: "Recommendation Model",
        category: "Recommendation System",
        externalId: solution.solutionArn || "",
        serviceType: "Personalize",
        status: solution.status || "Unknown",
        riskScore: 45,
        tags: ["personalize", "recommendation-model", region],
        metadata: {
          arn: solution.solutionArn || "",
          status: solution.status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Personalize Solutions (${region}): ${err.message}`);
  }

  try {
    const campaigns = await client.send(new ListCampaignsCommand({ maxResults: 50 }));
    for (const campaign of campaigns.campaigns || []) {
      assets.push({
        name: campaign.name || "Unknown",
        type: "Personalize Campaign",
        category: "Recommendation Endpoints",
        source: "AWS Personalize",
        externalId: campaign.campaignArn || "",
        serviceType: "Personalize",
        risk: "High",
        exposure: "Private",
        tags: ["personalize", "campaign", "endpoint", region],
        metadata: {
          arn: campaign.campaignArn || "",
          status: campaign.status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Personalize Campaigns (${region}): ${err.message}`);
  }

  try {
    const recommenders = await client.send(new ListRecommendersCommand({ maxResults: 50 }));
    for (const recommender of recommenders.recommenders || []) {
      models.push({
        name: recommender.name || "Unknown",
        type: "Domain Recommender",
        category: "Recommendation System",
        externalId: recommender.recommenderArn || "",
        serviceType: "Personalize",
        status: recommender.status || "Unknown",
        riskScore: 40,
        tags: ["personalize", "domain-recommender", region],
        metadata: {
          arn: recommender.recommenderArn || "",
          recipeArn: recommender.recipeArn || "",
          status: recommender.status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Personalize Recommenders (${region}): ${err.message}`);
  }

  return { assets, models, errors };
}

// ─── Amazon Forecast (Time Series Forecasting) ───
export async function scanForecast(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const models: DiscoveredModel[] = [];
  const errors: string[] = [];
  const client = new ForecastClient(getClientConfig(creds, region));

  try {
    const datasetGroups = await client.send(new ForecastListDatasetGroupsCommand({ MaxResults: 50 }));
    for (const group of datasetGroups.DatasetGroups || []) {
      assets.push({
        name: group.DatasetGroupName || "Unknown",
        type: "Forecast Dataset Group",
        category: "Time Series AI",
        source: "AWS Forecast",
        externalId: group.DatasetGroupArn || "",
        serviceType: "Forecast",
        risk: "Medium",
        exposure: "Private",
        tags: ["forecast", "time-series", "dataset", region],
        metadata: {
          arn: group.DatasetGroupArn || "",
          domain: group.Domain || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Forecast Dataset Groups (${region}): ${err.message}`);
  }

  try {
    const predictors = await client.send(new ListPredictorsCommand({ MaxResults: 50 }));
    for (const predictor of predictors.Predictors || []) {
      models.push({
        name: predictor.PredictorName || "Unknown",
        type: "Time Series Predictor",
        category: "Time Series AI",
        externalId: predictor.PredictorArn || "",
        serviceType: "Forecast",
        status: predictor.Status || "Unknown",
        riskScore: 40,
        tags: ["forecast", "predictor", "time-series", region],
        metadata: {
          arn: predictor.PredictorArn || "",
          status: predictor.Status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Forecast Predictors (${region}): ${err.message}`);
  }

  try {
    const forecasts = await client.send(new ListForecastsCommand({ MaxResults: 50 }));
    for (const forecast of forecasts.Forecasts || []) {
      assets.push({
        name: forecast.ForecastName || "Unknown",
        type: "Forecast Output",
        category: "Time Series Predictions",
        source: "AWS Forecast",
        externalId: forecast.ForecastArn || "",
        serviceType: "Forecast",
        risk: "Medium",
        exposure: "Private",
        tags: ["forecast", "predictions", "time-series", region],
        metadata: {
          arn: forecast.ForecastArn || "",
          predictorArn: forecast.PredictorArn || "",
          status: forecast.Status || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Forecasts (${region}): ${err.message}`);
  }

  return { assets, models, errors };
}

// ─── SageMaker Edge Manager (Device Fleets & Edge Packaging) ───
export async function scanSageMakerEdge(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new SageMakerClient(getClientConfig(creds, region));

  try {
    const fleets = await client.send(new ListDeviceFleetsCommand({ MaxResults: 50 }));
    for (const fleet of fleets.DeviceFleetSummaries || []) {
      let fleetDetail: Record<string, any> = {};
      if (fleet.DeviceFleetName) {
        try {
          const desc = await client.send(new DescribeDeviceFleetCommand({ DeviceFleetName: fleet.DeviceFleetName }));
          fleetDetail = {
            roleArn: desc.RoleArn || "",
            outputS3Uri: desc.OutputConfig?.S3OutputLocation || "",
            kmsKeyId: desc.OutputConfig?.KmsKeyId || "",
            iotRoleAlias: desc.IotRoleAlias || "",
            description: desc.Description || "",
          };
        } catch {}
      }
      const hasAuth = !!(fleetDetail.iotRoleAlias || fleetDetail.roleArn);
      assets.push({
        name: fleet.DeviceFleetName || "Unknown",
        type: "SageMaker Device Fleet",
        category: "Edge AI",
        source: "AWS SageMaker",
        externalId: fleet.DeviceFleetArn || "",
        serviceType: "SageMaker",
        risk: hasAuth ? "Medium" : "High",
        exposure: "Private",
        tags: ["sagemaker", "device-fleet", "edge-ai", region, hasAuth ? "authenticated" : "no-auth"],
        metadata: {
          deviceFleetArn: fleet.DeviceFleetArn || "",
          deviceFleetName: fleet.DeviceFleetName || "",
          ...fleetDetail,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`SageMaker Device Fleets (${region}): ${err.message}`);
  }

  try {
    const jobs = await client.send(new ListEdgePackagingJobsCommand({ MaxResults: 50 }));
    for (const job of jobs.EdgePackagingJobSummaries || []) {
      let jobDetail: Record<string, any> = {};
      if (job.EdgePackagingJobName) {
        try {
          const desc = await client.send(new DescribeEdgePackagingJobCommand({ EdgePackagingJobName: job.EdgePackagingJobName }));
          jobDetail = {
            outputS3Uri: desc.OutputConfig?.S3OutputLocation || "",
            kmsKeyId: desc.OutputConfig?.KmsKeyId || "",
            roleArn: desc.RoleArn || "",
            resourceKey: desc.ResourceKey || "",
          };
        } catch {}
      }
      assets.push({
        name: job.EdgePackagingJobName || "Unknown",
        type: "SageMaker Edge Packaging Job",
        category: "Edge AI",
        source: "AWS SageMaker",
        externalId: job.EdgePackagingJobArn || "",
        serviceType: "SageMaker",
        risk: jobDetail.kmsKeyId ? "Low" : "Medium",
        exposure: "Private",
        tags: ["sagemaker", "edge-packaging", "edge-ai", job.EdgePackagingJobStatus || "unknown", region, jobDetail.kmsKeyId ? "encrypted" : "unencrypted"],
        metadata: {
          edgePackagingJobArn: job.EdgePackagingJobArn || "",
          edgePackagingJobName: job.EdgePackagingJobName || "",
          status: job.EdgePackagingJobStatus || "",
          modelName: job.ModelName || "",
          modelVersion: job.ModelVersion || "",
          ...jobDetail,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`SageMaker Edge Packaging Jobs (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Bedrock Flows & Prompts ───
export async function scanBedrockFlowsPrompts(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new BedrockAgentClient(getClientConfig(creds, region));

  try {
    const flows = await client.send(new BedrockListFlowsCommand({ maxResults: 50 }));
    for (const flow of flows.flowSummaries || []) {
      let flowDetail: Record<string, any> = {};
      if (flow.id) {
        try {
          const desc = await client.send(new GetFlowCommand({ flowIdentifier: flow.id }));
          flowDetail = {
            executionRoleArn: desc.executionRoleArn || "",
            customerEncryptionKeyArn: desc.customerEncryptionKeyArn || "",
            definition: desc.definition ? JSON.stringify(desc.definition) : "",
            validations: desc.validations || [],
          };
        } catch {}
      }
      assets.push({
        name: flow.name || "Unknown",
        type: "Bedrock Flow",
        category: "AI Orchestration",
        source: "AWS Bedrock",
        externalId: flow.arn || flow.id || "",
        serviceType: "Bedrock",
        risk: "Medium",
        exposure: "Private",
        tags: ["bedrock", "flow", "orchestration", flow.status || "unknown", region],
        metadata: {
          flowId: flow.id || "",
          flowArn: flow.arn || "",
          status: flow.status || "",
          ...flowDetail,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Flows (${region}): ${err.message}`);
  }

  try {
    const prompts = await client.send(new ListPromptsCommand({ maxResults: 50 }));
    for (const prompt of prompts.promptSummaries || []) {
      let promptDetail: Record<string, any> = {};
      if (prompt.id) {
        try {
          const desc = await client.send(new GetPromptCommand({ promptIdentifier: prompt.id }));
          const variants = desc.variants || [];
          promptDetail = {
            variants: variants.map((v: any) => v.name || "default"),
            variantCount: variants.length,
            customerEncryptionKeyArn: desc.customerEncryptionKeyArn || "",
            defaultVariant: desc.defaultVariant || "",
          };
        } catch {}
      }
      assets.push({
        name: prompt.name || "Unknown",
        type: "Bedrock Prompt",
        category: "AI Orchestration",
        source: "AWS Bedrock",
        externalId: prompt.arn || prompt.id || "",
        serviceType: "Bedrock",
        risk: "Low",
        exposure: "Private",
        tags: ["bedrock", "prompt", "orchestration", region],
        metadata: {
          promptId: prompt.id || "",
          promptArn: prompt.arn || "",
          version: prompt.version || "",
          ...promptDetail,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Bedrock Prompts (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── CodeGuru Reviewer & DevOps Guru ───
export async function scanCodeGuruDevOpsGuru(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];

  const codeGuruClient = new CodeGuruReviewerClient(getClientConfig(creds, region));
  try {
    const repos = await codeGuruClient.send(new ListRepositoryAssociationsCommand({ MaxResults: 50 }));
    for (const repo of repos.RepositoryAssociationSummaries || []) {
      assets.push({
        name: repo.Name || "Unknown",
        type: "CodeGuru Repository",
        category: "Code Analysis",
        source: "AWS CodeGuru",
        externalId: repo.AssociationArn || "",
        serviceType: "CodeGuru",
        risk: "Medium",
        exposure: "Private",
        tags: ["codeguru", "code-review", "code-analysis", repo.State || "unknown", region],
        metadata: {
          associationArn: repo.AssociationArn || "",
          associationId: repo.AssociationId || "",
          state: repo.State || "",
          providerType: repo.ProviderType || "",
          owner: repo.Owner || "",
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`CodeGuru Repositories (${region}): ${err.message}`);
  }

  const devOpsGuruClient = new DevOpsGuruClient(getClientConfig(creds, region));
  try {
    const health = await devOpsGuruClient.send(new DescribeAccountHealthCommand({}));
    assets.push({
      name: `DevOps Guru Health (${region})`,
      type: "DevOps Guru Health",
      category: "AI Operations",
      source: "AWS DevOps Guru",
      externalId: `devops-guru-health-${region}`,
      serviceType: "DevOpsGuru",
      risk: (health.OpenReactiveInsights || 0) > 0 ? "High" : "Low",
      exposure: "Private",
      tags: ["devops-guru", "ai-operations", "monitoring", region],
      metadata: {
        openReactiveInsights: String(health.OpenReactiveInsights || 0),
        openProactiveInsights: String(health.OpenProactiveInsights || 0),
        metricsAnalyzed: String(health.MetricsAnalyzed || 0),
        resourceHours: String(health.ResourceHours || 0),
        region,
      },
    });
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`DevOps Guru Health (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Amazon Kendra (Search & Analytics) ───
export async function scanKendra(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new KendraClient(getClientConfig(creds, region));

  try {
    const indices = await client.send(new KendraListIndicesCommand({ MaxResults: 50 }));
    for (const index of indices.IndexConfigurationSummaryItems || []) {
      let indexDetail: Record<string, any> = {};
      if (index.Id) {
        try {
          const desc = await client.send(new KendraDescribeIndexCommand({ Id: index.Id }));
          indexDetail = {
            serverSideEncryptionConfiguration: desc.ServerSideEncryptionConfiguration?.KmsKeyId || "",
            roleArn: desc.RoleArn || "",
            capacityUnits: desc.CapacityUnits ? JSON.stringify(desc.CapacityUnits) : "",
            userContextPolicy: desc.UserContextPolicy || "",
          };
        } catch {}
      }
      const hasEncryption = !!(indexDetail.serverSideEncryptionConfiguration);
      assets.push({
        name: index.Name || "Unknown",
        type: "Kendra Index",
        category: "Search & Analytics",
        source: "AWS Kendra",
        externalId: index.Id ? `arn:aws:kendra:${region}::index/${index.Id}` : "",
        serviceType: "Kendra",
        risk: hasEncryption ? "Medium" : "High",
        exposure: "Private",
        tags: ["kendra", "index", region, hasEncryption ? "encrypted" : "unencrypted"],
        metadata: {
          indexId: index.Id || "",
          status: index.Status || "",
          edition: index.Edition || "",
          ...indexDetail,
          region,
        },
      });

      if (index.Id) {
        try {
          const dataSources = await client.send(new ListDataSourcesCommand({ IndexId: index.Id, MaxResults: 50 }));
          for (const ds of dataSources.SummaryItems || []) {
            let dsDetail: Record<string, any> = {};
            if (ds.Id && index.Id) {
              try {
                const dsDesc = await client.send(new KendraDescribeDataSourceCommand({ Id: ds.Id, IndexId: index.Id }));
                dsDetail = {
                  vpcConfiguration: dsDesc.VpcConfiguration ? JSON.stringify(dsDesc.VpcConfiguration) : "",
                  roleArn: dsDesc.RoleArn || "",
                  schedule: dsDesc.Schedule || "",
                };
              } catch {}
            }
            assets.push({
              name: ds.Name || "Unknown",
              type: "Kendra Data Source",
              category: "Search & Analytics",
              source: "AWS Kendra",
              externalId: ds.Id ? `arn:aws:kendra:${region}::index/${index.Id}/data-source/${ds.Id}` : "",
              serviceType: "Kendra",
              risk: "Medium",
              exposure: "Private",
              tags: ["kendra", "data-source", region, dsDetail.vpcConfiguration ? "vpc-configured" : "no-vpc"],
              metadata: {
                dataSourceId: ds.Id || "",
                indexId: index.Id || "",
                type: ds.Type || "",
                status: ds.Status || "",
                ...dsDetail,
                region,
              },
            });
          }
        } catch (dsErr: any) {
          if (!isIgnorableError(dsErr.message || "")) errors.push(`Kendra Data Sources for index ${index.Id} (${region}): ${dsErr.message}`);
        }
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Kendra Indices (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Amazon Lex (Conversational AI) ───
export async function scanLex(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new LexModelsV2Client(getClientConfig(creds, region));

  try {
    const bots = await client.send(new LexListBotsCommand({ MaxResults: 50 }));
    for (const bot of bots.botSummaries || []) {
      let botDetail: Record<string, any> = {};
      if (bot.botId) {
        try {
          const desc = await client.send(new DescribeBotCommand({ botId: bot.botId }));
          botDetail = {
            roleArn: desc.roleArn || "",
            idleSessionTTLInSeconds: desc.idleSessionTTLInSeconds || 0,
            dataPrivacy: desc.dataPrivacy ? JSON.stringify(desc.dataPrivacy) : "",
            botType: desc.botType || "",
          };
        } catch {}
      }
      assets.push({
        name: bot.botName || "Unknown",
        type: "Lex Bot",
        category: "Conversational AI",
        source: "AWS Lex",
        externalId: bot.botId ? `arn:aws:lex:${region}::bot/${bot.botId}` : "",
        serviceType: "Lex",
        risk: "Medium",
        exposure: "Private",
        tags: ["lex", "bot", region, bot.botStatus || "unknown"],
        metadata: {
          botId: bot.botId || "",
          botStatus: bot.botStatus || "",
          ...botDetail,
          region,
        },
      });

      if (bot.botId) {
        try {
          const aliases = await client.send(new ListBotAliasesCommand({ botId: bot.botId, maxResults: 50 }));
          for (const alias of aliases.botAliasSummaries || []) {
            let aliasDetail: Record<string, any> = {};
            if (alias.botAliasId) {
              try {
                const aliasDesc = await client.send(new DescribeBotAliasCommand({ botId: bot.botId, botAliasId: alias.botAliasId }));
                aliasDetail = {
                  conversationLogSettings: aliasDesc.conversationLogSettings ? JSON.stringify(aliasDesc.conversationLogSettings) : "",
                  botAliasLocaleSettings: aliasDesc.botAliasLocaleSettings ? JSON.stringify(aliasDesc.botAliasLocaleSettings) : "",
                  sentimentAnalysisSettings: aliasDesc.sentimentAnalysisSettings ? JSON.stringify(aliasDesc.sentimentAnalysisSettings) : "",
                };
              } catch {}
            }
            assets.push({
              name: alias.botAliasName || "Unknown",
              type: "Lex Bot Alias",
              category: "Conversational AI",
              source: "AWS Lex",
              externalId: alias.botAliasId ? `arn:aws:lex:${region}::bot/${bot.botId}/alias/${alias.botAliasId}` : "",
              serviceType: "Lex",
              risk: "Low",
              exposure: "Private",
              tags: ["lex", "bot-alias", region, alias.botAliasStatus || "unknown"],
              metadata: {
                botAliasId: alias.botAliasId || "",
                botAliasName: alias.botAliasName || "",
                botAliasStatus: alias.botAliasStatus || "",
                botId: bot.botId || "",
                ...aliasDetail,
                region,
              },
            });
          }
        } catch (aliasErr: any) {
          if (!isIgnorableError(aliasErr.message || "")) errors.push(`Lex Bot Aliases for bot ${bot.botId} (${region}): ${aliasErr.message}`);
        }
      }
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Lex Bots (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}

// ─── Amazon Q Business (Enterprise AI) ───
export async function scanQBusiness(creds: AwsCredentials, region: string): Promise<{ assets: DiscoveredAsset[]; models: DiscoveredModel[]; errors: string[] }> {
  const assets: DiscoveredAsset[] = [];
  const errors: string[] = [];
  const client = new QBusinessClient(getClientConfig(creds, region));

  try {
    const apps = await client.send(new ListApplicationsCommand({ maxResults: 50 }));
    for (const app of apps.applications || []) {
      let appDetail: Record<string, any> = {};
      if (app.applicationId) {
        try {
          const desc = await client.send(new GetApplicationCommand({ applicationId: app.applicationId }));
          appDetail = {
            identityType: desc.identityType || "",
            identityCenterApplicationArn: desc.identityCenterApplicationArn || "",
            roleArn: desc.roleArn || "",
            encryptionConfiguration: desc.encryptionConfiguration ? JSON.stringify(desc.encryptionConfiguration) : "",
            description: desc.description || "",
            autoSubscriptionConfiguration: desc.autoSubscriptionConfiguration ? JSON.stringify(desc.autoSubscriptionConfiguration) : "",
            qAppsConfiguration: desc.qAppsConfiguration ? JSON.stringify(desc.qAppsConfiguration) : "",
          };
        } catch {}
      }
      const hasIdentityCenter = !!(appDetail.identityCenterApplicationArn || appDetail.identityType === "AWS_IAM_IDP_OIDC" || appDetail.identityType === "AWS_IAM_IDC");
      assets.push({
        name: app.displayName || "Unknown",
        type: "Q Business Application",
        category: "Enterprise AI",
        source: "AWS Q Business",
        externalId: app.applicationId ? `arn:aws:qbusiness:${region}::application/${app.applicationId}` : "",
        serviceType: "QBusiness",
        risk: hasIdentityCenter ? "Medium" : "High",
        exposure: "Private",
        tags: ["qbusiness", "enterprise-ai", region, app.status || "unknown", hasIdentityCenter ? "identity-center" : "no-identity-center"],
        metadata: {
          applicationId: app.applicationId || "",
          status: app.status || "",
          ...appDetail,
          region,
        },
      });
    }
  } catch (err: any) {
    if (!isIgnorableError(err.message || "")) errors.push(`Q Business Applications (${region}): ${err.message}`);
  }

  return { assets, models: [], errors };
}