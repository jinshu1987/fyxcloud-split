import type { IStorage } from "./storage";
import type { Resource, AiModel, Policy, InsertPolicyFinding } from "@shared/schema";

interface AssetPool {
  resources: Resource[];
  models: AiModel[];
}

type CheckFn = (policy: Policy, pool: AssetPool, orgId: string) => InsertPolicyFinding[];

const UNSANCTIONED_PROVIDERS = ["perplexity", "claude.ai", "openai.com", "huggingface.co", "replicate.com", "together.ai"];

function meta(item: Resource | AiModel, key: string): string {
  const m = (item.metadata as Record<string, string>) || {};
  return m[key] || "";
}

function hasTags(item: Resource | AiModel, ...checks: string[]): boolean {
  const tags = (item.tags || []).map(t => t.toLowerCase());
  return checks.some(c => tags.some(t => t.includes(c.toLowerCase())));
}

function finding(
  policy: Policy, assetId: string, assetName: string, assetType: string,
  findingText: string, orgId: string,
  extra: { impact: string; remediation: string; evidence: string }
): InsertPolicyFinding {
  return {
    policyId: policy.id,
    ruleId: policy.ruleId,
    assetId,
    assetName,
    assetType,
    finding: findingText,
    severity: policy.severity,
    status: "open",
    impact: extra.impact,
    remediation: extra.remediation,
    evidence: extra.evidence,
    detectedAt: new Date().toISOString(),
    orgId,
  };
}

const checkDIS001: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    const tags = (r.tags || []).map(t => t.toLowerCase());
    const name = r.name.toLowerCase();
    for (const provider of UNSANCTIONED_PROVIDERS) {
      if (tags.some(t => t.includes(provider)) || name.includes(provider)) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Unsanctioned AI provider traffic detected: ${provider}`, orgId, {
            impact: "Unauthorized AI service usage bypasses corporate security controls, data loss prevention (DLP) policies, and compliance requirements. Sensitive corporate data may be sent to third-party AI providers without proper data processing agreements, violating GDPR, HIPAA, or SOC 2 controls.",
            remediation: "1. Block outbound traffic to unsanctioned AI provider domains at the VPC/firewall level.\n2. Implement DNS-based filtering to detect and prevent access to unauthorized AI services.\n3. Deploy a corporate AI gateway that routes all AI API calls through an approved proxy.\n4. Establish an AI acceptable use policy and communicate it to all teams.\n5. Set up network flow log monitoring for new AI provider endpoints.",
            evidence: `Asset "${r.name}" (${r.type}) has tags or name matching unsanctioned provider "${provider}". Tags: [${(r.tags || []).join(", ")}]. Source: ${r.source}.`
          }));
        break;
      }
    }
  }
  return findings;
};

const checkDIS002: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type.toLowerCase().includes("notebook") && r.category === "Development") {
      if (r.exposure === "Public" || !meta(r, "vpcId")) {
        const reason = r.exposure === "Public" ? "has a public IP address" : "has no VPC connectivity";
        findings.push(finding(policy, r.id, r.name, r.type,
          `SageMaker notebook ${reason}`, orgId, {
            impact: "A publicly accessible SageMaker notebook is a critical attack vector. Adversaries can exploit it to steal model weights, training data, and AWS credentials attached to the notebook's execution role. Without VPC isolation, the notebook can access any internet-facing service, enabling data exfiltration and lateral movement within the AWS account.",
            remediation: "1. Disable direct internet access on the notebook instance.\n2. Place the notebook inside a private VPC subnet with no public IP.\n3. Use VPC endpoints for S3 and SageMaker API access.\n4. Enable SageMaker notebook lifecycle configuration to enforce security policies.\n5. Restrict the IAM execution role to least-privilege permissions.\n6. Enable CloudTrail logging for all SageMaker API calls.",
            evidence: `Notebook "${r.name}" has exposure="${r.exposure}", VPC ID="${meta(r, "vpcId") || "none"}". Region: ${meta(r, "region") || "unknown"}. ARN: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkDIS003: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.source.toLowerCase().includes("azure") && r.category === "Development") {
      if (!hasTags(r, "approved", "managed", "compliant")) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Azure AI Foundry project not in approved subscription/management group`, orgId, {
            impact: "Unmanaged Azure AI Foundry projects operate outside organizational governance, bypassing cost controls, security baselines, and compliance monitoring. These shadow AI projects may use unapproved model versions, lack proper data classification, and miss security patching cycles.",
            remediation: "1. Move the AI Foundry project to an approved Azure management group.\n2. Apply Azure Policy assignments to enforce tagging and resource restrictions.\n3. Enable Microsoft Defender for Cloud on the subscription.\n4. Tag the resource with 'approved', 'managed', or 'compliant' after verification.\n5. Set up Azure Cost Management alerts for the subscription.",
            evidence: `Resource "${r.name}" (${r.type}) is sourced from Azure but lacks approved/managed/compliant tags. Current tags: [${(r.tags || []).join(", ")}].`
          }));
      }
    }
  }
  return findings;
};

const checkDIS004: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if ((a.source || "").toLowerCase().includes("gcp") || (a as any).serviceType === "VertexAI") {
      if (a.category === "Inference Endpoints" || (a as any).type?.includes("Endpoint")) {
        const tags = (a.tags || []).map(t => t.toLowerCase());
        const hasOwner = tags.some(t => t.includes("owner"));
        const hasProjectId = tags.some(t => t.includes("project"));
        if (!hasOwner || !hasProjectId) {
          const missing = [!hasOwner ? "Owner" : "", !hasProjectId ? "Project ID" : ""].filter(Boolean).join(" and ");
          findings.push(finding(policy, a.id, a.name, (a as any).type || "Endpoint",
            `Vertex AI endpoint missing ${missing} tag`, orgId, {
              impact: "Uninventoried AI endpoints cannot be attributed to a responsible team or project, making incident response, cost allocation, and access reviews impossible. Orphaned endpoints may continue serving predictions with stale models or compromised weights without anyone monitoring them.",
              remediation: `1. Add "Owner" and "Project ID" labels to the Vertex AI endpoint.\n2. Implement a GCP Organization Policy requiring these labels on all AI resources.\n3. Set up a Cloud Asset Inventory feed to detect untagged resources.\n4. Create an automated remediation Cloud Function that quarantines untagged endpoints.`,
              evidence: `Endpoint "${a.name}" is missing ${missing} tag(s). Current tags: [${(a.tags || []).join(", ")}].`
            }));
        }
      }
    }
  }
  return findings;
};

const checkDIS005: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Custom Models" && r.category !== "Training Data") continue;
    const modelFileCount = parseInt(meta(r, "modelFileCount") || "0", 10);
    const linkedToModel = meta(r, "linkedToDeployedModel");
    const bucketName = meta(r, "bucketName") || r.name;
    const modelExtensions = meta(r, "modelExtensions") || "";
    const modelSizeMB = meta(r, "modelFileSizeMB") || "0";
    const largestFiles = meta(r, "largestModelFiles") || "[]";

    if (modelFileCount > 0 && linkedToModel === "false") {
      const linkedModel = pool.models.some(m => {
        const mMeta = (m.metadata as Record<string, string>) || {};
        return mMeta.s3Bucket === bucketName || (m.tags || []).some(t => t === bucketName);
      });
      if (!linkedModel) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `S3 bucket contains ${modelFileCount} orphaned model artifact files (${modelSizeMB} MB) not linked to any deployed model`, orgId, {
            impact: "Orphaned model artifacts (.bin, .safetensors, .onnx, .pkl files) in cloud storage represent unmanaged intellectual property. They may contain proprietary model weights that could be stolen, or outdated models with known vulnerabilities that could be accidentally deployed. Storage costs continue to accrue without providing value.",
            remediation: "1. Review the model artifact files in this bucket and link them to model registry entries.\n2. If orphaned, either register them in the model catalog or archive/delete them.\n3. Implement S3 lifecycle policies to auto-archive unused artifacts after 90 days.\n4. Enable S3 Inventory to track all objects across AI storage buckets.\n5. Tag model artifacts with their corresponding model ID and version.",
            evidence: `Bucket "${bucketName}" contains ${modelFileCount} model files (${modelSizeMB} MB total). Extensions: ${modelExtensions}. Largest files: ${largestFiles.substring(0, 300)}. No deployed model references this bucket.`
          }));
      }
    }

    if (r.category === "Training Data") {
      const nameL = r.name.toLowerCase();
      if (nameL.includes("model") || nameL.includes("artifact") || nameL.includes("checkpoint") || nameL.includes("weights")) {
        if (modelFileCount === 0) {
          const linkedModel = pool.models.some(m => {
            const mMeta = (m.metadata as Record<string, string>) || {};
            return mMeta.s3Bucket === r.name || (m.tags || []).some(t => t === r.name);
          });
          if (!linkedModel) {
            findings.push(finding(policy, r.id, r.name, r.type,
              `S3 bucket named for model artifacts but contains no recognized model files — possible ghost artifacts`, orgId, {
                impact: "A bucket named to suggest model storage that contains no standard model files may indicate deleted or moved artifacts, or files stored in non-standard formats that evade inventory controls.",
                remediation: "1. Audit the bucket contents for model files in non-standard formats.\n2. Check if model artifacts were moved to another location.\n3. If the bucket is no longer needed, decommission it to reduce attack surface.\n4. Update naming conventions to avoid confusion.",
                evidence: `Bucket "${r.name}" has a name suggesting model artifacts but no standard model files (.pkl, .safetensors, .pth, .onnx, .bin, .h5, etc.) were found. Encryption: ${meta(r, "encryption") || "unknown"}.`
              }));
          }
        }
      }
    }
  }
  return findings;
};

const checkINF006: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Inference Endpoints" && r.exposure === "Public") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Inference endpoint has public access policy (Allow *)`, orgId, {
          impact: "A publicly accessible inference endpoint allows any unauthenticated user on the internet to invoke your AI model. This enables prompt injection attacks, model extraction through repeated queries, resource abuse leading to massive cloud costs, and potential exposure of training data through model inversion attacks.",
          remediation: "1. Restrict the resource policy to specific AWS accounts or VPC endpoints only.\n2. Implement IAM-based authentication for all inference requests.\n3. Add API Gateway with usage plans and API keys in front of the endpoint.\n4. Enable request throttling and rate limiting.\n5. Deploy AWS WAF rules to filter malicious requests.\n6. Enable CloudWatch alarms for unusual invocation patterns.",
          evidence: `Resource "${r.name}" (${r.type}) has exposure set to "Public". Category: ${r.category}. Source: ${r.source}. ARN: ${r.externalId || "N/A"}.`
        }));
    }
  }
  for (const m of pool.models) {
    if (m.category === "Inference Endpoints" && meta(m, "accessPolicy") === "public") {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Model inference endpoint has public access policy`, orgId, {
          impact: "Public model endpoints expose your AI models to unauthorized access, enabling model stealing, adversarial attacks, and uncontrolled compute costs.",
          remediation: "1. Change the access policy from public to private/VPC-only.\n2. Implement authentication and authorization checks.\n3. Add rate limiting and monitoring.",
          evidence: `Model "${m.name}" has accessPolicy="public" in metadata.`
        }));
    }
  }
  return findings;
};

const checkINF007: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    const svc = (r.source || "").toLowerCase();
    if (svc.includes("bedrock") || svc.includes("openai")) {
      if (r.category === "Inference Endpoints") {
        const pl = meta(r, "privateLink") || meta(r, "vpcEndpoint");
        if (!pl || pl === "false" || pl === "none") {
          findings.push(finding(policy, r.id, r.name, r.type,
            `${svc} service accessed via public internet without PrivateLink`, orgId, {
              impact: "Without PrivateLink, all API calls to Bedrock/OpenAI traverse the public internet, exposing prompts, responses, and API keys to potential man-in-the-middle attacks. Network-level DLP controls cannot inspect traffic leaving through public internet paths, and requests are visible in VPC flow logs as external traffic.",
              remediation: "1. Create a VPC Endpoint for Bedrock (com.amazonaws.region.bedrock-runtime).\n2. Configure the endpoint policy to restrict access to specific models.\n3. Update security groups to allow traffic only from approved subnets.\n4. Modify the Bedrock client SDK configuration to use the VPC endpoint.\n5. Verify DNS resolution routes to the private endpoint.",
              evidence: `Resource "${r.name}" (${r.type}) uses ${svc} service without PrivateLink/VPC endpoint configured. PrivateLink status: "${pl || "not configured"}".`
            }));
        }
      }
    }
  }
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    const svc = (m.type || "").toLowerCase();
    if (svc.includes("bedrock") || svc.includes("openai") || meta(m, "provider").toLowerCase().includes("bedrock") || meta(m, "provider").toLowerCase().includes("openai")) {
      if (m.category === "Inference Endpoints" || m.category === "Custom Models") {
        const pl = meta(m, "privateLink") || meta(m, "vpcEndpoint");
        if (!pl || pl === "false" || pl === "none") {
          findings.push(finding(policy, m.id, m.name, m.type,
            `Active model accessed via public internet without PrivateLink`, orgId, {
              impact: "Without PrivateLink, all API calls traverse the public internet, exposing prompts, responses, and API keys to potential man-in-the-middle attacks.",
              remediation: "1. Create a VPC Endpoint for the AI service.\n2. Configure the endpoint policy to restrict access to specific models.\n3. Update security groups to allow traffic only from approved subnets.\n4. Modify SDK configuration to use the VPC endpoint.",
              evidence: `Model "${m.name}" (${m.type}, category: ${m.category}) has no PrivateLink configured. PrivateLink status: "${pl || "not configured"}".`
            }));
        }
      }
    }
  }
  return findings;
};

const checkINF008: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Training Data" || r.category === "Custom Models" || r.category === "Feature Store") {
      const enc = meta(r, "encryption") || meta(r, "kmsKeyId") || meta(r, "encryptionType");
      if (!enc || enc.toLowerCase() === "none" || enc.toLowerCase() === "sse-s3") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Asset lacks Customer-Managed Encryption Keys (CMEK) - using ${enc || "no encryption"}`, orgId, {
            impact: "Without CMEK, model weights and training data are encrypted with AWS-managed keys that you cannot audit, rotate, or revoke. In a security incident, you cannot disable access to the encrypted data by revoking the key. This also fails compliance requirements for NIST 800-171, PCI-DSS, and SOC 2 Type II controls requiring customer-controlled encryption.",
            remediation: "1. Create a KMS Customer Managed Key (CMK) with appropriate key policy.\n2. Enable automatic key rotation on the CMK.\n3. Re-encrypt existing model artifacts with the CMK.\n4. Update S3 bucket policies to enforce SSE-KMS encryption on all uploads.\n5. Add a bucket policy condition requiring the specific CMK ARN.\n6. Monitor key usage via CloudTrail KMS events.",
            evidence: `Resource "${r.name}" (${r.type}, category: ${r.category}) has encryption="${enc || "none"}". Expected: Customer-Managed KMS Key. ARN: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  for (const m of pool.models) {
    if (m.category === "Custom Models") {
      const enc = meta(m, "encryption") || meta(m, "kmsKeyId");
      if (!enc || enc.toLowerCase() === "none") {
        findings.push(finding(policy, m.id, m.name, m.type,
          `Model weights stored without Customer-Managed Encryption Keys (CMEK)`, orgId, {
            impact: "Unencrypted or default-encrypted model weights are vulnerable to unauthorized access if the storage layer is compromised.",
            remediation: "1. Enable KMS CMK encryption for model storage.\n2. Rotate encryption keys regularly.\n3. Audit key access policies.",
            evidence: `Model "${m.name}" has encryption="${enc || "none"}" in metadata.`
          }));
      }
    }
  }
  return findings;
};

const checkINF009: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Vector Storage") {
      if (r.exposure === "Public") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Vector database has "Open to World" firewall rules`, orgId, {
            impact: "A publicly accessible vector database exposes all stored embeddings to unauthorized queries. Attackers can extract sensitive information encoded in embeddings through nearest-neighbor attacks, reconstruct original data from embedding vectors, and poison the vector store to manipulate RAG pipeline outputs.",
            remediation: "1. Restrict firewall rules to allow only specific IP ranges or VPC CIDRs.\n2. Enable authentication and API key requirements for all queries.\n3. Deploy the vector database in a private subnet without public access.\n4. Implement network access control lists (ACLs) to whitelist approved clients.\n5. Enable audit logging for all vector database operations.",
            evidence: `Vector storage "${r.name}" (${r.type}) has exposure="Public". Source: ${r.source}. This means the firewall rules allow access from any IP address.`
          }));
      }
    }
  }
  return findings;
};

const checkINF010: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const deprecatedModels = ["gpt-3.5-turbo-0301", "gpt-3.5-turbo-0613", "gpt-4-0314", "text-davinci-003",
    "code-davinci-002", "claude-v1", "claude-instant-v1", "titan-text-lite-v1"];
  for (const m of pool.models) {
    const modelId = meta(m, "modelId") || m.name.toLowerCase();
    const matched = deprecatedModels.find(dep => modelId.toLowerCase().includes(dep));
    if (matched) {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Using deprecated/EOL model version with known security flaws`, orgId, {
          impact: "Deprecated model versions no longer receive security patches, bug fixes, or safety alignment updates. Known prompt injection vulnerabilities, jailbreak techniques, and output manipulation methods remain unpatched. The model provider may discontinue service at any time, causing production outages.",
          remediation: `1. Identify all applications and pipelines using the deprecated model "${matched}".\n2. Test the latest model version as a drop-in replacement in a staging environment.\n3. Update API calls to reference the current model version.\n4. Implement model version pinning with automatic deprecation alerts.\n5. Set up a model lifecycle management process with quarterly version reviews.`,
          evidence: `Model "${m.name}" references deprecated model version "${matched}". Model ID: ${meta(m, "modelId") || "N/A"}. Provider: ${meta(m, "provider") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkDAT011: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Training Data") {
      const name = r.name.toLowerCase();
      const tags = (r.tags || []).map(t => t.toLowerCase());
      if (name.includes("pii") || name.includes("personal") || name.includes("customer") ||
          tags.some(t => t.includes("pii") || t.includes("sensitive") || t.includes("personal"))) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Training data source may contain PII (SSNs, emails, credit card info)`, orgId, {
            impact: "PII in training data can be memorized by the model and leaked through inference outputs. This creates GDPR Article 17 (right to erasure) compliance violations, as removing specific data points from a trained model requires full retraining. Financial penalties for PII exposure can reach 4% of annual global revenue under GDPR.",
            remediation: "1. Run a DSPM (Data Security Posture Management) scan on the training data bucket.\n2. Implement automated PII detection using Amazon Macie or equivalent.\n3. Apply data masking/tokenization to PII fields before model training.\n4. Maintain a data processing record per GDPR Article 30.\n5. Implement differential privacy techniques during model training.\n6. Create a data retention policy for training datasets.",
            evidence: `Training data "${r.name}" has indicators of PII content. Name/tags contain sensitive keywords. Tags: [${(r.tags || []).join(", ")}]. Encryption: ${meta(r, "encryption") || "unknown"}.`
          }));
      }
      const enc = meta(r, "encryption") || "";
      if (!enc || enc.toLowerCase() === "none") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Training data bucket lacks encryption - clear-text PII exposure risk`, orgId, {
            impact: "Unencrypted training data stored in cloud storage can be accessed by anyone with bucket-level read permissions, exposing potentially sensitive information used for model fine-tuning.",
            remediation: "1. Enable server-side encryption with KMS CMK.\n2. Apply bucket policies requiring encryption for all uploads.\n3. Audit existing unencrypted objects and re-encrypt them.",
            evidence: `Bucket "${r.name}" has encryption="${enc || "none"}".`
          }));
      }
    }
  }
  return findings;
};

const checkDAT012: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Monitoring/Logs") {
      const enc = meta(r, "encryption") || meta(r, "kmsKeyId");
      if (!enc || enc.toLowerCase() === "none") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `AI prompt/response logs stored without encryption`, orgId, {
            impact: "Unencrypted prompt logs may contain sensitive user queries, proprietary business logic embedded in system prompts, API keys passed in conversations, and PII shared by end users. These logs are often targeted in breach scenarios as they provide a concentrated dataset of sensitive interactions.",
            remediation: "1. Enable KMS encryption on the CloudWatch log group.\n2. Implement log data masking for sensitive fields (PII, API keys).\n3. Set log retention policies to minimize exposure window.\n4. Restrict log access with IAM policies to authorized personnel only.\n5. Enable CloudTrail monitoring on log group access.",
            evidence: `Log resource "${r.name}" (${r.type}) has encryption="${enc || "none"}". Category: Monitoring/Logs. ARN: ${r.externalId || "N/A"}.`
          }));
      }
      if (r.exposure === "Public") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `AI log storage is publicly accessible`, orgId, {
            impact: "Publicly accessible log storage exposes all AI interaction data including prompts, completions, and metadata to the internet.",
            remediation: "1. Remove public access permissions immediately.\n2. Enable S3 Block Public Access or equivalent.\n3. Audit access logs for unauthorized access.",
            evidence: `Log resource "${r.name}" has exposure="Public".`
          }));
      }
    }
  }
  return findings;
};

const checkDAT013: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const gdprRegions = ["eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-north-1", "eu-south-1"];
  const nonGdprRegions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "ap-southeast-1", "ap-northeast-1"];

  for (const r of pool.resources) {
    if (r.category === "Training Data") {
      const region = meta(r, "region");
      if (region) {
        const fromGdpr = gdprRegions.includes(region);
        const relatedAssets = pool.models.filter(m => m.connectorId === r.connectorId);
        for (const m of relatedAssets) {
          const mRegion = meta(m, "region");
          if (mRegion && fromGdpr && nonGdprRegions.includes(mRegion)) {
            findings.push(finding(policy, r.id, r.name, r.type,
              `Training data in ${region} (GDPR) used by model in ${mRegion} - cross-region data residency violation`, orgId, {
                impact: "Transferring training data from EU GDPR-regulated regions to non-EU regions without adequate safeguards violates GDPR Chapter V (Transfer of personal data to third countries). Fines up to €20 million or 4% of global annual turnover apply. Standard Contractual Clauses (SCCs) or Binding Corporate Rules (BCRs) are required for lawful transfers.",
                remediation: "1. Verify if a valid GDPR data transfer mechanism exists (SCCs, BCRs, adequacy decision).\n2. Conduct a Transfer Impact Assessment (TIA) for the data flow.\n3. Consider training the model in the same EU region as the data.\n4. Implement data residency controls at the organization level.\n5. Use AWS Service Control Policies to prevent cross-region data transfers.",
                evidence: `Training data "${r.name}" is in GDPR region ${region}, but model "${m.name}" operates in non-GDPR region ${mRegion}. This represents a cross-border data transfer.`
              }));
          }
        }
      }
    }
  }
  return findings;
};

const checkDAT014: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Vector Storage") {
      const hashing = meta(r, "hashingSalt") || meta(r, "embeddingProtection");
      if (!hashing || hashing === "none") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Vector embeddings generated from sensitive data without proper salt/hashing protection`, orgId, {
            impact: "Vector embeddings preserve semantic relationships from source data. Without proper protection, embeddings can be reversed to reconstruct sensitive source text using embedding inversion attacks. Nearest-neighbor queries can leak private information about individuals in the training corpus.",
            remediation: "1. Apply differential privacy noise to embedding vectors before storage.\n2. Implement embedding dimension reduction to remove fine-grained information.\n3. Use salted hashing on sensitive fields before embedding generation.\n4. Deploy access controls to restrict embedding query capabilities.\n5. Monitor for bulk embedding extraction attempts.",
            evidence: `Vector storage "${r.name}" has no hashing/salt protection configured. hashingSalt="${hashing || "not set"}". Source: ${r.source}.`
          }));
      }
    }
  }
  return findings;
};

const checkDAT015: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Orchestration") {
      const name = r.name.toLowerCase();
      const type = r.type.toLowerCase();
      if (type.includes("glue") || type.includes("dataflow") || name.includes("etl") || name.includes("pipeline")) {
        if (name.includes("prod") || name.includes("production") || hasTags(r, "production", "prod-db")) {
          findings.push(finding(policy, r.id, r.name, r.type,
            `Shadow data pipeline detected moving data from production DB into AI-specific buckets`, orgId, {
              impact: "Unauthorized data pipelines from production databases create uncontrolled copies of sensitive data in AI-specific storage. These shadow pipelines bypass change management, data classification, and access control processes. Production data copied for AI training may contain live customer records, financial data, or PII without proper anonymization.",
              remediation: "1. Review the pipeline's source and destination configurations.\n2. Verify data classification of all data being moved.\n3. Implement data masking or anonymization in the pipeline.\n4. Register the pipeline in the organization's data catalog.\n5. Apply appropriate IAM policies and VPC restrictions.\n6. Set up monitoring for new pipeline creation events.",
              evidence: `Pipeline "${r.name}" (${r.type}) appears to be moving production data. Name/tags suggest production source. Tags: [${(r.tags || []).join(", ")}].`
            }));
        }
      }
    }
  }
  return findings;
};

const checkIAM016: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Identity/Roles") {
      const name = r.name.toLowerCase();
      const permissions = meta(r, "permissions") || meta(r, "policyNames") || "";
      const permLower = permissions.toLowerCase();
      if (name.includes("sagemaker") || hasTags(r, "sagemaker")) {
        if (permLower.includes("administratoraccess") || permLower.includes("s3:*") ||
            permLower.includes("*:*") || permLower.includes("admin")) {
          findings.push(finding(policy, r.id, r.name, r.type,
            `SageMaker execution role has overprivileged permissions: ${permissions.substring(0, 100)}`, orgId, {
              impact: "An overprivileged SageMaker execution role can be exploited through a compromised notebook or training job to access any S3 bucket (including those with production data, secrets, or backups), create new IAM users/roles, modify network configurations, and potentially compromise the entire AWS account. This is a privilege escalation vector.",
              remediation: "1. Replace AdministratorAccess with a custom policy scoped to specific S3 buckets and SageMaker resources.\n2. Remove s3:* and replace with specific bucket ARNs needed for training.\n3. Apply the principle of least privilege using IAM Access Analyzer recommendations.\n4. Add permission boundaries to prevent privilege escalation.\n5. Enable IAM Access Analyzer to continuously monitor for overprivileged roles.\n6. Use SageMaker Studio domain execution roles instead of notebook-level roles.",
              evidence: `Role "${r.name}" has permissions including: ${permissions.substring(0, 200)}. ARN: ${r.externalId || "N/A"}.`
            }));
        }
      }
    }
  }
  return findings;
};

const checkIAM017: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Secrets/Keys") {
      const rotation = meta(r, "rotationEnabled") || meta(r, "rotation");
      const lastRotated = meta(r, "lastRotatedDate") || meta(r, "lastRotation");
      if (rotation === "false" || rotation === "disabled" || !rotation) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `AI service key/secret has not been rotated (rotation disabled or no rotation policy)`, orgId, {
            impact: "Long-lived, unrotated API keys for AI services are high-value targets for credential theft. If compromised, attackers gain persistent access to AI models, training data, and inference endpoints. Without rotation, compromised credentials remain valid indefinitely, and there's no way to detect unauthorized key usage versus legitimate use.",
            remediation: "1. Enable automatic rotation on the secret in AWS Secrets Manager.\n2. Configure the rotation Lambda function for the specific AI service.\n3. Set the rotation interval to 30-90 days based on risk classification.\n4. Update all applications to retrieve credentials from Secrets Manager at runtime.\n5. Implement credential usage monitoring via CloudTrail.\n6. Set up alerts for key usage from unusual IP addresses or regions.",
            evidence: `Secret "${r.name}" has rotation="${rotation || "not configured"}". Last rotated: ${lastRotated || "never"}. ARN: ${r.externalId || "N/A"}.`
          }));
      } else if (lastRotated) {
        const daysSince = Math.floor((Date.now() - new Date(lastRotated).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 90) {
          findings.push(finding(policy, r.id, r.name, r.type,
            `AI service key last rotated ${daysSince} days ago (exceeds 90-day policy)`, orgId, {
              impact: "Keys older than 90 days exceed the recommended rotation period, increasing the window of opportunity for compromised credentials.",
              remediation: "1. Immediately rotate the key.\n2. Review access logs for the period since last rotation.\n3. Adjust the rotation schedule to meet the 90-day policy.",
              evidence: `Secret "${r.name}" was last rotated ${daysSince} days ago (${lastRotated}). Maximum allowed: 90 days.`
            }));
        }
      }
    }
  }
  return findings;
};

const checkIAM018: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Development" && r.type.toLowerCase().includes("training")) {
      const mfa = meta(r, "mfaRequired") || meta(r, "mfa");
      if (!mfa || mfa === "false") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Model evaluation/training job triggered without MFA-authenticated identity`, orgId, {
            impact: "Training and evaluation jobs consume significant compute resources and can access sensitive training data. Without MFA, a compromised password alone is sufficient to launch jobs, modify model parameters, or exfiltrate training data. This violates the defense-in-depth principle for high-privilege operations.",
            remediation: "1. Add an IAM policy condition requiring MFA for SageMaker:CreateTrainingJob and CreateProcessingJob actions.\n2. Implement SCP (Service Control Policy) at the organization level requiring MFA for all AI service mutations.\n3. Use AWS IAM Identity Center with MFA enforcement.\n4. Set up CloudTrail alerts for training jobs launched without MFA.",
            evidence: `Training resource "${r.name}" (${r.type}) has MFA requirement: "${mfa || "not configured"}".`
          }));
      }
    }
  }
  for (const m of pool.models) {
    if (m.type.toLowerCase().includes("evaluation") || m.type.toLowerCase().includes("training")) {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Model evaluation job lacks MFA enforcement on triggering identity`, orgId, {
          impact: "Evaluation jobs can reveal model capabilities and vulnerabilities. Without MFA enforcement, unauthorized users could run evaluations to probe model weaknesses.",
          remediation: "1. Enforce MFA for all model evaluation API calls.\n2. Implement session-based MFA validation before job submission.",
          evidence: `Model "${m.name}" (${m.type}) has no MFA enforcement configured for evaluation triggers.`
        }));
    }
  }
  return findings;
};

const checkIAM019: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Identity/Roles") {
      const permissions = (meta(r, "permissions") || meta(r, "policyNames") || "").toLowerCase();
      if (permissions.includes("invokemodel") || permissions.includes("bedrock") || permissions.includes("sagemaker")) {
        const lastUsed = meta(r, "lastUsed") || meta(r, "lastActivity");
        if (lastUsed) {
          const daysSince = Math.floor((Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 30) {
            findings.push(finding(policy, r.id, r.name, r.type,
              `User/role with InvokeModel permissions inactive for ${daysSince} days - possible entitlement drift`, orgId, {
                impact: "Stale AI service permissions for inactive users/roles create an expanding attack surface. Former team members or reassigned employees retain the ability to invoke AI models, access training data, and view inference results. This violates the principle of least privilege and SOC 2 CC6.1 (Logical Access) controls.",
                remediation: "1. Review the user/role's group memberships and verify they still require AI access.\n2. Remove InvokeModel and related permissions if the user has left the AI Research team.\n3. Implement automated access reviews using IAM Access Analyzer.\n4. Set up JIT (Just-In-Time) access for AI model invocation.\n5. Create an access certification process with quarterly reviews.",
                evidence: `Role "${r.name}" has AI permissions (${permissions.substring(0, 100)}) but last activity was ${daysSince} days ago (${lastUsed}).`
              }));
          }
        }
      }
    }
  }
  return findings;
};

const checkIAM020: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const sensitiveKeys = ["openai_api_key", "anthropic_api_key", "huggingface_token", "ai_api_key",
    "bedrock_key", "sagemaker_key", "cohere_api_key"];
  for (const r of pool.resources) {
    if (r.category === "Secrets/Keys" || r.category === "Orchestration") {
      const name = r.name.toLowerCase();
      const type = r.type.toLowerCase();
      if (type.includes("lambda") || type.includes("cloudshell") || r.category === "Secrets/Keys") {
        for (const key of sensitiveKeys) {
          if (name.includes(key) || hasTags(r, key)) {
            findings.push(finding(policy, r.id, r.name, r.type,
              `Hardcoded AI API token detected: ${key.toUpperCase()}`, orgId, {
                impact: "Hardcoded API keys in Lambda environment variables or CloudShell history are exposed to anyone with read access to the function configuration. These keys grant direct access to AI provider APIs, enabling unauthorized model usage, data exfiltration, and significant financial costs. Keys in environment variables are logged in CloudTrail and may appear in deployment pipelines.",
                remediation: "1. Remove the hardcoded key from environment variables immediately.\n2. Store the key in AWS Secrets Manager with automatic rotation.\n3. Update the Lambda function to retrieve the key from Secrets Manager at runtime.\n4. Rotate the compromised key at the AI provider.\n5. Implement AWS Config rules to detect environment variables containing key patterns.\n6. Add pre-commit hooks to prevent API keys from being committed to source control.",
                evidence: `Resource "${r.name}" (${r.type}) contains reference to sensitive AI API key pattern: "${key.toUpperCase()}".`
              }));
            break;
          }
        }
        const envVars = meta(r, "environmentVariables") || meta(r, "secretType") || "";
        for (const key of sensitiveKeys) {
          if (envVars.toLowerCase().includes(key)) {
            findings.push(finding(policy, r.id, r.name, r.type,
              `Environment variable contains hardcoded AI API key: ${key.toUpperCase()}`, orgId, {
                impact: "API keys in environment variables are visible to all users with Lambda:GetFunctionConfiguration permissions.",
                remediation: "1. Move the key to Secrets Manager.\n2. Update the Lambda to use the Secrets Manager SDK.\n3. Rotate the exposed key immediately.",
                evidence: `Environment variables of "${r.name}" contain pattern matching "${key.toUpperCase()}".`
              }));
            break;
          }
        }
      }
    }
  }
  return findings;
};

const checkGRD021: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Guardrails") {
      const filterLevel = meta(r, "contentFilterLevel") || meta(r, "filterStrength") || meta(r, "status") || "";
      if (filterLevel.toLowerCase() === "disabled" || filterLevel.toLowerCase() === "low" || filterLevel.toLowerCase() === "none") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Content safety filter set to "${filterLevel}" - should be Medium or higher`, orgId, {
            impact: "Disabled or low-strength content safety filters allow the model to generate harmful, toxic, or inappropriate content including hate speech, explicit material, and dangerous instructions. This exposes the organization to reputational damage, legal liability, and regulatory violations (EU AI Act, state consumer protection laws).",
            remediation: "1. Set content filter strength to at least 'Medium' for all categories (hate, sexual, violence, misconduct).\n2. Enable both input and output filtering.\n3. Configure custom deny topics for your industry-specific risks.\n4. Implement a content safety testing pipeline before production deployment.\n5. Set up monitoring and alerting for filter bypass attempts.",
            evidence: `Guardrail "${r.name}" has content filter level="${filterLevel}". ARN: ${r.externalId || "N/A"}. Expected: Medium or higher.`
          }));
      }
    }
  }
  return findings;
};

