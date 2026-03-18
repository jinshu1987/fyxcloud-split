import type { EnhancedScanResult, NetworkResource, EnhancedDiscoveredAsset, ResourceRelationship, DataFlowPath } from './aws-scanner-enhanced';
import { writeFileSync } from 'fs';

// Generate demo data to showcase the enhanced scanner capabilities
function generateDemoScanResult(): EnhancedScanResult {
  // Demo Network Resources
  const networkResources: NetworkResource[] = [
    {
      id: 'vpc-demo123',
      type: 'vpc',
      name: 'Production VPC',
      region: 'us-east-1',
      metadata: {
        vpcId: 'vpc-demo123',
        cidrBlock: '10.0.0.0/16',
        enableDnsHostnames: true,
        enableDnsSupport: true,
      },
    },
    {
      id: 'subnet-private1',
      type: 'subnet',
      name: 'Private Subnet 1',
      region: 'us-east-1',
      metadata: {
        subnetId: 'subnet-private1',
        vpcId: 'vpc-demo123',
        cidrBlock: '10.0.1.0/24',
        availabilityZone: 'us-east-1a',
        mapPublicIpOnLaunch: false,
      },
    },
    {
      id: 'subnet-private2',
      type: 'subnet',
      name: 'Private Subnet 2',
      region: 'us-east-1',
      metadata: {
        subnetId: 'subnet-private2',
        vpcId: 'vpc-demo123',
        cidrBlock: '10.0.2.0/24',
        availabilityZone: 'us-east-1b',
        mapPublicIpOnLaunch: false,
      },
    },
    {
      id: 'sg-lambda-bedrock',
      type: 'security-group',
      name: 'Lambda-Bedrock-SG',
      region: 'us-east-1',
      metadata: {
        groupId: 'sg-lambda-bedrock',
        vpcId: 'vpc-demo123',
        description: 'Security group for Lambda functions accessing Bedrock',
        inboundRules: [],
        outboundRules: [
          {
            protocol: 'tcp',
            fromPort: 443,
            toPort: 443,
            source: '0.0.0.0/0',
            description: 'HTTPS to Bedrock API',
          },
        ],
      },
    },
    {
      id: 'vpce-bedrock-runtime',
      type: 'vpc-endpoint',
      name: 'Bedrock Runtime VPC Endpoint',
      region: 'us-east-1',
      metadata: {
        vpcEndpointId: 'vpce-bedrock-runtime',
        vpcId: 'vpc-demo123',
        serviceName: 'com.amazonaws.us-east-1.bedrock-runtime',
        vpcEndpointType: 'Interface',
        state: 'Available',
        subnetIds: ['subnet-private1', 'subnet-private2'],
        securityGroupIds: ['sg-lambda-bedrock'],
        privateDnsEnabled: true,
        isAiService: true,
        aiServiceType: 'bedrock',
      },
    },
    {
      id: 'vpce-sagemaker-runtime',
      type: 'vpc-endpoint',
      name: 'SageMaker Runtime VPC Endpoint',
      region: 'us-east-1',
      metadata: {
        vpcEndpointId: 'vpce-sagemaker-runtime',
        vpcId: 'vpc-demo123',
        serviceName: 'com.amazonaws.us-east-1.sagemaker.runtime',
        vpcEndpointType: 'Interface',
        state: 'Available',
        subnetIds: ['subnet-private1', 'subnet-private2'],
        privateDnsEnabled: true,
        isAiService: true,
        aiServiceType: 'sagemaker',
      },
    },
    {
      id: 'nat-gateway-1',
      type: 'nat-gateway',
      name: 'NAT Gateway AZ1',
      region: 'us-east-1',
      metadata: {
        natGatewayId: 'nat-gateway-1',
        vpcId: 'vpc-demo123',
        subnetId: 'subnet-public1',
        state: 'available',
        publicIp: '54.123.45.67',
      },
    },
  ];

  // Demo Enhanced Assets
  const assets: EnhancedDiscoveredAsset[] = [
    {
      id: 'lambda-bedrock-chat-processor',
      name: 'bedrock-chat-processor',
      type: 'Lambda Function',
      category: 'Compute',
      source: 'AWS Lambda',
      externalId: 'arn:aws:lambda:us-east-1:123456789:function:bedrock-chat-processor',
      serviceType: 'Lambda',
      risk: 'Low',
      exposure: 'Private',
      tags: ['lambda', 'python3.11', 'bedrock', 'us-east-1'],
      metadata: {
        functionArn: 'arn:aws:lambda:us-east-1:123456789:function:bedrock-chat-processor',
        runtime: 'python3.11',
        memorySize: 1024,
        timeout: 300,
        vpcId: 'vpc-demo123',
        subnetIds: ['subnet-private1', 'subnet-private2'],
        securityGroupIds: ['sg-lambda-bedrock'],
        roleArn: 'arn:aws:iam::123456789:role/bedrock-chat-lambda-role',
        hasBedrockConfig: true,
        environmentVariables: ['BEDROCK_MODEL_ID', 'BEDROCK_REGION', 'S3_BUCKET'],
        connectedServices: [
          {
            serviceType: 'bedrock',
            resourceId: 'bedrock-claude-v2',
            connectionType: 'api',
            direction: 'outbound',
          },
          {
            serviceType: 's3',
            resourceId: 'chat-history-bucket',
            connectionType: 'data',
            direction: 'bidirectional',
          },
        ],
        endpoints: [
          {
            type: 'vpc-endpoint',
            vpcEndpointId: 'vpce-bedrock-runtime',
            serviceName: 'com.amazonaws.us-east-1.bedrock-runtime',
          },
        ],
      },
    },
    {
      id: 'api-gateway-chat-api',
      name: 'Chat API Gateway',
      type: 'API Gateway',
      category: 'API Management',
      source: 'AWS API Gateway',
      externalId: 'api-gateway-123',
      serviceType: 'APIGateway',
      risk: 'Medium',
      exposure: 'Public',
      tags: ['api-gateway', 'rest', 'public', 'us-east-1'],
      metadata: {
        apiId: 'api-gateway-123',
        apiName: 'Chat API Gateway',
        endpointConfiguration: { types: ['EDGE'] },
        endpoints: [
          {
            type: 'public',
            url: 'https://api-gateway-123.execute-api.us-east-1.amazonaws.com',
          },
        ],
        connectedServices: [
          {
            serviceType: 'lambda',
            resourceId: 'bedrock-chat-processor',
            connectionType: 'api',
            direction: 'outbound',
          },
        ],
      },
    },
    {
      id: 'bedrock-kb-product-docs',
      name: 'Product Documentation KB',
      type: 'Knowledge Base',
      category: 'AI Service',
      source: 'AWS Bedrock',
      externalId: 'arn:aws:bedrock:us-east-1:123456789:knowledge-base/kb-123',
      serviceType: 'Bedrock',
      risk: 'Low',
      exposure: 'Private',
      tags: ['bedrock', 'knowledge-base', 'vector-store', 'us-east-1'],
      metadata: {
        knowledgeBaseId: 'kb-123',
        knowledgeBaseArn: 'arn:aws:bedrock:us-east-1:123456789:knowledge-base/kb-123',
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        opensearchEndpoint: 'https://kb-collection.us-east-1.aoss.amazonaws.com',
        connectedServices: [
          {
            serviceType: 's3',
            resourceId: 'docs-source-bucket',
            connectionType: 'data',
            direction: 'inbound',
          },
        ],
      },
    },
    {
      id: 'bedrock-agent-support-bot',
      name: 'Customer Support Agent',
      type: 'Bedrock Agent',
      category: 'AI Service',
      source: 'AWS Bedrock',
      externalId: 'arn:aws:bedrock:us-east-1:123456789:agent/agent-456',
      serviceType: 'Bedrock',
      risk: 'Medium',
      exposure: 'Private',
      tags: ['bedrock', 'agent', 'claude-v2', 'us-east-1'],
      metadata: {
        agentId: 'agent-456',
        agentArn: 'arn:aws:bedrock:us-east-1:123456789:agent/agent-456',
        foundationModel: 'anthropic.claude-v2',
        instruction: 'You are a helpful customer support assistant...',
        roleArn: 'arn:aws:iam::123456789:role/bedrock-agent-role',
        connectedServices: [
          {
            serviceType: 'bedrock-knowledge-base',
            resourceId: 'kb-123',
            connectionType: 'data',
            direction: 'inbound',
          },
        ],
      },
    },
    {
      id: 'sagemaker-endpoint-sentiment',
      name: 'sentiment-analysis-endpoint',
      type: 'SageMaker Endpoint',
      category: 'Inference Endpoints',
      source: 'AWS SageMaker',
      externalId: 'arn:aws:sagemaker:us-east-1:123456789:endpoint/sentiment-analysis',
      serviceType: 'SageMaker',
      risk: 'Low',
      exposure: 'Private',
      tags: ['sagemaker', 'endpoint', 'ml-model', 'us-east-1'],
      metadata: {
        endpointArn: 'arn:aws:sagemaker:us-east-1:123456789:endpoint/sentiment-analysis',
        instanceType: 'ml.m5.xlarge',
        instanceCount: 2,
        vpcConfig: {
          vpcId: 'vpc-demo123',
          subnetIds: ['subnet-private1', 'subnet-private2'],
          securityGroupIds: ['sg-sagemaker'],
        },
        endpoints: [
          {
            type: 'vpc-endpoint',
            vpcEndpointId: 'vpce-sagemaker-runtime',
            serviceName: 'com.amazonaws.us-east-1.sagemaker.runtime',
          },
        ],
      },
    },
  ];

  // Demo Relationships
  const relationships: ResourceRelationship[] = [
    // VPC containment relationships
    {
      id: 'rel-vpc-subnet-1',
      sourceId: 'vpc-demo123',
      sourceType: 'vpc',
      targetId: 'subnet-private1',
      targetType: 'subnet',
      relationshipType: 'contains',
    },
    {
      id: 'rel-vpc-subnet-2',
      sourceId: 'vpc-demo123',
      sourceType: 'vpc',
      targetId: 'subnet-private2',
      targetType: 'subnet',
      relationshipType: 'contains',
    },
    {
      id: 'rel-vpc-sg',
      sourceId: 'vpc-demo123',
      sourceType: 'vpc',
      targetId: 'sg-lambda-bedrock',
      targetType: 'security-group',
      relationshipType: 'contains',
    },
    {
      id: 'rel-vpc-endpoint-bedrock',
      sourceId: 'vpc-demo123',
      sourceType: 'vpc',
      targetId: 'vpce-bedrock-runtime',
      targetType: 'vpc-endpoint',
      relationshipType: 'contains',
    },
    // Lambda network relationships
    {
      id: 'rel-lambda-vpc',
      sourceId: 'lambda-bedrock-chat-processor',
      sourceType: 'lambda',
      targetId: 'vpc-demo123',
      targetType: 'vpc',
      relationshipType: 'uses',
    },
    {
      id: 'rel-lambda-subnet-1',
      sourceId: 'lambda-bedrock-chat-processor',
      sourceType: 'lambda',
      targetId: 'subnet-private1',
      targetType: 'subnet',
      relationshipType: 'uses',
    },
    {
      id: 'rel-lambda-sg',
      sourceId: 'lambda-bedrock-chat-processor',
      sourceType: 'lambda',
      targetId: 'sg-lambda-bedrock',
      targetType: 'security-group',
      relationshipType: 'uses',
    },
    {
      id: 'rel-lambda-vpce',
      sourceId: 'lambda-bedrock-chat-processor',
      sourceType: 'lambda',
      targetId: 'vpce-bedrock-runtime',
      targetType: 'vpc-endpoint',
      relationshipType: 'uses',
      metadata: {
        purpose: 'Private access to Bedrock API',
      },
    },
    // API Gateway to Lambda
    {
      id: 'rel-api-lambda',
      sourceId: 'api-gateway-chat-api',
      sourceType: 'api-gateway',
      targetId: 'lambda-bedrock-chat-processor',
      targetType: 'lambda',
      relationshipType: 'connects-to',
      protocol: 'https',
      dataFlow: 'source-to-target',
    },
    // Bedrock Agent to Knowledge Base
    {
      id: 'rel-agent-kb',
      sourceId: 'bedrock-agent-support-bot',
      sourceType: 'bedrock-agent',
      targetId: 'bedrock-kb-product-docs',
      targetType: 'bedrock-knowledge-base',
      relationshipType: 'uses',
      dataFlow: 'bidirectional',
    },
  ];

  // Demo Data Flow Paths
  const dataFlowPaths: DataFlowPath[] = [
    {
      id: 'flow-chat-api',
      name: 'Chat API → Bedrock Flow',
      description: 'Data flow from public API through Lambda to Bedrock via VPC Endpoint',
      steps: [
        {
          resourceId: 'api-gateway-chat-api',
          resourceType: 'API Gateway',
          resourceName: 'Chat API Gateway',
          action: 'route',
          protocol: 'https',
          port: 443,
          encrypted: true,
        },
        {
          resourceId: 'lambda-bedrock-chat-processor',
          resourceType: 'Lambda Function',
          resourceName: 'bedrock-chat-processor',
          action: 'process',
          encrypted: true,
        },
        {
          resourceId: 'vpce-bedrock-runtime',
          resourceType: 'VPC Endpoint',
          resourceName: 'Bedrock Runtime VPC Endpoint',
          action: 'route',
          encrypted: true,
        },
        {
          resourceId: 'bedrock-claude-v2',
          resourceType: 'Bedrock Model',
          resourceName: 'Claude v2',
          action: 'invoke',
          encrypted: true,
        },
      ],
      securityPosture: {
        encrypted: true,
        publiclyAccessible: true,
        authentication: ['api-key', 'iam'],
        complianceFlags: [
          'Chat API Gateway is publicly accessible',
          'Lambda uses VPC endpoints for private Bedrock access',
          'All data in transit is encrypted with TLS 1.2',
        ],
      },
    },
    {
      id: 'flow-knowledge-base-ingestion',
      name: 'Knowledge Base Ingestion Flow',
      description: 'Data flow from S3 to Bedrock Knowledge Base via OpenSearch',
      steps: [
        {
          resourceId: 's3-docs-source',
          resourceType: 'S3 Bucket',
          resourceName: 'docs-source-bucket',
          action: 'read',
          encrypted: true,
        },
        {
          resourceId: 'bedrock-kb-product-docs',
          resourceType: 'Knowledge Base',
          resourceName: 'Product Documentation KB',
          action: 'transform',
          encrypted: true,
        },
        {
          resourceId: 'opensearch-vector-store',
          resourceType: 'OpenSearch Serverless',
          resourceName: 'kb-collection',
          action: 'write',
          encrypted: true,
        },
      ],
      securityPosture: {
        encrypted: true,
        publiclyAccessible: false,
        authentication: ['iam'],
        complianceFlags: [
          'All resources are within VPC',
          'Data encrypted at rest and in transit',
          'IAM authentication enforced',
        ],
      },
    },
    {
      id: 'flow-agent-interaction',
      name: 'Bedrock Agent Interaction Flow',
      description: 'Customer support agent accessing knowledge base for responses',
      steps: [
        {
          resourceId: 'bedrock-agent-support-bot',
          resourceType: 'Bedrock Agent',
          resourceName: 'Customer Support Agent',
          action: 'invoke',
          encrypted: true,
        },
        {
          resourceId: 'bedrock-kb-product-docs',
          resourceType: 'Knowledge Base',
          resourceName: 'Product Documentation KB',
          action: 'read',
          encrypted: true,
        },
        {
          resourceId: 'opensearch-vector-store',
          resourceType: 'OpenSearch Serverless',
          resourceName: 'kb-collection',
          action: 'read',
          encrypted: true,
        },
        {
          resourceId: 'bedrock-claude-v2',
          resourceType: 'Bedrock Model',
          resourceName: 'Claude v2',
          action: 'invoke',
          encrypted: true,
        },
      ],
      securityPosture: {
        encrypted: true,
        publiclyAccessible: false,
        authentication: ['iam'],
        complianceFlags: [
          'Private VPC-only communication',
          'All services use IAM authentication',
          'No public endpoints exposed',
        ],
      },
    },
  ];

  return {
    assets,
    models: [],
    networkResources,
    relationships,
    dataFlowPaths,
    accountId: 'demo-account-123456789',
    regionsScanned: ['us-east-1'],
    scanTimestamp: new Date().toISOString(),
    errors: [],
  };
}

