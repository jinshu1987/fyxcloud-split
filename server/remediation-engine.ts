import type { PolicyFinding, Resource } from "@shared/schema";
import type { IStorage } from "./storage";

export interface RemediationScript {
  title: string;
  description: string;
  type: "aws-cli" | "iam-policy" | "terraform" | "python" | "shell" | "config";
  language: string;
  code: string;
  risk: "low" | "medium" | "high";
  riskNote: string;
  estimatedTime: string;
  requiresApproval: boolean;
}

export interface RemediationSuggestion {
  findingId: string;
  ruleId: string;
  summary: string;
  scripts: RemediationScript[];
  prerequisites: string[];
  rollbackSteps: string[];
  references: { title: string; url: string }[];
}

function extractFromEvidence(evidence: string, pattern: RegExp): string {
  const match = evidence.match(pattern);
  return match ? match[1] : "";
}

function getAssetArn(f: PolicyFinding): string {
  return extractFromEvidence(f.evidence || "", /ARN:\s*(arn:[^\s."]+)/) ||
    extractFromEvidence(f.evidence || "", /(arn:aws:[^\s."]+)/) ||
    "<RESOURCE_ARN>";
}

function getAssetName(f: PolicyFinding): string {
  return f.assetName || "<ASSET_NAME>";
}

function getBucketName(f: PolicyFinding): string {
  return extractFromEvidence(f.evidence || "", /[Bb]ucket\s+"([^"]+)"/) ||
    f.assetName?.replace(" [Model Artifacts]", "") || "<BUCKET_NAME>";
}

function getRoleName(f: PolicyFinding): string {
  return extractFromEvidence(f.evidence || "", /[Rr]ole\s+"([^"]+)"/) ||
    f.assetName || "<ROLE_NAME>";
}

const GENERATORS: Record<string, (f: PolicyFinding) => RemediationSuggestion> = {

  "DIS-002": (f) => {
    const name = getAssetName(f);
    const region = extractFromEvidence(f.evidence || "", /region[:\s]+([\w-]+)/) || "us-east-1";
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Restrict SageMaker notebook "${name}" to private VPC access and disable direct internet.`,
      scripts: [
        {
          title: "Stop and Reconfigure Notebook Instance",
          description: "Stop the notebook, update it to use a VPC subnet, and disable direct internet access.",
          type: "aws-cli", language: "bash",
          code: `# Step 1: Stop the notebook instance
aws sagemaker stop-notebook-instance \\
  --notebook-instance-name "${name}" \\
  --region ${region}

# Step 2: Wait for it to stop
aws sagemaker wait notebook-instance-stopped \\
  --notebook-instance-name "${name}" \\
  --region ${region}

# Step 3: Update with VPC config and disable direct internet
aws sagemaker update-notebook-instance \\
  --notebook-instance-name "${name}" \\
  --subnet-id <SUBNET_ID> \\
  --security-group-ids <SECURITY_GROUP_ID> \\
  --direct-internet-access Disabled \\
  --region ${region}

# Step 4: Restart the notebook
aws sagemaker start-notebook-instance \\
  --notebook-instance-name "${name}" \\
  --region ${region}`,
          risk: "medium", riskNote: "Notebook will be temporarily unavailable during reconfiguration. Users will lose active sessions.",
          estimatedTime: "5-10 minutes", requiresApproval: true,
        },
        {
          title: "Terraform - SageMaker Notebook with VPC",
          description: "Terraform configuration for a properly isolated SageMaker notebook.",
          type: "terraform", language: "hcl",
          code: `resource "aws_sagemaker_notebook_instance" "${name.replace(/[^a-zA-Z0-9_]/g, "_")}" {
  name                    = "${name}"
  instance_type           = "ml.t3.medium"
  role_arn                = aws_iam_role.sagemaker_role.arn
  subnet_id               = aws_subnet.private.id
  security_groups         = [aws_security_group.sagemaker_sg.id]
  direct_internet_access  = "Disabled"
  root_access             = "Disabled"
  kms_key_id              = aws_kms_key.sagemaker.arn

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}`,
          risk: "low", riskNote: "Infrastructure as code — review before applying.",
          estimatedTime: "2-3 minutes", requiresApproval: false,
        },
      ],
      prerequisites: ["VPC with private subnets configured", "Security group allowing outbound HTTPS (443)", "NAT Gateway for internet access from private subnet", "SageMaker execution role with appropriate permissions"],
      rollbackSteps: ["1. Stop the notebook instance", "2. Update with direct_internet_access=Enabled and remove subnet/security group", "3. Restart the notebook instance"],
      references: [
        { title: "SageMaker Notebook VPC Configuration", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/appendix-notebook-and-internet-access.html" },
        { title: "SageMaker Security Best Practices", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/security.html" },
      ],
    };
  },

  "INF-006": (f) => {
    const name = getAssetName(f);
    const arn = getAssetArn(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Restrict public access on inference endpoint "${name}" using resource-based policy.`,
      scripts: [
        {
          title: "Apply Restrictive Resource Policy",
          description: "Apply a resource-based policy that restricts access to specific AWS accounts and VPC endpoints only.",
          type: "iam-policy", language: "json",
          code: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "DenyPublicAccess",
                Effect: "Deny",
                Principal: "*",
                Action: "sagemaker:InvokeEndpoint",
                Resource: arn,
                Condition: {
                  StringNotEquals: {
                    "aws:sourceVpce": "<VPCE_ID>"
                  }
                }
              },
              {
                Sid: "AllowFromVPCEndpoint",
                Effect: "Allow",
                Principal: { AWS: "<ACCOUNT_ID>" },
                Action: "sagemaker:InvokeEndpoint",
                Resource: arn,
                Condition: {
                  StringEquals: {
                    "aws:sourceVpce": "<VPCE_ID>"
                  }
                }
              }
            ]
          }, null, 2),
          risk: "medium", riskNote: "Applying a restrictive policy will block any existing public access. Verify all consumers use the VPC endpoint first.",
          estimatedTime: "3-5 minutes", requiresApproval: true,
        },
      ],
      prerequisites: ["VPC endpoint for SageMaker Runtime created", "All consuming applications routed through the VPC endpoint"],
      rollbackSteps: ["1. Remove the resource-based policy from the endpoint", "2. Verify application connectivity is restored"],
      references: [
        { title: "SageMaker Endpoint Access Control", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/api-permissions-reference.html" },
      ],
    };
  },

  "INF-008": (f) => {
    const name = getAssetName(f);
    const bucket = getBucketName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Enable Customer-Managed KMS encryption on "${name}" for model weight protection.`,
      scripts: [
        {
          title: "Create KMS Key and Apply to S3 Bucket",
          description: "Create a dedicated KMS CMK and configure the S3 bucket to use it as default encryption.",
          type: "aws-cli", language: "bash",
          code: `# Step 1: Create a KMS key for AI model encryption
KEY_ID=$(aws kms create-key \\
  --description "CMK for AI model artifacts - ${bucket}" \\
  --tags TagKey=Purpose,TagValue=ai-model-encryption \\
  --query 'KeyMetadata.KeyId' --output text)

echo "Created KMS Key: $KEY_ID"

# Step 2: Create an alias for easier reference
aws kms create-alias \\
  --alias-name "alias/ai-models-${bucket}" \\
  --target-key-id "$KEY_ID"

# Step 3: Enable automatic key rotation
aws kms enable-key-rotation --key-id "$KEY_ID"

# Step 4: Apply KMS encryption to the bucket
aws s3api put-bucket-encryption \\
  --bucket "${bucket}" \\
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "'$KEY_ID'"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Step 5: Add bucket policy to enforce KMS encryption on uploads
aws s3api put-bucket-policy --bucket "${bucket}" --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyUnencryptedUploads",
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::${bucket}/*",
    "Condition": {
      "StringNotEquals": {
        "s3:x-amz-server-side-encryption": "aws:kms"
      }
    }
  }]
}'`,
          risk: "medium", riskNote: "Existing objects remain encrypted with old key. New uploads will use KMS. The bucket policy will reject uploads without KMS encryption.",
          estimatedTime: "5-10 minutes", requiresApproval: true,
        },
        {
          title: "Re-encrypt Existing Objects with KMS",
          description: "Copy existing objects in-place to re-encrypt them with the new KMS key.",
          type: "aws-cli", language: "bash",
          code: `# Re-encrypt all objects in the bucket using the new KMS key
# WARNING: This copies objects in-place, which may take time for large buckets

aws s3 cp "s3://${bucket}/" "s3://${bucket}/" \\
  --recursive \\
  --sse aws:kms \\
  --sse-kms-key-id "alias/ai-models-${bucket}" \\
  --metadata-directive COPY`,
          risk: "high", riskNote: "This operation copies every object in the bucket. For large buckets with model files, this can be slow and incur significant S3 API costs. Test on a small bucket first.",
          estimatedTime: "10-60 minutes (depends on bucket size)", requiresApproval: true,
        },
      ],
      prerequisites: ["IAM permissions: kms:CreateKey, kms:CreateAlias, s3:PutBucketEncryption, s3:PutBucketPolicy", "Verify no applications depend on SSE-S3 encryption headers"],
      rollbackSteps: ["1. Remove the bucket policy denying unencrypted uploads", "2. Change bucket encryption back to SSE-S3", "3. Schedule KMS key for deletion if no longer needed (min 7-day waiting period)"],
      references: [
        { title: "S3 Server-Side Encryption with KMS", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html" },
        { title: "KMS Key Rotation", url: "https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html" },
      ],
    };
  },

  "INF-010": (f) => {
    const name = getAssetName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Upgrade deprecated model "${name}" to a supported version with active security patches.`,
      scripts: [
        {
          title: "Check Available Model Versions",
          description: "List available model versions to identify the recommended upgrade target.",
          type: "aws-cli", language: "bash",
          code: `# List available foundation models
aws bedrock list-foundation-models \\
  --query 'modelSummaries[*].[modelId,modelName,modelLifecycle.status]' \\
  --output table

# For SageMaker models, list model packages
aws sagemaker list-model-packages \\
  --model-package-group-name "<MODEL_PACKAGE_GROUP>" \\
  --sort-by CreationTime \\
  --sort-order Descending \\
  --query 'ModelPackageSummaryList[*].[ModelPackageArn,ModelPackageStatus,ModelApprovalStatus]' \\
  --output table`,
          risk: "low", riskNote: "Read-only operation — lists available versions without making changes.",
          estimatedTime: "1-2 minutes", requiresApproval: false,
        },
      ],
      prerequisites: ["Identify the target model version before upgrading", "Test the new version in a staging environment"],
      rollbackSteps: ["1. Revert the endpoint to the previous model version", "2. Monitor for degraded performance or accuracy"],
      references: [
        { title: "Bedrock Model Lifecycle", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html" },
      ],
    };
  },

  "DAT-012": (f) => {
    const name = getAssetName(f);
    const arn = getAssetArn(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Enable KMS encryption on CloudWatch Log Group "${name}" to protect AI prompt/response logs.`,
      scripts: [
        {
          title: "Associate KMS Key with Log Group",
          description: "Create or use an existing KMS key to encrypt the CloudWatch Log Group.",
          type: "aws-cli", language: "bash",
          code: `# Step 1: Create a KMS key for log encryption (or use existing)
KEY_ARN=$(aws kms create-key \\
  --description "CMK for AI prompt log encryption" \\
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "EnableRootAccount",
        "Effect": "Allow",
        "Principal": {"AWS": "arn:aws:iam::<ACCOUNT_ID>:root"},
        "Action": "kms:*",
        "Resource": "*"
      },
      {
        "Sid": "AllowCloudWatchLogs",
        "Effect": "Allow",
        "Principal": {"Service": "logs.<REGION>.amazonaws.com"},
        "Action": [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ],
        "Resource": "*",
        "Condition": {
          "ArnLike": {
            "kms:EncryptionContext:aws:logs:arn": "${arn}"
          }
        }
      }
    ]
  }' \\
  --query 'KeyMetadata.Arn' --output text)

echo "Created KMS Key: $KEY_ARN"

# Step 2: Associate the key with the log group
aws logs associate-kms-key \\
  --log-group-name "${name}" \\
  --kms-key-id "$KEY_ARN"

echo "Log group '${name}' now encrypted with KMS."`,
          risk: "low", riskNote: "Encrypting a log group is non-destructive. Existing log events will remain readable. New events will be encrypted with the KMS key.",
          estimatedTime: "3-5 minutes", requiresApproval: false,
        },
        {
          title: "Terraform - Encrypted CloudWatch Log Group",
          description: "Terraform configuration for an encrypted CloudWatch Log Group.",
          type: "terraform", language: "hcl",
          code: `resource "aws_cloudwatch_log_group" "${name.replace(/[^a-zA-Z0-9_]/g, "_")}" {
  name              = "${name}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.log_encryption.arn

  tags = {
    Purpose   = "ai-prompt-logs"
    Encrypted = "true"
  }
}

resource "aws_kms_key" "log_encryption" {
  description             = "KMS key for AI log encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 14

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableRootAccount"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::\${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AllowCloudWatchLogs"
        Effect    = "Allow"
        Principal = { Service = "logs.\${data.aws_region.current.name}.amazonaws.com" }
        Action    = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
        Resource  = "*"
      }
    ]
  })
}`,
          risk: "low", riskNote: "Review the Terraform plan before applying.",
          estimatedTime: "2-3 minutes", requiresApproval: false,
        },
      ],
      prerequisites: ["IAM permissions: kms:CreateKey, logs:AssociateKmsKey", "Account ID and region for KMS policy"],
      rollbackSteps: ["1. Disassociate the KMS key: aws logs disassociate-kms-key --log-group-name <LOG_GROUP>", "2. Schedule the KMS key for deletion if no longer needed"],
      references: [
        { title: "CloudWatch Logs Encryption", url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html" },
      ],
    };
  },

  "IAM-016": (f) => {
    const roleName = getRoleName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Reduce permissions on SageMaker role "${roleName}" from AdministratorAccess to least-privilege.`,
      scripts: [
        {
          title: "Audit Current Role Permissions",
          description: "List all policies attached to the role and generate a least-privilege policy using IAM Access Analyzer.",
          type: "aws-cli", language: "bash",
          code: `# Step 1: List attached managed policies
aws iam list-attached-role-policies \\
  --role-name "${roleName}" \\
  --query 'AttachedPolicies[*].[PolicyName,PolicyArn]' \\
  --output table

# Step 2: List inline policies
aws iam list-role-policies \\
  --role-name "${roleName}" \\
  --query 'PolicyNames' \\
  --output table

# Step 3: Generate a least-privilege policy using Access Analyzer
# (Requires CloudTrail to be enabled for usage analysis)
aws accessanalyzer start-policy-generation \\
  --policy-generation-details '{
    "principalArn": "arn:aws:iam::<ACCOUNT_ID>:role/${roleName}"
  }' \\
  --query 'jobId' --output text`,
          risk: "low", riskNote: "Read-only audit operation. No permissions are changed.",
          estimatedTime: "2-3 minutes", requiresApproval: false,
        },
        {
          title: "Replace AdministratorAccess with Scoped Policy",
          description: "Detach the overprivileged policy and attach a scoped SageMaker execution policy.",
          type: "aws-cli", language: "bash",
          code: `# Step 1: Detach AdministratorAccess
aws iam detach-role-policy \\
  --role-name "${roleName}" \\
  --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"

# Step 2: Attach scoped SageMaker policy
aws iam attach-role-policy \\
  --role-name "${roleName}" \\
  --policy-arn "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"

# Step 3: Add S3 access scoped to specific buckets only
aws iam put-role-policy \\
  --role-name "${roleName}" \\
  --policy-name "ScopedS3Access" \\
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::<AI_DATA_BUCKET>",
        "arn:aws:s3:::<AI_DATA_BUCKET>/*",
        "arn:aws:s3:::<MODEL_BUCKET>",
        "arn:aws:s3:::<MODEL_BUCKET>/*"
      ]
    }]
  }'

# Step 4: Add a permission boundary to prevent privilege escalation
aws iam put-role-permissions-boundary \\
  --role-name "${roleName}" \\
  --permissions-boundary "arn:aws:iam::<ACCOUNT_ID>:policy/SageMakerPermissionBoundary"`,
          risk: "high", riskNote: "Removing AdministratorAccess will immediately restrict the role. Any SageMaker jobs or notebooks using this role may fail if they require permissions not covered by the scoped policy. Test in a non-production environment first.",
          estimatedTime: "10-15 minutes", requiresApproval: true,
        },
        {
          title: "Least-Privilege IAM Policy for SageMaker",
          description: "A recommended least-privilege policy for SageMaker execution roles.",
          type: "iam-policy", language: "json",
          code: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "SageMakerCore",
                Effect: "Allow",
                Action: [
                  "sagemaker:CreateModel", "sagemaker:CreateEndpoint",
                  "sagemaker:CreateEndpointConfig", "sagemaker:InvokeEndpoint",
                  "sagemaker:CreateTrainingJob", "sagemaker:DescribeTrainingJob"
                ],
                Resource: "*"
              },
              {
                Sid: "S3ModelAccess",
                Effect: "Allow",
                Action: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
                Resource: [
                  "arn:aws:s3:::<MODEL_BUCKET>",
                  "arn:aws:s3:::<MODEL_BUCKET>/*"
                ]
              },
              {
                Sid: "CloudWatchLogs",
                Effect: "Allow",
                Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
                Resource: "arn:aws:logs:*:*:log-group:/aws/sagemaker/*"
              },
              {
                Sid: "ECRPull",
                Effect: "Allow",
                Action: ["ecr:GetAuthorizationToken", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"],
                Resource: "*"
              }
            ]
          }, null, 2),
          risk: "low", riskNote: "Review and customize the bucket ARNs and actions before applying.",
          estimatedTime: "5 minutes", requiresApproval: false,
        },
      ],
      prerequisites: ["Identify all SageMaker jobs/notebooks using this role", "CloudTrail enabled for IAM Access Analyzer", "Test the scoped policy in a staging environment"],
      rollbackSteps: ["1. Re-attach AdministratorAccess: aws iam attach-role-policy --role-name <ROLE> --policy-arn arn:aws:iam::aws:policy/AdministratorAccess", "2. Remove the scoped inline policy", "3. Remove the permission boundary"],
      references: [
        { title: "SageMaker Role Permissions", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html" },
        { title: "IAM Access Analyzer Policy Generation", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html" },
      ],
    };
  },

  "IAM-054": (f) => {
    const roleName = getRoleName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Attach a permission boundary to IAM role "${roleName}" to prevent privilege escalation.`,
      scripts: [
        {
          title: "Create and Attach Permission Boundary",
          description: "Create a permission boundary policy and attach it to the role to cap maximum permissions.",
          type: "aws-cli", language: "bash",
          code: `# Step 1: Create the permission boundary policy
BOUNDARY_ARN=$(aws iam create-policy \\
  --policy-name "AIRolePermissionBoundary" \\
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowAIServices",
        "Effect": "Allow",
        "Action": [
          "sagemaker:*", "bedrock:*", "s3:GetObject", "s3:PutObject",
          "s3:ListBucket", "logs:*", "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer",
          "kms:Decrypt", "kms:GenerateDataKey"
        ],
        "Resource": "*"
      },
      {
        "Sid": "DenyPrivilegeEscalation",
        "Effect": "Deny",
        "Action": [
          "iam:CreateUser", "iam:CreateRole", "iam:AttachRolePolicy",
          "iam:PutRolePolicy", "iam:DeleteRolePermissionsBoundary",
          "iam:CreateAccessKey", "organizations:*", "account:*"
        ],
        "Resource": "*"
      }
    ]
  }' \\
  --query 'Policy.Arn' --output text)

echo "Created boundary: $BOUNDARY_ARN"

# Step 2: Attach the permission boundary to the role
aws iam put-role-permissions-boundary \\
  --role-name "${roleName}" \\
  --permissions-boundary "$BOUNDARY_ARN"

echo "Permission boundary attached to ${roleName}."`,
          risk: "medium", riskNote: "The permission boundary restricts the maximum permissions the role can have. If the role currently uses actions blocked by the boundary, those operations will fail.",
          estimatedTime: "3-5 minutes", requiresApproval: true,
        },
      ],
      prerequisites: ["Review all actions the role currently uses", "IAM permissions to create policies and set permission boundaries"],
      rollbackSteps: ["1. Remove the permission boundary: aws iam delete-role-permissions-boundary --role-name <ROLE>"],
      references: [
        { title: "IAM Permission Boundaries", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html" },
      ],
    };
  },

  "DIS-005": (f) => {
    const bucket = getBucketName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Inventory and link orphaned model artifacts in S3 bucket "${bucket}" to the model registry.`,
      scripts: [
        {
          title: "List and Classify Model Artifacts",
          description: "Scan the bucket for model files and generate an inventory report.",
          type: "aws-cli", language: "bash",
          code: `# List all model artifact files in the bucket
echo "=== Model Artifact Inventory for s3://${bucket} ==="
for ext in pkl safetensors pth onnx bin h5 joblib tf tflite mlmodel pt model weights caffemodel pb; do
  echo "\\n--- .$ext files ---"
  aws s3api list-objects-v2 \\
    --bucket "${bucket}" \\
    --query "Contents[?ends_with(Key, '.$ext')].[Key,Size,LastModified]" \\
    --output table 2>/dev/null || echo "  (none found)"
done`,
          risk: "low", riskNote: "Read-only operation — lists files without modification.",
          estimatedTime: "1-3 minutes", requiresApproval: false,
        },
        {
          title: "Archive Orphaned Artifacts to Glacier",
          description: "Move unlinked model artifacts to S3 Glacier for cost-effective retention.",
          type: "aws-cli", language: "bash",
          code: `# Set lifecycle policy to transition orphaned artifacts to Glacier after 30 days
aws s3api put-bucket-lifecycle-configuration \\
  --bucket "${bucket}" \\
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "ArchiveOrphanedModels",
      "Status": "Enabled",
      "Filter": {
        "Tag": { "Key": "status", "Value": "orphaned" }
      },
      "Transitions": [{
        "Days": 30,
        "StorageClass": "GLACIER"
      }],
      "Expiration": { "Days": 365 }
    }]
  }'

echo "Lifecycle policy applied. Tag orphaned objects with status=orphaned to auto-archive."`,
          risk: "medium", riskNote: "Objects tagged 'status=orphaned' will move to Glacier after 30 days and delete after 365 days. Verify objects are truly orphaned before tagging.",
          estimatedTime: "2-5 minutes", requiresApproval: true,
        },
      ],
      prerequisites: ["S3 read permissions on the bucket", "Verify which artifacts are actually linked to deployed models"],
      rollbackSteps: ["1. Remove the lifecycle configuration: aws s3api delete-bucket-lifecycle --bucket <BUCKET>", "2. Restore objects from Glacier if needed (takes 3-5 hours for standard retrieval)"],
      references: [
        { title: "S3 Lifecycle Policies", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html" },
      ],
    };
  },

  "SUP-026": (f) => {
    const name = getAssetName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Scan untrusted model "${name}" for malicious payloads before deployment.`,
      scripts: [
        {
          title: "Scan Model Files with ModelScan (Python)",
          description: "Use the ModelScan open-source tool to detect malicious payloads in pickle and other model files.",
          type: "python", language: "python",
          code: `# Install ModelScan: pip install modelscan
# Scan a model file for malicious code

from modelscan.modelscan import ModelScan

scanner = ModelScan()
results = scanner.scan("path/to/${name}")

# Print scan results
for issue in results.issues:
    print(f"[{issue.severity}] {issue.description}")
    print(f"  Location: {issue.source}")
    print(f"  Details: {issue.details}")

if not results.issues:
    print("No malicious payloads detected.")
else:
    print(f"\\n⚠️  {len(results.issues)} issue(s) found — DO NOT deploy this model.")`,
          risk: "low", riskNote: "Read-only scanning operation. Does not modify the model file.",
          estimatedTime: "2-10 minutes depending on model size", requiresApproval: false,
        },
        {
          title: "Convert Pickle to SafeTensors",
          description: "Convert unsafe Pickle model files to the SafeTensors format for safe deserialization.",
          type: "python", language: "python",
          code: `# pip install safetensors torch
import torch
from safetensors.torch import save_file

# Load the pickle model (in an isolated environment!)
model_state = torch.load("model.pkl", map_location="cpu")

# Save as SafeTensors (safe serialization — no code execution on load)
save_file(model_state, "model.safetensors")

print("Model converted to SafeTensors format.")
print("You can now safely delete the .pkl file.")`,
          risk: "medium", riskNote: "Loading the pickle file executes any embedded code. Run this in an isolated, sandboxed environment (container with no network access).",
          estimatedTime: "5-15 minutes", requiresApproval: true,
        },
      ],
      prerequisites: ["Python environment with modelscan and/or safetensors installed", "Isolated environment for loading untrusted pickle files"],
      rollbackSteps: ["1. Keep the original model file as backup before conversion", "2. Verify the converted SafeTensors model produces identical outputs"],
      references: [
        { title: "ModelScan - ML Model Security Scanner", url: "https://github.com/protectai/modelscan" },
        { title: "SafeTensors Format", url: "https://huggingface.co/docs/safetensors" },
      ],
    };
  },

  "GRD-021": (f) => {
    const name = getAssetName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Enable content safety filters on guardrail "${name}" to block harmful outputs.`,
      scripts: [
        {
          title: "Update Bedrock Guardrail Filters",
          description: "Update the Bedrock guardrail to enable all content safety filters at appropriate severity levels.",
          type: "aws-cli", language: "bash",
          code: `# Update guardrail with proper content filters
aws bedrock update-guardrail \\
  --guardrail-identifier "<GUARDRAIL_ID>" \\
  --name "${name}" \\
  --content-policy-config '{
    "filtersConfig": [
      {"type": "SEXUAL", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "VIOLENCE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "HATE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "INSULTS", "inputStrength": "MEDIUM", "outputStrength": "MEDIUM"},
      {"type": "MISCONDUCT", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "PROMPT_ATTACK", "inputStrength": "HIGH", "outputStrength": "NONE"}
    ]
  }' \\
  --blocked-input-messaging "Your request was blocked by content safety filters." \\
  --blocked-outputs-messaging "The response was blocked by content safety filters."

echo "Guardrail filters updated for ${name}."`,
          risk: "medium", riskNote: "Enabling stricter filters may block legitimate queries that trigger false positives. Monitor the blocked request rate after applying.",
          estimatedTime: "2-3 minutes", requiresApproval: true,
        },
      ],
      prerequisites: ["Bedrock guardrail ID", "Appropriate filter strengths agreed with the content safety team"],
      rollbackSteps: ["1. Update the guardrail with the previous filter configuration", "2. Set filter strengths back to the original values"],
      references: [
        { title: "Bedrock Guardrails", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html" },
      ],
    };
  },

  "IAM-017": (f) => {
    const name = getAssetName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Rotate access key for AI service account "${name}" (key age exceeds 90 days).`,
      scripts: [
        {
          title: "Rotate Access Key",
          description: "Create a new access key, update dependent services, then deactivate and delete the old key.",
          type: "aws-cli", language: "bash",
          code: `# Step 1: List existing keys
aws iam list-access-keys --user-name "${name}" \\
  --query 'AccessKeyMetadata[*].[AccessKeyId,Status,CreateDate]' \\
  --output table

# Step 2: Create a new access key
NEW_KEY=$(aws iam create-access-key --user-name "${name}" --output json)
echo "New Key Created:"
echo "$NEW_KEY" | jq '.AccessKey | {AccessKeyId, SecretAccessKey}'

# Step 3: Update dependent services with the new key
# >>> UPDATE YOUR APPLICATION CONFIGURATION HERE <<<

# Step 4: Deactivate the old key (after verifying new key works)
aws iam update-access-key \\
  --user-name "${name}" \\
  --access-key-id "<OLD_KEY_ID>" \\
  --status Inactive

# Step 5: Delete the old key (after monitoring period)
# aws iam delete-access-key --user-name "${name}" --access-key-id "<OLD_KEY_ID>"`,
          risk: "high", riskNote: "Deactivating the old key before updating all dependent services will cause authentication failures. Follow the steps in order and verify each step.",
          estimatedTime: "15-30 minutes", requiresApproval: true,
        },
      ],
      prerequisites: ["Identify all services/applications using the current access key", "Have a rollback plan if the new key causes issues"],
      rollbackSteps: ["1. Reactivate the old key: aws iam update-access-key --access-key-id <OLD_KEY> --status Active", "2. Delete the new key if not yet deployed"],
      references: [
        { title: "IAM Access Key Rotation", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_RotateAccessKey" },
      ],
    };
  },

  "NET-062": (f) => {
    const name = getAssetName(f);
    return {
      findingId: f.id, ruleId: f.ruleId,
      summary: `Restrict VPC configuration for AI resource "${name}" to enforce network isolation.`,
      scripts: [
        {
          title: "Create Restrictive Security Group for AI Workloads",
          description: "Create a security group that only allows necessary ingress/egress for AI inference.",
          type: "aws-cli", language: "bash",
          code: `# Create a security group for AI workloads
SG_ID=$(aws ec2 create-security-group \\
  --group-name "ai-workload-sg" \\
  --description "Restricted SG for AI inference endpoints" \\
  --vpc-id <VPC_ID> \\
  --query 'GroupId' --output text)

# Allow inbound HTTPS only from internal CIDR
aws ec2 authorize-security-group-ingress \\
  --group-id "$SG_ID" \\
  --protocol tcp --port 443 \\
  --cidr <INTERNAL_CIDR>/16

# Allow outbound to S3 and KMS VPC endpoints only
aws ec2 authorize-security-group-egress \\
  --group-id "$SG_ID" \\
  --protocol tcp --port 443 \\
  --cidr <VPC_ENDPOINT_CIDR>/16

echo "Security Group $SG_ID created for AI workloads."`,
          risk: "medium", riskNote: "Verify all required network connectivity before applying the restrictive security group.",
          estimatedTime: "5-10 minutes", requiresApproval: true,
        },
      ],
      prerequisites: ["VPC ID and subnet configuration", "List of required network endpoints for AI services"],
      rollbackSteps: ["1. Reassign the previous security group to the AI resource", "2. Delete the new security group if not needed"],
      references: [
        { title: "VPC Security Groups", url: "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html" },
      ],
    };
  },
};

const CATEGORY_FALLBACKS: Record<string, (f: PolicyFinding) => RemediationSuggestion> = {
  "DIS": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Investigate and remediate discovery finding for "${f.assetName}".`,
    scripts: [{
      title: "Asset Inventory Audit Script",
      description: "Run an inventory audit to identify and classify unmanaged AI assets.",
      type: "aws-cli", language: "bash",
      code: `# Comprehensive AI asset discovery audit
echo "=== AI Asset Discovery Audit ==="

# SageMaker resources
echo "\\n--- SageMaker Endpoints ---"
aws sagemaker list-endpoints --query 'Endpoints[*].[EndpointName,EndpointStatus]' --output table

echo "\\n--- SageMaker Notebooks ---"
aws sagemaker list-notebook-instances --query 'NotebookInstances[*].[NotebookInstanceName,NotebookInstanceStatus,DirectInternetAccess]' --output table

echo "\\n--- Bedrock Custom Models ---"
aws bedrock list-custom-models --query 'modelSummaries[*].[modelName,modelArn]' --output table

echo "\\n--- Lambda Functions (AI-related) ---"
aws lambda list-functions --query 'Functions[?contains(FunctionName, \`ai\`) || contains(FunctionName, \`ml\`) || contains(FunctionName, \`model\`)].[FunctionName,Runtime,LastModified]' --output table`,
      risk: "low", riskNote: "Read-only audit. No changes are made.",
      estimatedTime: "2-5 minutes", requiresApproval: false,
    }],
    prerequisites: ["AWS CLI configured with read access to AI services"],
    rollbackSteps: [],
    references: [{ title: "AWS AI Services Overview", url: "https://aws.amazon.com/machine-learning/" }],
  }),

  "INF": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Harden infrastructure configuration for "${f.assetName}".`,
    scripts: [{
      title: "Infrastructure Security Audit",
      description: "Check encryption, network isolation, and access controls for AI infrastructure.",
      type: "aws-cli", language: "bash",
      code: `# Infrastructure security check for ${f.assetName}
echo "=== Infrastructure Security Audit ==="

# Check S3 bucket encryption
echo "\\n--- S3 Bucket Encryption Status ---"
aws s3api list-buckets --query 'Buckets[*].Name' --output text | tr '\\t' '\\n' | while read bucket; do
  enc=$(aws s3api get-bucket-encryption --bucket "$bucket" 2>/dev/null | jq -r '.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm // "NONE"')
  echo "$bucket: $enc"
done

# Check for public access
echo "\\n--- Public Access Block Status ---"
aws s3api list-buckets --query 'Buckets[*].Name' --output text | tr '\\t' '\\n' | while read bucket; do
  status=$(aws s3api get-public-access-block --bucket "$bucket" 2>/dev/null | jq -r '.PublicAccessBlockConfiguration.BlockPublicAccess // "NOT_SET"')
  echo "$bucket: $status"
done`,
      risk: "low", riskNote: "Read-only audit.",
      estimatedTime: "3-5 minutes", requiresApproval: false,
    }],
    prerequisites: ["AWS CLI with S3 and IAM read permissions"],
    rollbackSteps: [],
    references: [{ title: "AWS Security Best Practices", url: "https://docs.aws.amazon.com/security/" }],
  }),

  "DAT": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Address data security finding for "${f.assetName}".`,
    scripts: [{
      title: "Data Security Assessment",
      description: "Scan for unencrypted data stores and public access configurations.",
      type: "aws-cli", language: "bash",
      code: `# Data security assessment
echo "=== Data Security Assessment for ${f.assetName} ==="

# Enable Amazon Macie for PII detection
aws macie2 enable-macie 2>/dev/null || echo "Macie already enabled"

# Create a classification job
aws macie2 create-classification-job \\
  --job-type ONE_TIME \\
  --name "ai-data-scan-$(date +%Y%m%d)" \\
  --s3-job-definition '{
    "bucketDefinitions": [{
      "accountId": "<ACCOUNT_ID>",
      "buckets": ["<BUCKET_NAME>"]
    }]
  }' 2>/dev/null || echo "Configure Macie job manually"

echo "\\nRecommendation: Enable Amazon Macie to continuously scan AI data stores for sensitive data."`,
      risk: "low", riskNote: "Macie incurs costs based on data scanned. Review pricing before enabling.",
      estimatedTime: "5-10 minutes", requiresApproval: false,
    }],
    prerequisites: ["Amazon Macie service access", "S3 bucket read permissions"],
    rollbackSteps: ["1. Disable Macie if not needed: aws macie2 disable-macie"],
    references: [{ title: "Amazon Macie", url: "https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html" }],
  }),

  "IAM": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Review and tighten IAM configuration for "${f.assetName}".`,
    scripts: [{
      title: "IAM Security Review",
      description: "Audit IAM role permissions, trust relationships, and access patterns.",
      type: "aws-cli", language: "bash",
      code: `# IAM security review
ROLE_NAME="${f.assetName}"
echo "=== IAM Review for $ROLE_NAME ==="

# List attached policies
echo "\\n--- Attached Policies ---"
aws iam list-attached-role-policies --role-name "$ROLE_NAME" --output table 2>/dev/null

# Check trust policy
echo "\\n--- Trust Policy ---"
aws iam get-role --role-name "$ROLE_NAME" --query 'Role.AssumeRolePolicyDocument' --output json 2>/dev/null

# Check permission boundary
echo "\\n--- Permission Boundary ---"
aws iam get-role --role-name "$ROLE_NAME" --query 'Role.PermissionsBoundary' --output json 2>/dev/null

# Last used
echo "\\n--- Last Used ---"
aws iam get-role --role-name "$ROLE_NAME" --query 'Role.RoleLastUsed' --output json 2>/dev/null`,
      risk: "low", riskNote: "Read-only audit.",
      estimatedTime: "1-2 minutes", requiresApproval: false,
    }],
    prerequisites: ["IAM read permissions"],
    rollbackSteps: [],
    references: [{ title: "IAM Best Practices", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html" }],
  }),

  "GRD": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Review guardrail configuration for "${f.assetName}".`,
    scripts: [{
      title: "Guardrail Configuration Audit",
      description: "Review current guardrail settings and recommend improvements.",
      type: "aws-cli", language: "bash",
      code: `# Guardrail audit
echo "=== Bedrock Guardrails Audit ==="
aws bedrock list-guardrails \\
  --query 'guardrails[*].[name,id,status,version]' \\
  --output table

# Get detailed config for each guardrail
for gid in $(aws bedrock list-guardrails --query 'guardrails[*].id' --output text); do
  echo "\\n--- Guardrail: $gid ---"
  aws bedrock get-guardrail --guardrail-identifier "$gid" --output json
done`,
      risk: "low", riskNote: "Read-only audit.",
      estimatedTime: "1-2 minutes", requiresApproval: false,
    }],
    prerequisites: ["Bedrock API access"],
    rollbackSteps: [],
    references: [{ title: "Bedrock Guardrails", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html" }],
  }),

  "SUP": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Address supply chain risk for "${f.assetName}".`,
    scripts: [{
      title: "Supply Chain Security Scan",
      description: "Scan model artifacts and dependencies for known vulnerabilities.",
      type: "shell", language: "bash",
      code: `# Supply chain security scan
echo "=== Supply Chain Security Assessment ==="

# Scan Python dependencies for vulnerabilities
pip audit 2>/dev/null || echo "Install pip-audit: pip install pip-audit"

# Check for known vulnerable ML packages
echo "\\n--- ML Package Version Check ---"
pip show torch tensorflow transformers 2>/dev/null | grep -E "Name:|Version:"

# Scan model files with ModelScan
echo "\\n--- Model File Scan ---"
modelscan --path "<MODEL_FILE_PATH>" 2>/dev/null || echo "Install modelscan: pip install modelscan"`,
      risk: "low", riskNote: "Read-only scanning.",
      estimatedTime: "5-10 minutes", requiresApproval: false,
    }],
    prerequisites: ["Python environment with pip-audit and modelscan"],
    rollbackSteps: [],
    references: [{ title: "ModelScan", url: "https://github.com/protectai/modelscan" }],
  }),

  "MON": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Enable monitoring for "${f.assetName}".`,
    scripts: [{
      title: "Enable AI Monitoring",
      description: "Set up CloudWatch alarms and logging for AI workloads.",
      type: "aws-cli", language: "bash",
      code: `# Enable monitoring for AI workloads
echo "=== AI Monitoring Setup ==="

# Enable Bedrock invocation logging
aws bedrock put-model-invocation-logging-configuration \\
  --logging-config '{
    "cloudWatchConfig": {
      "logGroupName": "/aws/bedrock/invocations",
      "roleArn": "<LOGGING_ROLE_ARN>",
      "largeDataDeliveryS3Config": {
        "bucketName": "<LOG_BUCKET>",
        "keyPrefix": "bedrock-logs/"
      }
    },
    "s3Config": {
      "bucketName": "<LOG_BUCKET>",
      "keyPrefix": "bedrock-logs/"
    }
  }' 2>/dev/null || echo "Configure Bedrock logging manually"

echo "Recommendation: Enable CloudWatch alarms for invocation latency, error rates, and token usage."`,
      risk: "low", riskNote: "Enabling logging may incur CloudWatch and S3 storage costs.",
      estimatedTime: "5-10 minutes", requiresApproval: false,
    }],
    prerequisites: ["CloudWatch and S3 permissions", "Logging IAM role"],
    rollbackSteps: ["1. Disable invocation logging via the Bedrock console"],
    references: [{ title: "Bedrock Model Invocation Logging", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html" }],
  }),

  "GOV": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Address governance gap for "${f.assetName}".`,
    scripts: [{
      title: "Governance Compliance Check",
      description: "Verify tagging, documentation, and approval requirements for AI resources.",
      type: "aws-cli", language: "bash",
      code: `echo "=== AI Governance Check ==="
echo "Asset: ${f.assetName}"
echo "Finding: ${f.finding?.substring(0, 100)}"
echo ""
echo "Recommended actions:"
echo "1. Verify the asset has required tags (Owner, Project, Environment, DataClassification)"
echo "2. Check that a Model Card or system documentation exists in the GRC module"
echo "3. Confirm the asset has been approved through the AI governance review process"
echo "4. Verify risk assessment has been completed and documented"`,
      risk: "low", riskNote: "Informational audit only.",
      estimatedTime: "5 minutes", requiresApproval: false,
    }],
    prerequisites: [],
    rollbackSteps: [],
    references: [{ title: "NIST AI RMF", url: "https://www.nist.gov/artificial-intelligence/executive-order-safe-secure-and-trustworthy-artificial-intelligence" }],
  }),

  "RUN": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Address runtime security issue for "${f.assetName}".`,
    scripts: [{
      title: "Runtime Security Hardening",
      description: "Review and harden runtime security configurations for AI workloads.",
      type: "aws-cli", language: "bash",
      code: `echo "=== Runtime Security Review ==="
echo "Asset: ${f.assetName}"
echo ""
echo "Recommended runtime security checks:"
echo "1. Verify input validation is enabled for all inference endpoints"
echo "2. Check that output filtering/guardrails are active"
echo "3. Confirm rate limiting is configured to prevent abuse"
echo "4. Review timeout settings to prevent resource exhaustion"
echo "5. Check that error responses do not leak model internals"`,
      risk: "low", riskNote: "Informational assessment.",
      estimatedTime: "10 minutes", requiresApproval: false,
    }],
    prerequisites: [],
    rollbackSteps: [],
    references: [{ title: "OWASP ML Security Top 10", url: "https://owasp.org/www-project-machine-learning-security-top-10/" }],
  }),

  "NET": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Address network security finding for "${f.assetName}".`,
    scripts: [{
      title: "Network Security Assessment",
      description: "Audit network configuration, security groups, and endpoint access for AI resources.",
      type: "aws-cli", language: "bash",
      code: `echo "=== Network Security Assessment ==="
echo "Asset: ${f.assetName}"
echo ""

# List VPC endpoints for AI services
echo "--- VPC Endpoints for AI Services ---"
aws ec2 describe-vpc-endpoints \\
  --filters "Name=service-name,Values=*sagemaker*,*bedrock*" \\
  --query 'VpcEndpoints[*].[VpcEndpointId,ServiceName,State]' \\
  --output table 2>/dev/null

# Check security groups for overly permissive rules
echo "\\n--- Security Groups with 0.0.0.0/0 Ingress ---"
aws ec2 describe-security-groups \\
  --filters "Name=ip-permission.cidr,Values=0.0.0.0/0" \\
  --query 'SecurityGroups[*].[GroupId,GroupName,Description]' \\
  --output table`,
      risk: "low", riskNote: "Read-only audit.",
      estimatedTime: "2-3 minutes", requiresApproval: false,
    }],
    prerequisites: ["EC2 and VPC read permissions"],
    rollbackSteps: [],
    references: [{ title: "VPC Endpoints", url: "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html" }],
  }),

  "COM": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Address compliance requirement for "${f.assetName}".`,
    scripts: [{
      title: "Compliance Gap Assessment",
      description: "Review compliance requirements and documentation gaps for the AI system.",
      type: "config", language: "yaml",
      code: `# Compliance Checklist for ${f.assetName}
# Based on: ${f.ruleId} - ${f.finding?.substring(0, 80)}

compliance_assessment:
  asset: "${f.assetName}"
  rule: "${f.ruleId}"
  
  eu_ai_act:
    risk_classification: "# HIGH / LIMITED / MINIMAL"
    human_oversight: "# Yes / No"
    technical_documentation: "# Complete / Incomplete / Missing"
    conformity_assessment: "# Passed / Pending / Not Started"
    transparency_obligations: "# Met / Not Met"
    
  data_protection:
    gdpr_dpia_completed: "# Yes / No"
    data_processing_agreement: "# Yes / No"
    automated_decision_safeguards: "# Yes / No"
    right_to_explanation: "# Implemented / Not Implemented"
    
  actions_required:
    - "Complete risk classification per EU AI Act Article 6"
    - "Document the AI system per Annex IV requirements"
    - "Implement human oversight per Article 14"
    - "Register in EU AI database per Article 60"
    - "Schedule next bias audit within 6 months"`,
      risk: "low", riskNote: "Documentation template — fill in the values and submit to your compliance team.",
      estimatedTime: "30-60 minutes", requiresApproval: false,
    }],
    prerequisites: ["Access to the GRC module", "AI system documentation", "Risk classification from the AI governance team"],
    rollbackSteps: [],
    references: [
      { title: "EU AI Act Full Text", url: "https://eur-lex.europa.eu/eli/reg/2024/1689" },
      { title: "NIST AI RMF", url: "https://www.nist.gov/artificial-intelligence" },
    ],
  }),
  "HEX": (f) => ({
    findingId: f.id, ruleId: f.ruleId,
    summary: `Hex Scanner detected a security issue in model artifact "${f.assetName}". Review the finding and apply the recommended remediation.`,
    scripts: [{
      title: "Re-scan with Hex Scanner",
      description: "Re-run the Hex container scanner against the model files for the latest results.",
      type: "shell" as const, language: "bash",
      code: `# Pull latest Hex scanner image\ndocker pull layerd/hex:latest\n\n# Download the model files from S3\naws s3 sync s3://${f.assetName.split(" — ")[0] || "BUCKET_NAME"} /tmp/hex-scan/ \\\n  --exclude "*" \\\n  --include "*.pkl" --include "*.safetensors" --include "*.pth" \\\n  --include "*.onnx" --include "*.bin" --include "*.h5" \\\n  --include "*.pt" --include "*.model" --include "*.weights"\n\n# Run Hex scan with JSON output\ndocker run --rm \\\n  --security-opt=no-new-privileges:true \\\n  --cap-drop=ALL \\\n  --read-only \\\n  -v /tmp/hex-scan:/scan:ro \\\n  layerd/hex:latest /scan --json > hex-report.json\n\necho "Scan complete. Review hex-report.json for findings."\ncat hex-report.json | jq '.summary'`,
      risk: "low" as const, riskNote: "Read-only scan — no changes are made to the model files.",
      estimatedTime: "5-15 minutes", requiresApproval: false,
    }, {
      title: "Generate Model SBOM",
      description: "Generate a Software Bill of Materials for the model to track dependencies and provenance.",
      type: "shell" as const, language: "bash",
      code: `# Generate CycloneDX SBOM with AI/ML metadata\ndocker run --rm \\\n  -v /tmp/hex-scan:/scan:ro \\\n  -v $(pwd)/output:/output \\\n  layerd/hex:latest /scan \\\n  --sbom /output/model-sbom.cdx.json \\\n  --sbom-format cyclonedx\n\necho "SBOM generated at output/model-sbom.cdx.json"`,
      risk: "low" as const, riskNote: "Generates documentation only.",
      estimatedTime: "2-5 minutes", requiresApproval: false,
    }],
    prerequisites: ["Docker installed and running", "AWS CLI configured with bucket access", "Sufficient disk space for model files"],
    rollbackSteps: ["Remove temporary model files: rm -rf /tmp/hex-scan/"],
    references: [
      { title: "Hex Scanner Documentation", url: "https://hex.layerd.com" },
      { title: "Hex Docker Hub", url: "https://hub.docker.com/r/layerd/hex" },
    ],
  }),
};

export function generateRemediation(finding: PolicyFinding): RemediationSuggestion {
  const specificGenerator = GENERATORS[finding.ruleId];
  if (specificGenerator) {
    return specificGenerator(finding);
  }

  const category = finding.ruleId.split("-")[0];
  const fallbackGenerator = CATEGORY_FALLBACKS[category];
  if (fallbackGenerator) {
    return fallbackGenerator(finding);
  }

  return {
    findingId: finding.id,
    ruleId: finding.ruleId,
    summary: `Review and remediate finding for "${finding.assetName}".`,
    scripts: [{
      title: "General Security Review",
      description: "Perform a manual security review of the affected asset.",
      type: "shell", language: "bash",
      code: `echo "Manual review required for: ${finding.assetName}"\necho "Finding: ${finding.finding?.substring(0, 100)}"\necho "Severity: ${finding.severity}"`,
      risk: "low", riskNote: "Informational only.",
      estimatedTime: "15-30 minutes", requiresApproval: false,
    }],
    prerequisites: [],
    rollbackSteps: [],
    references: [],
  };
}