const checkGRD022: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    if (m.category === "Custom Models" || m.category === "Inference Endpoints") {
      const jailbreak = meta(m, "jailbreakDetection") || meta(m, "promptInjectionShield");
      if (!jailbreak || jailbreak === "false" || jailbreak === "disabled") {
        const guardrails = pool.resources.filter(r =>
          r.category === "Guardrails" && r.connectorId === m.connectorId
        );
        if (guardrails.length === 0) {
          findings.push(finding(policy, m.id, m.name, m.type,
            `Model deployment has no prompt injection/jailbreak detection layer`, orgId, {
              impact: "Without prompt injection detection, attackers can use jailbreak techniques to bypass system prompts, extract confidential instructions, manipulate model behavior, and access restricted functionality. Common attacks include DAN (Do Anything Now), payload splitting, and indirect prompt injection through user-supplied content.",
              remediation: "1. Deploy a Bedrock Guardrail with prompt attack filtering enabled.\n2. Implement an input validation layer that checks for known jailbreak patterns.\n3. Use a dedicated prompt injection detection model as a preprocessing step.\n4. Add output validation to detect when the model ignores its system prompt.\n5. Implement rate limiting per user to prevent brute-force jailbreak attempts.\n6. Set up monitoring for prompt injection patterns in input logs.",
              evidence: `Model "${m.name}" (${m.type}, category: ${m.category}) has no jailbreak detection. No associated guardrails found for connector ${m.connectorId || "N/A"}.`
            }));
        }
      }
    }
  }
  return findings;
};

const checkGRD023: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    if (m.category === "Inference Endpoints" || m.category === "Custom Models") {
      const maxTokens = meta(m, "maxTokens") || meta(m, "maxOutputTokens");
      if (maxTokens === "unlimited" || maxTokens === "-1" || maxTokens === "0" || parseInt(maxTokens) > 100000) {
        findings.push(finding(policy, m.id, m.name, m.type,
          `max_tokens set to ${maxTokens || "unlimited"} - risk of Model Denial of Service (DoS)`, orgId, {
            impact: "Unlimited or extremely high max_tokens settings allow single requests to consume excessive compute resources, leading to Model Denial of Service (MDoS). An attacker can craft requests that generate maximum-length outputs, exhausting GPU capacity, increasing latency for all users, and driving cloud costs to extreme levels.",
            remediation: "1. Set max_tokens to a reasonable limit based on your use case (typically 1000-4000).\n2. Implement request-level token budgets that cap total tokens (input + output).\n3. Add timeout limits for inference requests.\n4. Deploy auto-scaling with maximum instance limits.\n5. Set up billing alerts for unusual inference costs.",
            evidence: `Model "${m.name}" has max_tokens="${maxTokens || "unlimited"}". This exceeds the recommended maximum of 100,000 tokens per request.`
          }));
      }
    }
  }
  return findings;
};

const checkGRD024: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    const temp = meta(m, "temperature");
    if (temp) {
      const tempVal = parseFloat(temp);
      if (!isNaN(tempVal) && tempVal > 1.2) {
        findings.push(finding(policy, m.id, m.name, m.type,
          `Production model temperature set to ${temp} (>1.2) - increased hallucination/instability risk`, orgId, {
            impact: "High temperature values (>1.2) significantly increase the randomness and unpredictability of model outputs. In production, this leads to more frequent hallucinations, factually incorrect responses, inconsistent behavior between identical requests, and potential generation of harmful or nonsensical content that bypasses safety training.",
            remediation: "1. Reduce temperature to 0.7 or lower for production use cases requiring accuracy.\n2. Use temperature 0.0-0.3 for deterministic tasks (classification, extraction, structured output).\n3. Use temperature 0.5-0.8 for creative tasks with controlled variation.\n4. Never use temperature >1.0 in production without explicit approval and monitoring.\n5. Implement A/B testing to find the optimal temperature for your use case.",
            evidence: `Model "${m.name}" has temperature=${temp}. Threshold: 1.2. Provider: ${meta(m, "provider") || "unknown"}. Model ID: ${meta(m, "modelId") || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkGRD025: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Knowledge Bases") {
      const grounding = meta(r, "groundingCheck") || meta(r, "factualityCheck");
      if (!grounding || grounding === "false" || grounding === "disabled") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `RAG pipeline has no factuality/grounding check enabled`, orgId, {
            impact: "Without grounding checks, the RAG pipeline may generate responses that are not supported by the retrieved documents, leading to hallucinated answers presented as factual. In regulated industries (healthcare, finance, legal), this can result in incorrect advice, compliance violations, and liability. Users may trust AI-generated answers that have no basis in the knowledge base.",
            remediation: "1. Enable Bedrock Guardrails grounding check for the knowledge base.\n2. Implement citation verification that maps output claims to source documents.\n3. Add confidence scoring to RAG responses and flag low-confidence answers.\n4. Set up human-in-the-loop review for high-stakes queries.\n5. Deploy automated factuality testing against a golden dataset.\n6. Configure the knowledge base to return source attributions with every response.",
            evidence: `Knowledge base "${r.name}" has grounding check="${grounding || "not configured"}". ARN: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkSUP026: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const trustedRegistries = ["amazonaws.com", "azure.com", "google.com", "corp.internal"];
  for (const m of pool.models) {
    if (m.category === "Custom Models") {
      const source = meta(m, "sourceRegistry") || meta(m, "modelSource") || "";
      if (source && !trustedRegistries.some(reg => source.toLowerCase().includes(reg))) {
        findings.push(finding(policy, m.id, m.name, m.type,
          `Custom model imported from untrusted registry: ${source}`, orgId, {
            impact: "Models from untrusted registries may contain backdoors, trojaned weights, or adversarial modifications that activate on specific inputs. Supply chain attacks on ML models are difficult to detect because model weights are opaque binary files. A compromised model can exfiltrate data, produce manipulated outputs, or serve as a persistent backdoor in your infrastructure.",
            remediation: "1. Only import models from approved corporate registries or verified model hubs.\n2. Implement model signature verification using cryptographic signing.\n3. Run model security scanning (ModelScan, Fickling) on imported model files.\n4. Test imported models against adversarial inputs before production deployment.\n5. Maintain a model provenance record tracking the full lineage.\n6. Establish a model approval workflow requiring security review.",
            evidence: `Model "${m.name}" sourced from registry: "${source}". This is not in the approved registry list: [${trustedRegistries.join(", ")}].`
          }));
      }
      const name = m.name.toLowerCase();
      if (name.includes("huggingface") || name.includes("hf-") || hasTags(m, "huggingface", "hf")) {
        findings.push(finding(policy, m.id, m.name, m.type,
          `Custom model sourced from public HuggingFace repository`, orgId, {
            impact: "Public HuggingFace models have no guaranteed security review. Anyone can upload models that may contain malicious code in pickle files, backdoored weights, or unsafe deserialization payloads.",
            remediation: "1. Verify the model publisher's identity and reputation.\n2. Prefer models from the HuggingFace verified organization program.\n3. Scan the model files for malicious payloads before deployment.\n4. Test model behavior against a security benchmark.",
            evidence: `Model "${m.name}" has HuggingFace indicators in name/tags. Tags: [${(m.tags || []).join(", ")}].`
          }));
      }
    }
  }
  for (const r of pool.resources) {
    if (r.category !== "Custom Models") continue;
    const containsPickle = meta(r, "containsPickleFiles");
    const containsUnsafe = meta(r, "containsUnsafeFormats");
    const modelFileCount = parseInt(meta(r, "modelFileCount") || "0", 10);
    if (modelFileCount === 0) continue;
    if (containsPickle === "true") {
      const extensions = meta(r, "modelExtensions") || "";
      const largestFiles = meta(r, "largestModelFiles") || "[]";
      findings.push(finding(policy, r.id, r.name, r.type,
        `S3 model store contains .pkl (Pickle) files — arbitrary code execution risk`, orgId, {
          impact: "Python Pickle files can execute arbitrary code during deserialization. An attacker who replaces a .pkl model file can achieve remote code execution when the model is loaded. This is the most exploited attack vector in ML supply chain attacks. Pickle-based models should be converted to safer formats like SafeTensors or ONNX.",
          remediation: "1. Convert all .pkl model files to SafeTensors format (safe serialization).\n2. Run ModelScan or Fickling on all pickle files to detect malicious payloads.\n3. Implement a policy blocking new pickle file uploads.\n4. Enable S3 Object Lock to prevent unauthorized file replacement.\n5. Use cryptographic signatures to verify model file integrity before loading.",
          evidence: `Model store "${r.name}" contains pickle files. ${modelFileCount} model files found. Extensions: ${extensions}. Top files: ${largestFiles.substring(0, 300)}.`
        }));
    } else if (containsUnsafe === "true") {
      const extensions = meta(r, "modelExtensions") || "";
      findings.push(finding(policy, r.id, r.name, r.type,
        `S3 model store contains files in unsafe serialization formats (.pkl, .bin, .joblib)`, orgId, {
          impact: "Unsafe serialization formats (Pickle, Joblib, raw binary) can contain embedded executable code that runs during model loading. These formats should be replaced with safer alternatives like SafeTensors, ONNX, or TFLite that cannot execute arbitrary code.",
          remediation: "1. Audit all model files in unsafe formats and convert to SafeTensors or ONNX.\n2. Scan files with ModelScan before any model loading operations.\n3. Implement guardrails in the ML pipeline to reject unsafe formats.\n4. Establish a migration timeline to eliminate all unsafe format files.",
          evidence: `Model store "${r.name}" contains files in unsafe formats. Extensions found: ${extensions}.`
        }));
    }
  }
  return findings;
};

// --- SUP-027 to SUP-030: Supply Chain ---

const VULNERABLE_PACKAGES: Record<string, string> = {
  "transformers": "4.30.0",
  "langchain": "0.1.0",
  "torch": "2.0.0",
  "tensorflow": "2.12.0",
  "numpy": "1.24.0",
  "pillow": "9.5.0",
  "scikit-learn": "1.2.0",
  "flask": "2.3.0",
  "fastapi": "0.95.0",
  "gradio": "3.35.0",
  "huggingface-hub": "0.15.0",
  "tokenizers": "0.13.0",
  "safetensors": "0.3.0",
  "llama-index": "0.8.0",
};

const checkSUP027: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Development" && r.category !== "Orchestration") continue;
    const packages = meta(r, "packages") || meta(r, "dependencies") || meta(r, "pipPackages") || "";
    if (!packages) continue;
    const pkgLower = packages.toLowerCase();
    for (const [pkg, minVersion] of Object.entries(VULNERABLE_PACKAGES)) {
      const regex = new RegExp(`${pkg}[=<>~!]*([0-9.]+)`, "i");
      const match = pkgLower.match(regex);
      if (match && match[1]) {
        const installedParts = match[1].split(".").map(Number);
        const minParts = minVersion.split(".").map(Number);
        let isOld = false;
        for (let i = 0; i < Math.max(installedParts.length, minParts.length); i++) {
          const a = installedParts[i] || 0;
          const b = minParts[i] || 0;
          if (a < b) { isOld = true; break; }
          if (a > b) break;
        }
        if (isOld) {
          findings.push(finding(policy, r.id, r.name, r.type,
            `Vulnerable AI package detected: ${pkg}==${match[1]} (minimum safe: ${minVersion})`, orgId, {
              impact: `Outdated ${pkg} version ${match[1]} contains known security vulnerabilities including remote code execution, deserialization attacks, and dependency confusion risks. Attackers can exploit these to gain code execution within AI workloads, steal model weights, or pivot to other cloud resources.`,
              remediation: `1. Upgrade ${pkg} to version ${minVersion} or later.\n2. Run \`pip audit\` or \`safety check\` to identify all vulnerable packages.\n3. Implement automated dependency scanning in CI/CD pipelines.\n4. Use a private PyPI mirror with pre-approved package versions.\n5. Pin package versions and review updates before deploying.`,
              evidence: `Resource "${r.name}" (${r.type}) has ${pkg}==${match[1]} installed. Minimum safe version: ${minVersion}. Packages metadata: "${packages.substring(0, 200)}".`
            }));
        }
      }
    }
  }
  return findings;
};

const checkSUP028: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    if (m.category !== "Custom Models") continue;
    const signature = meta(m, "signature") || meta(m, "hash") || meta(m, "sha256") || meta(m, "checksum") || meta(m, "signed");
    if (signature === "false" || signature === "none" || signature === "unsigned") {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Custom model binary loaded without valid digital signature or hash verification`, orgId, {
          impact: "Unsigned model weights cannot be verified for integrity or provenance. An attacker who compromises the model storage or supply chain can substitute malicious weights that produce manipulated outputs, contain backdoors activated by trigger inputs, or exfiltrate data through steganographic channels in model responses.",
          remediation: "1. Generate SHA-256 hashes for all model weight files at build time.\n2. Implement cosign or Notary-based signing for model artifacts.\n3. Verify signatures before loading models into inference containers.\n4. Store signatures in a tamper-proof metadata registry.\n5. Set up CI/CD gates that reject unsigned model deployments.",
          evidence: `Model "${m.name}" has signature/hash status: "${signature}". Expected: a valid SHA-256 hash or digital signature.`
        }));
    }
  }
  return findings;
};

const checkSUP029: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Development") continue;
    const code = meta(r, "codePatterns") || meta(r, "unsafeLoads") || meta(r, "pickleUsage") || "";
    if (!code) continue;
    const codeLower = code.toLowerCase();
    if (codeLower.includes("pickle.load") || codeLower.includes("torch.load") ||
        codeLower.includes("joblib.load") || codeLower.includes("cloudpickle")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Unsafe deserialization detected: pickle/torch.load on potentially untrusted model files`, orgId, {
          impact: "Python's pickle module executes arbitrary code during deserialization. An attacker can craft a malicious .pkl or .pt file that, when loaded via pickle.load() or torch.load(), executes arbitrary Python code with the permissions of the running process. This is a critical remote code execution (RCE) vector in ML pipelines.",
          remediation: "1. Replace pickle.load() with safetensors for model weight loading.\n2. Use torch.load(weights_only=True) to prevent code execution.\n3. Validate file checksums before loading any model artifacts.\n4. Implement allowlisting for classes that can be deserialized.\n5. Run model loading in sandboxed environments with minimal permissions.\n6. Scan model files with Fickling or ModelScan before loading.",
          evidence: `Resource "${r.name}" (${r.type}) contains unsafe deserialization patterns: "${code.substring(0, 200)}".`
        }));
    }
  }
  return findings;
};

const checkSUP030: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const approvedPlugins = ["web_search", "code_interpreter", "retrieval", "file_search", "corporate_kb", "approved_api"];
  for (const r of pool.resources) {
    if (r.category !== "AI Agents" && r.category !== "Orchestration") continue;
    const plugins = meta(r, "plugins") || meta(r, "tools") || meta(r, "functions") || "";
    if (!plugins) continue;
    const pluginList = plugins.split(",").map(p => p.trim().toLowerCase()).filter(Boolean);
    for (const plugin of pluginList) {
      if (!approvedPlugins.some(ap => plugin.includes(ap))) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Unapproved LLM plugin/tool detected: "${plugin}"`, orgId, {
            impact: "Unapproved plugins extend the LLM's capabilities beyond the organization's security boundary. Shadow plugins may access internal APIs, execute arbitrary code, connect to external services, or exfiltrate data. Without approval, these plugins bypass security review, data classification, and access control policies.",
            remediation: `1. Review the plugin "${plugin}" against the organization's approved manifest.\n2. If legitimate, add it to the approved plugins list after security review.\n3. If unauthorized, remove it from the agent configuration.\n4. Implement plugin allowlisting at the orchestration layer.\n5. Monitor plugin invocations for anomalous behavior.`,
            evidence: `Resource "${r.name}" (${r.type}, category: ${r.category}) has plugin "${plugin}" which is not in the approved list: [${approvedPlugins.join(", ")}].`
          }));
      }
    }
  }
  return findings;
};

// --- MON-031 to MON-035: Monitoring ---

const checkMON031: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Monitoring/Logs") continue;
    const tokenSpike = meta(r, "tokenUsageSpike") || meta(r, "usageAnomaly") || "";
    if (!tokenSpike) continue;
    const spikeVal = parseFloat(tokenSpike);
    if (!isNaN(spikeVal) && spikeVal > 300) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI token usage spike detected: ${spikeVal}% increase by a single IAM role within 1 hour`, orgId, {
          impact: "A >300% token consumption spike indicates potential abuse: an attacker using stolen credentials for mass data extraction via model queries, a denial-of-wallet attack driving up inference costs, or a compromised application making unbounded API calls. Cloud costs can escalate to thousands of dollars within minutes.",
          remediation: "1. Immediately investigate the IAM role associated with the spike.\n2. Set up CloudWatch alarms for token consumption thresholds.\n3. Implement per-role token budgets with automatic throttling.\n4. Review recent InvokeModel CloudTrail events for the role.\n5. Consider temporarily revoking the role's model invocation permissions.",
          evidence: `Monitoring resource "${r.name}" detected ${spikeVal}% token usage increase. Threshold: 300%. Source: ${r.source}.`
        }));
    }
  }
  return findings;
};

const checkMON032: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Monitoring/Logs" && r.category !== "Guardrails") continue;
    const violations = meta(r, "contentFilterViolations") || meta(r, "safetyViolationCount") || "";
    if (!violations) continue;
    const count = parseInt(violations);
    if (!isNaN(count) && count > 50) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Persistent safety violations: ${count} content filter blocks in 24-hour period`, orgId, {
          impact: "An identity triggering >50 content filter blocks in 24 hours is likely attempting systematic jailbreak attacks, probing for filter bypasses, or deliberately generating harmful content. This pattern indicates either a compromised account or a malicious insider attempting to abuse AI capabilities.",
          remediation: "1. Identify the IAM identity/user triggering the violations.\n2. Temporarily suspend the identity's model invocation permissions.\n3. Review the blocked prompts for attack patterns.\n4. Escalate to the security incident response team if patterns suggest intentional abuse.\n5. Strengthen content filters based on observed bypass attempts.",
          evidence: `Resource "${r.name}" recorded ${count} content filter violations in a 24-hour period. Threshold: 50. Source: ${r.source}.`
        }));
    }
  }
  return findings;
};

const checkMON033: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.source && !r.source.toLowerCase().includes("azure")) continue;
    if (r.category !== "Development") continue;
    const type = r.type.toLowerCase();
    if (!type.includes("workspace") && !type.includes("machine learning")) continue;
    const diagnostics = meta(r, "diagnosticLogging") || meta(r, "diagnosticsEnabled") || "";
    if (diagnostics === "false" || diagnostics === "disabled") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Azure ML workspace has diagnostic logging turned off`, orgId, {
          impact: "Without diagnostic logging, all activities within the Azure ML workspace are invisible to security monitoring: model training jobs, data access, experiment runs, and compute provisioning happen without audit trails. This prevents detection of unauthorized data access, model theft, or resource abuse.",
          remediation: "1. Enable diagnostic settings on the Azure ML workspace.\n2. Route logs to a Log Analytics workspace or Storage Account.\n3. Configure log categories: AmlComputeClusterEvent, AmlRunStatusChangedEvent, AmlComputeJobEvent.\n4. Set up Azure Monitor alerts for suspicious activity patterns.\n5. Ensure log retention meets compliance requirements (minimum 90 days).",
          evidence: `Workspace "${r.name}" has diagnostic logging set to "${diagnostics}". Expected: enabled with log categories configured.`
        }));
    }
  }
  return findings;
};

const checkMON034: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    if (m.category !== "Inference Endpoints" && m.category !== "Custom Models") continue;
    const status = ((m as any).status || "").toLowerCase();
    if (status !== "deployed" && status !== "in-service" && status !== "active" && status !== "inservice") continue;
    const monitoring = meta(m, "monitoringSchedule") || meta(m, "modelMonitor") || meta(m, "driftDetection") || "";
    if (monitoring === "false" || monitoring === "disabled" || monitoring === "none") {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Deployed model has no active monitoring schedule for drift/performance`, orgId, {
          impact: "Without model monitoring, gradual performance degradation (data drift, concept drift) goes undetected. The model may silently produce increasingly inaccurate or biased predictions, leading to business losses, customer harm, or compliance violations. Adversarial attacks that subtly poison model inputs also remain invisible.",
          remediation: "1. Create a SageMaker Model Monitor schedule (or equivalent) for the endpoint.\n2. Configure data quality, model quality, and bias drift monitors.\n3. Set up CloudWatch alarms for drift metric thresholds.\n4. Establish a model retraining pipeline triggered by drift alerts.\n5. Review monitoring results weekly and adjust thresholds as needed.",
          evidence: `Model "${m.name}" (status: ${status}, category: ${m.category}) has monitoring schedule set to "${monitoring}". Expected: an active monitoring schedule.`
        }));
    }
  }
  return findings;
};

const checkMON035: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const jailbreakPatterns = ["ignore previous", "dan mode", "do anything now", "jailbreak", "ignore all instructions",
    "pretend you are", "act as if you have no restrictions", "developer mode", "bypass your rules"];
  for (const r of pool.resources) {
    if (r.category !== "Monitoring/Logs") continue;
    const logPatterns = meta(r, "detectedPatterns") || meta(r, "jailbreakAttempts") || meta(r, "promptInjections") || "";
    if (!logPatterns) continue;
    const patternLower = logPatterns.toLowerCase();
    const matched = jailbreakPatterns.filter(p => patternLower.includes(p));
    if (matched.length > 0) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Jailbreak/prompt injection patterns detected in AI logs: ${matched.join(", ")}`, orgId, {
          impact: "Detected jailbreak strings in logs indicate active prompt injection attacks against your AI systems. Attackers are attempting to bypass safety guardrails, extract system prompts, manipulate model behavior, or access restricted capabilities. Successful attacks can lead to data exfiltration, harmful content generation, and unauthorized actions.",
          remediation: "1. Block the source IP addresses or user accounts associated with the patterns.\n2. Strengthen input validation and prompt injection filters.\n3. Deploy a dedicated prompt injection detection model as a preprocessing step.\n4. Review all successful model responses following the injection attempts.\n5. Update guardrail rules to cover the specific patterns detected.",
          evidence: `Log resource "${r.name}" contains jailbreak patterns: [${matched.join(", ")}]. Raw patterns detected: "${logPatterns.substring(0, 200)}".`
        }));
    }
  }
  return findings;
};

// --- GOV-036 to GOV-040: Governance ---

const checkGOV036: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const highRiskUseCases = ["hris", "hr", "human resources", "finance", "financial", "credit", "lending",
    "insurance", "healthcare", "medical", "legal", "law enforcement", "recruitment", "hiring"];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const useCase = meta(a, "useCase") || meta(a, "use_case") || meta(a, "purpose") || "";
    if (!useCase) continue;
    const useCaseLower = useCase.toLowerCase();
    const matchedUseCase = highRiskUseCases.find(hru => useCaseLower.includes(hru));
    if (matchedUseCase) {
      const tags = (a.tags || []).map(t => t.toLowerCase());
      const hasHighRiskTag = tags.some(t => t.includes("high-risk") || t.includes("highrisk") || t.includes("eu-ai-act") || t.includes("regulated"));
      if (!hasHighRiskTag) {
        findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
          `AI system with use case "${matchedUseCase}" missing "High Risk" compliance tag`, orgId, {
            impact: "Under the EU AI Act, AI systems used for HR/recruitment, finance/credit scoring, and other high-risk categories require conformity assessments, risk management systems, human oversight, and transparency obligations. Failing to tag and track these systems as high-risk exposes the organization to regulatory fines up to €35 million or 7% of global annual turnover.",
            remediation: `1. Add a "high-risk" or "eu-ai-act" tag to this AI system.\n2. Conduct a conformity assessment as required by EU AI Act Article 43.\n3. Document the risk management system per Article 9.\n4. Ensure human oversight mechanisms are in place per Article 14.\n5. Create and maintain technical documentation per Article 11.\n6. Register the system in the EU AI database per Article 49.`,
            evidence: `Asset "${a.name}" has use case "${useCase}" matching high-risk category "${matchedUseCase}". Current tags: [${(a.tags || []).join(", ")}]. Missing: "high-risk" or "eu-ai-act" tag.`
          }));
      }
    }
  }
  return findings;
};

const checkGOV037: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    if (m.category !== "Custom Models" && m.category !== "Inference Endpoints") continue;
    const modelCard = meta(m, "modelCard") || meta(m, "documentation") || meta(m, "intendedUse") || "";
    if (modelCard === "false" || modelCard === "none" || modelCard === "missing") {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Model in registry lacks a documented Model Card (intended use, limitations, biases)`, orgId, {
          impact: "Without a Model Card, downstream users have no documentation of the model's intended use cases, known limitations, training data composition, performance benchmarks, ethical considerations, or known biases. This leads to misuse in inappropriate contexts, failure to account for known limitations, and inability to assess regulatory compliance.",
          remediation: "1. Create a Model Card following the Mitchell et al. (2019) template.\n2. Document intended use cases and out-of-scope uses.\n3. Describe training data sources and known biases.\n4. Include performance metrics across different demographic groups.\n5. List known limitations and failure modes.\n6. Add the model card URL to the model registry metadata.",
          evidence: `Model "${m.name}" (category: ${m.category}) has model card status: "${modelCard}". Expected: a valid Model Card with intended use, limitations, and bias documentation.`
        }));
    }
  }
  return findings;
};

const checkGOV038: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "AI Agents") continue;
    const dbAccess = meta(r, "dbWriteAccess") || meta(r, "databaseAccess") || "";
    if (!dbAccess) continue;
    const dbLower = dbAccess.toLowerCase();
    if (dbLower.includes("write") || dbLower.includes("insert") || dbLower.includes("update") || dbLower.includes("delete")) {
      const humanApproval = meta(r, "humanApproval") || meta(r, "humanInLoop") || meta(r, "requiresApproval") || "";
      if (!humanApproval || humanApproval === "false" || humanApproval === "disabled") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `AI agent with database write access does not require human approval for actions`, orgId, {
            impact: "An AI agent with direct write access to a database can modify, delete, or corrupt data based on misinterpreted prompts, hallucinated instructions, or prompt injection attacks. Without human-in-the-loop approval, a single malicious or malformed prompt can result in mass data deletion, unauthorized record modifications, or data corruption that affects downstream systems.",
            remediation: "1. Implement a human approval workflow for all database write operations.\n2. Use a staging/preview mechanism where the agent proposes changes for review.\n3. Add transaction rollback capabilities for agent-initiated writes.\n4. Implement rate limiting on write operations.\n5. Log all agent database operations for audit.\n6. Consider read-only database access with a separate approval flow for writes.",
            evidence: `Agent "${r.name}" has database access level: "${dbAccess}" with human approval: "${humanApproval || "not configured"}". Category: AI Agents.`
          }));
      }
    }
  }
  return findings;
};

const checkGOV039: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    const env = meta(m, "environment") || meta(m, "stage") || "";
    if (!env) continue;
    const envLower = env.toLowerCase();
    if (envLower === "dev" || envLower === "development" || envLower === "staging" || envLower === "test") {
      const trainingDataSource = meta(m, "trainingDataSource") || meta(m, "dataSource") || "";
      const tdLower = trainingDataSource.toLowerCase();
      if (tdLower.includes("prod") || tdLower.includes("production")) {
        findings.push(finding(policy, m.id, m.name, m.type,
          `Dev/staging model trained on production tenant data: "${trainingDataSource}"`, orgId, {
            impact: "Training a development model on production data violates data segregation policies, potentially exposing PII and confidential business data to development environments with weaker access controls. This creates data leakage risks, compliance violations (GDPR, HIPAA), and breaks the principle of environment isolation.",
            remediation: "1. Replace production data with synthetic or anonymized datasets for development.\n2. Implement data masking pipelines between production and development environments.\n3. Use differential privacy techniques when sampling production data for training.\n4. Enforce account-level SCPs preventing cross-environment data access.\n5. Establish a formal data provisioning process for ML training.",
            evidence: `Model "${m.name}" is in environment "${env}" but references production data source: "${trainingDataSource}".`
          }));
      }
    }
  }
  return findings;
};

const checkGOV040: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const highStakesKeywords = ["hiring", "lending", "credit", "insurance", "medical", "healthcare",
    "criminal", "justice", "welfare", "benefits", "education", "admission"];
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    if (m.category !== "Inference Endpoints" && m.category !== "Custom Models") continue;
    const useCase = meta(m, "useCase") || meta(m, "use_case") || meta(m, "purpose") || "";
    if (!useCase) continue;
    const useCaseLower = useCase.toLowerCase();
    const isHighStakes = highStakesKeywords.some(kw => useCaseLower.includes(kw));
    if (isHighStakes) {
      const biasMonitoring = meta(m, "biasMonitoring") || meta(m, "fairnessMetrics") || meta(m, "biasDetection") || "";
      if (!biasMonitoring || biasMonitoring === "false" || biasMonitoring === "disabled" || biasMonitoring === "none") {
        findings.push(finding(policy, m.id, m.name, m.type,
          `High-stakes model lacks fairness/bias metrics tracking`, orgId, {
            impact: "AI models used in high-stakes decisions (hiring, lending, healthcare) without bias monitoring can systematically discriminate against protected groups. This exposes the organization to civil rights violations, regulatory enforcement actions, class-action lawsuits, and reputational damage. EEOC, CFPB, and state-level AI regulations increasingly require bias testing.",
            remediation: "1. Implement demographic parity and equalized odds metrics.\n2. Set up SageMaker Clarify or equivalent bias detection for the endpoint.\n3. Monitor prediction outcomes across protected attribute groups.\n4. Establish threshold alerts for statistical parity differences.\n5. Conduct quarterly bias audits with results documented for compliance.\n6. Publish bias testing results as part of the model card.",
            evidence: `Model "${m.name}" has use case "${useCase}" (high-stakes) but bias monitoring is: "${biasMonitoring || "not configured"}". Expected: active fairness/bias metrics tracking.`
          }));
      }
    }
  }
  return findings;
};

// --- RUN-041 to RUN-045: Runtime Security ---

const checkRUN041: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "AI Agents" && r.category !== "Orchestration" && r.category !== "Development") continue;
    const codePatterns = meta(r, "codePatterns") || meta(r, "sqlExecution") || meta(r, "outputHandling") || "";
    if (!codePatterns) continue;
    const codeLower = codePatterns.toLowerCase();
    if ((codeLower.includes("sql") || codeLower.includes("query")) &&
        (codeLower.includes("f-string") || codeLower.includes("format(") || codeLower.includes("concatenat") ||
         codeLower.includes("string interpolation") || codeLower.includes("unsanitized") || codeLower.includes("raw"))) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `LLM output passed directly to SQL executor without parameterization`, orgId, {
          impact: "Passing raw LLM output into SQL queries creates a critical SQL injection vector. An attacker can use prompt injection to make the LLM generate malicious SQL (DROP TABLE, UNION SELECT, etc.) that executes with the application's database privileges. This can result in complete data exfiltration, data destruction, or privilege escalation.",
          remediation: "1. Never pass LLM output directly into SQL queries.\n2. Use parameterized queries or prepared statements exclusively.\n3. Implement an SQL allowlist of permitted query patterns.\n4. Add a validation layer that parses and sanitizes generated SQL before execution.\n5. Run AI-generated queries with a read-only database role.\n6. Implement query result row limits and timeout safeguards.",
          evidence: `Resource "${r.name}" (${r.type}) has code patterns indicating unsanitized SQL execution: "${codePatterns.substring(0, 200)}".`
        }));
    }
  }
  return findings;
};

const checkRUN042: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "AI Agents" && r.category !== "Development" && r.category !== "Inference Endpoints") continue;
    const outputSanitization = meta(r, "outputSanitization") || meta(r, "xssProtection") || meta(r, "htmlEscaping") || "";
    if (!outputSanitization) continue;
    if (outputSanitization === "false" || outputSanitization === "disabled" || outputSanitization === "none") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI web UI does not sanitize model response strings for JavaScript/XSS`, orgId, {
          impact: "If the AI model's response is rendered as raw HTML in the web UI, an attacker can use prompt injection to make the model output malicious JavaScript. This enables stored XSS attacks that steal user session tokens, exfiltrate conversation history, redirect users to phishing pages, or perform actions on behalf of authenticated users.",
          remediation: "1. Always render model output as plain text, never as raw HTML.\n2. Apply DOMPurify or equivalent sanitization to all model responses before rendering.\n3. Implement Content Security Policy (CSP) headers to prevent inline script execution.\n4. Use React's default JSX escaping (avoid dangerouslySetInnerHTML).\n5. Add output validation to detect and strip HTML/JavaScript in model responses.",
          evidence: `Resource "${r.name}" has output sanitization: "${outputSanitization}". Expected: enabled with XSS protection active.`
        }));
    }
  }
  return findings;
};

const checkRUN043: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const internalUrls = ["169.254.169.254", "metadata.google.internal", "metadata.azure.com",
    "localhost", "127.0.0.1", "10.0.", "172.16.", "192.168.", "0.0.0.0"];
  for (const r of pool.resources) {
    if (r.category !== "AI Agents") continue;
    const urlAccess = meta(r, "allowedUrls") || meta(r, "toolUrls") || meta(r, "fetchPermissions") || "";
    if (!urlAccess) continue;
    const urlLower = urlAccess.toLowerCase();
    const matched = internalUrls.filter(u => urlLower.includes(u));
    if (matched.length > 0) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI agent permitted to fetch internal/metadata URLs: ${matched.join(", ")}`, orgId, {
          impact: "An AI agent with access to internal URLs can be manipulated through prompt injection to perform Server-Side Request Forgery (SSRF). The IMDS endpoint (169.254.169.254) exposes IAM role credentials, instance metadata, and user data. Internal network access allows scanning, lateral movement, and access to services not exposed to the internet.",
          remediation: "1. Block access to IMDS endpoints (169.254.169.254) from AI agent processes.\n2. Enforce IMDSv2 (token-required) on all EC2 instances.\n3. Implement URL allowlisting that restricts agent fetch operations to approved external domains.\n4. Block all RFC 1918 private IP ranges from agent tool access.\n5. Deploy network segmentation to isolate AI agent workloads.\n6. Monitor agent HTTP requests for internal URL access patterns.",
          evidence: `Agent "${r.name}" has URL access permissions that include internal addresses: [${matched.join(", ")}]. Full URL permissions: "${urlAccess.substring(0, 200)}".`
        }));
    }
  }
  return findings;
};