// Display functions
function displayScanResults(result: EnhancedScanResult) {
  console.log('\n' + '='.repeat(80));
  console.log('ENHANCED AWS SCANNER - DEMO RESULTS');
  console.log('='.repeat(80));

  console.log('\n📊 SCAN SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Account ID: ${result.accountId}`);
  console.log(`Scan Time: ${result.scanTimestamp}`);
  console.log(`Regions Scanned: ${result.regionsScanned.join(', ')}`);
  console.log(`\nResources Discovered:`);
  console.log(`  • AI/ML Assets: ${result.assets.length}`);
  console.log(`  • Network Resources: ${result.networkResources.length}`);
  console.log(`  • Relationships: ${result.relationships.length}`);
  console.log(`  • Data Flow Paths: ${result.dataFlowPaths.length}`);

  // Network Infrastructure Summary
  console.log('\n🌐 NETWORK INFRASTRUCTURE');
  console.log('-'.repeat(40));
  const networkByType = new Map<string, number>();
  result.networkResources.forEach(r => {
    networkByType.set(r.type, (networkByType.get(r.type) || 0) + 1);
  });
  for (const [type, count] of networkByType) {
    console.log(`  • ${type}: ${count}`);
  }

  // AI Service VPC Endpoints
  const aiEndpoints = result.networkResources.filter(r =>
    r.type === 'vpc-endpoint' && r.metadata.isAiService
  );
  if (aiEndpoints.length > 0) {
    console.log('\n  🔐 AI Service VPC Endpoints (Private Access):');
    aiEndpoints.forEach(ep => {
      console.log(`    - ${ep.name}: ${ep.metadata.serviceName}`);
      console.log(`      VPC: ${ep.metadata.vpcId}`);
      console.log(`      Subnets: ${ep.metadata.subnetIds?.join(', ')}`);
    });
  }

  // AI/ML Assets Summary
  console.log('\n🤖 AI/ML ASSETS');
  console.log('-'.repeat(40));
  const assetsByType = new Map<string, any[]>();
  result.assets.forEach(a => {
    if (!assetsByType.has(a.type)) assetsByType.set(a.type, []);
    assetsByType.get(a.type)!.push(a);
  });

  for (const [type, assets] of assetsByType) {
    console.log(`\n  ${type} (${assets.length}):`);
    assets.forEach(asset => {
      console.log(`    • ${asset.name}`);
      console.log(`      - Risk: ${asset.risk}, Exposure: ${asset.exposure}`);
      if (asset.metadata.vpcId) {
        console.log(`      - VPC: ${asset.metadata.vpcId}`);
      }
      if (asset.metadata.connectedServices?.length) {
        console.log(`      - Connected Services: ${asset.metadata.connectedServices.map(s => s.serviceType).join(', ')}`);
      }
    });
  }

  // Relationship Graph
  console.log('\n🔗 RESOURCE RELATIONSHIPS');
  console.log('-'.repeat(40));
  const relationshipTypes = new Map<string, number>();
  result.relationships.forEach(r => {
    relationshipTypes.set(r.relationshipType, (relationshipTypes.get(r.relationshipType) || 0) + 1);
  });
  console.log('  Relationship Types:');
  for (const [type, count] of relationshipTypes) {
    console.log(`    • ${type}: ${count}`);
  }

  // Key relationships for AI services
  const aiRelationships = result.relationships.filter(r =>
    r.sourceType.includes('lambda') || r.targetType.includes('bedrock') ||
    r.targetType.includes('vpc-endpoint')
  );
  console.log(`\n  Key AI Service Relationships (${aiRelationships.length}):`);
  aiRelationships.slice(0, 5).forEach(rel => {
    console.log(`    • ${rel.sourceType} → ${rel.targetType} (${rel.relationshipType})`);
    if (rel.metadata?.purpose) {
      console.log(`      Purpose: ${rel.metadata.purpose}`);
    }
  });

  // Data Flow Paths
  console.log('\n🔄 DATA FLOW PATHS');
  console.log('-'.repeat(40));
  result.dataFlowPaths.forEach(path => {
    console.log(`\n  📍 ${path.name}`);
    console.log(`     ${path.description}`);
    console.log('\n     Flow Steps:');
    path.steps.forEach((step, i) => {
      const arrow = i < path.steps.length - 1 ? '→' : '';
      console.log(`       ${i + 1}. ${step.resourceName} (${step.action}) ${arrow}`);
    });

    console.log('\n     Security Posture:');
    console.log(`       • Encrypted: ${path.securityPosture.encrypted ? '✅' : '❌'}`);
    console.log(`       • Public Access: ${path.securityPosture.publiclyAccessible ? '⚠️ Yes' : '✅ No'}`);
    console.log(`       • Authentication: ${path.securityPosture.authentication.join(', ')}`);

    if (path.securityPosture.complianceFlags?.length) {
      console.log('\n     Compliance Notes:');
      path.securityPosture.complianceFlags.forEach(flag => {
        const icon = flag.includes('private') || flag.includes('encrypted') ? '✅' : '⚠️';
        console.log(`       ${icon} ${flag}`);
      });
    }
  });

  // Security Analysis
  console.log('\n🛡️ SECURITY ANALYSIS');
  console.log('-'.repeat(40));

  // Check for public exposure
  const publicAssets = result.assets.filter(a => a.exposure === 'Public');
  const privateAssets = result.assets.filter(a => a.exposure === 'Private');
  console.log(`\n  Exposure Analysis:`);
  console.log(`    • Public Assets: ${publicAssets.length}`);
  console.log(`    • Private Assets: ${privateAssets.length}`);

  if (publicAssets.length > 0) {
    console.log(`\n  ⚠️ Public Assets Requiring Review:`);
    publicAssets.forEach(asset => {
      console.log(`    - ${asset.name} (${asset.type})`);
    });
  }

  // VPC Endpoint usage
  const vpcEndpointCount = result.networkResources.filter(r => r.type === 'vpc-endpoint').length;
  console.log(`\n  VPC Endpoints: ${vpcEndpointCount}`);
  if (vpcEndpointCount > 0) {
    console.log('    ✅ Using VPC endpoints for private service access');
  }

  // Lambda VPC attachment
  const lambdas = result.assets.filter(a => a.type === 'Lambda Function');
  const vpcLambdas = lambdas.filter(l => l.metadata.vpcId);
  console.log(`\n  Lambda Security:`);
  console.log(`    • Total Lambda Functions: ${lambdas.length}`);
  console.log(`    • VPC-Attached: ${vpcLambdas.length}/${lambdas.length}`);

  // Security group analysis
  const securityGroups = result.networkResources.filter(r => r.type === 'security-group');
  const openSGs = securityGroups.filter(sg =>
    sg.metadata.inboundRules?.some(r => r.source === '0.0.0.0/0')
  );
  console.log(`\n  Security Groups:`);
  console.log(`    • Total: ${securityGroups.length}`);
  if (openSGs.length > 0) {
    console.log(`    • ⚠️ With open ingress (0.0.0.0/0): ${openSGs.length}`);
  } else {
    console.log(`    • ✅ No overly permissive rules found`);
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));

  const recommendations: string[] = [];

  if (vpcEndpointCount === 0) {
    recommendations.push('Consider creating VPC endpoints for Bedrock/SageMaker to enable private access');
  }

  if (lambdas.length > vpcLambdas.length) {
    recommendations.push(`Attach ${lambdas.length - vpcLambdas.length} Lambda function(s) to VPC for better network isolation`);
  }

  if (publicAssets.length > 0) {
    recommendations.push('Review public exposure of AI/ML assets to ensure it\'s intentional');
  }

  const pathsWithoutAuth = result.dataFlowPaths.filter(p =>
    p.securityPosture.authentication.includes('none')
  );
  if (pathsWithoutAuth.length > 0) {
    recommendations.push('Implement authentication for unauthenticated data flow paths');
  }

  if (recommendations.length === 0) {
    console.log('  ✅ No critical recommendations - good security posture!');
  } else {
    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

// Save results to file
function saveResults(result: EnhancedScanResult) {
  const filename = 'demo-enhanced-scan-results.json';
  writeFileSync(filename, JSON.stringify(result, null, 2));
  console.log(`\n📁 Detailed results saved to: ${filename}`);
}

// Main execution
console.log('\n🚀 AWS Enhanced Scanner - Demo Mode');
console.log('   Generating demonstration data to showcase capabilities...\n');

const demoResult = generateDemoScanResult();
displayScanResults(demoResult);
saveResults(demoResult);

console.log('\n✨ Demo complete! This demonstration shows the enhanced scanner\'s ability to:');
console.log('   • Discover and map network infrastructure (VPCs, subnets, security groups)');
console.log('   • Identify VPC endpoints for private AI service access');
console.log('   • Track relationships between resources');
console.log('   • Build data flow paths showing how data moves through your infrastructure');
console.log('   • Analyze security posture and provide recommendations');
console.log('\n💡 To run against real AWS infrastructure, provide valid AWS credentials.');
console.log('   The scanner will discover actual resources and relationships in your account.\n');