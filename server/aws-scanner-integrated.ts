// This file integrates the comprehensive scanner into the existing system
// It maintains backward compatibility while adding full relationship mapping

import {
  scanEC2Instances,
  scanRDSDatabases,
  scanLoadBalancers,
  scanS3Buckets,
  scanLambdaFunctions,
  scanDynamoDB,
  scanAPIGateways,
  scanCloudFront,
  buildDataFlowPaths,
  type UniversalResource,
  type ResourceRelationship,
  type DataFlowPath,
  type ComprehensiveScanResult
} from './aws-scanner-complete';

import {
  scanElastiCache,
  scanEFS,
  scanSQS,
  scanSNS,
  scanEventBridge,
  scanKinesis,
  scanRoute53,
  scanCloudWatchRelationships
} from './aws-scanner-additional-services';

import {
  scanNetworkInfrastructure,
  type NetworkResource
} from './aws-scanner-enhanced';

// Import existing types and functions from the original scanner
import type { AwsCredentials, DiscoveredAsset, DiscoveredModel, ScanResult } from './aws-scanner';

// Extended scan result that includes relationships
export interface EnhancedScanResult extends ScanResult {
  relationships?: ResourceRelationship[];
  dataFlowPaths?: DataFlowPath[];
  networkResources?: NetworkResource[];
  universalResources?: UniversalResource[];
}

/**
 * Convert UniversalResource to DiscoveredAsset for backward compatibility
 */
function convertToDiscoveredAsset(resource: UniversalResource): DiscoveredAsset {
  // Map universal resource to the existing DiscoveredAsset format
  return {
    name: resource.name,
    type: resource.type,
    category: mapTypeToCategory(resource.type),
    source: `AWS ${resource.service}`,
    externalId: resource.id,
    serviceType: resource.service,
    risk: determineRisk(resource),
    exposure: resource.publicAccess ? 'Public' : 'Private',
    tags: generateTags(resource),
    metadata: {
      ...resource.metadata,
      vpcId: resource.vpcId,
      subnetIds: resource.subnetIds,
      securityGroupIds: resource.securityGroupIds,
      encrypted: resource.encrypted,
      region: resource.region,
    },
  };
}

function convertNetworkResourceToAsset(nr: NetworkResource): DiscoveredAsset {
  const typeMap: Record<string, string> = {
    'vpc': 'VPC',
    'subnet': 'Subnet',
    'security-group': 'Security Group',
    'route-table': 'Route Table',
    'nat-gateway': 'NAT Gateway',
    'internet-gateway': 'Internet Gateway',
    'vpc-endpoint': 'VPC Endpoint',
    'network-interface': 'Network Interface',
    'network-acl': 'Network ACL',
    'vpc-peering': 'VPC Peering Connection',
    'transit-gateway': 'Transit Gateway',
  };
  const categoryMap: Record<string, string> = {
    'vpc': 'Networking',
    'subnet': 'Networking',
    'security-group': 'Security',
    'route-table': 'Networking',
    'nat-gateway': 'Networking',
    'internet-gateway': 'Networking',
    'vpc-endpoint': 'Networking',
    'network-interface': 'Networking',
    'network-acl': 'Security',
    'vpc-peering': 'Networking',
    'transit-gateway': 'Networking',
  };
  const riskMap: Record<string, string> = {
    'internet-gateway': 'Medium',
    'security-group': 'Medium',
    'nat-gateway': 'Low',
    'vpc': 'Low',
    'subnet': 'Low',
    'vpc-peering': 'Medium',
    'transit-gateway': 'Medium',
  };

  const isPublic = nr.type === 'internet-gateway' ||
    (nr.type === 'subnet' && nr.metadata?.mapPublicIpOnLaunch) ||
    (nr.type === 'security-group' && JSON.stringify(nr.metadata).includes('0.0.0.0/0'));

  const flatMeta: Record<string, string> = { region: nr.region };
  if (nr.metadata) {
    for (const [k, v] of Object.entries(nr.metadata)) {
      if (v !== undefined && v !== null && typeof v !== 'object') {
        flatMeta[k] = String(v);
      }
    }
  }

  return {
    name: nr.name,
    type: typeMap[nr.type] || nr.type,
    category: categoryMap[nr.type] || 'Networking',
    source: 'AWS EC2',
    externalId: nr.id,
    serviceType: 'EC2',
    risk: riskMap[nr.type] || 'Low',
    exposure: isPublic ? 'Public' : 'Private',
    tags: ['networking', nr.type, nr.region, isPublic ? 'public' : 'private'],
    metadata: flatMeta,
  };
}