const checkRUN044: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    if (m.category === "Foundation Models") continue;
    if (m.category !== "Inference Endpoints" && m.category !== "Custom Models") continue;
    const queryPattern = meta(m, "queryPattern") || meta(m, "extractionAttempts") || meta(m, "highFrequencyQueries") || "";
    if (!queryPattern) continue;
    const patternLower = queryPattern.toLowerCase();
    if (patternLower.includes("extraction") || patternLower.includes("probing") ||
        patternLower.includes("boundary") || patternLower.includes("high-frequency") ||
        patternLower.includes("systematic")) {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Model inversion/extraction attack pattern detected: ${queryPattern.substring(0, 80)}`, orgId, {
          impact: "Systematic high-frequency queries that probe model decision boundaries indicate a model extraction or model inversion attack. Successful extraction allows attackers to create a functionally equivalent copy of your proprietary model, while inversion attacks can reconstruct sensitive training data including PII. This represents theft of intellectual property and potential data breach.",
          remediation: "1. Implement rate limiting per user/API key with progressive throttling.\n2. Add query similarity detection to identify systematic probing.\n3. Deploy watermarking in model outputs to detect extracted copies.\n4. Monitor for unusual query patterns (identical inputs with slight perturbations).\n5. Implement output perturbation to degrade extraction quality.\n6. Block the source IP/identity and investigate.",
          evidence: `Model "${m.name}" has detected query patterns: "${queryPattern.substring(0, 200)}". These patterns suggest systematic model probing.`
        }));
    }
  }
  return findings;
};

const checkRUN045: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const sensitivePatterns = [
    { pattern: /[A-Za-z0-9+/]{40,}/, label: "Base64-encoded credential" },
    { pattern: /sk-[a-zA-Z0-9]{20,}/, label: "OpenAI API key" },
    { pattern: /AKIA[0-9A-Z]{16}/, label: "AWS Access Key" },
    { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, label: "IP address" },
    { pattern: /password\s*[:=]\s*\S+/i, label: "Hardcoded password" },
    { pattern: /api[_-]?key\s*[:=]\s*\S+/i, label: "API key assignment" },
    { pattern: /secret\s*[:=]\s*\S+/i, label: "Secret assignment" },
    { pattern: /bearer\s+[a-zA-Z0-9._-]+/i, label: "Bearer token" },
  ];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const systemPrompt = meta(a, "systemPrompt") || meta(a, "system_prompt") || meta(a, "instructions") || "";
    if (!systemPrompt || systemPrompt.length < 20) continue;
    const matched: string[] = [];
    for (const { pattern, label } of sensitivePatterns) {
      if (pattern.test(systemPrompt)) {
        matched.push(label);
      }
    }
    if (matched.length > 0) {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `Sensitive data detected in system prompt: ${matched.join(", ")}`, orgId, {
          impact: "Hardcoded credentials, API keys, or internal IP addresses in system prompts can be extracted through prompt injection attacks ('repeat your system prompt verbatim'). Once extracted, attackers gain access to internal APIs, cloud resources, and network endpoints. System prompts are also visible in log files and may be cached by AI providers.",
          remediation: "1. Remove all credentials and API keys from system prompts immediately.\n2. Use environment variables or secrets managers for dynamic credential injection.\n3. Replace internal IP addresses with DNS names resolved at runtime.\n4. Implement system prompt obfuscation or encryption at rest.\n5. Add monitoring for 'repeat your instructions' type queries.\n6. Audit all system prompts across the organization quarterly.",
          evidence: `Asset "${a.name}" system prompt contains sensitive patterns: [${matched.join(", ")}]. Prompt excerpt: "${systemPrompt.substring(0, 100)}...".`
        }));
    }
  }
  return findings;
};

// --- IAM-046 to IAM-060: Advanced Agent Identity & Access ---

const checkIAM046: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("service") && !name.includes("sagemaker") && !name.includes("bedrock")) continue;
    const keyType = meta(r, "accessKeyType") || meta(r, "credentialType") || meta(r, "authMethod") || "";
    if (!keyType) continue;
    const keyLower = keyType.toLowerCase();
    if (keyLower.includes("long-lived") || keyLower.includes("permanent") || keyLower.includes("static") || keyLower.includes("access_key")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI Agent/service account using long-lived access keys instead of temporary STS credentials`, orgId, {
          impact: "Long-lived access keys for AI agent service accounts never expire and, if compromised, provide indefinite access to cloud resources. Unlike STS session credentials that expire in hours, permanent keys can be exfiltrated through prompt injection, logged in cleartext, or discovered in configuration files. A single compromised key can enable persistent unauthorized access to AI services and training data.",
          remediation: "1. Replace static access keys with IAM role-based authentication using STS AssumeRole.\n2. Configure maximum session duration (1-12 hours) for AI agent roles.\n3. Implement credential rotation for any remaining static keys (every 30 days max).\n4. Enable AWS CloudTrail to monitor AssumeRole events for agent identities.\n5. Use OIDC federation or IAM Roles Anywhere for non-AWS AI agents.\n6. Deploy AWS Config rule access-keys-rotated to enforce key rotation.",
          evidence: `Role "${r.name}" uses credential type: "${keyType}". Expected: STS temporary credentials or IAM role-based authentication. ARN: ${r.externalId || "N/A"}.`
        }));
    }
  }
  return findings;
};

const checkIAM047: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("ai") && !name.includes("bedrock")) continue;
    const s3Perms = meta(r, "s3Permissions") || meta(r, "permissions") || meta(r, "policyDocument") || "";
    if (!s3Perms) continue;
    const permLower = s3Perms.toLowerCase();
    if (permLower.includes("s3:getobject") || permLower.includes("s3:*")) {
      if (permLower.includes("/*") || permLower.includes("arn:aws:s3:::*") || !permLower.includes("/")) {
        const bucketMatch = s3Perms.match(/arn:aws:s3:::([^/\s*]+)/);
        const bucket = bucketMatch ? bucketMatch[1] : "unknown";
        findings.push(finding(policy, r.id, r.name, r.type,
          `AI Agent IAM policy grants S3 access to entire bucket "${bucket}" instead of a scoped prefix`, orgId, {
            impact: "Granting an AI agent GetObject permissions on an entire S3 bucket allows it to access all objects, including training data for other models, configuration files, secrets, and data belonging to other teams or tenants. A prompt injection attack could direct the agent to read sensitive objects outside its intended scope, leading to data exfiltration.",
            remediation: "1. Scope the S3 resource ARN to a specific prefix: arn:aws:s3:::bucket/agent-name/*.\n2. Use S3 Access Points to create agent-specific access policies.\n3. Implement S3 Object Lambda to filter accessible objects per agent.\n4. Add condition keys to restrict access based on object tags.\n5. Enable S3 server access logging to monitor agent access patterns.\n6. Review bucket policy for any Allow * statements.",
            evidence: `Role "${r.name}" has S3 permissions that appear to cover an entire bucket without prefix restriction. Permissions: "${s3Perms.substring(0, 200)}".`
          }));
      }
    }
  }
  return findings;
};

const checkIAM048: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const permissions = meta(r, "permissions") || meta(r, "policyDocument") || meta(r, "policyNames") || "";
    const permLower = permissions.toLowerCase();
    if (permLower.includes("deletemodel") || permLower.includes("deleteresolver") || permLower.includes("sagemaker:delete") || permLower.includes("bedrock:delete")) {
      const mfaCondition = meta(r, "mfaCondition") || meta(r, "requireMfa") || "";
      if (!mfaCondition || mfaCondition === "false" || mfaCondition === "none") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `IAM policy allows model deletion without MFA condition`, orgId, {
            impact: "Without MFA enforcement on destructive model operations (DeleteModel, DeleteEndpoint), a compromised set of credentials or an automated attack can permanently delete production AI models, causing immediate service outages. Model deletion may be irreversible if model artifacts are not separately backed up, requiring expensive retraining from scratch.",
            remediation: "1. Add an IAM policy condition requiring MFA: aws:MultiFactorAuthPresent: true.\n2. Implement an SCP at the OU level to deny Delete* actions without MFA.\n3. Enable model versioning and backups before allowing delete operations.\n4. Use AWS Backup for SageMaker model artifacts.\n5. Implement a soft-delete mechanism with a 72-hour recovery window.\n6. Set up CloudTrail alerts for all model deletion API calls.",
            evidence: `Role "${r.name}" has delete permissions: "${permissions.substring(0, 150)}" with MFA condition: "${mfaCondition || "not configured"}". ARN: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkIAM049: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("ai") && !name.includes("execution")) continue;
    const permissions = meta(r, "permissions") || meta(r, "policyDocument") || "";
    const permLower = permissions.toLowerCase();
    if (permLower.includes("secretsmanager:getsecretvalue") || permLower.includes("ssm:getparameter")) {
      const resourceScope = meta(r, "secretsScope") || meta(r, "resourceRestriction") || "";
      if (!resourceScope || resourceScope === "*" || resourceScope.toLowerCase().includes("*")) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `AI execution role has unscoped Secrets Manager access — can read secrets not tagged for this agent`, orgId, {
            impact: "An AI agent with broad SecretsManager:GetSecretValue permissions can access all secrets in the account, including database credentials, API keys for other services, and encryption keys. Through prompt injection, an attacker could instruct the agent to retrieve and exfiltrate arbitrary secrets, compromising the entire secrets infrastructure.",
            remediation: "1. Scope the IAM policy to specific secret ARNs tagged with the agent's unique ID.\n2. Add a condition key: aws:ResourceTag/AgentId: <agent-id>.\n3. Use Secrets Manager resource policies to restrict access per agent.\n4. Implement VPC endpoints for Secrets Manager to prevent internet access.\n5. Enable Secrets Manager audit logging to track all GetSecretValue calls.\n6. Rotate all secrets that the agent has accessed as a precaution.",
            evidence: `Role "${r.name}" has secrets access permissions: "${permissions.substring(0, 150)}" with resource scope: "${resourceScope || "unrestricted (*)"}."`
          }));
      }
    }
  }
  return findings;
};

const checkIAM050: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const trustPolicy = meta(r, "trustPolicy") || meta(r, "assumeRolePolicy") || meta(r, "trustRelationship") || "";
    if (!trustPolicy) continue;
    const trustLower = trustPolicy.toLowerCase();
    if (trustLower.includes("assumerole") && (trustLower.includes("external") || trustLower.includes("cross-account"))) {
      const externalAccounts = meta(r, "trustedAccounts") || meta(r, "externalPrincipals") || "";
      findings.push(finding(policy, r.id, r.name, r.type,
        `Cross-account trust allows external AI agents to assume production role`, orgId, {
          impact: "A trust relationship allowing external accounts to assume a production AI role creates a lateral movement path. If the external account is compromised, attackers can assume the production role and invoke models, access training data, or modify AI infrastructure. This is especially dangerous when the external account has weaker security controls than the production environment.",
          remediation: "1. Review and restrict the trust policy Principal to specific role ARNs, not account-wide.\n2. Add an ExternalId condition to prevent confused deputy attacks.\n3. Implement aws:PrincipalOrgID condition to restrict to your AWS Organization.\n4. Enable CloudTrail cross-account AssumeRole monitoring.\n5. Use AWS Organizations SCPs to control cross-account access patterns.\n6. Implement a broker/hub account pattern for cross-account AI access.",
          evidence: `Role "${r.name}" has cross-account trust relationship: "${trustPolicy.substring(0, 200)}". External principals: "${externalAccounts || "not specified"}". ARN: ${r.externalId || "N/A"}.`
        }));
    }
  }
  return findings;
};

const checkIAM051: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("ai")) continue;
    const permissions = meta(r, "permissions") || meta(r, "policyDocument") || "";
    const permLower = permissions.toLowerCase();
    const writePerms = ["dynamodb:putitem", "dynamodb:deleteitem", "dynamodb:updateitem",
      "rds-data:executestatement", "rds:modify", "update", "delete", "put"];
    const hasWrite = writePerms.some(wp => permLower.includes(wp));
    if (hasWrite) {
      const approvalFlow = meta(r, "approvalWorkflow") || meta(r, "writeApproval") || meta(r, "humanApproval") || "";
      if (!approvalFlow || approvalFlow === "false" || approvalFlow === "disabled") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `AI Agent has write/delete permissions on production databases without approval workflow`, orgId, {
            impact: "An AI agent with direct write and delete permissions on production databases (RDS, DynamoDB) can modify or destroy critical data through prompt injection or hallucinated actions. Without an approval workflow, a single malicious prompt can trigger mass data deletion or corruption with no human verification checkpoint.",
            remediation: "1. Implement a human-in-the-loop approval mechanism for all write operations.\n2. Use AWS Step Functions to create an approval workflow before database writes.\n3. Deploy the agent with read-only database access and a separate write API.\n4. Implement transaction logging and automatic rollback capabilities.\n5. Add rate limiting on write operations per time window.\n6. Use database-level row-level security (RLS) to restrict agent access.",
            evidence: `Role "${r.name}" has database write permissions: "${permissions.substring(0, 200)}" with approval workflow: "${approvalFlow || "not configured"}".`
          }));
      }
    }
  }
  return findings;
};

const checkIAM052: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const permissions = meta(r, "permissions") || meta(r, "policyDocument") || "";
    const permLower = permissions.toLowerCase();
    if (permLower.includes("bedrock:invokemodel") || permLower.includes("bedrock:invoke")) {
      if (permLower.includes("resource: *") || permLower.includes("resource:*") || permLower.includes("\"*\"")) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `IAM policy uses bedrock:InvokeModel on Resource: * — agents should be restricted to approved model ARNs`, orgId, {
            impact: "A wildcard Resource in bedrock:InvokeModel allows the agent to invoke any foundation model in the account, including expensive large models (Claude 3 Opus, GPT-4) that increase costs, models not approved for the use case, or models with weaker safety guardrails. This creates cost explosion risk and bypasses the model governance process.",
            remediation: "1. Replace Resource: * with specific model ARNs approved for this agent.\n2. Use resource tags and condition keys to restrict to approved model families.\n3. Implement AWS Budgets alerts for unexpected Bedrock invocation costs.\n4. Create a model allowlist per agent in the IAM policy.\n5. Use Bedrock model access controls to disable unapproved models.\n6. Monitor InvokeModel CloudTrail events for unexpected model usage.",
            evidence: `Role "${r.name}" has bedrock:InvokeModel with wildcard resource. Permissions: "${permissions.substring(0, 200)}". Expected: specific model ARNs.`
          }));
      }
    }
  }
  return findings;
};

const checkIAM053: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("ai") && !name.includes("ml") && !name.includes("sagemaker") && !name.includes("bedrock") && !name.includes("lambda")) continue;
    const lastActivity = meta(r, "lastActivity") || meta(r, "lastUsed") || meta(r, "lastInvocation") || "";
    if (!lastActivity) continue;
    const actLower = lastActivity.toLowerCase();
    if (actLower.includes("inactive") || actLower.includes("never") || actLower.includes(">30") || actLower.includes("stale")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Unused AI agent identity detected — no invoke or training activity in 30+ days (Ghost Agent)`, orgId, {
          impact: "Inactive AI agent identities ('Ghost Agents') retain their permissions indefinitely but are no longer actively monitored or maintained. These stale accounts are prime targets for credential theft and lateral movement because their compromise may go undetected for extended periods. They also violate the principle of least privilege and complicate security audits.",
          remediation: "1. Disable or delete the unused agent identity immediately.\n2. Revoke all active sessions and access keys for the identity.\n3. Review CloudTrail logs to verify no recent unauthorized activity.\n4. Implement IAM Access Analyzer to continuously identify unused roles.\n5. Create an automated cleanup policy for agent identities unused for >30 days.\n6. Add a 'last-active' tag and monitor it with AWS Config rules.",
          evidence: `Role "${r.name}" has last activity: "${lastActivity}". Expected: recent invoke or training activity within the last 30 days. ARN: ${r.externalId || "N/A"}.`
        }));
    }
  }
  return findings;
};

const checkIAM054: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("ai") && !name.includes("bedrock") && !name.includes("sagemaker") && !name.includes("lambda") && !name.includes("ml")) continue;
    const permBoundary = meta(r, "permissionBoundary") || meta(r, "permissionsBoundary") || meta(r, "boundary") || "";
    const pbLower = permBoundary.toLowerCase();
    if (!permBoundary || pbLower === "none" || pbLower === "false" || pbLower === "no") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI agent role missing IAM Permission Boundary — vulnerable to privilege escalation via prompt injection`, orgId, {
          impact: "Without an IAM Permission Boundary, an AI agent that has been compromised through prompt injection can escalate its own permissions by creating new roles, attaching additional policies, or modifying its own role. Permission Boundaries set a hard ceiling on what permissions a role can ever have, even if additional policies are attached. This is critical for AI agents that may execute arbitrary code.",
          remediation: "1. Create a Permission Boundary policy that caps the maximum permissions for AI agents.\n2. Attach the boundary using: aws iam put-role-permissions-boundary.\n3. Ensure the boundary blocks iam:CreateRole, iam:AttachRolePolicy, and iam:PutRolePolicy.\n4. Implement SCP-level guardrails that require boundaries on all new roles.\n5. Use AWS Config rule iam-role-permissions-boundary-check for continuous compliance.\n6. Test the boundary with the IAM Policy Simulator.",
          evidence: `Role "${r.name}" has no Permission Boundary configured. Boundary: "${permBoundary || "not set"}". ARN: ${r.externalId || "N/A"}.`
        }));
    }
  }
  return findings;
};

const checkIAM055: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const createdBy = meta(r, "createdBy") || meta(r, "creator") || "";
    if (!createdBy) continue;
    const creatorLower = createdBy.toLowerCase();
    const isNonAdmin = !creatorLower.includes("admin") && !creatorLower.includes("root") && !creatorLower.includes("platform");
    if (!isNonAdmin) continue;
    const assignedRoles = meta(r, "assignedRoles") || meta(r, "managedPolicies") || meta(r, "permissions") || "";
    const rolesLower = assignedRoles.toLowerCase();
    if (rolesLower.includes("ai developer") || rolesLower.includes("vertex ai user") || rolesLower.includes("sagemaker") || rolesLower.includes("bedrock")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Shadow agent creation: non-admin user "${createdBy}" created service principal with AI roles`, orgId, {
          impact: "A non-admin user creating service principals with AI roles may indicate either a security policy violation or an insider threat. Shadow agent creation bypasses the approval workflow for AI service provisioning, potentially creating unmonitored AI agents with access to sensitive data and models. These agents may not have proper logging, guardrails, or permission boundaries configured.",
          remediation: "1. Investigate the purpose of the service principal and the creator's intent.\n2. Verify the agent has appropriate logging and monitoring configured.\n3. Add Permission Boundaries and guardrails to the created agent.\n4. Implement an SCP or Organizational Policy that requires approval for AI role creation.\n5. Set up CloudTrail/Activity Log alerts for CreateRole events with AI-related policies.\n6. Enforce a service principal naming convention that includes the owning team.",
          evidence: `Role "${r.name}" was created by non-admin user "${createdBy}" with AI-related roles: "${assignedRoles.substring(0, 150)}". This may be unauthorized agent provisioning.`
        }));
    }
  }
  return findings;
};

const checkIAM056: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("service") && !name.includes("bot")) continue;
    const loginType = meta(r, "loginType") || meta(r, "interactiveLogin") || meta(r, "consoleAccess") || "";
    if (!loginType) continue;
    const loginLower = loginType.toLowerCase();
    if (loginLower.includes("interactive") || loginLower.includes("console") || loginLower.includes("enabled")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI service account has interactive/console login enabled — should use non-interactive auth only`, orgId, {
          impact: "AI service accounts with interactive login enabled can be used for manual console access, which defeats audit trail integrity and allows human operators to perform actions under the agent's identity. This blurs the line between automated and manual actions, making incident investigation unreliable. Interactive login also exposes the account to phishing and credential stuffing attacks.",
          remediation: "1. Disable interactive/console login for the service account.\n2. Restrict authentication to programmatic API keys or OIDC tokens.\n3. Implement Workload Identity Federation (GCP) or IAM Roles (AWS) for non-interactive auth.\n4. Add a condition in the IAM policy to deny console sign-in.\n5. Enable MFA on the account as a compensating control until interactive login is disabled.\n6. Audit CloudTrail/Activity Logs for any console sign-in events from this identity.",
          evidence: `Service account "${r.name}" has login type: "${loginType}". Expected: non-interactive/programmatic only. ARN: ${r.externalId || "N/A"}.`
        }));
    }
  }
  return findings;
};

const checkIAM057: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "AI Agents" && r.category !== "Development") continue;
    const imdsAccess = meta(r, "imdsVersion") || meta(r, "metadataAccess") || meta(r, "instanceMetadata") || "";
    if (!imdsAccess) continue;
    const imdsLower = imdsAccess.toLowerCase();
    if (imdsLower.includes("v1") || imdsLower.includes("imdsv1") || imdsLower.includes("enabled") || imdsLower.includes("unrestricted")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI Agent on EC2/Compute has access to Instance Metadata Service (IMDSv1) — vulnerable to SSRF`, orgId, {
          impact: "IMDSv1 is vulnerable to SSRF attacks because it does not require a session token for access. An AI agent running on EC2 with IMDSv1 access can be tricked via prompt injection into fetching http://169.254.169.254/latest/meta-data/iam/security-credentials/ to steal the instance's IAM role credentials. These credentials can then be used from outside the instance for lateral movement and privilege escalation.",
          remediation: "1. Enforce IMDSv2 (token-required) on all instances running AI agents: aws ec2 modify-instance-metadata-options --http-tokens required.\n2. Set HttpPutResponseHopLimit to 1 to prevent container/proxy exploitation.\n3. Implement an SCP that denies ec2:RunInstances without IMDSv2.\n4. Block the 169.254.169.254 IP in the agent's network namespace/container.\n5. Use task-level IAM roles (ECS) or IRSA (EKS) instead of instance-level roles.\n6. Monitor CloudTrail for IMDSv1 credential retrieval events.",
          evidence: `Resource "${r.name}" has IMDS configuration: "${imdsAccess}". IMDSv1 is active and vulnerable to SSRF credential theft. Expected: IMDSv2 (token-required) only.`
        }));
    }
  }
  return findings;
};

const checkIAM058: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    if (a.category !== "AI Agents" && a.category !== "Development" && a.category !== "Training Data") continue;
    const configFiles = meta(a, "configFiles") || meta(a, "envFiles") || meta(a, "configStorage") || "";
    if (!configFiles) continue;
    const configLower = configFiles.toLowerCase();
    if (configLower.includes("plaintext") || configLower.includes(".env") || configLower.includes("config.yaml") ||
        configLower.includes("unencrypted") || configLower.includes("hardcoded")) {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `Insecure agent key storage: plaintext AI API keys found in configuration files`, orgId, {
          impact: "Plaintext API keys and bearer tokens in configuration files (.env, config.yaml) stored in cloud storage (S3, GCS) are accessible to anyone with read permissions on the bucket. These credentials can be used to access AI services, incur charges, exfiltrate model responses, or impersonate the agent. S3 bucket misconfiguration is one of the most common cloud breach vectors.",
          remediation: "1. Move all API keys from config files to AWS Secrets Manager or Parameter Store.\n2. Use IAM roles instead of API keys where possible.\n3. Scan all S3 buckets for .env and config files with Amazon Macie.\n4. Implement S3 bucket policies that block public access to config file extensions.\n5. Add pre-commit hooks to prevent committing credentials.\n6. Rotate all exposed credentials immediately.",
          evidence: `Asset "${a.name}" has configuration storage: "${configFiles.substring(0, 200)}". Expected: encrypted secrets manager, not plaintext config files.`
        }));
    }
  }
  return findings;
};

const checkIAM059: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("rag") && !name.includes("retrieval")) continue;
    const searchPerms = meta(r, "searchPermissions") || meta(r, "indexAccess") || meta(r, "kendraPermissions") || "";
    if (!searchPerms) continue;
    const searchLower = searchPerms.toLowerCase();
    if (searchLower.includes("*") || searchLower.includes("all-indices") || searchLower.includes("unrestricted") || searchLower.includes("full-access")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `RAG agent has over-scoped search permissions across indices it does not need`, orgId, {
          impact: "A RAG (Retrieval-Augmented Generation) agent with broad search permissions can query indices containing data outside its authorized scope, including indices with PII, financial records, legal documents, or other tenants' data. Through prompt injection, an attacker could direct the agent to retrieve and expose sensitive documents from unrelated indices, bypassing data access controls.",
          remediation: "1. Restrict search permissions to specific index names or patterns relevant to the agent's task.\n2. Use attribute-based access control (ABAC) to scope queries by data classification.\n3. Implement Kendra/OpenSearch index-level access policies per agent.\n4. Add query-time filters that restrict results to the agent's authorized data scope.\n5. Monitor search queries for cross-index access patterns.\n6. Use separate indices per data classification level.",
          evidence: `Role "${r.name}" has search permissions: "${searchPerms.substring(0, 200)}". Expected: scoped to specific indices relevant to the agent's RAG task.`
        }));
    }
  }
  return findings;
};

const checkIAM060: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Identity/Roles") continue;
    const name = r.name.toLowerCase();
    if (!name.includes("agent") && !name.includes("ai")) continue;
    const permissions = meta(r, "permissions") || meta(r, "policyDocument") || "";
    const permLower = permissions.toLowerCase();
    if (permLower.includes("lambda:updatefunctioncode") || permLower.includes("lambda:updatefunction") ||
        permLower.includes("lambda:createfunction")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI Agent has Lambda code modification permissions — prompt injection could rewrite agent logic`, orgId, {
          impact: "An AI agent with lambda:UpdateFunctionCode or lambda:CreateFunction permissions can modify its own Lambda function code (or create new functions) through prompt injection. An attacker could inject a prompt that instructs the agent to overwrite its own code with a backdoor, deploy a cryptominer, or create a reverse shell. This represents a critical privilege escalation from AI prompt injection to arbitrary code execution.",
          remediation: "1. Remove lambda:UpdateFunctionCode and lambda:CreateFunction from the agent's IAM policy.\n2. Use separate CI/CD pipelines for Lambda deployment — never allow runtime self-modification.\n3. Implement AWS Lambda code signing to prevent unauthorized code changes.\n4. Add an SCP that denies Lambda code modification from agent roles.\n5. Enable CloudTrail alerts for UpdateFunctionCode events from non-CI/CD identities.\n6. Use Lambda function URLs with IAM auth instead of direct invoke permissions.",
          evidence: `Role "${r.name}" has Lambda code permissions: "${permissions.substring(0, 200)}". This allows the agent to modify or create Lambda functions, enabling self-modification attacks.`
        }));
    }
  }
  return findings;
};

// --- NET-061 to NET-075: Network Security ---

const checkNET061: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Vector Storage") continue;
    if (r.exposure === "Public") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Vector database control plane exposed to 0.0.0.0/0 (Public Internet)`, orgId, {
          impact: "A publicly exposed vector database (Pinecone, Weaviate, Milvus) control plane allows anyone on the internet to query, modify, or delete vector embeddings. Attackers can extract proprietary embeddings to reconstruct sensitive training data, poison the vector index with adversarial embeddings to manipulate RAG results, or delete the entire index causing a denial of service for AI applications.",
          remediation: "1. Restrict the vector database security group/firewall to allow only private VPC CIDR ranges.\n2. Deploy the vector DB behind a VPC endpoint or Private Link.\n3. Enable authentication and API key requirements on the vector database.\n4. Implement IP allowlisting to restrict access to known application subnets.\n5. Set up network flow logs to monitor access patterns to the vector DB.\n6. Consider using managed vector DB services with built-in network isolation.",
          evidence: `Vector store "${r.name}" (${r.type}) has exposure="${r.exposure}". Source: ${r.source}. Expected: Private with VPC-only access.`
        }));
    }
    const networkAccess = meta(r, "networkAccess") || meta(r, "firewallRules") || meta(r, "accessPolicy") || "";
    if (networkAccess && (networkAccess.includes("0.0.0.0/0") || networkAccess.includes("public") || networkAccess.includes("open"))) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Vector database network access allows public ingress: ${networkAccess.substring(0, 80)}`, orgId, {
          impact: "A publicly accessible vector database exposes all stored embeddings and metadata to unauthorized access, enabling data exfiltration and index poisoning attacks.",
          remediation: "1. Remove 0.0.0.0/0 from security group inbound rules.\n2. Restrict access to specific VPC CIDR ranges.\n3. Enable VPC endpoints for private connectivity.\n4. Implement network ACLs as an additional layer of defense.",
          evidence: `Vector store "${r.name}" has network access: "${networkAccess.substring(0, 200)}". Expected: restricted to private subnets.`
        }));
    }
  }
  return findings;
};

const checkNET062: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Inference Endpoints" && r.category !== "Vector Storage" && r.category !== "Development") continue;
    const vpcPeering = meta(r, "vpcPeering") || meta(r, "peeringConfig") || meta(r, "networkConfig") || "";
    if (!vpcPeering) continue;
    const peerLower = vpcPeering.toLowerCase();
    if (peerLower.includes("corporate") || peerLower.includes("full-vpc") || peerLower.includes("unrestricted") || peerLower.includes("0.0.0.0")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI cluster peered with entire Corporate VPC instead of restricted AI Sandbox subnet`, orgId, {
          impact: "VPC peering with the entire corporate network gives the AI inference cluster bidirectional network access to all corporate resources including databases, internal APIs, and management planes. If the AI cluster is compromised through prompt injection or model exploitation, attackers can pivot to attack any system in the corporate VPC, bypassing perimeter security controls.",
          remediation: "1. Replace full VPC peering with subnet-level peering to a dedicated 'AI Sandbox' subnet.\n2. Implement Transit Gateway with route table segmentation for AI workloads.\n3. Use Security Groups to restrict traffic to only necessary ports and protocols.\n4. Deploy Network ACLs to enforce subnet-level isolation.\n5. Monitor VPC Flow Logs for unexpected cross-subnet traffic.\n6. Implement micro-segmentation using AWS Firewall Manager or equivalent.",
          evidence: `Resource "${r.name}" (${r.category}) has VPC peering configuration: "${vpcPeering.substring(0, 200)}". Expected: restricted to AI Sandbox subnet.`
        }));
    }
  }
  return findings;
};

const checkNET063: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Vector Storage" && r.category !== "AI Agents") continue;
    const protocol = meta(r, "connectionProtocol") || meta(r, "transport") || meta(r, "endpoint") || "";
    if (!protocol) continue;
    const protoLower = protocol.toLowerCase();
    if (protoLower.includes("http:") || protoLower.includes("port 80") || protoLower.includes("unencrypted") || protoLower.includes("plaintext")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Communication between LLM Agent and Vector Database uses unencrypted HTTP instead of HTTPS`, orgId, {
          impact: "Unencrypted HTTP communication between the LLM agent and vector database exposes query embeddings and retrieved documents to network sniffing attacks. An attacker with network access can intercept the query vectors to understand what users are asking, capture retrieved context documents that may contain sensitive information, and perform man-in-the-middle attacks to inject malicious context into RAG responses.",
          remediation: "1. Enforce HTTPS (TLS 1.2+) for all vector database connections.\n2. Update the vector DB client configuration to use port 443 with TLS.\n3. Deploy TLS certificates from ACM or Let's Encrypt for the vector DB endpoint.\n4. Block port 80 at the security group level for vector DB instances.\n5. Implement mutual TLS (mTLS) for agent-to-vector-DB authentication.\n6. Monitor network traffic for any cleartext HTTP connections to vector stores.",
          evidence: `Resource "${r.name}" has connection protocol: "${protocol}". Expected: HTTPS/TLS encrypted transport on port 443.`
        }));
    }
  }
  return findings;
};

const checkNET064: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Vector Storage" && r.category !== "Knowledge Bases") continue;
    const tenantIsolation = meta(r, "tenantIsolation") || meta(r, "multiTenant") || meta(r, "indexSharing") || "";
    if (!tenantIsolation) continue;
    const isoLower = tenantIsolation.toLowerCase();
    if (isoLower.includes("shared") || isoLower.includes("multi-tenant") || isoLower.includes("no-filter") || isoLower.includes("disabled")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Multiple tenants share same vector index without metadata filtering enforcement`, orgId, {
          impact: "Storing multiple tenants' data in the same vector index without enforced metadata filtering allows cross-tenant data leakage. A user from Tenant A can craft queries that retrieve embeddings belonging to Tenant B, exposing confidential business data, trade secrets, or PII. This violates data isolation requirements and may breach contractual obligations and data protection regulations.",
          remediation: "1. Implement mandatory metadata filtering on all vector queries with tenant ID.\n2. Use separate vector indices or namespaces per tenant for strong isolation.\n3. Deploy application-level tenant filtering that cannot be bypassed.\n4. Add server-side enforcement of tenant context in the vector DB proxy.\n5. Audit query logs for cross-tenant data access attempts.\n6. Consider using vector DB features like Pinecone namespaces for logical isolation.",
          evidence: `Resource "${r.name}" has tenant isolation: "${tenantIsolation}". Expected: per-tenant indices or mandatory metadata filtering.`
        }));
    }
  }
  return findings;
};

const checkNET065: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Development" && r.category !== "Inference Endpoints") continue;
    const name = r.name.toLowerCase();
    const type = r.type.toLowerCase();
    if (!name.includes("edge") && !type.includes("edge")) continue;
    const ports = meta(r, "openPorts") || meta(r, "sshAccess") || meta(r, "networkPorts") || "";
    if (!ports) continue;
    const portsLower = ports.toLowerCase();
    if (portsLower.includes("22") || portsLower.includes("ssh") || portsLower.includes("unauthenticated") || portsLower.includes("open")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Edge deployment has open SSH (port 22) or unauthenticated local endpoints`, orgId, {
          impact: "Open SSH access on SageMaker Edge Manager deployments allows direct remote access to edge AI devices, which typically run in less-secured environments (factories, retail, IoT). An attacker can access the model weights, modify inference logic, intercept prediction data, or use the device as a pivot point into the corporate network through its VPN or WAN connection.",
          remediation: "1. Disable SSH access and use AWS Systems Manager Session Manager for remote access.\n2. Close port 22 in the device's firewall/security group.\n3. Implement certificate-based authentication for any local endpoints.\n4. Enable SageMaker Edge Agent's built-in authentication mechanisms.\n5. Deploy network segmentation to isolate edge devices from production networks.\n6. Monitor for unauthorized SSH login attempts on edge devices.",
          evidence: `Resource "${r.name}" has open ports/access: "${ports.substring(0, 200)}". Expected: no SSH, authenticated endpoints only.`
        }));
    }
  }
  return findings;
};

const checkNET066: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    if (a.category !== "Inference Endpoints" && a.category !== "Custom Models" && a.category !== "AI Agents") continue;
    const outboundData = meta(a, "outboundData") || meta(a, "dataTransfer") || meta(a, "egressVolume") || "";
    if (!outboundData) continue;
    const outLower = outboundData.toLowerCase();
    if (outLower.includes("anomal") || outLower.includes("high") || outLower.includes(">1gb") || outLower.includes("exfil") || outLower.includes("unknown-ip")) {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `Anomalous outbound data transfer detected from AI model instance: ${outboundData.substring(0, 80)}`, orgId, {
          impact: "An AI model instance sending large volumes of data (>1GB) to unknown external IPs is a strong indicator of model weight exfiltration, training data theft, or a compromised instance being used for data staging. Proprietary model weights represent significant intellectual property investment, and their theft enables competitors or attackers to replicate your AI capabilities without the training cost.",
          remediation: "1. Investigate the destination IP and determine if it is authorized.\n2. Implement VPC Flow Log analysis for outbound data transfer anomalies.\n3. Set up AWS GuardDuty or equivalent for automated exfiltration detection.\n4. Restrict outbound network access from AI instances to approved endpoints only.\n5. Deploy Data Loss Prevention (DLP) on egress traffic from AI subnets.\n6. Implement bandwidth throttling on AI instance outbound connections.",
          evidence: `Asset "${a.name}" has outbound data indicator: "${outboundData.substring(0, 200)}". Expected: normal traffic patterns to approved endpoints.`
        }));
    }
  }
  return findings;
};

const checkNET067: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    if (a.category !== "Inference Endpoints" && a.category !== "Orchestration" && a.category !== "AI Agents") continue;
    const tlsVersion = meta(a, "tlsVersion") || meta(a, "sslVersion") || meta(a, "minTlsVersion") || "";
    if (!tlsVersion) continue;
    const tlsLower = tlsVersion.toLowerCase();
    if (tlsLower.includes("1.0") || tlsLower.includes("1.1") || tlsLower.includes("ssl") || tlsLower.includes("legacy")) {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `AI service endpoint supports legacy TLS ${tlsVersion} — should enforce TLS 1.2+`, orgId, {
          impact: "TLS 1.0 and 1.1 have known vulnerabilities (POODLE, BEAST, CRIME) that allow attackers to decrypt intercepted traffic. AI service endpoints transmitting prompts, model responses, and authentication tokens over weak TLS are vulnerable to eavesdropping. Compliance frameworks (PCI DSS, NIST) require TLS 1.2 as the minimum version.",
          remediation: "1. Configure the AI endpoint to enforce minimum TLS 1.2.\n2. Disable TLS 1.0 and 1.1 in the load balancer/API gateway configuration.\n3. Use AWS ALB or CloudFront security policies that enforce TLS 1.2+.\n4. Update client libraries to support TLS 1.2/1.3.\n5. Scan all AI endpoints with SSL Labs or equivalent for TLS compliance.\n6. Implement TLS 1.3 where possible for improved performance and security.",
          evidence: `Asset "${a.name}" supports TLS version: "${tlsVersion}". Expected: TLS 1.2 or higher enforced.`
        }));
    }
  }
  return findings;
};

const checkNET068: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Orchestration" && r.category !== "Inference Endpoints" && r.category !== "AI Agents") continue;
    const wafStatus = meta(r, "wafEnabled") || meta(r, "waf") || meta(r, "webFirewall") || "";
    if (!wafStatus) continue;
    const wafLower = wafStatus.toLowerCase();
    if (wafLower === "false" || wafLower === "disabled" || wafLower === "none" || wafLower === "no") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI Gateway/Prompt Gateway missing Web Application Firewall (WAF) protection`, orgId, {
          impact: "An AI Gateway (Kong, Apigee, custom proxy) without WAF protection is vulnerable to basic SQL injection, XSS, and prompt injection attacks embedded in HTTP request payloads. Attackers can bypass input validation, inject malicious prompts, extract system prompts, or exploit the gateway itself to gain access to backend AI services and model endpoints.",
          remediation: "1. Deploy AWS WAF, Azure WAF, or Cloudflare WAF in front of the AI Gateway.\n2. Configure WAF rules for SQL injection and XSS detection on prompt payloads.\n3. Add custom WAF rules for common prompt injection patterns.\n4. Enable WAF logging to capture blocked requests for analysis.\n5. Implement rate limiting rules in the WAF to prevent abuse.\n6. Use managed rule sets (OWASP Top 10) as a baseline protection layer.",
          evidence: `Resource "${r.name}" has WAF status: "${wafStatus}". Expected: WAF enabled with AI-specific rule sets.`
        }));
    }
  }
  return findings;
};

