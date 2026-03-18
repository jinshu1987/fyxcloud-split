# AWS Resource Relationship and Data Flow Analysis

## Executive Summary
After reviewing the AWS scanner implementation, I've identified significant gaps in how resource relationships and network configurations are captured. The current implementation focuses on discovering individual resources but lacks comprehensive relationship mapping and data flow visibility.

## Current State Analysis

### 1. AI Service Integration Coverage

#### ✅ What's Currently Captured:
- **Bedrock Services:**
  - Foundation models (provisioned throughput)
  - Custom models
  - Agents and Knowledge Bases
  - Flows and Prompts
  - Guardrails
  - Invocation logging configuration

- **SageMaker Services:**
  - Models and Endpoints
  - Notebook instances (with limited VPC info)
  - Training jobs
  - Pipelines
  - Feature groups

- **Other AI Services:**
  - Comprehend, Textract, Rekognition
  - Translate, Transcribe, Polly
  - Personalize, Forecast
  - Lex Bots, Kendra Indices

### 2. Network Configuration Capture

#### ⚠️ Partially Captured:
- **SageMaker Notebooks:** Captures subnet ID, security groups, and VPC ID (server/aws-scanner.ts:580-598)
- **EKS Clusters:** Captures public endpoint access status (server/aws-scanner.ts:1636-1639)
- **ECS Services:** Captures public IP assignment status (server/aws-scanner.ts:1681-1682)

#### ❌ Missing Network Infrastructure:
- VPCs and their configurations
- Subnets and route tables
- Security groups and their rules
- Network ACLs
- VPC Endpoints (critical for private Bedrock access)
- NAT Gateways and Internet Gateways
- Elastic Network Interfaces (ENIs)
- VPC Peering and Transit Gateway connections

## Critical Gaps Identified

### 1. Resource Relationship Mapping
**Current State:** Resources are stored as isolated entities with minimal relationship data.

**Missing Elements:**
- No parent-child relationships (e.g., Lambda → VPC → Subnet)
- No service-to-service connections (e.g., Lambda → Bedrock API)
- No IAM role associations and permission boundaries
- No resource dependency graphs

### 2. API Communication Patterns
**Current State:** No visibility into how services communicate with AI APIs.

**Missing Elements:**
- VPC Endpoint usage for private Bedrock/SageMaker access
- API Gateway integrations with backend services
- Lambda function environment variables pointing to AI endpoints
- Service mesh configurations (if using App Mesh)

### 3. Security Group and Traffic Flow
**Current State:** Security groups are mentioned but rules aren't analyzed.

**Missing Elements:**
- Inbound/outbound security group rules
- Network ACL rules
- Flow logs analysis
- Traffic patterns between resources

### 4. Data Flow Visibility
**Current State:** Individual resources identified but data flow paths unknown.

**Missing Elements:**
- S3 bucket access patterns from AI services
- Kinesis/Firehose data streams to ML pipelines
- EventBridge rule targets and workflows
- Step Functions state machine definitions

## Recommendations for Enhancement

### Phase 1: Network Infrastructure Discovery
```typescript
// Add new scanner functions
async function scanNetworkInfrastructure(creds: AwsCredentials, region: string) {
  // Scan VPCs
  // Scan Subnets with route tables
  // Scan Security Groups with rules
  // Scan VPC Endpoints
  // Scan NAT/Internet Gateways
  // Scan Network Interfaces
}
```

### Phase 2: Enhanced Resource Metadata
Expand the metadata captured for each resource:
```typescript
interface EnhancedMetadata {
  // Network Configuration
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  privateIpAddresses?: string[];
  publicIpAddresses?: string[];

  // IAM Configuration
  roleArn?: string;
  attachedPolicies?: string[];

  // Service Connections
  connectedServices?: Array<{
    serviceType: string;
    resourceId: string;
    connectionType: string; // 'api', 'network', 'iam', 'event'
  }>;

  // API Endpoints
  endpoints?: Array<{
    type: string; // 'public', 'vpc-endpoint', 'private-link'
    url: string;
    vpcEndpointId?: string;
  }>;
}
```