/**
 * Map resource types to categories for backward compatibility
 */
function mapTypeToCategory(type: string): string {
  const categoryMap: Record<string, string> = {
    'EC2 Instance': 'Compute',
    'Lambda Function': 'Compute',
    'ECS Service': 'Container Orchestration',
    'EKS Cluster': 'Container Orchestration',
    'RDS Instance': 'Database',
    'RDS Cluster': 'Database',
    'Aurora Cluster': 'Database',
    'DynamoDB Table': 'Database',
    'ElastiCache Redis': 'Cache',
    'ElastiCache Memcached': 'Cache',
    'S3 Bucket': 'Storage',
    'EFS File System': 'Storage',
    'Application Load Balancer': 'Networking',
    'Network Load Balancer': 'Networking',
    'API Gateway': 'API Management',
    'CloudFront Distribution': 'CDN',
    'SQS Queue': 'Messaging',
    'SNS Topic': 'Messaging',
    'Kinesis Stream': 'Streaming',
    'EventBridge Rule': 'Event Management',
    'VPC': 'Networking',
    'Subnet': 'Networking',
    'Security Group': 'Security',
    'VPC Endpoint': 'Networking',
  };

  return categoryMap[type] || 'General';
}

/**
 * Determine risk level based on resource properties
 */
function determineRisk(resource: UniversalResource): string {
  const isDatabase = resource.type.includes('Database') || resource.type.includes('RDS') || resource.type.includes('Aurora') || resource.type.includes('Neptune');
  const isStorage = resource.type.includes('Storage') || resource.type === 'S3 Bucket' || resource.type === 'EFS File System';
  const isSensitiveData = isDatabase || isStorage || resource.type.includes('Secret') || resource.type.includes('DynamoDB');

  if (resource.publicAccess && isDatabase) return 'Critical';
  if (resource.publicAccess && !resource.encrypted && isSensitiveData) return 'High';
  if (isDatabase && !resource.encrypted) return 'High';

  if (resource.publicAccess && isSensitiveData) return 'Medium';
  if (resource.publicAccess && !resource.encrypted) return 'Medium';
  if (!resource.vpcId && resource.type === 'Lambda Function') return 'Medium';
  if (!resource.encrypted && isStorage) return 'Medium';

  if (resource.publicAccess) return 'Low';

  return 'Low';
}

/**
 * Generate tags from resource properties
 */
function generateTags(resource: UniversalResource): string[] {
  const tags: string[] = [
    resource.service.toLowerCase(),
    resource.type.toLowerCase().replace(/\s+/g, '-'),
    resource.region,
  ];

  if (resource.publicAccess) tags.push('public');
  else tags.push('private');

  if (resource.encrypted) tags.push('encrypted');
  else tags.push('unencrypted');

  if (resource.vpcId) tags.push('vpc-attached');

  return tags;
}

/**
 * Main enhanced scanner that integrates all comprehensive scanners
 * while maintaining backward compatibility with the existing system
 */