const checkNET069: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Vector Storage" && r.category !== "Training Data") continue;
    const backupExposure = meta(r, "backupExposure") || meta(r, "snapshotAccess") || meta(r, "backupPublic") || "";
    if (!backupExposure) continue;
    const backLower = backupExposure.toLowerCase();
    if (backLower.includes("public") || backLower.includes("open") || backLower.includes("world-readable") || backLower.includes("unprotected")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Vector database backup/snapshot stored in publicly readable storage`, orgId, {
          impact: "Publicly accessible vector database backups expose the entire vector index including all embeddings and metadata. Attackers can download the backup, reconstruct the original data using embedding inversion techniques, and extract sensitive information that was used to build the RAG system. This is equivalent to a full data breach of all documents indexed in the vector store.",
          remediation: "1. Remove public access from the S3 bucket/Azure Blob containing backups.\n2. Enable S3 Block Public Access at the account level.\n3. Encrypt backups with customer-managed KMS keys.\n4. Implement lifecycle policies to automatically delete old backups.\n5. Audit S3 bucket policies for any Allow * statements.\n6. Use AWS Backup with vault lock for immutable, access-controlled backups.",
          evidence: `Resource "${r.name}" has backup exposure: "${backupExposure}". Expected: encrypted, private-only access.`
        }));
    }
  }
  return findings;
};

const checkNET070: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Monitoring/Logs") continue;
    const dashboardAuth = meta(r, "dashboardAuth") || meta(r, "monitoringAuth") || meta(r, "authentication") || "";
    if (!dashboardAuth) continue;
    const authLower = dashboardAuth.toLowerCase();
    if (authLower.includes("none") || authLower.includes("unauthenticated") || authLower.includes("public") || authLower.includes("anonymous") || authLower === "false") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI cluster monitoring dashboard (Prometheus/Grafana) lacks authentication — publicly accessible`, orgId, {
          impact: "Unauthenticated monitoring dashboards for AI clusters expose GPU utilization metrics, model performance data, error rates, request patterns, and potentially query/response samples. This operational intelligence helps attackers understand the AI infrastructure, identify optimal attack windows, discover model weaknesses, and plan resource exhaustion attacks based on capacity data.",
          remediation: "1. Enable SSO/SAML authentication for Grafana and Prometheus.\n2. Place monitoring dashboards behind a VPN or bastion host.\n3. Implement RBAC to restrict dashboard access by team role.\n4. Enable MFA for all monitoring dashboard accounts.\n5. Restrict network access to monitoring endpoints from approved IP ranges.\n6. Audit dashboard access logs for unauthorized viewing.",
          evidence: `Resource "${r.name}" has monitoring dashboard auth: "${dashboardAuth}". Expected: SSO/MFA-protected access.`
        }));
    }
  }
  return findings;
};

const checkNET071: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "AI Agents" && r.category !== "Orchestration") continue;
    const dbConnection = meta(r, "dbConnection") || meta(r, "databaseAccess") || meta(r, "connectionType") || "";
    if (!dbConnection) continue;
    const dbLower = dbConnection.toLowerCase();
    if (dbLower.includes("direct") || dbLower.includes("tcp") || dbLower.includes("no-proxy") || dbLower.includes("raw-sql")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI Agent connects directly to production SQL database without proxy or API layer`, orgId, {
          impact: "Direct database connections from AI agents bypass all application-level security controls including query validation, rate limiting, audit logging, and authorization checks. A prompt-injected agent with a direct database connection can execute arbitrary SQL including data exfiltration, modification, or deletion. Without a proxy layer, there is no centralized point to implement query filtering or connection pooling.",
          remediation: "1. Route all database access through an API layer or database proxy (RDS Proxy, PgBouncer).\n2. Implement a read-only database user for AI agent queries.\n3. Use parameterized queries exclusively — never raw SQL from agent output.\n4. Deploy a SQL firewall (e.g., DataSunrise, Imperva) to filter queries.\n5. Enable database audit logging for all AI agent connections.\n6. Implement connection-level rate limiting in the proxy.",
          evidence: `Resource "${r.name}" has database connection type: "${dbConnection}". Expected: proxied connection through API layer.`
        }));
    }
  }
  return findings;
};

const checkNET072: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    if (a.category !== "Inference Endpoints" && a.category !== "AI Agents") continue;
    const rateLimiting = meta(a, "rateLimiting") || meta(a, "rpmLimit") || meta(a, "throttling") || "";
    if (!rateLimiting) continue;
    const rlLower = rateLimiting.toLowerCase();
    if (rlLower === "none" || rlLower === "disabled" || rlLower === "false" || rlLower === "unlimited" || rlLower === "no") {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `AI inference endpoint lacks rate limiting (RPM cap) — vulnerable to token exhaustion DDoS`, orgId, {
          impact: "Without request-per-minute (RPM) rate limiting, an AI inference endpoint can be overwhelmed by automated requests that exhaust the model's token allocation, causing a denial of service for legitimate users. Token exhaustion attacks are particularly expensive because each request consumes billable API tokens. A sustained attack can generate thousands of dollars in compute costs while degrading service for all users.",
          remediation: "1. Implement RPM (requests per minute) and TPM (tokens per minute) rate limits per API key.\n2. Configure throttling policies in the API gateway (Kong, Apigee, AWS API Gateway).\n3. Set up AWS WAF rate-based rules to block excessive request sources.\n4. Implement token budget alerts and automatic cutoffs per user/tenant.\n5. Deploy auto-scaling with maximum instance limits to cap cost exposure.\n6. Use CloudFront or Cloudflare for DDoS protection at the edge.",
          evidence: `Asset "${a.name}" has rate limiting: "${rateLimiting}". Expected: configured RPM/TPM limits per client.`
        }));
    }
  }
  return findings;
};

const checkNET073: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Inference Endpoints" && r.category !== "Orchestration") continue;
    const k8sIngress = meta(r, "ingressConfig") || meta(r, "certManager") || meta(r, "tlsRotation") || "";
    if (!k8sIngress) continue;
    const ingressLower = k8sIngress.toLowerCase();
    if (ingressLower.includes("no-cert-manager") || ingressLower.includes("self-signed") || ingressLower.includes("expired") || ingressLower.includes("manual") || ingressLower === "disabled") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Kubernetes Ingress for AI model missing cert-manager for automatic SSL/TLS rotation`, orgId, {
          impact: "Without automatic certificate rotation (cert-manager), TLS certificates for AI model serving endpoints (KServe, Seldon) will eventually expire, causing service outages. Manual certificate management is error-prone and creates security gaps during rotation windows. Expired certificates may cause clients to fall back to insecure connections or bypass certificate validation entirely.",
          remediation: "1. Install cert-manager in the Kubernetes cluster (kubectl apply -f cert-manager.yaml).\n2. Configure a ClusterIssuer with Let's Encrypt or ACM Private CA.\n3. Add cert-manager annotations to the Ingress resource for automatic TLS.\n4. Set up certificate expiry monitoring and alerting.\n5. Implement mutual TLS (mTLS) with Istio or Linkerd for service mesh security.\n6. Audit all Ingress resources for TLS configuration compliance.",
          evidence: `Resource "${r.name}" has ingress/cert config: "${k8sIngress}". Expected: cert-manager with automatic SSL/TLS rotation.`
        }));
    }
  }
  return findings;
};

const checkNET074: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    if (a.category !== "Inference Endpoints" && a.category !== "Custom Models") continue;
    const environment = meta(a, "environment") || meta(a, "stage") || meta(a, "vpcEnvironment") || "";
    if (!environment) continue;
    const envLower = environment.toLowerCase();
    const isDev = envLower === "dev" || envLower === "development" || envLower === "staging" || envLower === "test";
    if (!isDev) continue;
    const crossVpcAccess = meta(a, "crossVpcAccess") || meta(a, "callerEnvironment") || meta(a, "accessSources") || "";
    if (!crossVpcAccess) continue;
    const accessLower = crossVpcAccess.toLowerCase();
    if (accessLower.includes("prod") || accessLower.includes("production")) {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `Dev VPC model being queried by production applications — environment bleed detected`, orgId, {
          impact: "A production application querying a model in the development VPC creates environment bleed, where production traffic depends on unstable, untested infrastructure. Dev models may have weaker guardrails, different training data, and no SLA. Additionally, production request data (potentially containing PII) flows into the less-secure dev environment, violating data segregation policies.",
          remediation: "1. Implement network segmentation to prevent cross-VPC model invocation.\n2. Use separate AWS accounts for dev and prod AI workloads.\n3. Deploy Service Control Policies (SCPs) to block cross-environment access.\n4. Implement resource tagging and IAM conditions to enforce environment boundaries.\n5. Set up VPC Flow Log monitoring for cross-environment traffic.\n6. Use model registry promotion workflows to move models from dev to prod properly.",
          evidence: `Asset "${a.name}" is in environment "${environment}" but accessed from: "${crossVpcAccess}". Expected: no cross-environment model inference.`
        }));
    }
  }
  return findings;
};

const checkNET075: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "AI Agents" && r.category !== "Orchestration") continue;
    const webhookValidation = meta(r, "webhookValidation") || meta(r, "signatureVerification") || meta(r, "webhookAuth") || "";
    if (!webhookValidation) continue;
    const whLower = webhookValidation.toLowerCase();
    if (whLower === "none" || whLower === "disabled" || whLower === "false" || whLower === "no" || whLower.includes("missing")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI Agent webhooks do not validate signature headers — vulnerable to spoofed requests`, orgId, {
          impact: "AI agent webhooks (from Slack, GitHub, etc.) that don't validate the request signature header accept spoofed requests from any source. An attacker can craft webhook payloads that trigger the AI agent to perform unauthorized actions, execute arbitrary prompts, or process malicious data. This is a direct prompt injection vector that bypasses the application's authentication layer.",
          remediation: "1. Implement HMAC signature verification for all incoming webhook requests.\n2. Validate the X-Hub-Signature-256 (GitHub) or X-Slack-Signature header.\n3. Reject requests with missing, expired, or invalid signatures.\n4. Implement request timestamp validation to prevent replay attacks.\n5. Restrict webhook source IPs to known provider IP ranges.\n6. Log all webhook invocations with source validation status for audit.",
          evidence: `Resource "${r.name}" has webhook signature validation: "${webhookValidation}". Expected: HMAC signature verification enabled.`
        }));
    }
  }
  return findings;
};

// --- SUP-076 to SUP-090: Supply Chain & Data Integrity ---

const checkSUP076: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Training Data" && r.category !== "Feature Store") continue;
    const integrity = meta(r, "integrityHash") || meta(r, "sha256") || meta(r, "checksum") || meta(r, "dataHash") || "";
    if (!integrity) continue;
    const iLower = integrity.toLowerCase();
    if (iLower === "none" || iLower === "missing" || iLower === "false" || iLower === "disabled") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Training dataset lacks cryptographic hash (SHA-256) for tamper verification`, orgId, {
          impact: "Without cryptographic hashes on training data, an attacker who gains access to the data store can silently modify training samples to inject backdoors, bias the model, or poison outputs. Data poisoning attacks are extremely difficult to detect post-training and can cause the model to produce targeted wrong answers on specific inputs while appearing normal on general benchmarks.",
          remediation: "1. Generate SHA-256 hashes for all training dataset files and store in a manifest.\n2. Implement hash verification in the training pipeline before job execution.\n3. Use S3 Object Lock or equivalent to prevent unauthorized modifications.\n4. Deploy a data integrity monitoring system that alerts on hash mismatches.\n5. Sign dataset manifests using AWS KMS or GPG for non-repudiation.\n6. Maintain an immutable audit log of all dataset modifications.",
          evidence: `Dataset "${r.name}" has integrity hash status: "${integrity}". Expected: SHA-256 hash for all training data files.`
        }));
    }
  }
  return findings;
};

const checkSUP077: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Knowledge Bases" && r.category !== "Training Data") continue;
    const piiScan = meta(r, "piiScanResult") || meta(r, "piiDetected") || meta(r, "sensitiveData") || "";
    if (!piiScan) continue;
    const piiLower = piiScan.toLowerCase();
    if (piiLower.includes("detected") || piiLower.includes("found") || piiLower.includes("true") || piiLower.includes("ssn") || piiLower.includes("email") || piiLower.includes("pii")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `PII detected in RAG Knowledge Base source documents: ${piiScan.substring(0, 80)}`, orgId, {
          impact: "Clear-text customer PII (SSNs, emails, phone numbers, addresses) indexed in RAG knowledge bases will be retrieved and included in LLM responses. Any user who asks the right question can extract PII from the knowledge base through the AI interface, creating an uncontrolled data disclosure channel that bypasses traditional access controls and DLP systems.",
          remediation: "1. Run Amazon Macie or equivalent DSPM tool on all knowledge base source documents.\n2. Implement PII redaction/masking before indexing documents into the knowledge base.\n3. Deploy real-time PII detection on RAG retrieval results before sending to the LLM.\n4. Establish a data classification policy for knowledge base content.\n5. Use synthetic or anonymized data for non-production knowledge bases.\n6. Implement access controls on the knowledge base that match the sensitivity of the data.",
          evidence: `Knowledge base "${r.name}" has PII scan result: "${piiScan.substring(0, 200)}". Expected: no clear-text PII in indexed content.`
        }));
    }
  }
  return findings;
};

const checkSUP078: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Training Data" && r.category !== "Feature Store") continue;
    const dataCombination = meta(r, "combinedDatasets") || meta(r, "dataJoins") || meta(r, "linkedSources") || "";
    if (!dataCombination) continue;
    const combLower = dataCombination.toLowerCase();
    if (combLower.includes("pii-risk") || combLower.includes("re-identification") || combLower.includes("high-risk") || combLower.includes("toxic-combination")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Toxic data combination detected: individually safe datasets create high-risk PII profile when joined`, orgId, {
          impact: "Combining two individually anonymized datasets can create re-identification risks. For example, joining a dataset of ZIP codes + birth dates + gender with a medical records dataset can uniquely identify 87% of the US population (Sweeney, 2000). AI agents with access to combined datasets can inadvertently expose re-identified individuals through their responses.",
          remediation: "1. Conduct a Privacy Impact Assessment (PIA) before combining datasets.\n2. Apply k-anonymity or differential privacy to combined datasets.\n3. Implement data combination policies that require review for PII risk.\n4. Use synthetic data generation for training when real data combination is risky.\n5. Deploy re-identification risk scoring on combined datasets.\n6. Maintain a data lineage graph that tracks all dataset combinations.",
          evidence: `Dataset "${r.name}" has data combination risk: "${dataCombination.substring(0, 200)}". Expected: privacy impact assessment for combined datasets.`
        }));
    }
  }
  return findings;
};

const checkSUP079: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Knowledge Bases") continue;
    const writeAccess = meta(r, "unauthorizedWrite") || meta(r, "writeAccess") || meta(r, "modifiedBy") || "";
    if (!writeAccess) continue;
    const writeLower = writeAccess.toLowerCase();
    if (writeLower.includes("unauthorized") || writeLower.includes("non-curator") || writeLower.includes("unknown") || writeLower.includes("violation")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Unauthorized write operation on Knowledge Base by non-Data Curator identity`, orgId, {
          impact: "Unauthorized modifications to a knowledge base allow injection of false, misleading, or malicious content that the RAG system will retrieve and present as fact. An attacker who can write to the knowledge base can manipulate AI outputs for all users by inserting carefully crafted documents that override correct information, inject prompt injections, or introduce backdoor triggers.",
          remediation: "1. Restrict Write/Put permissions on the knowledge base to the 'Data Curator' role only.\n2. Implement resource-based policies on the knowledge base storage (S3, OpenSearch).\n3. Enable CloudTrail/audit logging for all write operations on the knowledge base.\n4. Deploy an approval workflow for knowledge base content changes.\n5. Implement content versioning with rollback capability.\n6. Set up alerts for any write operations from non-approved identities.",
          evidence: `Knowledge base "${r.name}" has unauthorized write access: "${writeAccess.substring(0, 200)}". Expected: writes restricted to Data Curator role.`
        }));
    }
  }
  return findings;
};

const checkSUP080: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Training Data") continue;
    const copyrightStatus = meta(r, "copyrightCheck") || meta(r, "licenseStatus") || meta(r, "optOutList") || "";
    if (!copyrightStatus) continue;
    const copyLower = copyrightStatus.toLowerCase();
    if (copyLower.includes("restricted") || copyLower.includes("opt-out") || copyLower.includes("copyrighted") || copyLower.includes("violation") || copyLower.includes("unlicensed")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Training data contains material from opt-out lists or restricted copyright repositories`, orgId, {
          impact: "Using copyrighted material from opt-out lists or restricted repositories for AI training exposes the organization to copyright infringement lawsuits (NYT v. OpenAI, Getty v. Stability AI). Statutory damages can reach $150,000 per infringed work. Additionally, the EU AI Act requires disclosure of copyrighted training data, and failure to comply results in significant fines.",
          remediation: "1. Audit all training data sources against known opt-out lists and copyright databases.\n2. Implement automated copyright detection using content fingerprinting.\n3. Remove any data from restricted repositories or news archives.\n4. Maintain a provenance record for all training data with license information.\n5. Use only Creative Commons, public domain, or properly licensed data.\n6. Implement a legal review process for new training data sources.",
          evidence: `Dataset "${r.name}" has copyright status: "${copyrightStatus.substring(0, 200)}". Expected: all data properly licensed with no opt-out violations.`
        }));
    }
  }
  return findings;
};

const checkSUP081: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    if (a.category !== "Custom Models" && a.category !== "Training Data") continue;
    const dataOrigin = meta(a, "dataOrigin") || meta(a, "dataSource") || meta(a, "sourceUrl") || "";
    if (!dataOrigin) continue;
    const originLower = dataOrigin.toLowerCase();
    if (originLower.includes("http://") || originLower.includes("public-url") || originLower.includes("unverified") || originLower.includes("third-party") || originLower.includes("external-bucket")) {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `Model fine-tuned using data from untrusted/unverified source: ${dataOrigin.substring(0, 80)}`, orgId, {
          impact: "Fine-tuning a model with data from public URLs or unverified third-party buckets introduces supply chain risk. The data may have been tampered with, contain adversarial examples designed to create backdoors, or include malicious content that poisons the model. An attacker controlling the data source can influence model behavior without accessing the training infrastructure directly.",
          remediation: "1. Restrict fine-tuning data sources to approved internal repositories only.\n2. Implement data provenance verification for all external data.\n3. Hash and validate data integrity before use in training pipelines.\n4. Scan external data for adversarial patterns and anomalies.\n5. Use IAM policies to block training jobs that reference external URLs.\n6. Maintain an approved data sources registry with security assessments.",
          evidence: `Asset "${a.name}" has data origin: "${dataOrigin.substring(0, 200)}". Expected: verified internal data source.`
        }));
    }
  }
  return findings;
};

const checkSUP082: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Training Data") continue;
    const phiStatus = meta(r, "phiDetected") || meta(r, "hipaaCompliance") || meta(r, "healthData") || "";
    if (!phiStatus) continue;
    const phiLower = phiStatus.toLowerCase();
    if (phiLower.includes("detected") || phiLower.includes("unmasked") || phiLower.includes("phi-present") || phiLower.includes("non-compliant")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Unmasked Protected Health Information (PHI) detected in AI training dataset`, orgId, {
          impact: "Using unmasked PHI in AI training violates HIPAA Privacy Rule (45 CFR 164.502) and can result in fines up to $1.9 million per violation category per year. PHI embedded in model weights through training cannot be fully removed and may be extracted through model inversion attacks. Healthcare AI models trained on PHI create ongoing breach liability for the entire model lifecycle.",
          remediation: "1. Implement automated PHI detection and de-identification before training.\n2. Use the HIPAA Safe Harbor method to remove all 18 PHI identifiers.\n3. Apply differential privacy techniques during model training.\n4. Obtain a HIPAA Expert Determination for any remaining quasi-identifiers.\n5. Ensure a Business Associate Agreement (BAA) covers AI training activities.\n6. Conduct a HIPAA risk assessment for all healthcare AI training pipelines.",
          evidence: `Dataset "${r.name}" has PHI status: "${phiStatus.substring(0, 200)}". Expected: fully de-identified per HIPAA Safe Harbor.`
        }));
    }
  }
  return findings;
};

const checkSUP083: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Development") continue;
    const type = r.type.toLowerCase();
    if (!type.includes("training") && !type.includes("job")) continue;
    const trainingMetrics = meta(r, "trainingMetrics") || meta(r, "lossAnomaly") || meta(r, "accuracyShift") || "";
    if (!trainingMetrics) continue;
    const metricsLower = trainingMetrics.toLowerCase();
    if (metricsLower.includes("anomal") || metricsLower.includes("spike") || metricsLower.includes("abrupt") || metricsLower.includes("poison") || metricsLower.includes("backdoor")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Anomalous training metrics detected — potential data poisoning or backdoor insertion: ${trainingMetrics.substring(0, 80)}`, orgId, {
          impact: "Abrupt shifts in training loss or accuracy curves are indicators of data poisoning or backdoor insertion attacks. In a poisoning attack, the adversary modifies a small fraction of training data to cause the model to misclassify specific inputs. Backdoor attacks embed hidden triggers that cause targeted misbehavior when activated, while the model performs normally on clean inputs.",
          remediation: "1. Implement automated training metric monitoring with anomaly detection.\n2. Compare training curves against baseline models for unexpected deviations.\n3. Use spectral signature analysis to detect poisoned data samples.\n4. Validate model behavior on a held-out clean test set after each epoch.\n5. Implement data sanitization (e.g., STRIP, Activation Clustering) to detect backdoors.\n6. Quarantine and investigate any training jobs with anomalous metrics.",
          evidence: `Training job "${r.name}" has metric anomaly: "${trainingMetrics.substring(0, 200)}". Expected: smooth convergence without abrupt shifts.`
        }));
    }
  }
  return findings;
};

const checkSUP084: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Training Data") continue;
    const dataType = meta(r, "dataType") || meta(r, "syntheticFlag") || meta(r, "dataClassification") || "";
    if (!dataType) continue;
    const dtLower = dataType.toLowerCase();
    if (dtLower.includes("real") || dtLower.includes("production")) {
      const syntheticRequired = meta(r, "syntheticRequired") || meta(r, "policyMandate") || "";
      const srLower = syntheticRequired.toLowerCase();
      if (srLower.includes("true") || srLower.includes("required") || srLower.includes("mandated")) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Real production data used for training where synthetic data is mandated by policy`, orgId, {
            impact: "Using real production data for AI training when organizational policy mandates synthetic data violates data governance controls. Production data contains live PII, business-sensitive information, and regulated data that should not exist in training environments. This creates regulatory compliance violations (GDPR, CCPA), increases breach surface, and violates the principle of data minimization.",
            remediation: "1. Replace production data with synthetic data generated using approved tools.\n2. Use differential privacy or federated learning as alternatives to raw data.\n3. Implement automated checks in the training pipeline to verify data classification.\n4. Block training job submission when data source is tagged as 'production'.\n5. Deploy a synthetic data generation pipeline using tools like Gretel, Mostly AI, or SDV.\n6. Update the data governance policy to include AI training data requirements.",
            evidence: `Dataset "${r.name}" uses data type: "${dataType}" but synthetic data policy: "${syntheticRequired}". Expected: synthetic data per organizational mandate.`
          }));
      }
    }
  }
  return findings;
};

const checkSUP085: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Orchestration" && r.category !== "Training Data") continue;
    const dataFlow = meta(r, "dataFlow") || meta(r, "syncDirection") || meta(r, "pipelineSource") || "";
    if (!dataFlow) continue;
    const flowLower = dataFlow.toLowerCase();
    if ((flowLower.includes("prod") && flowLower.includes("dev")) || flowLower.includes("prod-to-dev") || flowLower.includes("shadow-sync") || flowLower.includes("ad-hoc")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Shadow data sync detected: production data being moved to dev for ad-hoc AI experiments`, orgId, {
          impact: "Automated scripts moving production database data to development S3 buckets for AI experiments bypass all data governance controls. Development environments typically have weaker access controls, no audit logging, and broader user access. Production data in dev environments creates an uncontrolled data sprawl that increases breach surface and violates data segregation requirements.",
          remediation: "1. Block automated production-to-development data transfers via SCPs.\n2. Implement a formal data provisioning process for AI training data.\n3. Use Data Pipeline approvals that require data owner sign-off.\n4. Deploy VPC endpoint policies that prevent cross-environment S3 access.\n5. Set up GuardDuty or equivalent to detect unusual data movement patterns.\n6. Provide approved synthetic data alternatives for development experiments.",
          evidence: `Resource "${r.name}" has data flow: "${dataFlow.substring(0, 200)}". Expected: no unsanctioned production-to-dev data movement.`
        }));
    }
  }
  return findings;
};

const checkSUP086: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Training Data" && r.category !== "Feature Store") continue;
    const fairnessMetadata = meta(r, "fairnessMetadata") || meta(r, "demographicParity") || meta(r, "biasMetadata") || "";
    if (!fairnessMetadata) continue;
    const fmLower = fairnessMetadata.toLowerCase();
    if (fmLower === "none" || fmLower === "missing" || fmLower === "false" || fmLower === "absent") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Dataset lacks required fairness/bias metadata (Demographic Parity metrics)`, orgId, {
          impact: "Datasets used for high-risk AI decision-making without fairness metadata cannot be audited for bias. The EU AI Act requires bias testing for high-risk systems, and EEOC/CFPB guidelines mandate fairness assessments for AI used in employment and credit decisions. Without demographic parity metrics, the organization cannot demonstrate compliance or detect discriminatory model behavior.",
          remediation: "1. Compute and attach Demographic Parity metrics to the dataset metadata.\n2. Calculate Equalized Odds, Predictive Parity, and Disparate Impact ratios.\n3. Document the demographic composition of the training data.\n4. Implement automated fairness metadata generation in the data pipeline.\n5. Require fairness metadata as a mandatory field in the data catalog.\n6. Establish threshold values for fairness metrics that trigger remediation.",
          evidence: `Dataset "${r.name}" has fairness metadata: "${fairnessMetadata}". Expected: Demographic Parity and fairness metrics documented.`
        }));
    }
  }
  return findings;
};

const checkSUP087: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Training Data" && r.category !== "Knowledge Bases") continue;
    const robotsTxt = meta(r, "robotsTxtCompliance") || meta(r, "noAiRespected") || meta(r, "scrapingCompliance") || "";
    if (!robotsTxt) continue;
    const rtLower = robotsTxt.toLowerCase();
    if (rtLower.includes("violated") || rtLower.includes("ignored") || rtLower.includes("non-compliant") || rtLower === "false") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI data collection violated robots.txt or "no-ai" metadata tags`, orgId, {
          impact: "Ignoring robots.txt directives and 'no-ai' metadata tags during data collection violates website terms of service, may constitute unauthorized access under CFAA, and creates copyright liability. Multiple lawsuits (Cohere, OpenAI, Anthropic) have cited robots.txt violations as evidence of willful infringement. This also damages the organization's reputation and industry relationships.",
          remediation: "1. Implement robots.txt parsing and compliance in all web scraping pipelines.\n2. Respect 'no-ai', 'noai', and 'X-Robots-Tag: noai' directives.\n3. Maintain an exclusion list of domains that have opted out of AI training.\n4. Deploy automated compliance checking before ingesting web-sourced data.\n5. Document data collection methodology for regulatory inquiries.\n6. Implement a takedown request process for content owners.",
          evidence: `Data source "${r.name}" has robots.txt compliance: "${robotsTxt}". Expected: full compliance with opt-out signals.`
        }));
    }
  }
  return findings;
};

const checkSUP088: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Orchestration" && r.category !== "Knowledge Bases" && r.category !== "Training Data") continue;
    const inputSanitization = meta(r, "inputSanitization") || meta(r, "pipelineSanitization") || meta(r, "injectionFilter") || "";
    if (!inputSanitization) continue;
    const sanLower = inputSanitization.toLowerCase();
    if (sanLower === "none" || sanLower === "disabled" || sanLower === "false" || sanLower === "missing") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Data pipeline feeds into Vector DB without sanitization for prompt injection seeds`, orgId, {
          impact: "Unsanitized data pipelines allow prompt injection payloads to be embedded in documents that are indexed into the vector database. When the RAG system retrieves these poisoned documents, the injection payload is included in the LLM context, potentially overriding system instructions, exfiltrating data, or causing the AI to perform unauthorized actions. This is an indirect prompt injection attack vector.",
          remediation: "1. Add an input sanitization step to the data pipeline before vector DB ingestion.\n2. Scan documents for known prompt injection patterns before indexing.\n3. Implement content security policies that strip executable instructions from documents.\n4. Use a dedicated prompt injection detection model on ingested content.\n5. Apply HTML/markdown stripping to remove embedded instructions.\n6. Monitor vector DB content for anomalous patterns indicating injection attempts.",
          evidence: `Pipeline "${r.name}" has input sanitization: "${inputSanitization}". Expected: active sanitization for prompt injection prevention.`
        }));
    }
  }
  return findings;
};