### Phase 3: Relationship Graph Builder
Create a post-processing step to build relationships:
```typescript
interface ResourceRelationship {
  sourceId: string;
  targetId: string;
  relationshipType: 'uses' | 'contains' | 'connects-to' | 'managed-by';
  dataFlow?: 'bidirectional' | 'source-to-target' | 'target-to-source';
  protocol?: string; // 'https', 'tcp', 'udp'
  ports?: number[];
}
```

### Phase 4: Specific Bedrock Integration Enhancements

1. **Track VPC Endpoints for Bedrock:**
   - Scan for VPC endpoints with service name `com.amazonaws.*.bedrock*`
   - Map which resources can access these endpoints

2. **Lambda Function Analysis:**
   - Parse environment variables for Bedrock/SageMaker endpoints
   - Check IAM role permissions for bedrock:* actions
   - Identify Lambda layers with AI/ML libraries

3. **API Gateway Integration:**
   - Check for Bedrock/SageMaker backend integrations
   - Map authentication methods and API keys

### Phase 5: Data Flow Visualization Requirements

Create a data structure to support visualization:
```typescript
interface DataFlowPath {
  id: string;
  name: string;
  steps: Array<{
    resourceId: string;
    resourceType: string;
    action: string; // 'invoke', 'read', 'write', 'transform'
    nextStep?: string;
  }>;
  securityPosture: {
    encrypted: boolean;
    publiclyAccessible: boolean;
    authentication: string[];
  };
}
```

## Implementation Priority

### High Priority (Immediate):
1. Add VPC and Subnet scanning
2. Add Security Group rule extraction
3. Add VPC Endpoint discovery
4. Enhance Lambda metadata to include VPC configuration

### Medium Priority (Next Sprint):
1. Build relationship mapping engine
2. Add IAM role and policy associations
3. Implement data flow path detection
4. Add API Gateway backend analysis

### Low Priority (Future):
1. Traffic flow analysis from VPC Flow Logs
2. CloudTrail event correlation
3. Cost optimization recommendations
4. Automated security posture assessment

## Security Considerations

### Current Security Gaps:
1. No visibility into private vs public endpoints
2. Missing security group rule analysis
3. No detection of overly permissive IAM policies
4. No identification of unencrypted data flows

### Recommended Security Enhancements:
1. Flag resources with public IP addresses
2. Identify security groups with 0.0.0.0/0 rules
3. Detect IAM policies with wildcards
4. Track encryption in transit and at rest
5. Identify resources without VPC endpoints (forcing internet routing)

## Sample Enhanced Output

```json
{
  "resource": {
    "id": "lambda-123",
    "name": "bedrock-inference-function",
    "type": "Lambda",
    "network": {
      "vpcId": "vpc-abc123",
      "subnetIds": ["subnet-1", "subnet-2"],
      "securityGroupIds": ["sg-lambda-bedrock"],
      "hasInternetAccess": false,
      "vpcEndpoints": ["vpce-bedrock-runtime"]
    },
    "relationships": [
      {
        "targetId": "bedrock-claude-v2",
        "type": "invokes",
        "via": "vpc-endpoint",
        "secured": true
      },
      {
        "targetId": "s3-model-artifacts",
        "type": "reads",
        "via": "vpc-endpoint",
        "secured": true
      }
    ],
    "dataFlow": {
      "inbound": ["api-gateway-123"],
      "outbound": ["bedrock-api", "s3-results"],
      "encryption": "TLS 1.2"
    }
  }
}
```

## Conclusion

The current AWS scanner provides good coverage of AI/ML resources but lacks critical network and relationship mapping capabilities. Implementing these enhancements will provide:

1. **Complete visibility** into how AI services communicate
2. **Security posture** assessment of data flows
3. **Network topology** understanding
4. **Cost optimization** opportunities (e.g., identifying internet egress that could use VPC endpoints)
5. **Compliance validation** for data residency and encryption requirements

The recommended phased approach allows for incremental value delivery while building toward a comprehensive resource relationship and data flow visualization system.