export async function performEnhancedAwsScan(
  creds: AwsCredentials,
  options?: {
    includeRelationships?: boolean;
    includeDataFlows?: boolean;
    regions?: string[];
    services?: string[];
  }
): Promise<EnhancedScanResult> {
  const startTime = Date.now();
  const allAssets: DiscoveredAsset[] = [];
  const allModels: DiscoveredModel[] = [];
  const allUniversalResources: UniversalResource[] = [];
  const allRelationships: ResourceRelationship[] = [];
  const allNetworkResources: NetworkResource[] = [];
  const errors: string[] = [];

  // Default options
  const includeRelationships = options?.includeRelationships !== false; // Default true
  const includeDataFlows = options?.includeDataFlows !== false; // Default true
  const regions = options?.regions || ['us-east-1', 'us-west-2', 'eu-west-1'];
  const services = options?.services || ['all']; // Default scan all services

  // Get account ID
  let accountId = '';
  try {
    const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
    const stsClient = new STSClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    accountId = identity.Account || '';
  } catch (err: any) {
    errors.push(`Failed to get account ID: ${err.message}`);
    return {
      assets: [],
      models: [],
      accountId: '',
      regionsScanned: [],
      errors: [err.message],
    };
  }

  console.log(`Starting enhanced AWS scan for account ${accountId}`);
  console.log(`Scanning regions: ${regions.join(', ')}`);

  // Scan each region
  for (const region of regions) {
    console.log(`\nScanning region: ${region}`);

    try {
      // Phase 1: Network Infrastructure (always scan for context)
      if (includeRelationships) {
        console.log('  - Scanning network infrastructure...');
        const networkScan = await scanNetworkInfrastructure(creds, region);
        allNetworkResources.push(...networkScan.networkResources);
        allRelationships.push(...networkScan.relationships);
        errors.push(...networkScan.errors);
      }

      // Create scanner promises based on selected services
      const scannerPromises: Promise<any>[] = [];

      if (services.includes('all') || services.includes('ec2')) {
        console.log('  - Scanning EC2 instances...');
        scannerPromises.push(scanEC2Instances(creds, region));
      }

      if (services.includes('all') || services.includes('rds')) {
        console.log('  - Scanning RDS databases...');
        scannerPromises.push(scanRDSDatabases(creds, region));
      }

      if (services.includes('all') || services.includes('elb')) {
        console.log('  - Scanning load balancers...');
        scannerPromises.push(scanLoadBalancers(creds, region));
      }

      if (services.includes('all') || services.includes('s3')) {
        console.log('  - Scanning S3 buckets...');
        scannerPromises.push(scanS3Buckets(creds, region));
      }

      if (services.includes('all') || services.includes('lambda')) {
        console.log('  - Scanning Lambda functions...');
        scannerPromises.push(scanLambdaFunctions(creds, region));
      }

      if (services.includes('all') || services.includes('dynamodb')) {
        console.log('  - Scanning DynamoDB tables...');
        scannerPromises.push(scanDynamoDB(creds, region));
      }

      if (services.includes('all') || services.includes('apigateway')) {
        console.log('  - Scanning API Gateways...');
        scannerPromises.push(scanAPIGateways(creds, region));
      }

      if (services.includes('all') || services.includes('elasticache')) {
        console.log('  - Scanning ElastiCache...');
        scannerPromises.push(scanElastiCache(creds, region));
      }

      if (services.includes('all') || services.includes('efs')) {
        console.log('  - Scanning EFS...');
        scannerPromises.push(scanEFS(creds, region));
      }

      if (services.includes('all') || services.includes('sqs')) {
        console.log('  - Scanning SQS queues...');
        scannerPromises.push(scanSQS(creds, region));
      }

      if (services.includes('all') || services.includes('sns')) {
        console.log('  - Scanning SNS topics...');
        scannerPromises.push(scanSNS(creds, region));
      }

      if (services.includes('all') || services.includes('eventbridge')) {
        console.log('  - Scanning EventBridge...');
        scannerPromises.push(scanEventBridge(creds, region));
      }

      if (services.includes('all') || services.includes('kinesis')) {
        console.log('  - Scanning Kinesis streams...');
        scannerPromises.push(scanKinesis(creds, region));
      }

      // Add CloudWatch relationships if monitoring is included
      if (includeRelationships && (services.includes('all') || services.includes('cloudwatch'))) {
        console.log('  - Scanning CloudWatch relationships...');
        scannerPromises.push(scanCloudWatchRelationships(creds, region));
      }

      // Execute all scanners in parallel
      const results = await Promise.allSettled(scannerPromises);

      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const scanResult = result.value;

          // Handle resources
          if (scanResult.resources) {
            allUniversalResources.push(...scanResult.resources);
            // Convert to DiscoveredAsset for backward compatibility
            for (const resource of scanResult.resources) {
              allAssets.push(convertToDiscoveredAsset(resource));
            }
          }

          // Handle relationships
          if (scanResult.relationships && includeRelationships) {
            allRelationships.push(...scanResult.relationships);
          }

          // Handle errors
          if (scanResult.errors) {
            errors.push(...scanResult.errors);
          }
        } else {
          errors.push(`Scanner failed: ${result.reason}`);
        }
      }

    } catch (err: any) {
      errors.push(`Region ${region} scan error: ${err.message}`);
    }
  }

  // Global services (CloudFront, Route53)
  console.log('\nScanning global services...');

  try {
    if (services.includes('all') || services.includes('cloudfront')) {
      console.log('  - Scanning CloudFront distributions...');
      const cloudFrontResult = await scanCloudFront(creds);
      allUniversalResources.push(...cloudFrontResult.resources);
      for (const resource of cloudFrontResult.resources) {
        allAssets.push(convertToDiscoveredAsset(resource));
      }
      if (includeRelationships) {
        allRelationships.push(...cloudFrontResult.relationships);
      }
      errors.push(...cloudFrontResult.errors);
    }

    if (services.includes('all') || services.includes('route53')) {
      console.log('  - Scanning Route53...');
      const route53Result = await scanRoute53(creds);
      allUniversalResources.push(...route53Result.resources);
      for (const resource of route53Result.resources) {
        allAssets.push(convertToDiscoveredAsset(resource));
      }
      if (includeRelationships) {
        allRelationships.push(...route53Result.relationships);
      }
      errors.push(...route53Result.errors);
    }
  } catch (err: any) {
    errors.push(`Global services scan error: ${err.message}`);
  }

  // Build data flow paths if requested
  let dataFlowPaths: DataFlowPath[] = [];
  if (includeDataFlows && allUniversalResources.length > 0) {
    console.log('\nBuilding data flow paths...');
    dataFlowPaths = buildDataFlowPaths(allUniversalResources, allRelationships);
    console.log(`  - Found ${dataFlowPaths.length} data flow paths`);
  }

  const scanDuration = Date.now() - startTime;

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SCAN COMPLETE');
  console.log('='.repeat(50));
  console.log(`Duration: ${(scanDuration / 1000).toFixed(2)} seconds`);
  console.log(`Assets discovered: ${allAssets.length}`);
  if (includeRelationships) {
    console.log(`Relationships mapped: ${allRelationships.length}`);
    console.log(`Network resources: ${allNetworkResources.length}`);
  }
  if (includeDataFlows) {
    console.log(`Data flow paths: ${dataFlowPaths.length}`);
  }
  console.log(`Errors encountered: ${errors.length}`);

  // Return enhanced result
  const result: EnhancedScanResult = {
    assets: allAssets,
    models: allModels,
    accountId,
    regionsScanned: regions,
    errors: [...new Set(errors)], // Remove duplicates
  };

  // Add optional enhanced data
  if (includeRelationships) {
    result.relationships = allRelationships;
    result.networkResources = allNetworkResources;
  }

  if (includeDataFlows) {
    result.dataFlowPaths = dataFlowPaths;
  }

  if (allUniversalResources.length > 0) {
    result.universalResources = allUniversalResources;
  }

  return result;
}

/**
 * Wrapper function that matches the existing scanAwsAccount signature
 * for complete backward compatibility
 */
export async function scanAwsAccount(creds: AwsCredentials): Promise<ScanResult> {
  // Call the enhanced scanner with default options
  const result = await performEnhancedAwsScan(creds, {
    includeRelationships: true,
    includeDataFlows: true,
    regions: undefined, // Use defaults
    services: ['all'],
  });

  // Return only the basic fields for backward compatibility
  return {
    assets: result.assets,
    models: result.models,
    accountId: result.accountId,
    regionsScanned: result.regionsScanned,
    errors: result.errors,
  };
}

// Export for use in routes
export default {
  scanAwsAccount,
  performEnhancedAwsScan,
};