const checkSUP089: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Training Data" && r.category !== "Feature Store") continue;
    const datasheet = meta(r, "datasheet") || meta(r, "datasheetForDatasets") || meta(r, "provenance") || "";
    if (!datasheet) continue;
    const dsLower = datasheet.toLowerCase();
    if (dsLower === "none" || dsLower === "missing" || dsLower === "false" || dsLower === "absent") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Dataset in catalog lacks a formal "Datasheet for Datasets" (provenance, collection method, etc.)`, orgId, {
          impact: "Without a Datasheet for Datasets (Gebru et al., 2021), downstream users have no documentation of data provenance, collection methodology, preprocessing steps, intended use cases, known biases, or ethical considerations. This prevents informed decision-making about whether the dataset is appropriate for a given AI application, increases legal risk, and makes compliance audits impossible.",
          remediation: "1. Create a Datasheet following the Gebru et al. (2021) template for each dataset.\n2. Document data collection methodology, sources, and time period.\n3. Describe preprocessing, cleaning, and labeling procedures.\n4. List known biases, limitations, and recommended use cases.\n5. Include demographic composition and representation analysis.\n6. Make the datasheet a required field in the data catalog before datasets can be used for training.",
          evidence: `Dataset "${r.name}" has datasheet status: "${datasheet}". Expected: formal Datasheet for Datasets with provenance documentation.`
        }));
    }
  }
  return findings;
};

const checkSUP090: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category !== "Orchestration" && r.category !== "Training Data") continue;
    const name = r.name.toLowerCase();
    const type = r.type.toLowerCase();
    if (!type.includes("glue") && !type.includes("dataflow") && !type.includes("pipeline") && !type.includes("etl") && !name.includes("etl") && !name.includes("pipeline")) continue;
    const transferEncryption = meta(r, "transferEncryption") || meta(r, "inTransitEncryption") || meta(r, "tlsVersion") || "";
    if (!transferEncryption) continue;
    const teLower = transferEncryption.toLowerCase();
    if (teLower === "none" || teLower === "disabled" || teLower === "false" || teLower.includes("unencrypted") || teLower.includes("http") || teLower.includes("tls 1.0") || teLower.includes("tls 1.1")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `ETL job transfers AI training data over the network without TLS 1.2+ encryption`, orgId, {
          impact: "Training data transferred without TLS encryption is vulnerable to interception, modification, and injection by network-level attackers. An attacker with access to the network path can sniff sensitive training data (PII, proprietary information), inject poisoned data samples into the transfer stream, or redirect data to an unauthorized destination. This violates data-in-transit encryption requirements of GDPR, HIPAA, and SOC 2.",
          remediation: "1. Enable TLS 1.2+ encryption for all ETL job connections (Glue, Dataflow).\n2. Configure Glue jobs with 'RequireSSL' connection property.\n3. Use VPC endpoints to keep data transfers within the AWS network.\n4. Implement certificate validation to prevent MITM attacks.\n5. Monitor network traffic for any unencrypted data transfers from ETL jobs.\n6. Deploy AWS Config rule to enforce encryption on all Glue connections.",
          evidence: `ETL job "${r.name}" has transfer encryption: "${transferEncryption}". Expected: TLS 1.2+ for all data in transit.`
        }));
    }
  }
  return findings;
};

// --- COM-091 to COM-100: Compliance & Regulatory ---

const checkCOM091: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const riskLevel = meta(a, "riskLevel") || meta(a, "aiActRisk") || meta(a, "riskClassification") || "";
    if (!riskLevel) continue;
    const rlLower = riskLevel.toLowerCase();
    if (rlLower.includes("high") || rlLower.includes("critical")) {
      const hitl = meta(a, "hitl") || meta(a, "humanInTheLoop") || meta(a, "humanOversight") || "";
      const hitlLower = hitl.toLowerCase();
      if (!hitl || hitlLower === "none" || hitlLower === "false" || hitlLower === "disabled" || hitlLower === "missing") {
        findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
          `High-Risk AI system lacks designated Human-in-the-Loop (HITL) supervisor`, orgId, {
            impact: "The EU AI Act (Article 14) requires high-risk AI systems to have effective human oversight measures, including the ability for a human to understand, monitor, and override the system. Without a designated HITL supervisor, high-risk decisions (HR screening, credit scoring, medical triage) operate autonomously, creating legal non-compliance, potential discriminatory outcomes, and inability to intervene when the system misbehaves.",
            remediation: "1. Tag all high-risk AI systems with a designated HITL supervisor identity.\n2. Implement a real-time dashboard for the HITL supervisor to monitor decisions.\n3. Add a 'pause' or 'override' mechanism that the supervisor can invoke.\n4. Ensure the HITL has sufficient training and authority to override AI decisions.\n5. Log all HITL interventions for audit trail purposes.\n6. Schedule periodic reviews of HITL effectiveness per EU AI Act Article 14(4).",
            evidence: `Asset "${a.name}" is classified as "${riskLevel}" risk but HITL status: "${hitl || "not set"}". Expected: designated Human-in-the-Loop supervisor for all high-risk AI systems.`
          }));
      }
    }
  }
  return findings;
};

const checkCOM092: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const type = ((a as any).type || "").toLowerCase();
    const name = a.name.toLowerCase();
    if (!type.includes("generat") && !type.includes("image") && !type.includes("video") && !type.includes("audio") && !type.includes("diffusion") && !name.includes("generat") && !name.includes("dall") && !name.includes("stable-diffusion") && !name.includes("midjourney")) continue;
    const watermark = meta(a, "watermark") || meta(a, "syntheticWatermark") || meta(a, "c2paMetadata") || meta(a, "contentCredentials") || "";
    if (!watermark) continue;
    const wmLower = watermark.toLowerCase();
    if (wmLower === "none" || wmLower === "false" || wmLower === "disabled" || wmLower === "missing") {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `Generative AI model does not append machine-readable watermark to outputs`, orgId, {
          impact: "EU AI Act Article 50(2) requires providers of AI systems that generate synthetic audio, image, video, or text to mark the output in a machine-readable format and make it detectable as artificially generated. Failure to implement watermarking exposes the organization to regulatory fines, enables misuse of AI-generated content for deepfakes, misinformation, and fraud, and prevents content provenance verification.",
          remediation: "1. Integrate C2PA (Coalition for Content Provenance and Authenticity) metadata into generated outputs.\n2. Implement invisible watermarking using techniques like frequency-domain embedding.\n3. Add EXIF/XMP metadata tags indicating AI-generated content.\n4. Deploy a content credentials system for all generative AI outputs.\n5. Maintain a registry of generated content hashes for verification.\n6. Test watermark robustness against common manipulation (cropping, compression, screenshots).",
          evidence: `Generative model "${a.name}" has watermark status: "${watermark}". Expected: machine-readable watermark per EU AI Act Article 50.`
        }));
    }
  }
  return findings;
};

const checkCOM093: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const decisionType = meta(a, "decisionType") || meta(a, "legalEffect") || meta(a, "automatedDecision") || "";
    if (!decisionType) continue;
    const dtLower = decisionType.toLowerCase();
    if (dtLower.includes("legal") || dtLower.includes("loan") || dtLower.includes("credit") || dtLower.includes("employment") || dtLower.includes("insurance") || dtLower.includes("judicial")) {
      const auditLog = meta(a, "decisionAuditLog") || meta(a, "promptLogging") || meta(a, "auditTrail") || "";
      const alLower = auditLog.toLowerCase();
      if (!auditLog || alLower === "none" || alLower === "false" || alLower === "disabled" || alLower === "missing") {
        findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
          `AI system making legal-effect decisions does not log prompt, model version, and timestamp`, orgId, {
            impact: "GDPR Article 22 and the UK Data Act require that individuals not be subject to decisions based solely on automated processing that produce legal effects without adequate safeguards. Without logging the exact prompt, model version, and decision timestamp, the organization cannot demonstrate compliance, respond to Subject Access Requests (SARs), or explain decisions to regulators. This creates legal liability for every automated decision.",
            remediation: "1. Implement comprehensive decision audit logging that captures: prompt/input, model ID and version, timestamp, output/decision, confidence score.\n2. Store audit logs in an immutable, tamper-evident log store (e.g., CloudWatch Logs with KMS encryption).\n3. Retain decision logs for the legally mandated period (varies by jurisdiction).\n4. Implement a SAR response process that can retrieve decision explanations.\n5. Add model version tracking to all inference endpoints.\n6. Deploy automated compliance monitoring for decision logging completeness.",
            evidence: `Asset "${a.name}" makes "${decisionType}" decisions but audit log status: "${auditLog || "not set"}". Expected: full audit trail for all legal-effect decisions.`
          }));
      }
    }
  }
  return findings;
};

const checkCOM094: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const decisionType = meta(a, "decisionType") || meta(a, "automatedDecision") || meta(a, "legalEffect") || "";
    if (!decisionType) continue;
    const dtLower = decisionType.toLowerCase();
    if (dtLower.includes("automated") || dtLower.includes("legal") || dtLower.includes("binding") || dtLower.includes("consequential")) {
      const challengeMechanism = meta(a, "rightToChallenge") || meta(a, "humanReview") || meta(a, "appealProcess") || "";
      const cmLower = challengeMechanism.toLowerCase();
      if (!challengeMechanism || cmLower === "none" || cmLower === "false" || cmLower === "disabled" || cmLower === "missing") {
        findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
          `Automated AI decision workflow cannot be paused or challenged by a human user`, orgId, {
            impact: "The UK Data Act 2025 and GDPR Article 22(3) grant individuals the right to obtain human intervention, express their point of view, and contest automated decisions. An AI workflow that cannot be paused or challenged violates these rights and exposes the organization to enforcement action, compensation claims, and reputational damage. Without a challenge mechanism, erroneous decisions may persist without recourse.",
            remediation: "1. Implement a 'Request Human Review' button in the user-facing interface.\n2. Add a workflow pause mechanism that queues decisions for human review.\n3. Create an appeals process with defined SLAs for human review of contested decisions.\n4. Log all challenge requests and their outcomes for compliance reporting.\n5. Ensure the human reviewer has sufficient context (input, model reasoning, confidence) to make an informed decision.\n6. Train staff on the right-to-challenge process and regulatory requirements.",
            evidence: `Asset "${a.name}" makes "${decisionType}" decisions but challenge mechanism: "${challengeMechanism || "not set"}". Expected: ability to pause/challenge automated decisions.`
          }));
      }
    }
  }
  return findings;
};

const checkCOM095: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const purpose = meta(a, "purpose") || meta(a, "useCase") || meta(a, "modelPurpose") || "";
    const tags = JSON.stringify((a as any).tags || {}).toLowerCase();
    const purposeLower = purpose.toLowerCase();
    if (purposeLower.includes("behavior_tracking") || purposeLower.includes("social_credit") || purposeLower.includes("social_scoring") || purposeLower.includes("emotion_recognition") || tags.includes("social_credit") || tags.includes("behavior_tracking") || tags.includes("social_scoring")) {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `AI model tagged with prohibited practice: social scoring or behavior tracking`, orgId, {
          impact: "EU AI Act Article 5 explicitly prohibits AI systems that evaluate or classify natural persons based on their social behavior or personality characteristics (social scoring). This is classified as an 'Unacceptable Risk' AI practice. Deploying such systems exposes the organization to fines of up to €35 million or 7% of global annual turnover, whichever is higher. This also violates fundamental rights to dignity and non-discrimination.",
          remediation: "1. Immediately decommission any AI system tagged with social scoring or behavior tracking purposes.\n2. Conduct an audit of all AI systems to identify any that perform social scoring functions.\n3. Remove all training data and model artifacts associated with prohibited practices.\n4. Update the AI use case registry to flag prohibited practices for pre-deployment review.\n5. Implement automated tagging checks that block deployment of prohibited-purpose models.\n6. Report the finding to the AI Compliance Officer and legal team immediately.",
          evidence: `Asset "${a.name}" has purpose: "${purpose}" and tags containing prohibited practice indicators. EU AI Act Article 5 bans social scoring systems.`
        }));
    }
  }
  return findings;
};

const checkCOM096: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    if (a.category !== "Custom Models" && a.category !== "Inference Endpoints" && a.category !== "AI Agents") continue;
    const status = ((a as any).status || "").toLowerCase();
    if (status !== "active" && status !== "inservice" && status !== "deployed" && status !== "running") continue;
    const techDoc = meta(a, "technicalDocumentation") || meta(a, "conformityAssessment") || meta(a, "ceMarking") || meta(a, "modelCard") || "";
    if (!techDoc) continue;
    const tdLower = techDoc.toLowerCase();
    if (tdLower === "none" || tdLower === "missing" || tdLower === "false" || tdLower === "incomplete" || tdLower === "absent") {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `Production AI model lacks technical documentation or Conformity Assessment record`, orgId, {
          impact: "EU AI Act Article 11 requires providers of high-risk AI systems to draw up technical documentation before placing the system on the market. Article 43 requires a conformity assessment. Models in production without these documents are non-compliant from day one, creating ongoing regulatory liability. Regulators can order the system to be withdrawn from the market until documentation is completed.",
          remediation: "1. Create technical documentation per EU AI Act Annex IV requirements.\n2. Complete a Conformity Assessment for each production model.\n3. Generate and publish a Model Card (Mitchell et al., 2019) for each deployed model.\n4. Register the model in the EU database per Article 60.\n5. Establish a documentation lifecycle that updates with each model version.\n6. Block model promotion to production without completed documentation in the GRC module.",
          evidence: `Model "${a.name}" is in production (status: ${status}) but technical documentation: "${techDoc}". Expected: complete Conformity Assessment and technical documentation.`
        }));
    }
  }
  return findings;
};

const checkCOM097: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    if (a.category !== "AI Agents" && a.category !== "Inference Endpoints") continue;
    const userFacing = meta(a, "userFacing") || meta(a, "hasWebUI") || meta(a, "chatInterface") || "";
    if (!userFacing) continue;
    const ufLower = userFacing.toLowerCase();
    if (ufLower === "true" || ufLower === "yes" || ufLower.includes("web") || ufLower.includes("chat") || ufLower.includes("public")) {
      const disclosure = meta(a, "aiDisclosure") || meta(a, "transparencyNotice") || meta(a, "aiInteractionNotice") || "";
      const dLower = disclosure.toLowerCase();
      if (!disclosure || dLower === "none" || dLower === "false" || dLower === "missing" || dLower === "disabled") {
        findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
          `User-facing AI interface lacks "You are interacting with an AI" disclosure`, orgId, {
            impact: "EU AI Act Article 52 and various consumer protection laws require that users be clearly informed when they are interacting with an AI system. Without a transparency disclosure, users may believe they are communicating with a human, leading to uninformed consent, potential deception, and regulatory violations. This is particularly critical for customer service chatbots, sales assistants, and healthcare triage systems.",
            remediation: "1. Add a prominent 'You are interacting with an AI' disclosure to the web UI.\n2. Include the AI system's name, capabilities, and limitations in the disclosure.\n3. Provide a mechanism for users to request human intervention.\n4. Ensure the disclosure is accessible (WCAG compliant) and available in relevant languages.\n5. Log user acknowledgment of the AI disclosure for compliance records.\n6. Review disclosure placement with UX team to ensure visibility without impeding usability.",
            evidence: `AI interface "${a.name}" is user-facing (${userFacing}) but AI disclosure: "${disclosure || "not set"}". Expected: clear transparency notice per EU AI Act Article 52.`
          }));
      }
    }
  }
  return findings;
};

const checkCOM098: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const riskLevel = meta(a, "riskLevel") || meta(a, "aiActRisk") || meta(a, "riskClassification") || "";
    if (!riskLevel) continue;
    const rlLower = riskLevel.toLowerCase();
    if (!rlLower.includes("high") && !rlLower.includes("critical")) continue;
    const lastBiasAudit = meta(a, "lastBiasAudit") || meta(a, "fairnessAuditDate") || meta(a, "biasReviewDate") || "";
    if (!lastBiasAudit) continue;
    const laLower = lastBiasAudit.toLowerCase();
    if (laLower === "never" || laLower === "expired" || laLower === "overdue" || laLower.includes("stale")) {
      findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
        `High-risk AI model has not undergone mandatory bias/fairness audit in over 6 months`, orgId, {
          impact: "High-risk AI models require periodic bias and fairness audits to ensure they are not producing discriminatory outcomes. Without regular audits, model drift can introduce or amplify biases that disproportionately affect protected groups. This creates liability under anti-discrimination laws (Title VII, ECOA, EU AI Act Article 9), potential class-action lawsuits, and reputational damage. The NYC Local Law 144 specifically requires annual bias audits for automated employment decision tools.",
          remediation: "1. Schedule and complete a bias/fairness audit immediately for overdue models.\n2. Implement automated fairness metric monitoring (Demographic Parity, Equalized Odds).\n3. Set up calendar reminders for 6-month audit cycles on all high-risk models.\n4. Engage an independent third-party auditor for bias assessments.\n5. Document audit findings and remediation actions in the GRC module.\n6. Implement automated model performance monitoring that triggers audit alerts on drift.",
          evidence: `Model "${a.name}" is classified as "${riskLevel}" risk but last bias audit: "${lastBiasAudit}". Expected: bias audit within the last 6 months.`
        }));
    }
  }
  return findings;
};

const checkCOM099: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.category === "Foundation Models") continue;
    if (r.category !== "Development" && r.category !== "Orchestration" && r.category !== "AI Agents" && r.category !== "Custom Models") continue;
    const nistStatus = meta(r, "nistAiRmf") || meta(r, "riskFramework") || meta(r, "nistMap") || meta(r, "nistMeasure") || "";
    if (!nistStatus) continue;
    const nsLower = nistStatus.toLowerCase();
    if (nsLower === "incomplete" || nsLower === "missing" || nsLower === "false" || nsLower === "none" || nsLower.includes("not started") || nsLower.includes("gap")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `AI project has not completed NIST AI RMF "Map" or "Measure" function documentation`, orgId, {
          impact: "The NIST AI Risk Management Framework (AI RMF 1.0) provides the authoritative risk management structure adopted by federal agencies and increasingly by private sector organizations. Without completing the 'Map' function (understanding context and identifying risks) and 'Measure' function (assessing and tracking identified risks), the organization cannot demonstrate systematic AI risk management. This creates gaps in executive reporting, regulatory responses, and insurance assessments.",
          remediation: "1. Complete the NIST AI RMF 'Map' function: document AI system context, stakeholders, and potential impacts.\n2. Complete the 'Measure' function: quantify identified risks using established metrics.\n3. Record all risk assessments in the organization's risk register.\n4. Assign risk owners for each identified AI risk.\n5. Establish a cadence for reviewing and updating the risk assessment.\n6. Align the AI risk register with the enterprise risk management (ERM) framework.",
          evidence: `AI project "${r.name}" has NIST AI RMF status: "${nistStatus}". Expected: completed Map and Measure function documentation.`
        }));
    }
  }
  return findings;
};

const checkCOM100: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const allAssets = [...pool.resources, ...pool.models];
  for (const a of allAssets) {
    if (a.category === "Foundation Models") continue;
    const riskScore = meta(a, "riskScore") || meta(a, "overallRisk") || meta(a, "criticalRisk") || "";
    if (!riskScore) continue;
    const rsLower = riskScore.toLowerCase();
    if (rsLower.includes("critical") || rsLower === "5" || rsLower === "10" || rsLower.includes("extreme")) {
      const mitigationPlan = meta(a, "mitigationPlan") || meta(a, "riskMitigation") || meta(a, "mitigationApproval") || "";
      const mpLower = mitigationPlan.toLowerCase();
      if (!mitigationPlan || mpLower === "none" || mpLower === "missing" || mpLower === "false" || mpLower === "pending" || mpLower === "unapproved") {
        findings.push(finding(policy, a.id, a.name, (a as any).type || "AI System",
          `Critical-risk AI resource has no approved mitigation plan from the AI Compliance Officer`, orgId, {
            impact: "An AI resource with a Critical risk score that lacks an approved mitigation plan represents an uncontrolled risk to the organization. Without documented, approved mitigation measures, the risk may materialize into a security incident, compliance violation, or operational failure. Board-level oversight obligations (SEC AI disclosure requirements, EU AI Act Article 9) require demonstrable risk management for critical AI risks.",
            remediation: "1. Draft a mitigation plan for the critical risk, including specific controls and timelines.\n2. Submit the plan to the AI Compliance Officer for review and approval.\n3. Implement approved mitigation controls within the defined timeline.\n4. Add the risk and mitigation plan to the board-level AI risk register.\n5. Schedule a follow-up review to verify mitigation effectiveness.\n6. Consider pausing or restricting the AI resource until the mitigation plan is approved and implemented.",
            evidence: `Asset "${a.name}" has risk score: "${riskScore}" but mitigation plan: "${mitigationPlan || "not set"}". Expected: approved mitigation plan for all critical-risk AI resources.`
          }));
      }
    }
  }
  return findings;
};

const checkKEN111: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Kendra Index") continue;
    const sseConfig = meta(r, "serverSideEncryptionConfiguration") || meta(r, "kmsKeyId");
    if (!sseConfig || sseConfig.toLowerCase() === "none" || sseConfig === "") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Kendra Index lacks server-side encryption with KMS`, orgId, {
          impact: "Without KMS encryption, Kendra index data including ingested documents, search queries, and indexed content is protected only by AWS-managed keys. This prevents the organization from controlling key rotation, auditing key usage, or revoking access in a security incident. Sensitive enterprise knowledge stored in the index may be exposed if storage-level access controls are bypassed.",
          remediation: "1. Create a KMS Customer Managed Key (CMK) for Kendra encryption.\n2. Re-create the Kendra index with server-side encryption configured using the CMK.\n3. Enable automatic key rotation on the CMK.\n4. Restrict KMS key policy to authorized Kendra service roles only.\n5. Monitor key usage via CloudTrail KMS events.",
          evidence: `Kendra Index "${r.name}" has encryption configuration: "${sseConfig || "not configured"}". Region: ${meta(r, "region") || "unknown"}. ARN: ${r.externalId || "N/A"}.`
        }));
    }
  }
  return findings;
};

const checkKEN112: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Kendra Data Source") continue;
    const vpcConfig = meta(r, "vpcConfiguration");
    if (!vpcConfig || vpcConfig.toLowerCase() === "none" || vpcConfig === "" || vpcConfig === "{}") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Kendra Data Source lacks VPC configuration`, orgId, {
          impact: "Without VPC configuration, the Kendra data source connector accesses upstream data repositories over the public internet. This exposes data in transit to potential interception, increases the attack surface, and prevents network-level access controls from being applied to data ingestion flows.",
          remediation: "1. Configure VPC settings for the Kendra data source connector.\n2. Place the connector in a private subnet with no public IP.\n3. Use VPC endpoints for accessing S3, RDS, or other data sources.\n4. Apply security groups to restrict network access to required data repositories only.\n5. Enable VPC Flow Logs to monitor data source connector traffic.",
          evidence: `Kendra Data Source "${r.name}" has VPC configuration: "${vpcConfig || "not configured"}". Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkKEN113: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "IAM Role" && r.type !== "IAM Policy" && !r.type.toLowerCase().includes("iam")) continue;
    const policyDoc = meta(r, "policyDocument") || meta(r, "inlinePolicies") || meta(r, "attachedPolicies") || "";
    const pdLower = policyDoc.toLowerCase();
    if (pdLower.includes("kendra:query") && pdLower.includes("resource\": \"*")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `IAM resource grants kendra:Query on Resource: * (over-scoped)`, orgId, {
          impact: "Granting kendra:Query on all resources allows the identity to search across every Kendra index in the account, potentially accessing sensitive documents and knowledge bases outside their intended scope. This violates least-privilege principles and could lead to unauthorized information disclosure through cross-index searches.",
          remediation: "1. Restrict the IAM policy to specific Kendra index ARNs.\n2. Use resource-based policies on Kendra indices to limit access.\n3. Implement attribute-based access control (ABAC) using tags.\n4. Audit all identities with kendra:Query permissions.\n5. Set up CloudTrail monitoring for cross-index query patterns.",
          evidence: `IAM resource "${r.name}" has policy document containing kendra:Query with Resource: *. This allows querying all Kendra indices in the account.`
        }));
    }
  }
  return findings;
};

const checkLEX114: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Lex Bot Alias") continue;
    const logSettings = meta(r, "conversationLogSettings");
    if (!logSettings || logSettings.toLowerCase() === "none" || logSettings === "" || logSettings === "{}") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Lex Bot Alias does not have conversation logging enabled`, orgId, {
          impact: "Without conversation logging, there is no audit trail of user interactions with the bot. This prevents detection of prompt injection attempts, abuse patterns, and compliance violations. In regulated industries, conversation logs are required for dispute resolution and regulatory audits.",
          remediation: "1. Enable conversation log settings on the Lex bot alias.\n2. Configure both text and audio logging to CloudWatch Logs or S3.\n3. Encrypt log destinations with KMS CMK.\n4. Set log retention policies appropriate for compliance requirements.\n5. Implement automated monitoring for suspicious conversation patterns.",
          evidence: `Lex Bot Alias "${r.name}" has conversation log settings: "${logSettings || "not configured"}". Bot ID: ${meta(r, "botId") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkLEX115: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Lex Bot Alias") continue;
    const logSettings = meta(r, "conversationLogSettings");
    if (logSettings && logSettings !== "" && logSettings !== "{}") {
      const hasAudioLog = logSettings.includes("audioLogSettings") || logSettings.includes("s3BucketArn");
      const hasKmsEncryption = logSettings.includes("kmsKeyArn") || logSettings.includes("kmsKeyId");
      if (hasAudioLog && !hasKmsEncryption) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Lex Bot Alias has audio logging enabled without KMS encryption`, orgId, {
            impact: "Unencrypted audio data from Lex bot conversations may contain sensitive personal information including voice biometrics, health information shared verbally, and financial details. Without encryption, this audio data is vulnerable to unauthorized access and violates HIPAA, PCI-DSS, and GDPR requirements for protecting personal data at rest.",
            remediation: "1. Configure a KMS Customer Managed Key for Lex bot audio log encryption.\n2. Enable encryption for both audio input and output streams.\n3. Encrypt any S3 buckets storing audio recordings.\n4. Restrict KMS key access to authorized Lex service roles.\n5. Enable key rotation and audit key usage via CloudTrail.",
            evidence: `Lex Bot Alias "${r.name}" has audio logging configured but no KMS encryption found in conversation log settings. Bot ID: ${meta(r, "botId") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
          }));
      }
    }
  }
  return findings;
};

const checkLEX116: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Lex Bot Alias") continue;
    const localeSettings = meta(r, "botAliasLocaleSettings");
    if (!localeSettings || localeSettings.toLowerCase() === "none" || localeSettings === "" || localeSettings === "{}" || localeSettings === "[]") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Lex Bot Alias lacks locale-specific routing configuration`, orgId, {
          impact: "Without locale settings and routing configuration, the bot alias cannot perform canary deployments, A/B testing, or gradual rollouts of new bot versions. This increases the risk of deploying untested bot versions directly to production, potentially causing service disruptions or exposing users to unvalidated conversational flows.",
          remediation: "1. Configure locale-specific routing settings on the Lex bot alias.\n2. Implement canary deployment with a small percentage of traffic to new versions.\n3. Set up CloudWatch alarms to monitor error rates during version transitions.\n4. Define rollback criteria and automated rollback procedures.\n5. Test new bot versions in a staging alias before production routing.",
          evidence: `Lex Bot Alias "${r.name}" has locale settings: "${localeSettings || "not configured"}". Bot ID: ${meta(r, "botId") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkQBI117: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Q Business Application") continue;
    const identityType = meta(r, "identityType");
    const identityCenterArn = meta(r, "identityCenterApplicationArn") || meta(r, "identityCenterArn");
    if ((!identityType || (identityType !== "AWS_IAM_IDP_OIDC" && identityType !== "AWS_IAM_IDC")) && (!identityCenterArn || identityCenterArn === "")) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Q Business Application lacks Identity Center integration`, orgId, {
          impact: "Without Identity Center (SSO) integration, Q Business cannot enforce centralized authentication, MFA requirements, or attribute-based access controls. Users may access enterprise knowledge bases without proper identity verification, bypassing organizational security policies and compliance requirements. This creates unauditable access to potentially sensitive corporate data indexed by Q Business.",
          remediation: "1. Configure AWS IAM Identity Center as the identity provider for Q Business.\n2. Set up SAML or OIDC federation with the corporate identity provider.\n3. Enable MFA requirements through Identity Center policies.\n4. Map user groups to Q Business application access levels.\n5. Enable CloudTrail logging for all Q Business authentication events.\n6. Implement session timeout policies through Identity Center.",
          evidence: `Q Business Application "${r.name}" has identityType: "${identityType || "not set"}", Identity Center ARN: "${identityCenterArn || "not configured"}". Expected: AWS_IAM_IDP_OIDC or valid Identity Center integration.`
        }));
    }
  }
  return findings;
};

const checkQBI118: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Q Business Application") continue;
    const qAppsConfig = meta(r, "qAppsConfiguration");
    const autoSubConfig = meta(r, "autoSubscriptionConfiguration");
    const encryptionConfig = meta(r, "encryptionConfiguration");
    const hasGuardrails = (qAppsConfig && qAppsConfig !== "" && qAppsConfig !== "{}") ||
                          (encryptionConfig && encryptionConfig !== "" && encryptionConfig !== "{}");
    if (!hasGuardrails) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Q Business Application lacks guardrails or content filtering configuration`, orgId, {
          impact: "Without guardrails, Q Business may generate responses containing sensitive internal data, provide inaccurate information from indexed sources, or respond to queries outside the intended scope. This could lead to data leakage, misinformation distribution within the organization, and potential compliance violations when handling regulated data through the Q Business interface.",
          remediation: "1. Configure Q Apps settings to control what applications users can build.\n2. Set up encryption configuration with a customer managed KMS key.\n3. Implement response guardrails to filter PII and confidential data from outputs.\n4. Configure document-level access controls in the Q Business data sources.\n5. Enable monitoring and alerting for guardrail violations.\n6. Regularly review and update guardrail configurations.",
          evidence: `Q Business Application "${r.name}" has Q Apps config: "${qAppsConfig || "not configured"}", encryption: "${encryptionConfig || "not configured"}", auto-subscription: "${autoSubConfig || "not configured"}".`
        }));
    }
  }
  return findings;
};

const checkEDG119: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "SageMaker Device Fleet") {
      const deviceFleetArn = meta(r, "deviceFleetArn");
      const iotRoleAlias = meta(r, "iotRoleAlias");
      if (!iotRoleAlias && !meta(r, "authConfig") && !hasTags(r, "iot-auth", "device-auth")) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `SageMaker Edge device fleet lacks IoT device authentication policy`, orgId, {
            impact: "Without proper device authentication, any device can register with the fleet and receive model deployments. Attackers could register rogue devices to exfiltrate model weights or inject poisoned inference results back into the pipeline.",
            remediation: "1. Configure AWS IoT role aliases for the device fleet.\n2. Implement X.509 certificate-based device authentication.\n3. Enable fleet-level device registration policies.\n4. Monitor device fleet registration events via CloudTrail.\n5. Implement device attestation checks before model deployment.",
            evidence: `Device Fleet "${r.name}" (ARN: ${deviceFleetArn || r.externalId || "N/A"}) has no IoT role alias or authentication configuration. Region: ${meta(r, "region") || "unknown"}.`
          }));
      }
    }
  }
  return findings;
};

const checkEDG120: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "SageMaker Edge Packaging Job") {
      const kmsKey = meta(r, "kmsKeyId") || meta(r, "outputKmsKeyId");
      const outputConfig = meta(r, "outputConfig");
      if (!kmsKey && (!outputConfig || !outputConfig.includes("kms"))) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `SageMaker Edge packaging job output is not encrypted with KMS`, orgId, {
            impact: "Unencrypted edge model packages can be intercepted during distribution to edge devices. Attackers can reverse-engineer model weights, extract proprietary algorithms, or replace the package with a trojaned model that produces manipulated inference results.",
            remediation: "1. Specify a KMS key in the edge packaging job output configuration.\n2. Enable encryption for the S3 output bucket used for packaged models.\n3. Implement integrity verification (checksums) for packaged models.\n4. Use AWS IoT Greengrass secure deployment for model distribution.\n5. Rotate KMS keys used for edge model encryption regularly.",
            evidence: `Edge Packaging Job "${r.name}" has no KMS key configured. Output KMS Key: "${kmsKey || "none"}". ARN: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkFLO121: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "Bedrock Flow") {
      const status = meta(r, "status");
      if (status && status !== "Prepared" && status !== "PREPARED") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Bedrock Flow is in "${status}" state — may lack proper error handling`, orgId, {
            impact: "A Bedrock Flow not in 'Prepared' status may have configuration errors, missing node connections, or incomplete error handling. This can lead to silent failures in AI orchestration pipelines, unhandled exceptions exposing internal details, or partial execution leaving data in inconsistent states.",
            remediation: "1. Review the flow definition for missing error handling nodes.\n2. Add catch/retry logic for each flow step.\n3. Validate the flow reaches 'Prepared' status before production use.\n4. Implement dead-letter queues for failed flow executions.\n5. Set up CloudWatch alarms for flow execution failures.",
            evidence: `Bedrock Flow "${r.name}" has status="${status}" (expected "Prepared"). ARN: ${r.externalId || "N/A"}. Region: ${meta(r, "region") || "unknown"}.`
          }));
      }
    }
  }
  return findings;
};

const checkFLO122: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "Bedrock Prompt") {
      const variantCount = parseInt(meta(r, "variantCount") || "0", 10);
      const version = meta(r, "version");
      const hasMinimalVersioning = variantCount > 1 || (version && version !== "" && version !== "DRAFT");
      if (!hasMinimalVersioning) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Bedrock Prompt lacks version control — only ${variantCount} variant(s), version: "${version || "DRAFT"}"`, orgId, {
            impact: "Prompts without version control cannot be rolled back if a change causes degraded model performance, safety filter bypasses, or output quality issues. Without versioning, there is no audit trail of prompt modifications, making it impossible to determine when a problematic change was introduced.",
            remediation: "1. Create multiple prompt versions to enable rollback capability.\n2. Implement prompt variants for A/B testing before production deployment.\n3. Use Bedrock's built-in prompt versioning to track all changes.\n4. Establish a prompt review process before publishing new versions.\n5. Tag prompt versions with deployment environment metadata.",
            evidence: `Bedrock Prompt "${r.name}" has ${variantCount} variant(s), version: "${version || "DRAFT"}". ARN: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkFLO123: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "Bedrock Flow") {
      const executionRoleArn = meta(r, "executionRoleArn");
      const rolePolicy = meta(r, "rolePolicy") || meta(r, "policyDocument");
      if (executionRoleArn) {
        const hasWildcard = (rolePolicy && (rolePolicy.includes('"Resource": "*"') || rolePolicy.includes('"Resource":"*"'))) ||
                            hasTags(r, "wildcard-invoke", "invoke-all-models");
        if (hasWildcard || (rolePolicy && rolePolicy.includes("bedrock:InvokeModel") && rolePolicy.includes("*"))) {
          findings.push(finding(policy, r.id, r.name, r.type,
            `Bedrock Flow execution role has unrestricted model invocation permissions`, orgId, {
              impact: "A flow with unrestricted bedrock:InvokeModel permissions can invoke any model in the account, including expensive large models. An attacker exploiting the flow through prompt injection could pivot to invoke unintended models, leading to data exfiltration through model outputs or massive cost overruns.",
              remediation: "1. Restrict the execution role to specific model ARNs needed by the flow.\n2. Use IAM condition keys to limit model invocation by region and model ID.\n3. Implement SCPs to enforce least-privilege on Bedrock model access.\n4. Audit the flow's execution role permissions quarterly.\n5. Use separate roles for each flow with minimal required permissions.",
              evidence: `Bedrock Flow "${r.name}" has execution role "${executionRoleArn}" with broad bedrock:InvokeModel permissions. Policy includes wildcard resource access.`
            }));
        }
      }
    }
  }
  return findings;
};

const checkCGR124: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "CodeGuru Repository") {
      const state = meta(r, "state") || meta(r, "associationState");
      if (state && state !== "Associated" && state !== "Associating") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `CodeGuru repository association is not actively reviewed (state: ${state})`, orgId, {
            impact: "A repository not actively associated with CodeGuru Reviewer misses automated code quality and security reviews. AI/ML code changes including model training scripts, inference pipelines, and data processing logic are deployed without static analysis, increasing the risk of vulnerabilities and code quality issues.",
            remediation: "1. Re-associate the repository with CodeGuru Reviewer.\n2. Investigate why the association was lost or failed.\n3. Ensure IAM permissions allow CodeGuru to access the repository.\n4. Set up alerts for association state changes.\n5. Enable CodeGuru Reviewer for all AI/ML code repositories.",
            evidence: `CodeGuru Repository "${r.name}" has association state="${state}" (expected "Associated"). ARN: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkCGR125: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "DevOps Guru Health") {
      const openReactive = parseInt(meta(r, "openReactiveInsights") || "0", 10);
      if (openReactive > 0) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `DevOps Guru has ${openReactive} unresolved reactive insight(s) indicating active operational issues`, orgId, {
            impact: "Unresolved reactive insights indicate active operational anomalies in your AI infrastructure. These could include degraded inference latency, resource exhaustion, or service disruptions that affect model availability and performance. Ignoring reactive insights delays incident response and extends mean time to resolution.",
            remediation: "1. Review and triage all open reactive insights immediately.\n2. Assign each insight to an owner for investigation and resolution.\n3. Implement the recommended actions provided by DevOps Guru.\n4. Set up SNS notifications for new reactive insights.\n5. Establish SLAs for reactive insight resolution based on severity.",
            evidence: `DevOps Guru Health "${r.name}" reports ${openReactive} open reactive insight(s). Region: ${meta(r, "region") || "unknown"}.`
          }));
      }
    }
  }
  return findings;
};

const checkCGR126: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "DevOps Guru Health") {
      const resourceHours = parseInt(meta(r, "resourceHours") || "0", 10);
      const metricsAnalyzed = parseInt(meta(r, "metricsAnalyzed") || "0", 10);
      if (resourceHours === 0 || metricsAnalyzed === 0) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `DevOps Guru proactive monitoring is effectively disabled — no resources or metrics being analyzed`, orgId, {
            impact: "Without proactive monitoring, DevOps Guru cannot detect anomalies before they become incidents. AI workloads are particularly sensitive to resource bottlenecks (GPU memory, compute), and proactive monitoring helps identify degradation patterns before they impact model inference performance or availability.",
            remediation: "1. Configure DevOps Guru resource coverage for AI workloads.\n2. Add CloudFormation stacks or tagged resources to monitoring scope.\n3. Verify IAM permissions allow DevOps Guru to access CloudWatch metrics.\n4. Enable proactive insights for SageMaker and Bedrock services.\n5. Review DevOps Guru service integration settings.",
            evidence: `DevOps Guru Health "${r.name}" shows resourceHours=${resourceHours}, metricsAnalyzed=${metricsAnalyzed}. Both should be > 0 for active monitoring.`
          }));
      }
    }
  }
  return findings;
};

const checkINF127: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "EC2 Instance") continue;
    const isPublic = hasTags(r, "public") || meta(r, "publicIp") || meta(r, "publicAccess") === "true";
    const isEncrypted = hasTags(r, "encrypted") || meta(r, "encrypted") === "true";
    if (isPublic && !isEncrypted) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Public EC2 instance without encryption — potential data exposure risk`, orgId, {
          impact: "A publicly accessible EC2 instance without storage encryption exposes AI workloads and any locally stored model data, training datasets, or inference results to potential unauthorized access. If the instance hosts AI services, model IP and sensitive data could be extracted.",
          remediation: "1. Enable EBS encryption for all volumes attached to the instance.\n2. Remove the public IP if direct internet access is not required.\n3. Place the instance in a private subnet behind a load balancer.\n4. Ensure security groups restrict inbound access to necessary ports only.\n5. Enable detailed monitoring and CloudTrail logging.",
          evidence: `EC2 Instance "${r.name}" is publicly accessible with unencrypted storage. Instance ID: ${r.externalId || "N/A"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkINF128: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "CloudFront Distribution") continue;
    const viewerProtocol = meta(r, "viewerProtocolPolicy") || meta(r, "defaultCacheBehavior");
    const hasHttpsOnly = viewerProtocol && (viewerProtocol.includes("https-only") || viewerProtocol.includes("redirect-to-https"));
    if (!hasHttpsOnly) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `CloudFront distribution may allow unencrypted HTTP traffic`, orgId, {
          impact: "A CloudFront distribution allowing HTTP traffic exposes data in transit to interception. If the distribution serves AI model APIs, inference endpoints, or application frontends, sensitive request/response data including model inputs, outputs, and authentication tokens could be captured by network attackers.",
          remediation: "1. Set the viewer protocol policy to 'redirect-to-https' or 'https-only'.\n2. Configure a custom SSL/TLS certificate via ACM.\n3. Set the minimum protocol version to TLSv1.2.\n4. Enable Origin Access Control for S3 origins.\n5. Review and restrict allowed HTTP methods.",
          evidence: `CloudFront Distribution "${r.name}" does not enforce HTTPS-only viewer protocol. Distribution ID: ${r.externalId || "N/A"}.`
        }));
    }
  }
  return findings;
};

const checkINF129: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Application Load Balancer" && r.type !== "Network Load Balancer") continue;
    const isPublic = hasTags(r, "public") || meta(r, "scheme") === "internet-facing" || meta(r, "publicAccess") === "true";
    if (isPublic) {
      const hasWaf = meta(r, "wafEnabled") || meta(r, "webAclArn");
      if (!hasWaf) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Internet-facing load balancer without WAF protection`, orgId, {
            impact: "An internet-facing load balancer without WAF protection is exposed to common web attacks including SQL injection, XSS, and bot traffic. If the load balancer routes traffic to AI inference endpoints or model APIs, attackers could exploit vulnerabilities to access or manipulate AI services.",
            remediation: "1. Associate an AWS WAF web ACL with the load balancer.\n2. Configure rate-limiting rules to prevent abuse.\n3. Add managed rule groups for common attack patterns.\n4. Enable access logging to S3 for security analysis.\n5. Consider using AWS Shield Advanced for DDoS protection.",
            evidence: `${r.type} "${r.name}" is internet-facing without WAF. ARN: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkINF130: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Lambda Function") continue;
    const hasVpc = meta(r, "vpcId") || hasTags(r, "vpc");
    if (!hasVpc) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Lambda function not deployed in a VPC — limited network isolation`, orgId, {
          impact: "A Lambda function without VPC configuration runs in AWS's shared network space, lacking private access to VPC resources and network-level access controls. If the function processes AI model data, makes inference calls, or handles sensitive inputs, network traffic cannot be inspected or controlled.",
          remediation: "1. Configure the Lambda function to run within a VPC.\n2. Place it in a private subnet with no direct internet access.\n3. Use VPC endpoints for AWS service access (S3, DynamoDB, Bedrock).\n4. Apply security groups to restrict network access.\n5. Use a NAT gateway only if outbound internet access is required.",
          evidence: `Lambda Function "${r.name}" is not deployed in a VPC. ARN: ${r.externalId || "N/A"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkINF131: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "API Gateway") continue;
    const hasAuth = meta(r, "authorizationType") || meta(r, "apiKeySource") || hasTags(r, "authenticated", "api-key-required");
    const isPublic = hasTags(r, "public") || meta(r, "endpointType") === "EDGE" || meta(r, "publicAccess") === "true";
    if (isPublic && !hasAuth) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Public API Gateway without authentication — unrestricted access`, orgId, {
          impact: "An API Gateway endpoint accessible without authentication allows anyone to invoke the API. If it proxies AI model endpoints, inference APIs, or data processing services, attackers can freely consume compute resources, exfiltrate model outputs, and potentially inject malicious inputs.",
          remediation: "1. Enable IAM authorization, Cognito user pools, or Lambda authorizers.\n2. Configure API key requirements for rate limiting.\n3. Set up usage plans to control access and throttling.\n4. Enable CloudWatch Logs for API access monitoring.\n5. Consider private API endpoints with VPC endpoint access only.",
          evidence: `API Gateway "${r.name}" is publicly accessible without authentication. ID: ${r.externalId || "N/A"}.`
        }));
    }
  }
  return findings;
};

const checkDAT132: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Face Collection") continue;
    findings.push(finding(policy, r.id, r.name, r.type,
      `Rekognition Face Collection contains biometric data requiring enhanced protection`, orgId, {
        impact: "Face collections contain biometric data subject to strict regulations (GDPR, BIPA, CCPA). Biometric identifiers are irrevocable — unlike passwords, they cannot be changed if compromised. Unauthorized access to face embeddings enables identity theft, surveillance, and discriminatory profiling.",
        remediation: "1. Implement strict IAM policies limiting access to the face collection.\n2. Enable CloudTrail logging for all Rekognition API calls.\n3. Implement data retention policies and automated deletion schedules.\n4. Conduct a privacy impact assessment for biometric data processing.\n5. Ensure informed consent mechanisms are in place for data subjects.\n6. Consider encryption of images before processing with Rekognition.",
        evidence: `Rekognition Face Collection "${r.name}" stores biometric face embeddings. Collection ID: ${r.externalId || "N/A"}. Region: ${meta(r, "region") || "unknown"}.`
      }));
  }
  return findings;
};

const checkBCM133: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const m of pool.models) {
    if (m.category !== "Custom Models" || m.type !== "Custom Model") continue;
    const kmsKey = meta(m, "modelKmsKeyArn");
    const outputKmsKey = meta(m, "outputModelKmsKeyArn");
    if (!kmsKey && !outputKmsKey) {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Bedrock custom model is not encrypted with a Customer Managed Key (CMK)`, orgId, {
          impact: "Without CMK encryption, you lose full control over who can access the encryption keys to access your custom model data. AWS-managed keys provide basic encryption but don't allow granular key policies, key rotation control, or cross-account access management. This limits your ability to meet strict compliance requirements.",
          remediation: "1. Create a new AWS KMS Customer Managed Key (CMK) with appropriate key policy.\n2. Re-create the Bedrock custom model specifying the CMK ARN for encryption.\n3. Configure key rotation for the CMK to meet compliance requirements.\n4. Restrict key access via IAM policies to authorized principals only.\n5. Enable CloudTrail logging for all KMS key usage events.",
          evidence: `Bedrock Custom Model "${m.name}" (${meta(m, "modelArn") || m.externalId}) has no Customer Managed Key configured. Model KMS Key: "${kmsKey || "none"}". Output KMS Key: "${outputKmsKey || "none"}". Region: ${meta(m, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkBCM134: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const m of pool.models) {
    if (m.category !== "Custom Models" || m.type !== "Custom Model") continue;
    const vpcConfigured = meta(m, "vpcConfigured");
    if (vpcConfigured !== "true") {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Bedrock custom model is not configured within a VPC`, orgId, {
          impact: "When a custom model's training job is not configured within a VPC, training data traverses the public internet increasing the risk of interception or unauthorized access. VPC configuration establishes a secure network boundary that prevents exposure of sensitive training data and model artifacts.",
          remediation: "1. Create or identify an appropriate VPC with private subnets.\n2. Configure security groups that restrict inbound/outbound traffic to necessary endpoints.\n3. Re-create the Bedrock model customization job with VPC configuration specifying subnet IDs and security group IDs.\n4. Ensure the VPC has VPC endpoints for S3 and Bedrock services to avoid public internet routing.\n5. Monitor VPC Flow Logs for anomalous traffic patterns.",
          evidence: `Bedrock Custom Model "${m.name}" (${meta(m, "modelArn") || m.externalId}) does not have a VPC configured for its customization job. Job ARN: "${meta(m, "jobArn") || "unknown"}". Region: ${meta(m, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkBCM135: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const m of pool.models) {
    if (m.category !== "Custom Models" || m.type !== "Custom Model") continue;
    const vpcConfigured = meta(m, "vpcConfigured");
    if (vpcConfigured === "true") {
      const subnetIdsStr = String(meta(m, "vpcSubnetIds") || "");
      if (!subnetIdsStr) continue;
      const subnetIdSet = new Set(subnetIdsStr.split(",").map(s => s.trim()).filter(Boolean));
      const hasPublicSubnetIndicator = pool.resources.some(r => {
        if (r.type !== "Subnet") return false;
        const subId = r.externalId || r.name || "";
        if (!subnetIdSet.has(subId)) return false;
        return meta(r, "mapPublicIpOnLaunch") === "true";
      });
      if (hasPublicSubnetIndicator) {
        findings.push(finding(policy, m.id, m.name, m.type,
          `Bedrock custom model is configured in a public VPC subnet`, orgId, {
            impact: "The custom model's VPC configuration uses public subnets with internet gateway routing, negating the security benefits of VPC isolation. Training data and model artifacts may be exposed to the public internet, enabling data exfiltration or man-in-the-middle attacks.",
            remediation: "1. Reconfigure the model customization job to use only private subnets (no internet gateway route).\n2. Ensure all subnets have 'MapPublicIpOnLaunch' set to false.\n3. Use NAT Gateways for any necessary outbound internet access from private subnets.\n4. Create VPC endpoints for S3 and Bedrock to keep traffic within the AWS network.\n5. Review route tables to ensure no direct internet gateway routes exist for model subnets.",
            evidence: `Bedrock Custom Model "${m.name}" VPC uses subnet(s) "${subnetIds}" which include public subnets with internet gateway routing. Region: ${meta(m, "region") || "unknown"}.`
          }));
      }
    }
  }
  return findings;
};

const checkBCM136: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Invocation Logging") continue;
    const loggingEnabled = meta(r, "loggingEnabled");
    if (loggingEnabled !== "true") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Bedrock model invocation logging is disabled`, orgId, {
          impact: "Without invocation logging, you cannot collect request data, response data, and metadata for model calls in your account. This limits troubleshooting capability, prevents security analysis of model interactions, and creates compliance gaps for audit requirements. Malicious prompt injection or data exfiltration through model invocations would go undetected.",
          remediation: "1. Navigate to Amazon Bedrock console > Settings > Model invocation logging.\n2. Enable text data delivery, image data delivery, and embedding data delivery as needed.\n3. Configure an S3 bucket destination with encryption for log storage.\n4. Optionally configure CloudWatch Logs for real-time monitoring.\n5. Set up CloudWatch alarms for suspicious invocation patterns.\n6. Implement log retention policies to meet compliance requirements.",
          evidence: `Bedrock Invocation Logging "${r.name}" shows logging is disabled. Text logging: ${meta(r, "textLogging") || "false"}, Image logging: ${meta(r, "imageLogging") || "false"}, Embedding logging: ${meta(r, "embeddingLogging") || "false"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkBCM137: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const m of pool.models) {
    if (m.category !== "Custom Models" || m.type !== "Custom Model") continue;
    const tags = m.tags || [];
    const hasCustomTags = tags.some((t: string) => !["bedrock", "custom-model", "encrypted", "no-cmk", "vpc", "no-vpc"].includes(t) && !t.match(/^us-|^eu-|^ap-|^sa-|^ca-|^me-|^af-/));
    if (!hasCustomTags) {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Bedrock custom model does not have any user-defined tags`, orgId, {
          impact: "Tags help organize resources, track costs, enforce access policies, and gain visibility into resource usage. Without proper tagging, you cannot effectively implement tag-based access control, cost allocation, or automated governance policies. This makes it difficult to identify model ownership and manage resources at scale.",
          remediation: "1. Define a tagging strategy that includes mandatory tags (e.g., Environment, Owner, Project, CostCenter).\n2. Add tags to the Bedrock custom model using the AWS console or CLI.\n3. Implement AWS Organizations Tag Policies to enforce mandatory tags.\n4. Use AWS Config rules to detect untagged resources.\n5. Set up automated remediation to notify teams of untagged models.",
          evidence: `Bedrock Custom Model "${m.name}" (${meta(m, "modelArn") || m.externalId}) has no user-defined tags. Current tags: [${tags.join(", ")}]. Region: ${meta(m, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM138: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Notebook" || r.category !== "Development") continue;
    const directInternet = meta(r, "directInternetAccess") || meta(r, "publicAccess");
    if (directInternet === "Enabled" || directInternet === "Yes") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Notebook has direct internet access enabled`, orgId, {
          impact: "Direct internet access from a SageMaker Notebook enables unmonitored data transfer to personal cloud storage, model exfiltration to external endpoints, and downloading of untrusted packages. An attacker or insider can exfiltrate proprietary training data, model weights, or sensitive datasets without detection.",
          remediation: "1. Disable DirectInternetAccess on the notebook instance.\n2. Configure VPC with private subnets and NAT Gateway for controlled internet access.\n3. Use VPC endpoints for S3, SageMaker API, and other AWS services.\n4. Implement network ACLs and security groups to restrict egress traffic.\n5. Enable VPC Flow Logs to monitor all network traffic.\n6. Use S3 VPC endpoints to prevent data from traversing the public internet.",
          evidence: `SageMaker Notebook "${r.name}" has DirectInternetAccess set to "${directInternet}". Instance type: ${meta(r, "instanceType") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM139: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Notebook" || r.category !== "Development") continue;
    const rootAccess = meta(r, "rootAccess");
    if (rootAccess === "Enabled") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Notebook has root access enabled`, orgId, {
          impact: "Root access allows users to disable security agents, modify system logging, install unauthorized software, and escalate privileges beyond intended boundaries. A compromised notebook with root access gives attackers full control to pivot within the VPC, access credentials, or tamper with ML pipelines.",
          remediation: "1. Set RootAccess to 'Disabled' on the notebook instance.\n2. Use lifecycle configuration scripts to install required packages during instance startup.\n3. Implement IAM conditions to prevent users from creating notebooks with root access.\n4. Configure SageMaker execution roles with least-privilege permissions.\n5. Use SageMaker Studio instead of classic notebooks for better access controls.",
          evidence: `SageMaker Notebook "${r.name}" has RootAccess set to "${rootAccess}". Role ARN: ${meta(r, "roleArn") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM140: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Notebook" || r.category !== "Development") continue;
    const kmsKeyId = meta(r, "kmsKeyId");
    if (!kmsKeyId) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Notebook storage is not encrypted with a Customer Managed Key`, orgId, {
          impact: "Without CMK encryption for EBS volumes, raw code, local model weights, training scripts, and cached data are stored in plain text on cloud disks. An attacker with access to the underlying storage infrastructure can extract proprietary models, training code, and sensitive data.",
          remediation: "1. Create a KMS Customer Managed Key with appropriate key policy.\n2. Recreate the notebook instance specifying the KMS key ID for volume encryption.\n3. Ensure the notebook execution role has kms:GenerateDataKey and kms:Decrypt permissions.\n4. Enable automatic key rotation on the CMK.\n5. Configure CloudTrail logging for KMS key usage events.",
          evidence: `SageMaker Notebook "${r.name}" has no KMS key configured for EBS volume encryption. KMS Key ID: "${kmsKeyId || "none"}". Instance type: ${meta(r, "instanceType") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM141: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Notebook" && r.type !== "Training Job") continue;
    const roleArn = meta(r, "roleArn");
    if (!roleArn) continue;
    const matchingRoles = pool.resources.filter(res =>
      res.type === "IAM Role" && res.category === "Identity/Roles" &&
      (res.externalId === roleArn || meta(res, "roleArn") === roleArn || res.name === roleArn.split("/").pop())
    );
    for (const role of matchingRoles) {
      const perms = (meta(role, "permissions") || meta(role, "attachedPolicies") || "").toLowerCase();
      if (perms.includes("s3:*") || perms.includes("administratoraccess") || perms.includes("iam:passrole")) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `SageMaker resource has overprivileged execution role`, orgId, {
            impact: "An execution role with s3:* or iam:PassRole without resource constraints creates a massive blast radius. A single compromised notebook can access the entire corporate data lake, pass elevated roles to other services, or create new privileged resources. This violates the principle of least privilege.",
            remediation: "1. Replace s3:* with specific S3 bucket ARNs needed for the workload.\n2. Remove iam:PassRole or constrain it to specific role ARNs.\n3. Use resource-based conditions (aws:ResourceTag, aws:RequestedRegion) to limit scope.\n4. Implement permission boundaries on all SageMaker execution roles.\n5. Regularly audit execution role permissions using IAM Access Analyzer.\n6. Use separate roles for different stages (development, training, production).",
            evidence: `${r.type} "${r.name}" uses execution role "${roleArn}" which has overprivileged permissions: ${perms.substring(0, 200)}. Region: ${meta(r, "region") || "unknown"}.`
          }));
        break;
      }
    }
  }
  return findings;
};

const checkSM142: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Feature Store") continue;
    const onlineKms = meta(r, "onlineStoreKmsKeyId");
    const offlineKms = meta(r, "offlineStoreKmsKeyId");
    const onlineEnabled = meta(r, "onlineStoreEnabled");
    if (onlineEnabled === "true" && !onlineKms && !offlineKms) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Feature Store lacks encryption for online/offline stores`, orgId, {
          impact: "Feature stores contain pre-computed, sensitive user attributes including PII, behavioral features, and derived metrics. Without CMK encryption on the online and offline stores, this data is not adequately protected against unauthorized access, potentially violating GDPR/CCPA data protection requirements.",
          remediation: "1. Configure KMS encryption for the online store via SecurityConfig.\n2. Set up S3 encryption with a CMK for the offline store.\n3. Restrict access to specific IAM roles and accounts using condition keys.\n4. Enable VPC endpoint policies to restrict feature store access to authorized VPCs.\n5. Enable CloudTrail logging for all FeatureStore API calls.\n6. Audit feature group access patterns regularly.",
          evidence: `SageMaker Feature Store "${r.name}" (${meta(r, "featureGroupArn") || r.externalId}) has online store enabled but no CMK encryption. Online KMS: "${onlineKms || "none"}". Offline KMS: "${offlineKms || "none"}". Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM143: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Training Job") continue;
    const volumeKmsKeyId = meta(r, "volumeKmsKeyId");
    if (!volumeKmsKeyId) {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Training Job has unencrypted storage volumes`, orgId, {
          impact: "Training jobs without VolumeKmsKeyId store temporary training data, model checkpoints, and intermediate results on unencrypted scratch space. This data includes proprietary training datasets, model gradients, and hyperparameter configurations that could be extracted by an attacker with access to the underlying storage.",
          remediation: "1. Specify VolumeKmsKeyId when creating training jobs.\n2. Create a KMS key policy that grants the SageMaker execution role access.\n3. Update training pipeline templates to include encryption by default.\n4. Use SageMaker Managed Encryption policies to enforce encryption.\n5. Monitor CloudTrail for training jobs created without encryption.",
          evidence: `SageMaker Training Job "${r.name}" has no VolumeKmsKeyId configured. Status: ${meta(r, "status") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM144: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Training Job") continue;
    const encrypted = meta(r, "enableInterContainerTrafficEncryption");
    if (encrypted !== "true") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Training Job has insecure inter-container traffic`, orgId, {
          impact: "Distributed training jobs without inter-container traffic encryption transmit model gradients, training data shards, and parameter updates in plaintext between containers. Attackers within the VPC can intercept these communications to steal model architectures, training data, or inject poisoned gradients via man-in-the-middle attacks.",
          remediation: "1. Set EnableInterContainerTrafficEncryption to true for all training jobs.\n2. Update training pipeline configurations to enforce encryption by default.\n3. Use SCP (Service Control Policies) to deny CreateTrainingJob without encryption.\n4. Monitor CloudTrail for training jobs created without inter-container encryption.\n5. Implement VPC security groups to restrict inter-container communication scope.",
          evidence: `SageMaker Training Job "${r.name}" has EnableInterContainerTrafficEncryption set to "${encrypted}". Status: ${meta(r, "status") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM145: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Inference Endpoint" || r.category !== "Inference Endpoints") continue;
    if (r.serviceType !== "SageMaker") continue;
    const exposure = meta(r, "exposure") || r.exposure || "";
    const vpcConfigured = meta(r, "vpcConfigured");
    if (exposure.toLowerCase() === "public" && vpcConfigured !== "true") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Inference Endpoint is publicly exposed without VPC isolation`, orgId, {
          impact: "A publicly exposed endpoint without VPC isolation allows broader access than intended, potentially enabling model hijacking, cost spikes from unauthorized usage, model inversion attacks to extract training data, and systematic probing to reverse-engineer proprietary algorithms.",
          remediation: "1. Deploy the endpoint within a VPC with private subnets.\n2. Implement resource-based policies to restrict endpoint access.\n3. Use VPC endpoints to limit access to authorized networks.\n4. Enable request logging via DataCaptureConfig for audit trails.\n5. Implement rate limiting and request throttling.\n6. Monitor CloudWatch for anomalous invocation patterns.",
          evidence: `SageMaker Inference Endpoint "${r.name}" has exposure: "${exposure}", VPC configured: "${vpcConfigured}". Status: ${meta(r, "status") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM146: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Inference Endpoint" || r.category !== "Inference Endpoints") continue;
    if (r.serviceType !== "SageMaker") continue;
    const hasMonitoring = meta(r, "hasMonitoring");
    if (hasMonitoring !== "true") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Endpoint missing Model Monitor schedule`, orgId, {
          impact: "Without an active Model Monitor schedule, the production model may silently drift in accuracy, develop data quality issues, or produce biased/toxic responses without detection. Model degradation can cause incorrect predictions, hallucinated outputs, and compliance violations (EU AI Act Article 9 monitoring requirements).",
          remediation: "1. Create a SageMaker Model Monitor schedule for the endpoint.\n2. Configure Data Quality monitoring to detect input data drift.\n3. Enable Model Quality monitoring to track prediction accuracy.\n4. Set up Model Bias monitoring for fairness metrics.\n5. Configure CloudWatch alarms for monitoring violations.\n6. Implement automated model retraining pipelines triggered by drift alerts.",
          evidence: `SageMaker Inference Endpoint "${r.name}" has no active Model Monitor schedule. Monitoring configured: "${hasMonitoring}". Status: ${meta(r, "status") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM147: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Inference Endpoint" || r.category !== "Inference Endpoints") continue;
    if (r.serviceType !== "SageMaker") continue;
    const vpcConfigured = meta(r, "vpcConfigured");
    if (vpcConfigured !== "true") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Endpoint deployed without VPC configuration`, orgId, {
          impact: "Endpoints without VPC configuration rely on public internet access, exposing the model's serving infrastructure to public scanning, DDoS attacks, and unauthorized access attempts. The model container and its inference code are accessible from outside your network perimeter, increasing the attack surface significantly.",
          remediation: "1. Deploy the endpoint with VPC configuration specifying private subnets.\n2. Configure security groups to restrict access to authorized clients only.\n3. Use PrivateLink/VPC endpoints for SageMaker API access.\n4. Implement Network ACLs as an additional security layer.\n5. Enable VPC Flow Logs for traffic monitoring.\n6. Consider using SageMaker Studio Domain with VPC-only mode.",
          evidence: `SageMaker Inference Endpoint "${r.name}" is not deployed within a VPC. VPC configured: "${vpcConfigured}". Status: ${meta(r, "status") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM148: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const m of pool.models) {
    if (m.type !== "SageMaker Model") continue;
    const containerImage = meta(m, "primaryContainerImage") || "";
    const networkIsolation = meta(m, "enableNetworkIsolation");
    if (containerImage && networkIsolation !== "true") {
      const isCustomImage = !containerImage.includes("amazonaws.com") || containerImage.includes("byoc");
      if (isCustomImage) {
        findings.push(finding(policy, m.id, m.name, m.type,
          `SageMaker Model uses custom container without network isolation`, orgId, {
            impact: "Custom inference containers without network isolation may use pickle.load() or other unsafe deserialization on untrusted inputs, enabling Remote Code Execution (RCE). An attacker can craft malicious payloads disguised as inference requests, enabling container takeover, data exfiltration, or VPC pivoting.",
            remediation: "1. Enable EnableNetworkIsolation on the model to restrict network access.\n2. Replace pickle.load() with safe deserialization (JSON, safetensors, ONNX).\n3. If pickle is required, use restricted_unpickler with allowed classes.\n4. Enable container image scanning via ECR for known vulnerabilities.\n5. Implement network policies to restrict container egress.\n6. Use SageMaker Model Package containers with security patches applied.",
            evidence: `SageMaker Model "${m.name}" uses custom container image "${containerImage}" without network isolation (EnableNetworkIsolation: ${networkIsolation}). Region: ${meta(m, "region") || "unknown"}.`
          }));
      }
    }
  }
  return findings;
};

const checkSM149: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const m of pool.models) {
    if (m.type !== "SageMaker Model") continue;
    const modelArn = meta(m, "modelArn") || m.externalId || "";
    const hasLineage = pool.resources.some(r =>
      r.type === "Training Job" && r.category === "Development" &&
      (meta(r, "outputModelArn") === modelArn || r.name.includes(m.name))
    );
    if (!hasLineage) {
      findings.push(finding(policy, m.id, m.name, m.type,
        `SageMaker Model has no verified training job lineage`, orgId, {
          impact: "A model in the SageMaker Model Registry without a linked, verified training job ARN violates traceability requirements (EU AI Act Article 11, NIST AI RMF). Without provenance tracking, you cannot verify what data trained the model, what hyperparameters were used, or whether security reviews were completed. This creates compliance gaps and makes incident response impossible.",
          remediation: "1. Link each model version to its originating Training Job ARN.\n2. Implement SageMaker ML Lineage Tracking for all model artifacts.\n3. Require training job ARN as a mandatory field in the model registry.\n4. Use SageMaker Experiments to track all model iterations.\n5. Configure model approval workflows that validate lineage before promotion.\n6. Set up automated compliance checks in the CI/CD pipeline.",
          evidence: `SageMaker Model "${m.name}" (${modelArn}) has no verified training job linkage in the asset inventory. Region: ${meta(m, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM150: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const m of pool.models) {
    if (m.type !== "SageMaker Model") continue;
    const tags = (m.tags || []).map((t: string) => t.toLowerCase());
    const hasApprovalTag = tags.some((t: string) => t.includes("approved") || t.includes("safety-reviewed") || t.includes("production-ready"));
    const hasSafetyReviewTag = tags.some((t: string) => t.includes("safety-review") || t.includes("security-review") || t.includes("reviewed"));
    if (hasApprovalTag && !hasSafetyReviewTag) {
      findings.push(finding(policy, m.id, m.name, m.type,
        `SageMaker Model approved without safety review tag`, orgId, {
          impact: "A model marked as 'Approved' in the registry without a completed 'Safety Review' tag indicates that developers can push unvetted models directly to production. This bypasses security review, bias testing, adversarial robustness testing, and compliance verification, potentially deploying models that produce harmful outputs or contain security vulnerabilities.",
          remediation: "1. Implement model approval workflows requiring 'SafetyReview: Complete' tag.\n2. Use SageMaker Model Registry approval policies with required tags.\n3. Configure SCPs to deny model deployment without review tags.\n4. Automate safety review checks (bias, toxicity, adversarial robustness) in CI/CD.\n5. Require sign-off from designated model risk reviewers.\n6. Implement model cards documenting evaluation results and limitations.",
          evidence: `SageMaker Model "${m.name}" has approval tags [${tags.filter((t: string) => t.includes("approved")).join(", ")}] but lacks safety review tags. Region: ${meta(m, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkSM151: CheckFn = (policy, pool, orgId) => {
  const findings: Finding[] = [];
  for (const r of pool.resources) {
    if (r.type !== "Inference Endpoint" || r.category !== "Inference Endpoints") continue;
    if (r.serviceType !== "SageMaker") continue;
    const dataCaptureEnabled = meta(r, "dataCaptureEnabled");
    if (dataCaptureEnabled !== "true") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `SageMaker Endpoint has data capture disabled`, orgId, {
          impact: "Without DataCaptureConfig enabled, there is no audit trail of AI prompts and responses. This prevents detection of prompt injection attacks, data exfiltration through model outputs, and policy violations in model responses. Regulatory requirements (SOC 2, HIPAA, EU AI Act) mandate logging of AI interactions for accountability and transparency.",
          remediation: "1. Enable DataCaptureConfig on the endpoint configuration.\n2. Configure capture of both input (request) and output (response) data.\n3. Set up S3 destination with encryption for captured data.\n4. Implement sampling strategies for high-traffic endpoints.\n5. Configure data retention policies for compliance.\n6. Set up automated analysis pipelines for captured data.",
          evidence: `SageMaker Inference Endpoint "${r.name}" has DataCaptureConfig disabled. Data capture enabled: "${dataCaptureEnabled}". Status: ${meta(r, "status") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkAZAI001: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if ((r.source || "").toLowerCase().includes("azure") && (r.type.includes("Cognitive Services") || r.type.includes("Azure OpenAI") || r.type.includes("Azure ML"))) {
      if (!meta(r, "managedIdentity") || meta(r, "managedIdentity") === "") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Azure AI resource not registered with a Microsoft Entra Agent ID (Managed Identity)`, orgId, {
            impact: "Identity Shadowing: Without a registered Entra Agent ID, it is extremely difficult to track which agent performed what action or accessed which file. This breaks the audit trail and makes incident investigation nearly impossible.",
            remediation: "1. Enable System-Assigned or User-Assigned Managed Identity on the resource.\n2. Register the AI agent with Microsoft Entra ID.\n3. Use Managed Identity for all authentication instead of keys.\n4. Configure audit logging to track agent actions.\n5. Map each agent to a specific Entra application registration.",
            evidence: `Azure AI resource "${r.name}" (${r.type}) has no Managed Identity configured. managedIdentity="${meta(r, "managedIdentity") || "none"}". Resource ID: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkAZAI002: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "Azure OpenAI Service" || (r.type === "Cognitive Services Account" && meta(r, "kind") === "OpenAI")) {
      const publicAccess = meta(r, "publicNetworkAccess");
      if (publicAccess === "Enabled" || publicAccess === "enabled") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Azure OpenAI Service does not have a Private Endpoint configured`, orgId, {
            impact: "Exposure: Data traverses the public internet, increasing the risk of Man-in-the-Middle (MitM) attacks. API keys and model inputs/outputs are exposed to network-level interception, potentially leaking sensitive prompts and completions.",
            remediation: "1. Create a Private Endpoint for the Azure OpenAI resource.\n2. Disable public network access in the resource's networking settings.\n3. Configure DNS resolution for the private endpoint.\n4. Update application configurations to use the private endpoint URL.\n5. Verify connectivity through the private endpoint before disabling public access.",
            evidence: `Azure OpenAI Service "${r.name}" has publicNetworkAccess="${publicAccess}". Endpoint: ${meta(r, "endpoint") || "N/A"}. Resource ID: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkAZAI003: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "Azure OpenAI Service" || (r.type === "Cognitive Services Account" && meta(r, "kind") === "OpenAI")) {
      const contentFilter = meta(r, "contentFilterEnabled");
      const networkRule = meta(r, "networkRuleSet");
      if (contentFilter === "false" || contentFilter === "off" || contentFilter === "low" || contentFilter === "") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Azure AI Content Safety filters are disabled or set to Low`, orgId, {
            impact: "Harmful Output: The model could generate toxic content or be easily jailbroken by users. Without content safety filters for Hate, Violence, and Self-harm, the service has no guardrails against adversarial prompts producing dangerous or legally actionable responses.",
            remediation: "1. Navigate to Azure AI Studio > Content Filters.\n2. Enable all content safety categories (Hate, Violence, Self-harm, Sexual) at Medium or High threshold.\n3. Configure custom blocklists for organization-specific terms.\n4. Enable prompt shields for jailbreak detection.\n5. Set up alerting for content filter violations.\n6. Review and test filter effectiveness regularly.",
            evidence: `Azure AI resource "${r.name}" has content filtering status="${contentFilter || "not configured"}". Network rule default action="${networkRule || "N/A"}". Resource ID: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkAZAI004: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "Azure ML Workspace" || (r.source || "").toLowerCase().includes("azure machine learning")) {
      const disableLocalAuth = meta(r, "disableLocalAuth");
      const managedId = meta(r, "managedIdentity");
      if (disableLocalAuth !== "true" && (!managedId || managedId === "" || managedId === "None")) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Azure AI Foundry connection using Connection Strings instead of Managed Identities`, orgId, {
            impact: "Credential Leak: Hardcoded connection strings and keys in code or configuration are easily stolen compared to passwordless IAM. If exposed in source control, logs, or error messages, attackers gain persistent access to connected data stores (Blob, SQL).",
            remediation: "1. Enable Managed Identity (System or User-Assigned) on the workspace.\n2. Replace all connection string-based connections with Managed Identity.\n3. Set disableLocalAuth=true to force identity-based authentication.\n4. Rotate and revoke all existing connection string keys.\n5. Use Azure Key Vault for any remaining secrets.\n6. Audit code repositories for committed connection strings.",
            evidence: `Azure ML Workspace "${r.name}" has managedIdentity="${managedId || "none"}", disableLocalAuth="${disableLocalAuth || "false"}". Storage: ${meta(r, "storageAccount") || "N/A"}. Resource ID: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkAZAI005: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if ((r.type === "Azure OpenAI Service" || r.type.includes("Cognitive Services")) && (r.source || "").toLowerCase().includes("azure")) {
      const encryption = meta(r, "encryption");
      if (encryption === "Microsoft.CognitiveServices" || encryption === "" || !encryption) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `AI prompts accessing data without active DLP policy — platform-managed encryption only`, orgId, {
            impact: "Exfiltration: Sensitive company data labeled 'Highly Confidential' in Purview may be used to ground a model without proper masking or DLP controls. Platform-managed encryption alone does not prevent authorized users from extracting sensitive information through model prompts.",
            remediation: "1. Configure Microsoft Purview DLP policies for AI workloads.\n2. Enable Customer-Managed Keys (CMK) for the Cognitive Services resource.\n3. Apply sensitivity labels and enforce them on AI-accessible data stores.\n4. Set up Purview Information Protection scanning on data sources used for grounding.\n5. Implement prompt-level PII detection and masking.",
            evidence: `Azure AI resource "${r.name}" (${r.type}) has encryption="${encryption || "platform-managed"}". Custom subdomain: ${meta(r, "customSubDomainName") || "N/A"}. Resource ID: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkAZAI006: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "Azure ML Workspace") {
      const encryption = meta(r, "encryption");
      if (encryption === "platform-managed" || encryption === "" || !encryption) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Azure Machine Learning workspace missing Customer-Managed Keys (CMK)`, orgId, {
            impact: "IP Theft: Model weights and fine-tuning data are stored in plain text on Microsoft-managed disks. Without CMK, Microsoft controls the encryption keys, and a breach of Microsoft's key management infrastructure could expose all training data, model weights, and experimental notebooks.",
            remediation: "1. Create an Azure Key Vault with a CMK for the ML workspace.\n2. Configure the workspace to use the Key Vault for encryption.\n3. Enable HBI (High Business Impact) workspace mode for additional protections.\n4. Verify all associated storage accounts also use CMK.\n5. Set up key rotation policies in Key Vault.\n6. Monitor Key Vault access logs for unauthorized key usage.",
            evidence: `Azure ML Workspace "${r.name}" has encryption="${encryption || "platform-managed"}". HBI workspace: ${meta(r, "hbiWorkspace") || "false"}. Key Vault: ${meta(r, "keyVault") || "N/A"}. Resource ID: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkAZAI007: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const deprecatedModels = ["gpt-35-turbo", "gpt-3.5", "text-davinci", "code-davinci", "text-curie", "text-babbage", "text-ada"];
  for (const m of pool.models) {
    if ((m.serviceType || "").includes("Azure OpenAI") || (m.type || "").includes("Azure OpenAI")) {
      const name = m.name.toLowerCase();
      for (const deprecated of deprecatedModels) {
        if (name.includes(deprecated)) {
          findings.push(finding(policy, m.id, m.name, m.type,
            `Deployment of deprecated OpenAI model (${deprecated}) with known security vulnerabilities`, orgId, {
              impact: "Compliance: Violates the requirement to use the most secure and updated foundation models. Deprecated models have known prompt injection vulnerabilities, lower safety alignment, and may lack critical security patches applied to newer versions.",
              remediation: "1. Identify all deployments using the deprecated model version.\n2. Migrate to the latest supported model version (e.g., GPT-4o or GPT-4 Turbo).\n3. Test application compatibility with the new model.\n4. Update API calls to reference the new model deployment.\n5. Decommission the deprecated model deployment.\n6. Set up alerts for future model deprecation notices.",
              evidence: `Azure OpenAI model "${m.name}" matches deprecated model pattern "${deprecated}". Status: ${m.status}. Resource ID: ${m.externalId || "N/A"}.`
            }));
          break;
        }
      }
    }
  }
  return findings;
};

const checkGCAI001: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if ((r.serviceType || "").includes("Vertex AI") && (r.type.includes("Endpoint") || r.type.includes("Dataset"))) {
      const network = meta(r, "network");
      if (!network || network === "") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Vertex AI resource located outside of a VPC Service Control (VPC-SC) perimeter`, orgId, {
            impact: "Data Exfiltration: Without VPC Service Controls, identities can move data to unauthorized external buckets or projects. Model data, training datasets, and inference results are not contained within a trusted network boundary, allowing exfiltration to any GCP project.",
            remediation: "1. Create a VPC Service Control perimeter for AI resources.\n2. Add the Vertex AI project to the VPC-SC perimeter.\n3. Configure access levels and ingress/egress rules.\n4. Move endpoints and datasets into VPC-peered networks.\n5. Enable VPC-SC dry run mode first to verify no legitimate traffic is blocked.\n6. Monitor VPC-SC audit logs for violations.",
            evidence: `Vertex AI resource "${r.name}" (${r.type}) has no VPC network configured. Network="${network || "none"}". Location: ${meta(r, "location") || "unknown"}. Resource: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkGCAI002: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if ((r.serviceType || "").includes("Vertex AI") && (r.type.includes("Notebook") || r.type.includes("Workbench"))) {
      if (r.exposure === "Public" || meta(r, "publicIp") === "true" || meta(r, "externalIp") === "true") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Vertex AI Workbench instance has an assigned External IP address`, orgId, {
            impact: "Direct Attack: Attackers can attempt to brute-force or exploit the JupyterLab interface directly from the internet. An exposed notebook provides access to model training data, GCP service account credentials, and potentially the entire project's resources.",
            remediation: "1. Remove the External IP from the Workbench instance.\n2. Use IAP (Identity-Aware Proxy) tunneling for secure access.\n3. Deploy the instance in a private subnet.\n4. Configure Cloud NAT for outbound internet access if needed.\n5. Enable OS Login for SSH key management.\n6. Set up VPC firewall rules to restrict inbound access.",
            evidence: `Vertex AI Workbench "${r.name}" has a public IP. Exposure: ${r.exposure}. Public IP: ${meta(r, "publicIp") || meta(r, "externalIp") || "assigned"}. Resource: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkGCAI003: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if ((r.serviceType || "").includes("Vertex AI") && r.type.includes("Endpoint")) {
      const deployedCount = parseInt(meta(r, "deployedModelsCount") || "0");
      if (deployedCount > 0) {
        const hasModelArmor = meta(r, "modelArmor") === "true" || meta(r, "promptInjectionShield") === "true";
        if (!hasModelArmor) {
          findings.push(finding(policy, r.id, r.name, r.type,
            `Vertex AI model interaction does not have Model Armor (Prompt Injection screening) enabled`, orgId, {
              impact: "Injection: Without Model Armor, the endpoint is vulnerable to jailbreak attempts that bypass system instructions and execute rogue logic. Adversaries can craft prompts to extract system prompts, training data, or manipulate model behavior for malicious purposes.",
              remediation: "1. Enable Model Armor on the Vertex AI endpoint.\n2. Configure prompt injection screening rules.\n3. Set up input validation for common jailbreak patterns.\n4. Enable Vertex AI safety filters on the model deployment.\n5. Implement request/response logging for security monitoring.\n6. Test with known prompt injection payloads to verify protection.",
              evidence: `Vertex AI Endpoint "${r.name}" has ${deployedCount} deployed model(s) but no Model Armor enabled. Model Armor: ${meta(r, "modelArmor") || "not configured"}. Resource: ${r.externalId || "N/A"}.`
            }));
        }
      }
    }
  }
  return findings;
};

const checkGCAI004: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if ((r.serviceType || "").includes("Vertex AI") && (r.type.includes("Dataset") || r.type.includes("Model"))) {
      const encryption = meta(r, "encryptionSpec");
      if (!encryption || encryption === "") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Vertex AI artifact not encrypted with Cloud KMS (CMEK)`, orgId, {
            impact: "Unauthorized Access: If the physical storage is breached, your proprietary model weights are exposed. Google-managed encryption keys do not provide the same level of control as CMEK, preventing you from managing key rotation, access policies, and revocation.",
            remediation: "1. Create a Cloud KMS key ring and key for Vertex AI resources.\n2. Re-create the dataset or model with CMEK encryption specified.\n3. Grant the Vertex AI service account access to the KMS key.\n4. Configure automatic key rotation in Cloud KMS.\n5. Set up monitoring for key usage and access patterns.\n6. Ensure backup/DR procedures account for the CMEK key dependency.",
            evidence: `Vertex AI resource "${r.name}" (${r.type}) has no CMEK encryption. encryptionSpec="${encryption || "none (Google-managed)"}". Location: ${meta(r, "location") || "unknown"}. Resource: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  for (const m of pool.models) {
    if ((m.serviceType || "").includes("Vertex AI")) {
      const encryption = meta(m, "encryptionSpec");
      if (!encryption || encryption === "") {
        findings.push(finding(policy, m.id, m.name, m.type,
          `Vertex AI Model not encrypted with Cloud KMS (CMEK)`, orgId, {
            impact: "Unauthorized Access: If the physical storage is breached, your proprietary model weights are exposed. Without CMEK, you cannot control key lifecycle, rotation, or revocation.",
            remediation: "1. Create a Cloud KMS key and grant Vertex AI service account access.\n2. Re-upload the model with CMEK encryption configured.\n3. Configure automatic key rotation.\n4. Monitor KMS key usage.",
            evidence: `Vertex AI Model "${m.name}" has no CMEK encryption. encryptionSpec="${encryption || "none (Google-managed)"}". Location: ${meta(m, "location") || "unknown"}. Resource: ${m.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkGCAI005: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if ((r.serviceType || "").includes("Vertex AI") && (r.type.includes("Notebook") || r.type.includes("Workbench") || r.type.includes("Compute"))) {
      const rootAccess = meta(r, "rootAccess") || meta(r, "enableRootAccess");
      if (rootAccess === "true" || rootAccess === "enabled") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Vertex AI Workbench instance has Root Access enabled`, orgId, {
            impact: "Breakout: Users with root access could disable Google-managed security agents, side-load malicious binaries, modify system configurations, or escape containerization. This fundamentally undermines the security posture of the compute environment.",
            remediation: "1. Disable root access on the Workbench instance.\n2. Use IAM roles and sudo rules for specific privileged operations.\n3. Deploy a custom container image with required tools pre-installed.\n4. Enable Container-Optimized OS for reduced attack surface.\n5. Set up Cloud Audit Logs for monitoring privileged operations.\n6. Implement OS Login with 2FA for SSH access.",
            evidence: `Vertex AI Workbench "${r.name}" has rootAccess="${rootAccess}". Resource: ${r.externalId || "N/A"}.`
          }));
      }
    }
  }
  return findings;
};

const checkGCAI006: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const m of pool.models) {
    if ((m.serviceType || "").includes("Vertex AI") && m.type.includes("Model")) {
      const state = (m.status || "").toLowerCase();
      if (state === "uploading" || state === "importing" || state === "active") {
        const tags = (m.tags || []).map(t => t.toLowerCase());
        const hasApprovedSource = tags.some(t => t.includes("approved") || t.includes("verified") || t.includes("trusted"));
        if (!hasApprovedSource) {
          findings.push(finding(policy, m.id, m.name, m.type,
            `Model uploaded from a GCS bucket not in the approved AI data list`, orgId, {
              impact: "Supply Chain: Prevents poisoned models or unverified weights from being served in production. Without source verification, adversaries can upload models with backdoors, biased weights, or trojan triggers that activate on specific inputs.",
              remediation: "1. Maintain an approved GCS bucket list for model sources.\n2. Implement a model upload policy that validates source bucket.\n3. Add 'approved' or 'verified' tags after security review.\n4. Scan all uploaded models with integrity checking tools.\n5. Require model provenance documentation before deployment.\n6. Set up Organization Policy constraints on allowed source buckets.",
              evidence: `Vertex AI Model "${m.name}" (status: ${m.status}) lacks approved/verified/trusted tags. Tags: [${(m.tags || []).join(", ")}]. Resource: ${m.externalId || "N/A"}.`
            }));
        }
      }
    }
  }
  return findings;
};

const checkGCAI007: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if ((r.serviceType || "").includes("Vertex AI") && r.type.includes("Endpoint")) {
      const deployedCount = parseInt(meta(r, "deployedModelsCount") || "0");
      if (deployedCount > 0) {
        const loggingEnabled = meta(r, "requestLogging") === "true" || meta(r, "predictionLogging") === "true" || meta(r, "enableAccessLogging") === "true";
        if (!loggingEnabled) {
          findings.push(finding(policy, r.id, r.name, r.type,
            `Vertex AI Endpoint has Data Logging disabled — no visibility into user prompts`, orgId, {
              impact: "Audit Blindness: Without prediction logging, you cannot investigate a security incident or a prompt injection after it happens. There is no record of what prompts were sent, what responses were generated, or whether sensitive data was extracted through model interactions.",
              remediation: "1. Enable request-response logging on the Vertex AI endpoint.\n2. Configure BigQuery or Cloud Storage as the logging destination.\n3. Set up sampling rate appropriate for the endpoint's traffic volume.\n4. Implement log analysis pipelines for security monitoring.\n5. Configure log retention policies for compliance.\n6. Set up alerts for suspicious prompt patterns in logged data.",
              evidence: `Vertex AI Endpoint "${r.name}" has ${deployedCount} deployed model(s) but no prediction logging enabled. Request logging: ${meta(r, "requestLogging") || "not configured"}. Resource: ${r.externalId || "N/A"}.`
            }));
        }
      }
    }
  }
  return findings;
};

const checkHF001: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "HF Model" && meta(r, "private") !== "true") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Public Hugging Face model repository exposes proprietary model weights`, orgId, {
          impact: "Proprietary model weights and architecture are exposed publicly on Hugging Face Hub. Anyone can download, clone, and redistribute the model, potentially leading to intellectual property theft, competitive disadvantage, and unauthorized use of fine-tuned models containing organization-specific knowledge.",
          remediation: "1. Set the repository visibility to 'private' on Hugging Face Hub.\n2. Enable gated access if the model must remain discoverable.\n3. Review the model files for any sensitive data or proprietary training artifacts.\n4. Implement access tokens with read-only scopes for authorized consumers.\n5. Consider hosting sensitive models on private infrastructure instead.",
          evidence: `Model "${r.name}" (${r.type}) has private="${meta(r, "private") || "false"}". Downloads: ${meta(r, "downloads") || "unknown"}. Likes: ${meta(r, "likes") || "0"}. External ID: ${r.externalId || "N/A"}.`
        }));
    }
  }
  for (const m of pool.models) {
    if (m.type === "HF Model" && meta(m, "private") !== "true") {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Public Hugging Face model repository exposes proprietary model weights`, orgId, {
          impact: "Proprietary model weights and architecture are exposed publicly on Hugging Face Hub.",
          remediation: "1. Set the repository visibility to 'private' on Hugging Face Hub.\n2. Enable gated access if the model must remain discoverable.",
          evidence: `Model "${m.name}" has private="${meta(m, "private") || "false"}".`
        }));
    }
  }
  return findings;
};

const checkHF002: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const sensitiveKeywords = ["pii", "medical", "financial", "proprietary", "health", "hipaa", "gdpr", "confidential", "personal"];
  for (const r of pool.resources) {
    if (r.type === "HF Dataset" && meta(r, "private") !== "true") {
      const tags = (r.tags || []).map(t => t.toLowerCase());
      const matchedTag = sensitiveKeywords.find(kw => tags.some(t => t.includes(kw)));
      if (matchedTag) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Public Hugging Face dataset contains sensitive tags: "${matchedTag}"`, orgId, {
            impact: "A publicly accessible dataset tagged with sensitive categories (PII, medical, financial) may expose regulated data to unauthorized access, violating GDPR, HIPAA, or financial data protection regulations. Public datasets can be freely downloaded and redistributed.",
            remediation: "1. Immediately set the dataset repository to 'private'.\n2. Audit the dataset contents for actual sensitive data.\n3. Apply data masking or anonymization before any public release.\n4. Remove sensitive tags if the data has been properly anonymized.\n5. Implement gated access with usage agreements for sensitive datasets.",
            evidence: `Dataset "${r.name}" is public (private="${meta(r, "private") || "false"}") and has sensitive tag matching "${matchedTag}". Tags: [${(r.tags || []).join(", ")}].`
          }));
      }
    }
  }
  return findings;
};

const checkHF003: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "HF Inference Endpoint" && meta(r, "type") === "public") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Hugging Face Inference Endpoint accessible without authentication`, orgId, {
          impact: "A public inference endpoint allows anyone on the internet to query the model without authentication. This enables unauthorized usage, model extraction through repeated queries, prompt injection attacks, and uncontrolled compute costs. Attackers can abuse the endpoint for free inference at the organization's expense.",
          remediation: "1. Change the endpoint security type from 'public' to 'protected' or 'private'.\n2. Implement API token authentication for all inference requests.\n3. Set up rate limiting to prevent abuse.\n4. Monitor endpoint usage for anomalous query patterns.\n5. Consider using private endpoints within your VPC for sensitive models.",
          evidence: `Inference Endpoint "${r.name}" has type="${meta(r, "type")}". State: ${meta(r, "state") || "unknown"}. Provider: ${meta(r, "provider") || "unknown"}. Region: ${meta(r, "region") || "unknown"}.`
        }));
    }
  }
  return findings;
};

const checkHF004: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  const activeStates = ["running", "scaled-to-zero", "scaledtozero"];
  for (const r of pool.resources) {
    if (r.type === "HF Inference Endpoint") {
      const state = (meta(r, "state") || "").toLowerCase();
      if (state && !activeStates.includes(state)) {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Hugging Face Inference Endpoint in inactive state: "${state}"`, orgId, {
            impact: "An inference endpoint in a failed, paused, or error state suggests an unmonitored or abandoned deployment. These endpoints may still incur costs, lack security updates, and could indicate operational issues that need immediate attention.",
            remediation: "1. Investigate why the endpoint is in a '${state}' state.\n2. If the endpoint is no longer needed, delete it to stop costs.\n3. If it should be running, troubleshoot and restore it.\n4. Set up monitoring alerts for endpoint state changes.\n5. Implement lifecycle management for all inference endpoints.",
            evidence: `Inference Endpoint "${r.name}" has state="${state}". Expected: "running" or "scaled-to-zero". Model: ${meta(r, "modelRepository") || "unknown"}. Provider: ${meta(r, "provider") || "unknown"}.`
          }));
      }
    }
  }
  return findings;
};

const checkHF005: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "HF Model") {
      const license = meta(r, "license") || "";
      if (!license || license === "unknown" || license === "none" || license === "") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Hugging Face model lacks a defined license`, orgId, {
            impact: "A model without a license creates legal uncertainty for both the organization and any downstream consumers. Without clear licensing terms, the model's usage rights, redistribution permissions, and liability terms are undefined, creating compliance and legal risks.",
            remediation: "1. Add an appropriate license to the model repository (e.g., Apache-2.0, MIT, CC-BY-4.0).\n2. Review the training data licenses to ensure compatibility.\n3. Consult legal counsel for proprietary or restricted-use models.\n4. Document license terms in the model card.\n5. Implement a policy requiring licenses for all published models.",
            evidence: `Model "${r.name}" has license="${license || "not set"}". Tags: [${(r.tags || []).join(", ")}].`
          }));
      }
    }
  }
  for (const m of pool.models) {
    if (m.type === "HF Model") {
      const license = meta(m, "license") || "";
      if (!license || license === "unknown" || license === "none" || license === "") {
        findings.push(finding(policy, m.id, m.name, m.type,
          `Hugging Face model lacks a defined license`, orgId, {
            impact: "A model without a license creates legal uncertainty for both the organization and any downstream consumers.",
            remediation: "1. Add an appropriate license to the model repository.\n2. Review training data licenses for compatibility.",
            evidence: `Model "${m.name}" has license="${license || "not set"}".`
          }));
      }
    }
  }
  return findings;
};

const checkHF006: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "HF Model") {
      const tags = (r.tags || []).map(t => t.toLowerCase());
      const libraryName = (meta(r, "library_name") || meta(r, "libraryName") || "").toLowerCase();
      const hasPickle = tags.some(t => t.includes("pickle"));
      const hasPytorchWithoutSafetensors = libraryName.includes("pytorch") && !tags.some(t => t.includes("safetensors"));
      if (hasPickle || hasPytorchWithoutSafetensors) {
        const reason = hasPickle ? "tagged with 'pickle'" : "uses PyTorch without safetensors format";
        findings.push(finding(policy, r.id, r.name, r.type,
          `Hugging Face model uses unsafe serialization format (${reason})`, orgId, {
            impact: "Pickle-based model files can execute arbitrary code during deserialization, enabling Remote Code Execution (RCE) attacks. An attacker who can modify model files could embed malicious payloads that execute when the model is loaded, potentially compromising the entire inference infrastructure.",
            remediation: "1. Convert model weights to SafeTensors format, which prevents arbitrary code execution.\n2. Remove pickle-format model files from the repository.\n3. Use model scanning tools to detect malicious payloads in existing pickle files.\n4. Implement a policy requiring SafeTensors format for all new model uploads.\n5. Verify model file integrity with SHA-256 checksums before loading.",
            evidence: `Model "${r.name}" ${reason}. Library: ${libraryName || "unknown"}. Tags: [${(r.tags || []).join(", ")}].`
          }));
      }
    }
  }
  return findings;
};

const checkHF007: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "HF Space" && meta(r, "private") !== "true") {
      const runtimeStage = (meta(r, "runtimeStage") || "").toUpperCase();
      if (runtimeStage === "RUNNING") {
        findings.push(finding(policy, r.id, r.name, r.type,
          `Public Hugging Face Space is actively running`, orgId, {
            impact: "A publicly accessible Space with an active runtime exposes the application to anyone on the internet. This can lead to unauthorized access to underlying models, data leakage through the application interface, compute resource abuse, and potential exploitation of application vulnerabilities.",
            remediation: "1. Set the Space visibility to 'private' if it contains sensitive functionality.\n2. Implement authentication in the Space application (e.g., Gradio auth).\n3. Review the Space for any exposed API keys, credentials, or sensitive data.\n4. Monitor Space usage for unusual traffic patterns.\n5. Consider using Hugging Face's gated access for controlled sharing.",
            evidence: `Space "${r.name}" is public (private="${meta(r, "private") || "false"}") with runtimeStage="${runtimeStage}". SDK: ${meta(r, "sdk") || "unknown"}.`
          }));
      }
    }
  }
  return findings;
};

const checkHF008: CheckFn = (policy, pool, orgId) => {
  const findings: InsertPolicyFinding[] = [];
  for (const r of pool.resources) {
    if (r.type === "HF Model" && meta(r, "gated") !== "true" && meta(r, "private") !== "true") {
      findings.push(finding(policy, r.id, r.name, r.type,
        `Public Hugging Face model without gated access control`, orgId, {
          impact: "A public model without gated access allows anyone to download the model weights without any approval process or usage agreement. This prevents the organization from tracking who uses the model, enforcing acceptable use policies, or complying with export control regulations.",
          remediation: "1. Enable gated access on the model repository to require user approval.\n2. Add a usage agreement that users must accept before downloading.\n3. If the model should not be public, set the repository to 'private'.\n4. Implement access logging to track model downloads.\n5. Review export control requirements for the model technology.",
          evidence: `Model "${r.name}" is public (private="${meta(r, "private") || "false"}") without gated access (gated="${meta(r, "gated") || "false"}"). Downloads: ${meta(r, "downloads") || "unknown"}.`
        }));
    }
  }
  for (const m of pool.models) {
    if (m.type === "HF Model" && meta(m, "gated") !== "true" && meta(m, "private") !== "true") {
      findings.push(finding(policy, m.id, m.name, m.type,
        `Public Hugging Face model without gated access control`, orgId, {
          impact: "A public model without gated access allows anyone to download the model weights without any approval process.",
          remediation: "1. Enable gated access on the model repository.\n2. Add a usage agreement for downloaders.",
          evidence: `Model "${m.name}" is public without gated access. Gated: "${meta(m, "gated") || "false"}".`
        }));
    }
  }
  return findings;
};

const RULE_CHECKS: Record<string, CheckFn> = {
  "DIS-001": checkDIS001, "DIS-002": checkDIS002, "DIS-003": checkDIS003,
  "DIS-004": checkDIS004, "DIS-005": checkDIS005, "INF-006": checkINF006,
  "INF-007": checkINF007, "INF-008": checkINF008, "INF-009": checkINF009,
  "INF-010": checkINF010, "DAT-011": checkDAT011, "DAT-012": checkDAT012,
  "DAT-013": checkDAT013, "DAT-014": checkDAT014, "DAT-015": checkDAT015,
  "IAM-016": checkIAM016, "IAM-017": checkIAM017, "IAM-018": checkIAM018,
  "IAM-019": checkIAM019, "IAM-020": checkIAM020, "GRD-021": checkGRD021,
  "GRD-022": checkGRD022, "GRD-023": checkGRD023, "GRD-024": checkGRD024,
  "GRD-025": checkGRD025, "SUP-026": checkSUP026, "SUP-027": checkSUP027,
  "SUP-028": checkSUP028, "SUP-029": checkSUP029, "SUP-030": checkSUP030,
  "MON-031": checkMON031, "MON-032": checkMON032, "MON-033": checkMON033,
  "MON-034": checkMON034, "MON-035": checkMON035, "GOV-036": checkGOV036,
  "GOV-037": checkGOV037, "GOV-038": checkGOV038, "GOV-039": checkGOV039,
  "GOV-040": checkGOV040, "RUN-041": checkRUN041, "RUN-042": checkRUN042,
  "RUN-043": checkRUN043, "RUN-044": checkRUN044, "RUN-045": checkRUN045,
  "IAM-046": checkIAM046, "IAM-047": checkIAM047, "IAM-048": checkIAM048,
  "IAM-049": checkIAM049, "IAM-050": checkIAM050, "IAM-051": checkIAM051,
  "IAM-052": checkIAM052, "IAM-053": checkIAM053, "IAM-054": checkIAM054,
  "IAM-055": checkIAM055, "IAM-056": checkIAM056, "IAM-057": checkIAM057,
  "IAM-058": checkIAM058, "IAM-059": checkIAM059, "IAM-060": checkIAM060,
  "NET-061": checkNET061, "NET-062": checkNET062, "NET-063": checkNET063,
  "NET-064": checkNET064, "NET-065": checkNET065, "NET-066": checkNET066,
  "NET-067": checkNET067, "NET-068": checkNET068, "NET-069": checkNET069,
  "NET-070": checkNET070, "NET-071": checkNET071, "NET-072": checkNET072,
  "NET-073": checkNET073, "NET-074": checkNET074, "NET-075": checkNET075,
  "SUP-076": checkSUP076, "SUP-077": checkSUP077, "SUP-078": checkSUP078,
  "SUP-079": checkSUP079, "SUP-080": checkSUP080, "SUP-081": checkSUP081,
  "SUP-082": checkSUP082, "SUP-083": checkSUP083, "SUP-084": checkSUP084,
  "SUP-085": checkSUP085, "SUP-086": checkSUP086, "SUP-087": checkSUP087,
  "SUP-088": checkSUP088, "SUP-089": checkSUP089, "SUP-090": checkSUP090,
  "COM-091": checkCOM091, "COM-092": checkCOM092, "COM-093": checkCOM093,
  "COM-094": checkCOM094, "COM-095": checkCOM095, "COM-096": checkCOM096,
  "COM-097": checkCOM097, "COM-098": checkCOM098, "COM-099": checkCOM099,
  "COM-100": checkCOM100,
  "KEN-111": checkKEN111, "KEN-112": checkKEN112, "KEN-113": checkKEN113,
  "LEX-114": checkLEX114, "LEX-115": checkLEX115, "LEX-116": checkLEX116,
  "QBI-117": checkQBI117, "QBI-118": checkQBI118,
  "EDG-119": checkEDG119, "EDG-120": checkEDG120, "FLO-121": checkFLO121,
  "FLO-122": checkFLO122, "FLO-123": checkFLO123, "CGR-124": checkCGR124,
  "CGR-125": checkCGR125, "CGR-126": checkCGR126,
  "INF-127": checkINF127, "INF-128": checkINF128, "INF-129": checkINF129,
  "INF-130": checkINF130, "INF-131": checkINF131, "DAT-132": checkDAT132,
  "BCM-133": checkBCM133, "BCM-134": checkBCM134, "BCM-135": checkBCM135,
  "BCM-136": checkBCM136, "BCM-137": checkBCM137,
  "SM-138": checkSM138, "SM-139": checkSM139, "SM-140": checkSM140,
  "SM-141": checkSM141, "SM-142": checkSM142, "SM-143": checkSM143,
  "SM-144": checkSM144, "SM-145": checkSM145, "SM-146": checkSM146,
  "SM-147": checkSM147, "SM-148": checkSM148, "SM-149": checkSM149,
  "SM-150": checkSM150, "SM-151": checkSM151,
  "AZ-AI-001": checkAZAI001, "AZ-AI-002": checkAZAI002, "AZ-AI-003": checkAZAI003,
  "AZ-AI-004": checkAZAI004, "AZ-AI-005": checkAZAI005, "AZ-AI-006": checkAZAI006,
  "AZ-AI-007": checkAZAI007,
  "GC-AI-001": checkGCAI001, "GC-AI-002": checkGCAI002, "GC-AI-003": checkGCAI003,
  "GC-AI-004": checkGCAI004, "GC-AI-005": checkGCAI005, "GC-AI-006": checkGCAI006,
  "GC-AI-007": checkGCAI007,
  "HF-001": checkHF001, "HF-002": checkHF002, "HF-003": checkHF003,
  "HF-004": checkHF004, "HF-005": checkHF005, "HF-006": checkHF006,
  "HF-007": checkHF007, "HF-008": checkHF008,
};

export const DEFAULT_POLICIES = [
  { ruleId: "DIS-001", name: "Shadow AI: Unsanctioned SaaS AI", description: "Detect traffic to unauthorized AI providers (e.g., Perplexity, Claude) from corporate VPCs.", category: "DIS", severity: "High", applicability: "Multi-Cloud (Network)" },
  { ruleId: "DIS-002", name: "Rogue SageMaker Notebooks", description: "Flag SageMaker notebook instances with public IP addresses and no VPC connectivity.", category: "DIS", severity: "Critical", applicability: "AWS" },
  { ruleId: "DIS-003", name: "Unmanaged Azure AI Foundry", description: "Identify Azure AI Foundry projects created outside of approved subscriptions/management groups.", category: "DIS", severity: "High", applicability: "Azure" },
  { ruleId: "DIS-004", name: "Uninventoried Vertex AI Endpoints", description: "Detect Vertex AI endpoints that are not tagged with a valid \"Owner\" or \"Project ID\".", category: "DIS", severity: "Medium", applicability: "GCP" },
  { ruleId: "DIS-005", name: "Ghost Model Artifacts", description: "Identify orphaned .bin or .safetensors files in S3/Blob storage not linked to a deployed model.", category: "DIS", severity: "Medium", applicability: "Multi-Cloud (Storage)" },
  { ruleId: "INF-006", name: "Public Inference Endpoints", description: "Flag any AI model endpoint (Bedrock/Azure OpenAI) with an access policy of Allow *.", category: "INF", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "INF-007", name: "Missing Private Endpoints", description: "Alert if Bedrock or OpenAI services are accessed via public internet instead of PrivateLink.", category: "INF", severity: "High", applicability: "AWS / Azure" },
  { ruleId: "INF-008", name: "Unencrypted Model Weights", description: "Detect model artifacts in buckets/disks without Customer-Managed Encryption Keys (CMEK).", category: "INF", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "INF-009", name: "Insecure Vector DB Access", description: "Flag Pinecone or Weaviate instances in the cloud with \"Open to World\" firewall rules.", category: "INF", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "INF-010", name: "Legacy Model Version Use", description: "Detect usage of deprecated or EOL model versions (e.g., GPT-3.5-Turbo-0301) with known flaws.", category: "INF", severity: "Medium", applicability: "Multi-Cloud (API)" },
  { ruleId: "DAT-011", name: "PII in Training Buckets", description: "Scan data sources used for \"Fine-tuning\" for clear-text SSNs, emails, or credit card info.", category: "DAT", severity: "Critical", applicability: "Multi-Cloud (DSPM)" },
  { ruleId: "DAT-012", name: "Unmasked Prompt Logs", description: "Detect if AI prompt/response logs are being stored in unencrypted, publicly accessible buckets.", category: "DAT", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "DAT-013", name: "Cross-Region AI Data Flow", description: "Flag if training data is being moved to a cloud region restricted by data residency laws (GDPR).", category: "DAT", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "DAT-014", name: "Embedding Data Leakage", description: "Detect if vector embeddings are generated from sensitive data without proper salt/hashing.", category: "DAT", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "DAT-015", name: "Shadow Data Pipelines", description: "Identify Dataflow or Glue jobs moving data from production DBs into AI-specific buckets.", category: "DAT", severity: "High", applicability: "GCP / AWS" },
  { ruleId: "IAM-016", name: "Overprivileged SageMaker Role", description: "Alert on SageMaker execution roles with AdministratorAccess or s3:* permissions.", category: "IAM", severity: "Critical", applicability: "AWS" },
  { ruleId: "IAM-017", name: "AI Service Principal Key Age", description: "Flag service accounts used for AI API access that haven't rotated keys in >90 days.", category: "IAM", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "IAM-018", name: "Anonymous Model Evaluation", description: "Detect model \"Evaluation\" jobs triggered by identities without multi-factor authentication (MFA).", category: "IAM", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "IAM-019", name: "User-to-Model Entitlement Drift", description: "Alert when a user who left the \"AI Research\" group still has InvokeModel permissions.", category: "IAM", severity: "High", applicability: "Multi-Cloud (CIEM)" },
  { ruleId: "IAM-020", name: "Leaked AI Tokens in Code", description: "Scan CloudShell and Lambda environment variables for hardcoded OPENAI_API_KEY.", category: "IAM", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "GRD-021", name: "Disabled Content Safety Filters", description: "Detect if Azure OpenAI / Bedrock Guardrails are set to \"Disabled\" or \"Low\" severity.", category: "GRD", severity: "High", applicability: "AWS / Azure" },
  { ruleId: "GRD-022", name: "Missing Prompt Injection Shield", description: "Flag model deployments that do not have a dedicated \"Jailbreak\" detection layer enabled.", category: "GRD", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "GRD-023", name: "Unconstrained Model Output", description: "Detect if max_tokens is set to unlimited, risking Model Denial of Service (DoS).", category: "GRD", severity: "Medium", applicability: "Multi-Cloud (API)" },
  { ruleId: "GRD-024", name: "Excessive Model Temperature", description: "Flag production models with temperature > 1.2, increasing hallucination/instability risks.", category: "GRD", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "GRD-025", name: "Missing Grounding Check", description: "Alert on RAG (Retrieval Augmented Generation) pipelines with no \"Factuality\" check enabled.", category: "GRD", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "SUP-026", name: "Untrusted Model Source", description: "Flag Custom Model Import jobs from untrusted registries or non-corporate HuggingFace repos.", category: "SUP", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "SUP-027", name: "Insecure Python AI Packages", description: "Scan AI container images for vulnerable libraries (e.g., old versions of Transformers, LangChain).", category: "SUP", severity: "High", applicability: "Multi-Cloud (SCA)" },
  { ruleId: "SUP-028", name: "Unsigned Model Binaries", description: "Detect if model weights being loaded into production lack a valid digital signature/hash.", category: "SUP", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "SUP-029", name: "Malicious Pickle File Load", description: "Flag code in notebooks/functions using pickle.load() on untrusted model files.", category: "SUP", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "SUP-030", name: "Shadow Plugin Usage", description: "Detect LLM \"Tools\" or \"Plugins\" that are not in the organization's approved manifest.", category: "SUP", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "MON-031", name: "AI Token Usage Spike", description: "Alert on >300% increase in token consumption by a single IAM role within 1 hour (DoS).", category: "MON", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "MON-032", name: "Persistent Safety Violations", description: "Flag an identity that has triggered \"Content Filter\" blocks >50 times in a 24-hour period.", category: "MON", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "MON-033", name: "Unmonitored AI Workspaces", description: "Detect Azure Machine Learning workspaces with \"Diagnostic Logging\" turned off.", category: "MON", severity: "Medium", applicability: "Azure" },
  { ruleId: "MON-034", name: "Model Drift Alert Missing", description: "Identify deployed models that do not have an active \"Monitoring Schedule\" for performance.", category: "MON", severity: "Medium", applicability: "AWS / GCP" },
  { ruleId: "MON-035", name: "Direct Prompt Injection Logs", description: "Alert on log patterns containing common jailbreak strings (e.g., \"DAN\", \"ignore previous\").", category: "MON", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "GOV-036", name: "Uncategorized AI High-Risk", description: "Flag AI systems with use_case: hris or use_case: finance missing \"High Risk\" compliance tags.", category: "GOV", severity: "High", applicability: "EU AI Act / GRC" },
  { ruleId: "GOV-037", name: "Missing Model Card", description: "Detect models in the registry that lack a documented \"Model Card\" (intended use/biases).", category: "GOV", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "GOV-038", name: "Human-in-Loop Bypass", description: "Alert if a model with \"Write\" access to a DB does not require human approval for actions.", category: "GOV", severity: "Critical", applicability: "Multi-Cloud (Agents)" },
  { ruleId: "GOV-039", name: "Cross-Tenant Data Training", description: "Flag if a model in Dev is trained on data residing in the Prod tenant/account.", category: "GOV", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "GOV-040", name: "AI Bias Monitoring Gap", description: "Detect high-stakes inference endpoints that lack \"Fairness\" or \"Bias\" metrics tracking.", category: "GOV", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "RUN-041", name: "Insecure Output to SQL", description: "Flag LLM outputs being passed directly to SQL query executors without parameterization.", category: "RUN", severity: "Critical", applicability: "AppSec / LLM" },
  { ruleId: "RUN-042", name: "XSS in LLM Web UI", description: "Detect if the front-end for the AI model does not sanitize the response string for JS.", category: "RUN", severity: "High", applicability: "AppSec / LLM" },
  { ruleId: "RUN-043", name: "SSRF via LLM Tools", description: "Alert if an AI agent is permitted to fetch internal URLs (e.g., http://169.254.169.254).", category: "RUN", severity: "Critical", applicability: "AWS / GCP / Azure" },
  { ruleId: "RUN-044", name: "Model Inversion Pattern", description: "Detect high-frequency queries that appear to be probing model boundary weights (Extraction).", category: "RUN", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "RUN-045", name: "Sensitive Data in System Prompt", description: "Scan \"System Prompts\" for hardcoded credentials, API keys, or internal IP addresses.", category: "RUN", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "IAM-046", name: "Short-Lived Token Enforcement", description: "Detect AI Agent service accounts or IAM roles using long-lived access keys instead of temporary, session-based credentials (STS).", category: "IAM", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "IAM-047", name: "Agent S3 Prefix Restriction", description: "Alert if an AI Agent's IAM policy allows s3:GetObject on an entire bucket instead of a specific subdirectory (prefix) designated for that agent.", category: "IAM", severity: "Medium", applicability: "AWS / GCP" },
  { ruleId: "IAM-048", name: "MFA for Custom Model Deletion", description: "Flag any IAM policy that allows DeleteModel or DeleteResolver actions without an explicit MultiFactorAuthPresent: true condition.", category: "IAM", severity: "High", applicability: "AWS / Azure" },
  { ruleId: "IAM-049", name: "Agent-to-Secrets Manager Leak", description: "Detect AI execution roles that have SecretsManager:GetSecretValue permissions for secrets not tagged with the agent's unique ID.", category: "IAM", severity: "High", applicability: "AWS / Azure" },
  { ruleId: "IAM-050", name: "Cross-Account Agent Assumption", description: "Alert on AssumeRole trust relationships that allow AI agents from external/untrusted accounts to invoke models in the production environment.", category: "IAM", severity: "Critical", applicability: "AWS" },
  { ruleId: "IAM-051", name: "Excessive Agent Write Perms", description: "Flag AI Agents with Update, Delete, or Put permissions on production databases (RDS/DynamoDB) without an approval-flow middleware.", category: "IAM", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "IAM-052", name: "Wildcard Model Invocation", description: "Detect IAM policies using bedrock:InvokeModel on Resource: *. Agents should be restricted to specific approved Model ARNs.", category: "IAM", severity: "High", applicability: "AWS" },
  { ruleId: "IAM-053", name: "Unused AI Agent Identities", description: "Identify AI-specific Service Accounts or Roles that have not performed an Invoke or Training action in the last 30 days (Ghost Agents).", category: "IAM", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "IAM-054", name: "Agent Boundary Enforcement", description: "Detect AI roles missing an IAM Permission Boundary. Boundaries prevent agents from escalating their own permissions via prompt injection.", category: "IAM", severity: "High", applicability: "AWS" },
  { ruleId: "IAM-055", name: "Shadow Agent Creation", description: "Alert when a non-admin user creates a new Service Principal with AI Developer or Vertex AI User roles assigned.", category: "IAM", severity: "High", applicability: "GCP / Azure" },
  { ruleId: "IAM-056", name: "Interactive Login for Agents", description: "Flag AI Service Accounts that have Interactive Login enabled. Agents should only authenticate via non-interactive API keys or tokens.", category: "IAM", severity: "Medium", applicability: "Azure / GCP" },
  { ruleId: "IAM-057", name: "Agent Metadata Access (SSRF)", description: "Detect AI Agents running on EC2/Compute Engine that have access to the Instance Metadata Service (IMDSv1), which is vulnerable to SSRF.", category: "IAM", severity: "Critical", applicability: "AWS / GCP" },
  { ruleId: "IAM-058", name: "Insecure Agent Key Storage", description: "Scan Agent configuration files (e.g., config.yaml or .env) in cloud storage for plaintext AI API keys or Bearer tokens.", category: "IAM", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "IAM-059", name: "Over-scoped Search Permissions", description: "Alert if an AI Agent used for RAG (Retrieval) has Search permissions across indices it does not need for its specific task.", category: "IAM", severity: "Medium", applicability: "Elastic / Kendra" },
  { ruleId: "IAM-060", name: "Agent Privilege Escalation via Lambda", description: "Detect AI Agents with lambda:UpdateFunctionCode permissions, which could allow an injected prompt to rewrite the agent's own logic.", category: "IAM", severity: "Critical", applicability: "AWS" },
  { ruleId: "NET-061", name: "Exposed Vector DB API", description: "Detect Pinecone, Weaviate, or Milvus control planes exposed to 0.0.0.0/0 (Public Internet).", category: "NET", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "NET-062", name: "Missing VPC Peering Isolation", description: "Flag AI inference clusters that are peered with the entire Corporate VPC instead of a restricted AI Sandbox subnet.", category: "NET", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "NET-063", name: "Unencrypted Vector Transit", description: "Detect if communication between the LLM Agent and the Vector Database is using unencrypted HTTP (Port 80) instead of HTTPS (443).", category: "NET", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "NET-064", name: "Shared Vector Index Risk", description: "Alert if Tenant A and Tenant B data are stored in the same Vector Index without logical Metadata Filtering enforcement.", category: "NET", severity: "High", applicability: "Multi-Tenant AI" },
  { ruleId: "NET-065", name: "Insecure SageMaker Edge", description: "Flag SageMaker Edge Manager deployments with open SSH (Port 22) or unauthenticated local endpoints.", category: "NET", severity: "High", applicability: "AWS" },
  { ruleId: "NET-066", name: "Anomalous Outbound Data", description: "Detect an AI Model instance sending >1GB of data to an unknown external IP (Potential Model/Weight exfiltration).", category: "NET", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "NET-067", name: "Legacy TLS for AI APIs", description: "Flag AI service endpoints that still support TLS 1.0 or 1.1 instead of enforced TLS 1.2+.", category: "NET", severity: "Medium", applicability: "GCP / Azure" },
  { ruleId: "NET-068", name: "Unprotected Prompt Gateway", description: "Detect if the AI Gateway (Kong, Apigee, etc.) is missing a Web Application Firewall (WAF) to block basic SQLi/XSS.", category: "NET", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "NET-069", name: "Vector DB Backup Exposure", description: "Identify snapshots/backups of Vector Databases stored in publicly readable S3 buckets or Azure Blobs.", category: "NET", severity: "Critical", applicability: "Multi-Cloud" },
  { ruleId: "NET-070", name: "Unauthenticated Prometheus/Grafana", description: "Detect monitoring dashboards for AI clusters (GPU utilization, etc.) that lack SSO/MFA.", category: "NET", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "NET-071", name: "Direct Database Connection", description: "Alert if an AI Agent connects directly to a Production SQL Database without going through a Proxy or API layer.", category: "NET", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "NET-072", name: "Missing Rate Limiting (DDoS)", description: "Flag AI Inference endpoints that lack a Request-per-Minute (RPM) cap, making them vulnerable to Token Exhaustion attacks.", category: "NET", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "NET-073", name: "Insecure Kubernetes Ingress", description: "Detect K8s Ingress controllers for AI models (e.g., KServe) missing cert-manager for automatic SSL/TLS rotation.", category: "NET", severity: "Medium", applicability: "Multi-Cloud (K8s)" },
  { ruleId: "NET-074", name: "Cross-VPC Model Inference", description: "Alert when a model in the Dev VPC is being queried by an application in the Prod VPC (Environment Bleed).", category: "NET", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "NET-075", name: "Unverified Webhook Sources", description: "Detect AI Agent webhooks (e.g., from Slack or GitHub) that do not validate the Signature Header for incoming requests.", category: "NET", severity: "Medium", applicability: "Multi-Cloud" },
  { ruleId: "SUP-076", name: "Training Data Integrity Gap", description: "Detect datasets used in training/fine-tuning that lack cryptographic hashes (SHA-256) to verify they haven't been tampered with.", category: "SUP", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "SUP-077", name: "PII in RAG Sources", description: "Scan the Knowledge Base (PDFs, Wikis, Docs) used for RAG to ensure no clear-text customer data is being indexed.", category: "SUP", severity: "Critical", applicability: "Multi-Cloud (DSPM)" },
  { ruleId: "SUP-078", name: "Toxic Data Combinations", description: "Alert when two datasets, safe individually, are combined in a way that creates a high-risk PII profile for an AI agent.", category: "SUP", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "SUP-079", name: "Unauthorized KB Modification", description: "Detect any Write operations on a Knowledge Base by an identity that is not the authorized Data Curator role.", category: "SUP", severity: "High", applicability: "AWS / Azure" },
  { ruleId: "SUP-080", name: "Copyrighted Data Detection", description: "Flag training sets containing material from Opt-Out lists or restricted copyright repositories (e.g., news archives).", category: "SUP", severity: "High", applicability: "Compliance / Supply Chain" },
  { ruleId: "SUP-081", name: "Untrusted Data Origin", description: "Alert if a model is fine-tuned using data pulled from a public URL or an unverified 3rd-party bucket.", category: "SUP", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "SUP-082", name: "PHI in AI Fine-tuning", description: "Detect unmasked Protected Health Information (PHI) in datasets used for training healthcare-specific models.", category: "SUP", severity: "Critical", applicability: "HIPAA / Cloud" },
  { ruleId: "SUP-083", name: "Anomalous Training Metrics", description: "Flag training jobs where Loss or Accuracy shifts abruptly, indicating potential Data Poisoning or Backdoor insertion.", category: "SUP", severity: "High", applicability: "Multi-Cloud (MLOps)" },
  { ruleId: "SUP-084", name: "Missing Synthetic Data Flag", description: "Alert if Real production data is used for training where Synthetic data was mandated by policy.", category: "SUP", severity: "Medium", applicability: "Data Governance" },
  { ruleId: "SUP-085", name: "Shadow Data Sync (Prod to Dev)", description: "Detect automated scripts or pipelines moving data from Production RDS to Dev S3 for ad-hoc AI experiments.", category: "SUP", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "SUP-086", name: "Bias/Fairness Metadata Gap", description: "Flag datasets that lack Demographic Parity or Fairness metadata, required for high-risk decision-making AI.", category: "SUP", severity: "Medium", applicability: "GRC / AI Act" },
  { ruleId: "SUP-087", name: "Opt-Out Signal Violation", description: "Detect if the AI scraper/ingestor ignored robots.txt or no-ai metadata tags during data collection.", category: "SUP", severity: "High", applicability: "Web-Scale AI" },
  { ruleId: "SUP-088", name: "Unsanitized Input Pipelines", description: "Flag data pipelines that feed into Vector DBs without a step for removing malicious scripts or Prompt Injection seeds.", category: "SUP", severity: "High", applicability: "AppSec" },
  { ruleId: "SUP-089", name: "Missing Dataset Datasheet", description: "Detect datasets in the catalog that lack a formal Datasheet for Datasets (provenance, collection method, etc.).", category: "SUP", severity: "Medium", applicability: "Governance" },
  { ruleId: "SUP-090", name: "Unencrypted Data Transfer", description: "Identify ETL jobs (Glue, Dataflow) moving AI training data over the network without TLS 1.2+ encryption.", category: "SUP", severity: "High", applicability: "Multi-Cloud" },
  { ruleId: "COM-091", name: "High-Risk AI: No HITL Tag", description: "Flag \"High-Risk\" AI systems (e.g., HR, Credit Scoring) that do not have a designated \"Human-in-the-Loop\" (HITL) supervisor.", category: "COM", severity: "High", applicability: "EU AI Act" },
  { ruleId: "COM-092", name: "Missing Synthetic Watermark", description: "Detect image/video/audio generation models that do not automatically append a \"Machine-Readable\" watermark/metadata.", category: "COM", severity: "High", applicability: "EU AI Act / Article 50" },
  { ruleId: "COM-093", name: "Decision Audit Trail Gap", description: "Alert if an AI system making \"Legal Effect\" decisions (e.g., loan approval) is not logging the exact prompt, model version, and date.", category: "COM", severity: "Critical", applicability: "GDPR / UK Data Act" },
  { ruleId: "COM-094", name: "Bypassed Right to Challenge", description: "Detect AI workflows where an automated decision cannot be \"paused\" or \"challenged\" by a human user.", category: "COM", severity: "High", applicability: "UK Data Act 2025" },
  { ruleId: "COM-095", name: "Prohibited Practice: Social Scoring", description: "Identify any AI model tagged with \"purpose: behavior_tracking\" or \"social_credit,\" which are banned in many regions.", category: "COM", severity: "Critical", applicability: "EU AI Act" },
  { ruleId: "COM-096", name: "Missing Technical Documentation", description: "Flag models in production that lack a technical \"Conformity Assessment\" or CE marking record in the GRC module.", category: "COM", severity: "High", applicability: "EU AI Act" },
  { ruleId: "COM-097", name: "Failure to Notify Interaction", description: "Detect if the AI Web UI lacks a clear \"You are interacting with an AI\" disclosure for the end user.", category: "COM", severity: "Medium", applicability: "Transparency" },
  { ruleId: "COM-098", name: "Expired Bias Audit", description: "Alert when a \"High-Risk\" model has not undergone a mandatory Bias/Fairness audit in over 6 months.", category: "COM", severity: "High", applicability: "Compliance" },
  { ruleId: "COM-099", name: "NIST AI RMF Alignment Gap", description: "Detect AI projects that have not completed the \"Map\" or \"Measure\" function documentation in the risk register.", category: "COM", severity: "Medium", applicability: "NIST AI RMF" },
  { ruleId: "COM-100", name: "Unmitigated Critical Risk", description: "Flag any AI resource with a \"Critical\" risk score that has not had a mitigation plan approved by the AI Compliance Officer.", category: "COM", severity: "Critical", applicability: "GRC" },
  { ruleId: "KEN-111", name: "Kendra Index Without Encryption", description: "Detect Kendra indices that lack server-side encryption with a Customer Managed KMS key.", category: "DAT", severity: "High", applicability: "AWS" },
  { ruleId: "KEN-112", name: "Kendra Data Source Without VPC", description: "Flag Kendra data source connectors that operate without VPC configuration, exposing data ingestion to the public internet.", category: "NET", severity: "Medium", applicability: "AWS" },
  { ruleId: "KEN-113", name: "Over-Scoped Kendra Search Permissions", description: "Alert on IAM policies granting kendra:Query on Resource: *, allowing unrestricted search across all Kendra indices.", category: "IAM", severity: "High", applicability: "AWS" },
  { ruleId: "LEX-114", name: "Lex Bot Alias Without Conversation Logging", description: "Detect Lex bot aliases that do not have conversation logging enabled, preventing audit trails and abuse detection.", category: "MON", severity: "Medium", applicability: "AWS" },
  { ruleId: "LEX-115", name: "Lex Bot Alias With Unencrypted Audio Logs", description: "Flag Lex bot aliases with audio logging enabled but no KMS encryption configured for audio data at rest.", category: "DAT", severity: "High", applicability: "AWS" },
  { ruleId: "LEX-116", name: "Lex Bot Alias Without Locale Routing", description: "Identify Lex bot aliases without locale-specific routing configuration, preventing safe canary deployments and gradual rollouts.", category: "INF", severity: "Low", applicability: "AWS" },
  { ruleId: "QBI-117", name: "Q Business App Without Identity Center", description: "Detect Q Business applications not integrated with AWS IAM Identity Center, bypassing centralized authentication and SSO.", category: "IAM", severity: "Critical", applicability: "AWS" },
  { ruleId: "QBI-118", name: "Q Business App Without Guardrails", description: "Flag Q Business applications lacking content filtering or guardrails configuration, risking data leakage and unscoped responses.", category: "GRD", severity: "High", applicability: "AWS" },
  { ruleId: "EDG-119", name: "SageMaker Edge Fleet Without Device Auth", description: "Detect SageMaker Device Fleets lacking IoT device authentication policies, allowing unauthorized devices to receive model deployments.", category: "IAM", severity: "Critical", applicability: "AWS" },
  { ruleId: "EDG-120", name: "Unencrypted Edge Model Packaging", description: "Flag SageMaker Edge Packaging Jobs where the output configuration lacks KMS encryption for packaged model artifacts.", category: "DAT", severity: "High", applicability: "AWS" },
  { ruleId: "FLO-121", name: "Bedrock Flow Without Error Handling", description: "Detect Bedrock Flows not in 'Prepared' status, indicating potential configuration errors or missing error handling.", category: "GOV", severity: "Medium", applicability: "AWS" },
  { ruleId: "FLO-122", name: "Bedrock Prompt Without Version Control", description: "Flag Bedrock Prompts with only one version and no variants, lacking rollback capability and change audit trail.", category: "GOV", severity: "Medium", applicability: "AWS" },
  { ruleId: "FLO-123", name: "Bedrock Flow With Unrestricted Model Access", description: "Detect Bedrock Flows whose execution role has overly broad bedrock:InvokeModel permissions on wildcard resources.", category: "IAM", severity: "High", applicability: "AWS" },
  { ruleId: "CGR-124", name: "CodeGuru Repository Not Actively Reviewed", description: "Flag CodeGuru repository associations not in 'Associated' state, meaning automated code reviews are inactive.", category: "MON", severity: "Medium", applicability: "AWS" },
  { ruleId: "CGR-125", name: "DevOps Guru Reactive Insights Unresolved", description: "Alert when DevOps Guru reports open reactive insights indicating active operational anomalies in AI infrastructure.", category: "MON", severity: "High", applicability: "AWS" },
  { ruleId: "CGR-126", name: "DevOps Guru Proactive Monitoring Disabled", description: "Detect DevOps Guru configurations with zero resource hours or metrics analyzed, indicating proactive monitoring is disabled.", category: "MON", severity: "Medium", applicability: "AWS" },
  { ruleId: "INF-127", name: "Public EC2 Instance Without Encryption", description: "Flag EC2 instances with public IP addresses and unencrypted EBS volumes, exposing compute workloads to data extraction risks.", category: "INF", severity: "Medium", applicability: "AWS" },
  { ruleId: "INF-128", name: "CloudFront Without HTTPS Enforcement", description: "Detect CloudFront distributions that allow unencrypted HTTP traffic, exposing data in transit to interception.", category: "INF", severity: "Medium", applicability: "AWS" },
  { ruleId: "INF-129", name: "Internet-Facing Load Balancer Without WAF", description: "Flag internet-facing ALBs/NLBs without AWS WAF protection, exposing backend services to web attacks.", category: "INF", severity: "Medium", applicability: "AWS" },
  { ruleId: "INF-130", name: "Lambda Function Without VPC Isolation", description: "Detect Lambda functions not deployed within a VPC, limiting network isolation and access controls.", category: "INF", severity: "Low", applicability: "AWS" },
  { ruleId: "INF-131", name: "Public API Gateway Without Authentication", description: "Flag public API Gateway endpoints without authentication configured, allowing unrestricted access.", category: "INF", severity: "High", applicability: "AWS" },
  { ruleId: "DAT-132", name: "Rekognition Face Collection — Biometric Data", description: "Alert on Rekognition Face Collections storing biometric face embeddings, requiring enhanced privacy protections and regulatory compliance.", category: "DAT", severity: "Critical", applicability: "AWS" },
  { ruleId: "BCM-133", name: "Bedrock Custom Model Without CMK Encryption", description: "Ensure Bedrock custom models are encrypted with a Customer Managed Key (CMK) for full control over encryption key policies, rotation, and access management.", category: "DAT", severity: "High", applicability: "AWS" },
  { ruleId: "BCM-134", name: "Bedrock Custom Model Without VPC", description: "Detect Bedrock custom models whose training customization job was not configured with a VPC, exposing training data to the public internet.", category: "NET", severity: "Medium", applicability: "AWS" },
  { ruleId: "BCM-135", name: "Bedrock Custom Model Not In Private VPC", description: "Flag Bedrock custom models configured with a VPC that uses public subnets with internet gateway routing, negating VPC isolation benefits.", category: "NET", severity: "Medium", applicability: "AWS" },
  { ruleId: "BCM-136", name: "Bedrock Invocation Logging Disabled", description: "Ensure Amazon Bedrock model invocation logging is enabled for auditing, troubleshooting, and security analysis of all model interactions.", category: "MON", severity: "Low", applicability: "AWS" },
  { ruleId: "BCM-137", name: "Bedrock Custom Model Without Tags", description: "Ensure Bedrock custom models have user-defined tags for resource organization, cost allocation, and tag-based access control.", category: "GOV", severity: "Low", applicability: "AWS" },
  { ruleId: "SM-138", name: "SageMaker Notebook Direct Internet Access", description: "Flag SageMaker Notebooks or Studio Apps where DirectInternetAccess is set to Enabled, enabling unmonitored data transfer.", category: "NET", severity: "High", applicability: "AWS" },
  { ruleId: "SM-139", name: "SageMaker Notebook Root Privileges", description: "Detect SageMaker Notebooks where RootAccess is enabled, allowing users to disable security agents or local logging.", category: "IAM", severity: "Medium", applicability: "AWS" },
  { ruleId: "SM-140", name: "SageMaker Unencrypted Notebook Storage", description: "Flag Notebook Instances missing a Customer Managed Key (KMS) for EBS volumes, exposing code and model weights in plain text.", category: "DAT", severity: "High", applicability: "AWS" },
  { ruleId: "SM-141", name: "SageMaker Overprivileged Execution Role", description: "Alert on SageMaker execution roles with s3:* or iam:PassRole permissions without resource constraints, creating a large blast radius.", category: "IAM", severity: "High", applicability: "AWS" },
  { ruleId: "SM-142", name: "SageMaker Feature Store Unencrypted", description: "Detect SageMaker Feature Stores with online stores enabled but lacking CMK encryption for online/offline storage, risking PII exposure.", category: "DAT", severity: "Critical", applicability: "AWS" },
  { ruleId: "SM-143", name: "SageMaker Unencrypted Training Jobs", description: "Flag Training or Processing jobs where VolumeKmsKeyId is missing, leaving temporary training data stored unencrypted.", category: "DAT", severity: "High", applicability: "AWS" },
  { ruleId: "SM-144", name: "SageMaker Insecure Inter-Container Traffic", description: "Alert when distributed training jobs have EnableInterContainerTrafficEncryption set to False, allowing gradient sniffing within the VPC.", category: "NET", severity: "Medium", applicability: "AWS" },
  { ruleId: "SM-145", name: "SageMaker Unauthenticated Endpoints", description: "Detect SageMaker Inference Endpoints with no authentication, allowing any entity to query the model.", category: "IAM", severity: "Critical", applicability: "AWS" },
  { ruleId: "SM-146", name: "SageMaker Missing Model Monitoring", description: "Flag production endpoints lacking an active SageMaker Model Monitor schedule, risking undetected model drift or bias.", category: "MON", severity: "Medium", applicability: "AWS" },
  { ruleId: "SM-147", name: "SageMaker Unprotected Inference VPC", description: "Alert when an Endpoint is deployed without a VPC configuration, exposing serving infrastructure to public internet.", category: "NET", severity: "High", applicability: "AWS" },
  { ruleId: "SM-148", name: "SageMaker Insecure Deserialization (RCE)", description: "Scan inference containers for use of pickle.load() on untrusted inputs, enabling Remote Code Execution via malicious payloads.", category: "SUP", severity: "Critical", applicability: "AWS" },
  { ruleId: "SM-149", name: "SageMaker Model Registry Lineage Gap", description: "Flag model versions in the Registry not linked to a verified Training Job ARN, violating traceability requirements (EU AI Act).", category: "GOV", severity: "Medium", applicability: "AWS" },
  { ruleId: "SM-150", name: "SageMaker Production Model Status Drift", description: "Alert when a model is set to Approved in the Registry without a completed Safety Review tag, bypassing security vetting.", category: "GOV", severity: "High", applicability: "AWS" },
  { ruleId: "SM-151", name: "SageMaker Unmonitored Data Capture", description: "Detect Endpoints where DataCaptureConfig is disabled, preventing audit trails of AI prompts and responses.", category: "MON", severity: "Medium", applicability: "AWS" },
  { ruleId: "AZ-AI-001", name: "Missing Entra Agent ID", description: "Detect AI agents in Copilot Studio or AI Foundry not registered with a Microsoft Entra Agent ID.", category: "IAM", severity: "High", applicability: "Azure" },
  { ruleId: "AZ-AI-002", name: "Public OpenAI Endpoint", description: "Flag Azure OpenAI Service instances that do not have a Private Endpoint configured.", category: "NET", severity: "High", applicability: "Azure" },
  { ruleId: "AZ-AI-003", name: "Disabled Content Safety", description: "Alert if Azure AI Content Safety filters (Hate, Violence, Self-harm) are set to Off or Low in the portal.", category: "GRD", severity: "High", applicability: "Azure" },
  { ruleId: "AZ-AI-004", name: "Managed Identity Bypass", description: "Detect AI Foundry connections to Azure Blob/SQL using Connection Strings instead of Managed Identities.", category: "IAM", severity: "High", applicability: "Azure" },
  { ruleId: "AZ-AI-005", name: "Purview Label Mismatch", description: "Flag AI prompts accessing data labeled Highly Confidential in Purview without an active DLP for AI policy.", category: "DAT", severity: "High", applicability: "Azure" },
  { ruleId: "AZ-AI-006", name: "Unencrypted ML Workspaces", description: "Detect Azure Machine Learning workspaces missing Customer-Managed Keys (CMK) for the underlying storage.", category: "DAT", severity: "High", applicability: "Azure" },
  { ruleId: "AZ-AI-007", name: "Legacy Model Usage", description: "Identify deployments of deprecated OpenAI models (e.g., GPT-3.5) with known security vulnerabilities.", category: "COM", severity: "Medium", applicability: "Azure" },
  { ruleId: "GC-AI-001", name: "VPC Service Control Breach", description: "Detect Vertex AI resources (Datasets, Endpoints) located outside of a VPC Service Control (VPC-SC) perimeter.", category: "NET", severity: "High", applicability: "GCP" },
  { ruleId: "GC-AI-002", name: "Vertex Notebook Public IP", description: "Flag any Vertex AI Workbench instance with an assigned External IP address.", category: "NET", severity: "Critical", applicability: "GCP" },
  { ruleId: "GC-AI-003", name: "Missing Model Armor", description: "Detect Vertex AI Agent/Model interactions that do not have Model Armor (Prompt Injection screening) enabled.", category: "GRD", severity: "High", applicability: "GCP" },
  { ruleId: "GC-AI-004", name: "Unencrypted Vertex Artifacts", description: "Alert if Vertex AI Datasets or Model Registry entries are not encrypted with Cloud KMS (CMEK).", category: "DAT", severity: "High", applicability: "GCP" },
  { ruleId: "GC-AI-005", name: "Root Access in Workbenches", description: "Detect Vertex AI Workbench instances where Root Access is enabled for the compute user.", category: "IAM", severity: "Critical", applicability: "GCP" },
  { ruleId: "GC-AI-006", name: "Shadow Model Import", description: "Alert on any models.upload activity from a GCS bucket not in the Approved AI Data list.", category: "SUP", severity: "High", applicability: "GCP" },
  { ruleId: "GC-AI-007", name: "Unmonitored Prediction Logs", description: "Detect Vertex AI Endpoints with Data Logging disabled, preventing visibility into user prompts.", category: "MON", severity: "High", applicability: "GCP" },
  { ruleId: "HEX-101", name: "Model Vulnerability (CVE)", description: "Hex detected a known vulnerability (CVE) in an AI/ML model file or its dependencies.", category: "HEX", severity: "Critical", applicability: "Hex Scanner" },
  { ruleId: "HEX-102", name: "Backdoor Detection", description: "Hex detected hidden backdoors or trigger patterns in model weights using Neural Cleanse analysis.", category: "HEX", severity: "Critical", applicability: "Hex Scanner" },
  { ruleId: "HEX-103", name: "Supply Chain Risk", description: "Hex detected supply chain risks including vulnerable dependencies or compromised model sources.", category: "HEX", severity: "High", applicability: "Hex Scanner" },
  { ruleId: "HEX-104", name: "Pickle Exploit Risk", description: "Hex detected unsafe deserialization patterns in pickle files that could enable arbitrary code execution.", category: "HEX", severity: "Critical", applicability: "Hex Scanner" },
  { ruleId: "HEX-105", name: "Adversarial Vulnerability", description: "Hex detected the model is vulnerable to adversarial attacks (FGSM, PGD) with low robustness scores.", category: "HEX", severity: "High", applicability: "Hex Scanner" },
  { ruleId: "HEX-106", name: "Privacy Leakage Risk", description: "Hex detected potential PII leakage, model inversion risks, or memorization vulnerabilities.", category: "HEX", severity: "High", applicability: "Hex Scanner" },
  { ruleId: "HEX-107", name: "License Compliance Violation", description: "Hex detected GPL compliance issues or license incompatibilities in model components.", category: "HEX", severity: "Medium", applicability: "Hex Scanner" },
  { ruleId: "HEX-108", name: "Compliance Gap", description: "Hex detected compliance gaps with NIST AI RMF, EU AI Act, or organizational policies.", category: "HEX", severity: "High", applicability: "Hex Scanner" },
  { ruleId: "HEX-109", name: "Malware in Model", description: "Hex detected malware signatures or malicious payloads embedded within model files.", category: "HEX", severity: "Critical", applicability: "Hex Scanner" },
  { ruleId: "HEX-110", name: "Suspicious Entropy Pattern", description: "Hex detected abnormal entropy patterns indicating hidden data or obfuscated malicious payloads.", category: "HEX", severity: "High", applicability: "Hex Scanner" },
  { ruleId: "HF-001", name: "Public Model Repository", description: "Detect Hugging Face model repositories with public visibility, exposing proprietary model weights and architecture.", category: "DAT", severity: "High", applicability: "Hugging Face" },
  { ruleId: "HF-002", name: "Public Dataset with Sensitive Tags", description: "Flag public Hugging Face datasets tagged with sensitive keywords (PII, medical, financial, proprietary).", category: "DAT", severity: "High", applicability: "Hugging Face" },
  { ruleId: "HF-003", name: "Inference Endpoint Without Authentication", description: "Detect Hugging Face Inference Endpoints with public access type, allowing unauthenticated model queries.", category: "IAM", severity: "Critical", applicability: "Hugging Face" },
  { ruleId: "HF-004", name: "Inactive Inference Endpoint Running", description: "Flag Hugging Face Inference Endpoints in failed or paused states suggesting unmonitored deployments.", category: "INF", severity: "Medium", applicability: "Hugging Face" },
  { ruleId: "HF-005", name: "Model Without License", description: "Detect Hugging Face models missing a defined license, creating legal and compliance uncertainty.", category: "GOV", severity: "Medium", applicability: "Hugging Face" },
  { ruleId: "HF-006", name: "Unsafe Model Format (Pickle)", description: "Flag Hugging Face models using pickle serialization or PyTorch without SafeTensors, enabling potential RCE.", category: "SUP", severity: "High", applicability: "Hugging Face" },
  { ruleId: "HF-007", name: "Space with Public Runtime", description: "Detect public Hugging Face Spaces with actively running runtimes exposed to the internet.", category: "NET", severity: "Medium", applicability: "Hugging Face" },
  { ruleId: "HF-008", name: "Model Without Gated Access", description: "Flag public Hugging Face models without gated access, allowing unrestricted downloads without approval.", category: "IAM", severity: "Medium", applicability: "Hugging Face" },
];

export async function seedDefaultPolicies(orgId: string, storageInstance: IStorage): Promise<Policy[]> {
  const existing = await storageInstance.getPolicies(orgId);
  if (existing.length === 0) {
    const created: Policy[] = [];
    for (const p of DEFAULT_POLICIES) {
      const policy = await storageInstance.createPolicy({ ...p, orgId });
      created.push(policy);
    }
    return created;
  }

  const existingRuleIds = new Set(existing.map(p => p.ruleId));
  const newPolicies = DEFAULT_POLICIES.filter(p => !existingRuleIds.has(p.ruleId));
  if (newPolicies.length > 0) {
    for (const p of newPolicies) {
      const policy = await storageInstance.createPolicy({ ...p, orgId });
      existing.push(policy);
    }
  }
  return existing;
}

export async function evaluatePolicies(orgId: string, storageInstance: IStorage): Promise<InsertPolicyFinding[]> {
  const allPolicies = await storageInstance.getPolicies(orgId);
  const enabledPolicies = allPolicies.filter(p => p.enabled);
  const [resourcesList, modelsList] = await Promise.all([
    storageInstance.getResources(orgId),
    storageInstance.getAiModels(orgId),
  ]);

  const pool: AssetPool = { resources: resourcesList.filter(r => !r.excludedFromScanning), models: modelsList };
  const allFindings: InsertPolicyFinding[] = [];

  for (const policy of enabledPolicies) {
    const checkFn = RULE_CHECKS[policy.ruleId];
    if (checkFn) {
      const results = checkFn(policy, pool, orgId);
      allFindings.push(...results);
    }
  }

  const assetProjectMap: Record<string, string | null> = {};
  for (const r of resourcesList) {
    assetProjectMap[r.id] = r.projectId;
  }
  for (const m of modelsList) {
    assetProjectMap[m.id] = m.projectId;
  }

  for (const f of allFindings) {
    if (f.assetId && assetProjectMap[f.assetId]) {
      f.projectId = assetProjectMap[f.assetId];
    }
  }

  await storageInstance.deleteAllPolicyFindings(orgId);

  const savedFindings: InsertPolicyFinding[] = [];
  for (const f of allFindings) {
    await storageInstance.createPolicyFinding(f);
    savedFindings.push(f);
  }

  return savedFindings;
}