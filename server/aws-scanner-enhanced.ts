import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeSecurityGroupsCommand, DescribeRouteTablesCommand, DescribeNatGatewaysCommand, DescribeInternetGatewaysCommand, DescribeNetworkInterfacesCommand, DescribeVpcEndpointsCommand, DescribeFlowLogsCommand, DescribeNetworkAclsCommand, DescribeVpcPeeringConnectionsCommand, DescribeTransitGatewaysCommand, DescribeTransitGatewayAttachmentsCommand } from "@aws-sdk/client-ec2";
import { SageMakerClient, ListModelsCommand, ListEndpointsCommand, ListNotebookInstancesCommand, ListTrainingJobsCommand, ListPipelinesCommand, ListFeatureGroupsCommand, DescribeEndpointCommand, DescribeNotebookInstanceCommand } from "@aws-sdk/client-sagemaker";
import { BedrockClient, ListCustomModelsCommand, ListProvisionedModelThroughputsCommand, ListGuardrailsCommand, GetModelInvocationLoggingConfigurationCommand } from "@aws-sdk/client-bedrock";
import { BedrockAgentClient, ListAgentsCommand, ListKnowledgeBasesCommand, ListFlowsCommand, ListPromptsCommand, GetAgentCommand, GetKnowledgeBaseCommand } from "@aws-sdk/client-bedrock-agent";
import { LambdaClient, ListFunctionsCommand, GetFunctionCommand, GetFunctionConfigurationCommand } from "@aws-sdk/client-lambda";
import { S3Client, ListBucketsCommand, GetBucketTaggingCommand, GetBucketEncryptionCommand, ListObjectsV2Command, GetBucketPolicyCommand, GetBucketVersioningCommand } from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { IAMClient, ListRolesCommand, ListAttachedRolePoliciesCommand, ListRolePoliciesCommand, GetRoleCommand, GetPolicyCommand, GetPolicyVersionCommand, ListPoliciesCommand } from "@aws-sdk/client-iam";
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { APIGatewayClient, GetRestApisCommand, GetResourcesCommand, GetIntegrationCommand } from "@aws-sdk/client-api-gateway";
import { EKSClient, ListClustersCommand as EKSListClustersCommand, DescribeClusterCommand } from "@aws-sdk/client-eks";
import { ECSClient, ListClustersCommand as ECSListClustersCommand, ListServicesCommand, DescribeServicesCommand, DescribeTaskDefinitionCommand } from "@aws-sdk/client-ecs";

// Enhanced interfaces with relationship and network details
export interface EnhancedMetadata extends Record<string, any> {
  // Network Configuration
  vpcId?: string;
  subnetIds?: string[];
  availabilityZones?: string[];
  securityGroupIds?: string[];
  privateIpAddresses?: string[];
  publicIpAddresses?: string[];
  dnsName?: string;
  privateZoneId?: string;

  // IAM Configuration
  roleArn?: string;
  assumeRolePolicyDocument?: string;
  attachedPolicies?: Array<{
    policyArn: string;
    policyName: string;
    policyDocument?: string;
  }>;
  permissions?: string[];

  // Service Connections
  connectedServices?: Array<{
    serviceType: string;
    resourceId: string;
    resourceArn?: string;
    connectionType: 'api' | 'network' | 'iam' | 'event' | 'data';
    direction?: 'inbound' | 'outbound' | 'bidirectional';
  }>;

  // API Endpoints
  endpoints?: Array<{
    type: 'public' | 'vpc-endpoint' | 'private-link' | 'interface' | 'gateway';
    url?: string;
    vpcEndpointId?: string;
    serviceName?: string;
    port?: number;
  }>;

  // Traffic Rules
  inboundRules?: SecurityGroupRule[];
  outboundRules?: SecurityGroupRule[];
  networkAcls?: NetworkAclRule[];

  // Data Flow
  dataFlowPaths?: DataFlowPath[];
  dataSources?: string[];
  dataDestinations?: string[];
}

export interface SecurityGroupRule {
  protocol: string;
  fromPort?: number;
  toPort?: number;
  source?: string; // CIDR or security group ID
  description?: string;
}

export interface NetworkAclRule {
  ruleNumber: number;
  protocol: string;
  ruleAction: 'allow' | 'deny';
  cidrBlock?: string;
  fromPort?: number;
  toPort?: number;
}

export interface NetworkResource {
  id: string;
  type: 'vpc' | 'subnet' | 'security-group' | 'route-table' | 'nat-gateway' | 'internet-gateway' | 'vpc-endpoint' | 'network-interface' | 'network-acl' | 'vpc-peering' | 'transit-gateway';
  name: string;
  region: string;
  metadata: EnhancedMetadata;
}

export interface ResourceRelationship {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationshipType: 'uses' | 'contains' | 'connects-to' | 'managed-by' | 'routes-to' | 'peers-with' | 'attached-to';
  dataFlow?: 'bidirectional' | 'source-to-target' | 'target-to-source';
  protocol?: string;
  ports?: number[];
  metadata?: Record<string, any>;
}

export interface DataFlowPath {
  id: string;
  name: string;
  description?: string;
  steps: Array<{
    resourceId: string;
    resourceType: string;
    resourceName: string;
    action: 'invoke' | 'read' | 'write' | 'transform' | 'process' | 'route' | 'filter';
    protocol?: string;
    port?: number;
    encrypted?: boolean;
    nextStep?: string;
  }>;
  securityPosture: {
    encrypted: boolean;
    publiclyAccessible: boolean;
    authentication: string[];
    complianceFlags?: string[];
  };
}

export interface EnhancedDiscoveredAsset {
  id: string;
  name: string;
  type: string;
  category: string;
  source: string;
  externalId: string;
  serviceType: string;
  risk: string;
  exposure: string;
  tags: string[];
  metadata: EnhancedMetadata;
  relationships?: ResourceRelationship[];
}

export interface EnhancedScanResult {
  assets: EnhancedDiscoveredAsset[];
  models: any[];
  networkResources: NetworkResource[];
  relationships: ResourceRelationship[];
  dataFlowPaths: DataFlowPath[];
  accountId: string;
  regionsScanned: string[];
  scanTimestamp: string;
  errors: string[];
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

// Utility function for client configuration
function getClientConfig(creds: AwsCredentials, region: string) {
  return {
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  };
}

// Phase 1: Network Infrastructure Discovery
export async function scanNetworkInfrastructure(creds: AwsCredentials, region: string): Promise<{
  networkResources: NetworkResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const networkResources: NetworkResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const ec2Client = new EC2Client(getClientConfig(creds, region));

  try {
    // Scan VPCs
    const vpcs = await ec2Client.send(new DescribeVpcsCommand({}));
    for (const vpc of vpcs.Vpcs || []) {
      const vpcResource: NetworkResource = {
        id: vpc.VpcId!,
        type: 'vpc',
        name: vpc.Tags?.find(t => t.Key === 'Name')?.Value || vpc.VpcId!,
        region,
        metadata: {
          vpcId: vpc.VpcId,
          cidrBlock: vpc.CidrBlock,
          enableDnsHostnames: vpc.EnableDnsHostnames,
          enableDnsSupport: vpc.EnableDnsSupport,
          isDefault: vpc.IsDefault,
          state: vpc.State,
          tags: vpc.Tags,
        },
      };
      networkResources.push(vpcResource);
    }

    // Scan Subnets
    const subnets = await ec2Client.send(new DescribeSubnetsCommand({}));
    for (const subnet of subnets.Subnets || []) {
      const subnetResource: NetworkResource = {
        id: subnet.SubnetId!,
        type: 'subnet',
        name: subnet.Tags?.find(t => t.Key === 'Name')?.Value || subnet.SubnetId!,
        region,
        metadata: {
          subnetId: subnet.SubnetId,
          vpcId: subnet.VpcId,
          cidrBlock: subnet.CidrBlock,
          availabilityZone: subnet.AvailabilityZone,
          availabilityZoneId: subnet.AvailabilityZoneId,
          mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
          state: subnet.State,
          availableIpAddressCount: subnet.AvailableIpAddressCount,
          tags: subnet.Tags,
        },
      };
      networkResources.push(subnetResource);

      // Create VPC-Subnet relationship
      if (subnet.VpcId) {
        relationships.push({
          id: `rel-vpc-subnet-${subnet.VpcId}-${subnet.SubnetId}`,
          sourceId: subnet.VpcId,
          sourceType: 'vpc',
          targetId: subnet.SubnetId!,
          targetType: 'subnet',
          relationshipType: 'contains',
        });
      }
    }

    // Scan Security Groups with rules
    const securityGroups = await ec2Client.send(new DescribeSecurityGroupsCommand({}));
    for (const sg of securityGroups.SecurityGroups || []) {
      const inboundRules: SecurityGroupRule[] = [];
      const outboundRules: SecurityGroupRule[] = [];

      // Process inbound rules
      for (const rule of sg.IpPermissions || []) {
        for (const ipRange of rule.IpRanges || []) {
          inboundRules.push({
            protocol: rule.IpProtocol || 'all',
            fromPort: rule.FromPort,
            toPort: rule.ToPort,
            source: ipRange.CidrIp || '',
            description: ipRange.Description,
          });
        }
        for (const sgRef of rule.UserIdGroupPairs || []) {
          inboundRules.push({
            protocol: rule.IpProtocol || 'all',
            fromPort: rule.FromPort,
            toPort: rule.ToPort,
            source: sgRef.GroupId || '',
            description: sgRef.Description,
          });
        }
      }

      // Process outbound rules
      for (const rule of sg.IpPermissionsEgress || []) {
        for (const ipRange of rule.IpRanges || []) {
          outboundRules.push({
            protocol: rule.IpProtocol || 'all',
            fromPort: rule.FromPort,
            toPort: rule.ToPort,
            source: ipRange.CidrIp || '',
            description: ipRange.Description,
          });
        }
      }

      const sgResource: NetworkResource = {
        id: sg.GroupId!,
        type: 'security-group',
        name: sg.GroupName || sg.GroupId!,
        region,
        metadata: {
          groupId: sg.GroupId,
          groupName: sg.GroupName,
          vpcId: sg.VpcId,
          description: sg.Description,
          inboundRules,
          outboundRules,
          tags: sg.Tags,
        },
      };
      networkResources.push(sgResource);

      // Create VPC-SecurityGroup relationship
      if (sg.VpcId) {
        relationships.push({
          id: `rel-vpc-sg-${sg.VpcId}-${sg.GroupId}`,
          sourceId: sg.VpcId,
          sourceType: 'vpc',
          targetId: sg.GroupId!,
          targetType: 'security-group',
          relationshipType: 'contains',
        });
      }
    }

    // Scan VPC Endpoints (critical for private AI service access)
    const vpcEndpoints = await ec2Client.send(new DescribeVpcEndpointsCommand({}));
    for (const endpoint of vpcEndpoints.VpcEndpoints || []) {
      const isBedrockEndpoint = endpoint.ServiceName?.includes('bedrock') || false;
      const isSageMakerEndpoint = endpoint.ServiceName?.includes('sagemaker') || false;

      const endpointResource: NetworkResource = {
        id: endpoint.VpcEndpointId!,
        type: 'vpc-endpoint',
        name: endpoint.Tags?.find(t => t.Key === 'Name')?.Value || endpoint.VpcEndpointId!,
        region,
        metadata: {
          vpcEndpointId: endpoint.VpcEndpointId,
          vpcId: endpoint.VpcId,
          serviceName: endpoint.ServiceName,
          vpcEndpointType: endpoint.VpcEndpointType,
          state: endpoint.State,
          subnetIds: endpoint.SubnetIds,
          routeTableIds: endpoint.RouteTableIds,
          securityGroupIds: endpoint.Groups?.map(g => g.GroupId),
          privateDnsEnabled: endpoint.PrivateDnsEnabled,
          dnsEntries: endpoint.DnsEntries,
          isAiService: isBedrockEndpoint || isSageMakerEndpoint,
          aiServiceType: isBedrockEndpoint ? 'bedrock' : (isSageMakerEndpoint ? 'sagemaker' : null),
          tags: endpoint.Tags,
        },
      };
      networkResources.push(endpointResource);

      // Create VPC-Endpoint relationship
      if (endpoint.VpcId) {
        relationships.push({
          id: `rel-vpc-endpoint-${endpoint.VpcId}-${endpoint.VpcEndpointId}`,
          sourceId: endpoint.VpcId,
          sourceType: 'vpc',
          targetId: endpoint.VpcEndpointId!,
          targetType: 'vpc-endpoint',
          relationshipType: 'contains',
          metadata: {
            serviceName: endpoint.ServiceName,
          },
        });
      }

      // Create Subnet-Endpoint relationships
      for (const subnetId of endpoint.SubnetIds || []) {
        relationships.push({
          id: `rel-subnet-endpoint-${subnetId}-${endpoint.VpcEndpointId}`,
          sourceId: subnetId,
          sourceType: 'subnet',
          targetId: endpoint.VpcEndpointId!,
          targetType: 'vpc-endpoint',
          relationshipType: 'attached-to',
        });
      }
    }

    // Scan Route Tables
    const routeTables = await ec2Client.send(new DescribeRouteTablesCommand({}));
    for (const rt of routeTables.RouteTables || []) {
      const rtResource: NetworkResource = {
        id: rt.RouteTableId!,
        type: 'route-table',
        name: rt.Tags?.find(t => t.Key === 'Name')?.Value || rt.RouteTableId!,
        region,
        metadata: {
          routeTableId: rt.RouteTableId,
          vpcId: rt.VpcId,
          routes: rt.Routes?.map(r => ({
            destinationCidrBlock: r.DestinationCidrBlock,
            gatewayId: r.GatewayId,
            natGatewayId: r.NatGatewayId,
            vpcEndpointId: r.VpcEndpointId,
            networkInterfaceId: r.NetworkInterfaceId,
            state: r.State,
          })),
          associations: rt.Associations,
          propagatingVgws: rt.PropagatingVgws,
          tags: rt.Tags,
        },
      };
      networkResources.push(rtResource);

      // Create VPC-RouteTable relationship
      if (rt.VpcId) {
        relationships.push({
          id: `rel-vpc-rt-${rt.VpcId}-${rt.RouteTableId}`,
          sourceId: rt.VpcId,
          sourceType: 'vpc',
          targetId: rt.RouteTableId!,
          targetType: 'route-table',
          relationshipType: 'contains',
        });
      }
    }

    // Scan NAT Gateways
    const natGateways = await ec2Client.send(new DescribeNatGatewaysCommand({}));
    for (const nat of natGateways.NatGateways || []) {
      const natResource: NetworkResource = {
        id: nat.NatGatewayId!,
        type: 'nat-gateway',
        name: nat.Tags?.find(t => t.Key === 'Name')?.Value || nat.NatGatewayId!,
        region,
        metadata: {
          natGatewayId: nat.NatGatewayId,
          vpcId: nat.VpcId,
          subnetId: nat.SubnetId,
          state: nat.State,
          publicIp: nat.NatGatewayAddresses?.[0]?.PublicIp,
          privateIp: nat.NatGatewayAddresses?.[0]?.PrivateIp,
          connectivityType: nat.ConnectivityType,
          tags: nat.Tags,
        },
      };
      networkResources.push(natResource);

      // Create Subnet-NAT relationship
      if (nat.SubnetId) {
        relationships.push({
          id: `rel-subnet-nat-${nat.SubnetId}-${nat.NatGatewayId}`,
          sourceId: nat.SubnetId,
          sourceType: 'subnet',
          targetId: nat.NatGatewayId!,
          targetType: 'nat-gateway',
          relationshipType: 'contains',
        });
      }
    }

    // Scan Internet Gateways
    const internetGateways = await ec2Client.send(new DescribeInternetGatewaysCommand({}));
    for (const igw of internetGateways.InternetGateways || []) {
      const igwResource: NetworkResource = {
        id: igw.InternetGatewayId!,
        type: 'internet-gateway',
        name: igw.Tags?.find(t => t.Key === 'Name')?.Value || igw.InternetGatewayId!,
        region,
        metadata: {
          internetGatewayId: igw.InternetGatewayId,
          attachments: igw.Attachments,
          tags: igw.Tags,
        },
      };
      networkResources.push(igwResource);

      // Create VPC-IGW relationships
      for (const attachment of igw.Attachments || []) {
        if (attachment.VpcId) {
          relationships.push({
            id: `rel-vpc-igw-${attachment.VpcId}-${igw.InternetGatewayId}`,
            sourceId: attachment.VpcId,
            sourceType: 'vpc',
            targetId: igw.InternetGatewayId!,
            targetType: 'internet-gateway',
            relationshipType: 'attached-to',
            metadata: {
              state: attachment.State,
            },
          });
        }
      }
    }

    // Scan Network ACLs
    const networkAcls = await ec2Client.send(new DescribeNetworkAclsCommand({}));
    for (const nacl of networkAcls.NetworkAcls || []) {
      const naclRules: NetworkAclRule[] = [];

      for (const entry of nacl.Entries || []) {
        naclRules.push({
          ruleNumber: entry.RuleNumber!,
          protocol: entry.Protocol || '-1',
          ruleAction: entry.RuleAction === 'allow' ? 'allow' : 'deny',
          cidrBlock: entry.CidrBlock,
          fromPort: entry.PortRange?.From,
          toPort: entry.PortRange?.To,
        });
      }

      const naclResource: NetworkResource = {
        id: nacl.NetworkAclId!,
        type: 'network-acl',
        name: nacl.Tags?.find(t => t.Key === 'Name')?.Value || nacl.NetworkAclId!,
        region,
        metadata: {
          networkAclId: nacl.NetworkAclId,
          vpcId: nacl.VpcId,
          isDefault: nacl.IsDefault,
          networkAcls: naclRules,
          associations: nacl.Associations,
          tags: nacl.Tags,
        },
      };
      networkResources.push(naclResource);
    }

    // Scan VPC Peering Connections
    const peeringConnections = await ec2Client.send(new DescribeVpcPeeringConnectionsCommand({}));
    for (const peering of peeringConnections.VpcPeeringConnections || []) {
      if (peering.Status?.Code === 'active') {
        relationships.push({
          id: `rel-vpc-peer-${peering.VpcPeeringConnectionId}`,
          sourceId: peering.RequesterVpcInfo?.VpcId || '',
          sourceType: 'vpc',
          targetId: peering.AccepterVpcInfo?.VpcId || '',
          targetType: 'vpc',
          relationshipType: 'peers-with',
          dataFlow: 'bidirectional',
          metadata: {
            peeringConnectionId: peering.VpcPeeringConnectionId,
            status: peering.Status?.Code,
            requesterRegion: peering.RequesterVpcInfo?.Region,
            accepterRegion: peering.AccepterVpcInfo?.Region,
          },
        });
      }
    }

    // Scan Transit Gateways
    try {
      const transitGateways = await ec2Client.send(new DescribeTransitGatewaysCommand({}));
      for (const tgw of transitGateways.TransitGateways || []) {
        const tgwResource: NetworkResource = {
          id: tgw.TransitGatewayId!,
          type: 'transit-gateway',
          name: tgw.Tags?.find(t => t.Key === 'Name')?.Value || tgw.TransitGatewayId!,
          region,
          metadata: {
            transitGatewayId: tgw.TransitGatewayId,
            state: tgw.State,
            amazonSideAsn: tgw.Options?.AmazonSideAsn,
            dnsSupport: tgw.Options?.DnsSupport,
            vpnEcmpSupport: tgw.Options?.VpnEcmpSupport,
            defaultRouteTableId: tgw.Options?.AssociationDefaultRouteTableId,
            tags: tgw.Tags,
          },
        };
        networkResources.push(tgwResource);

        // Get Transit Gateway Attachments
        const attachments = await ec2Client.send(new DescribeTransitGatewayAttachmentsCommand({
          Filters: [{ Name: 'transit-gateway-id', Values: [tgw.TransitGatewayId!] }],
        }));

        for (const attachment of attachments.TransitGatewayAttachments || []) {
          if (attachment.ResourceId && attachment.State === 'available') {
            relationships.push({
              id: `rel-tgw-attach-${attachment.TransitGatewayAttachmentId}`,
              sourceId: attachment.ResourceId,
              sourceType: attachment.ResourceType || 'vpc',
              targetId: tgw.TransitGatewayId!,
              targetType: 'transit-gateway',
              relationshipType: 'attached-to',
              metadata: {
                attachmentId: attachment.TransitGatewayAttachmentId,
                resourceOwnerId: attachment.ResourceOwnerId,
                state: attachment.State,
              },
            });
          }
        }
      }
    } catch (err: any) {
      // Transit Gateway might not be available in all regions
      if (!err.message?.includes('not available')) {
        errors.push(`Transit Gateway scan error in ${region}: ${err.message}`);
      }
    }

  } catch (err: any) {
    errors.push(`Network infrastructure scan error in ${region}: ${err.message}`);
  }

  return { networkResources, relationships, errors };
}

// Phase 2: Enhanced Lambda scanning with VPC configuration
export async function scanEnhancedLambdaFunctions(creds: AwsCredentials, region: string): Promise<{
  assets: EnhancedDiscoveredAsset[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const assets: EnhancedDiscoveredAsset[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const lambdaClient = new LambdaClient(getClientConfig(creds, region));
  const iamClient = new IAMClient(getClientConfig(creds, region));

  try {
    const functions = await lambdaClient.send(new ListFunctionsCommand({ MaxItems: 200 }));

    for (const fn of functions.Functions || []) {
      try {
        // Get detailed function configuration
        const details = await lambdaClient.send(new GetFunctionConfigurationCommand({
          FunctionName: fn.FunctionName!,
        }));

        // Check for AI/ML related patterns
        const envVars = details.Environment?.Variables || {};
        const isBedrockRelated = Object.keys(envVars).some(k =>
          k.toLowerCase().includes('bedrock') ||
          k.toLowerCase().includes('anthropic') ||
          k.toLowerCase().includes('claude')
        ) || Object.values(envVars).some(v =>
          v.toLowerCase().includes('bedrock') ||
          v.toLowerCase().includes('.bedrock')
        );

        const isSageMakerRelated = Object.keys(envVars).some(k =>
          k.toLowerCase().includes('sagemaker') ||
          k.toLowerCase().includes('endpoint')
        ) || Object.values(envVars).some(v =>
          v.toLowerCase().includes('sagemaker') ||
          v.toLowerCase().includes('.sagemaker')
        );

        // Parse IAM role for permissions
        let attachedPolicies: any[] = [];
        let permissions: string[] = [];

        if (details.Role) {
          const roleArn = details.Role;
          const roleName = roleArn.split('/').pop()!;

          try {
            // Get attached policies
            const policies = await iamClient.send(new ListAttachedRolePoliciesCommand({
              RoleName: roleName,
            }));

            for (const policy of policies.AttachedPolicies || []) {
              attachedPolicies.push({
                policyArn: policy.PolicyArn,
                policyName: policy.PolicyName,
              });

              // Check for AI service permissions
              if (policy.PolicyName?.toLowerCase().includes('bedrock')) {
                permissions.push('bedrock:*');
              }
              if (policy.PolicyName?.toLowerCase().includes('sagemaker')) {
                permissions.push('sagemaker:*');
              }
            }
          } catch (err) {
            // Role might be cross-account or have restricted access
          }
        }

        // Build enhanced metadata
        const enhancedMetadata: EnhancedMetadata = {
          functionArn: details.FunctionArn,
          runtime: details.Runtime,
          handler: details.Handler,
          codeSize: details.CodeSize,
          memorySize: details.MemorySize,
          timeout: details.Timeout,
          lastModified: details.LastModified,

          // Network configuration
          vpcId: details.VpcConfig?.VpcId,
          subnetIds: details.VpcConfig?.SubnetIds || [],
          securityGroupIds: details.VpcConfig?.SecurityGroupIds || [],

          // IAM configuration
          roleArn: details.Role,
          attachedPolicies,
          permissions,

          // Environment variables (sanitized)
          environmentVariables: Object.keys(envVars),
          hasBedrockConfig: isBedrockRelated,
          hasSageMakerConfig: isSageMakerRelated,

          // Layers
          layers: details.Layers?.map(l => l.Arn),

          // Dead letter queue
          deadLetterConfig: details.DeadLetterConfig,

          // Reserved concurrent executions
          reservedConcurrentExecutions: details.ReservedConcurrentExecutions,
        };

        // Identify connected services based on environment variables
        const connectedServices: any[] = [];

        // Check for Bedrock endpoints
        if (isBedrockRelated) {
          connectedServices.push({
            serviceType: 'bedrock',
            resourceId: 'bedrock-runtime',
            connectionType: 'api',
            direction: 'outbound',
          });
        }

        // Check for SageMaker endpoints
        if (isSageMakerRelated) {
          const endpointName = envVars['SAGEMAKER_ENDPOINT'] || envVars['ENDPOINT_NAME'];
          if (endpointName) {
            connectedServices.push({
              serviceType: 'sagemaker',
              resourceId: endpointName,
              connectionType: 'api',
              direction: 'outbound',
            });
          }
        }

        // Check for S3 buckets
        Object.entries(envVars).forEach(([key, value]) => {
          if ((key.includes('BUCKET') || key.includes('S3')) && value.includes('s3')) {
            connectedServices.push({
              serviceType: 's3',
              resourceId: value,
              connectionType: 'data',
              direction: 'bidirectional',
            });
          }
        });

        enhancedMetadata.connectedServices = connectedServices;

        const asset: EnhancedDiscoveredAsset = {
          id: `lambda-${fn.FunctionName}-${region}`,
          name: fn.FunctionName || 'Unknown',
          type: 'Lambda Function',
          category: 'Compute',
          source: 'AWS Lambda',
          externalId: details.FunctionArn || '',
          serviceType: 'Lambda',
          risk: details.VpcConfig ? 'Low' : 'Medium',
          exposure: details.VpcConfig ? 'Private' : 'Public',
          tags: ['lambda', details.Runtime || '', region],
          metadata: enhancedMetadata,
        };

        assets.push(asset);

        // Create relationships
        if (details.VpcConfig?.VpcId) {
          relationships.push({
            id: `rel-lambda-vpc-${fn.FunctionName}-${details.VpcConfig.VpcId}`,
            sourceId: asset.id,
            sourceType: 'lambda',
            targetId: details.VpcConfig.VpcId,
            targetType: 'vpc',
            relationshipType: 'uses',
          });
        }

        // Create subnet relationships
        for (const subnetId of details.VpcConfig?.SubnetIds || []) {
          relationships.push({
            id: `rel-lambda-subnet-${fn.FunctionName}-${subnetId}`,
            sourceId: asset.id,
            sourceType: 'lambda',
            targetId: subnetId,
            targetType: 'subnet',
            relationshipType: 'uses',
          });
        }

        // Create security group relationships
        for (const sgId of details.VpcConfig?.SecurityGroupIds || []) {
          relationships.push({
            id: `rel-lambda-sg-${fn.FunctionName}-${sgId}`,
            sourceId: asset.id,
            sourceType: 'lambda',
            targetId: sgId,
            targetType: 'security-group',
            relationshipType: 'uses',
          });
        }

      } catch (err: any) {
        errors.push(`Error getting Lambda details for ${fn.FunctionName}: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors.push(`Lambda scan error in ${region}: ${err.message}`);
  }

  return { assets, relationships, errors };
}

// Phase 3: Enhanced Bedrock scanning with relationship mapping
export async function scanEnhancedBedrockResources(creds: AwsCredentials, region: string): Promise<{
  assets: EnhancedDiscoveredAsset[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const assets: EnhancedDiscoveredAsset[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];

  const bedrockClient = new BedrockClient(getClientConfig(creds, region));
  const bedrockAgentClient = new BedrockAgentClient(getClientConfig(creds, region));

  try {
    // Scan Bedrock Agents with enhanced details
    const agents = await bedrockAgentClient.send(new ListAgentsCommand({ maxResults: 50 }));

    for (const agent of agents.agentSummaries || []) {
      try {
        // Get detailed agent configuration
        const agentDetails = await bedrockAgentClient.send(new GetAgentCommand({
          agentId: agent.agentId!,
        }));

        const agentInfo = agentDetails.agent;

        const enhancedMetadata: EnhancedMetadata = {
          agentId: agentInfo?.agentId,
          agentArn: agentInfo?.agentArn,
          agentVersion: agentInfo?.agentVersion,
          foundationModel: agentInfo?.foundationModel,
          instruction: agentInfo?.instruction?.substring(0, 200), // First 200 chars
          idleSessionTTL: agentInfo?.idleSessionTTLInSeconds,
          roleArn: agentInfo?.agentResourceRoleArn,
          status: agentInfo?.agentStatus,

          // Connected services
          connectedServices: [],
        };

        // Add knowledge base connections
        if (agentInfo?.knowledgeBaseIds) {
          for (const kbId of agentInfo.knowledgeBaseIds) {
            enhancedMetadata.connectedServices?.push({
              serviceType: 'bedrock-knowledge-base',
              resourceId: kbId,
              connectionType: 'data',
              direction: 'inbound',
            });

            relationships.push({
              id: `rel-agent-kb-${agent.agentId}-${kbId}`,
              sourceId: `bedrock-agent-${agent.agentId}`,
              sourceType: 'bedrock-agent',
              targetId: `bedrock-kb-${kbId}`,
              targetType: 'bedrock-knowledge-base',
              relationshipType: 'uses',
            });
          }
        }

        const asset: EnhancedDiscoveredAsset = {
          id: `bedrock-agent-${agent.agentId}`,
          name: agent.agentName || 'Unknown',
          type: 'Bedrock Agent',
          category: 'AI Service',
          source: 'AWS Bedrock',
          externalId: agentInfo?.agentArn || '',
          serviceType: 'Bedrock',
          risk: 'Medium',
          exposure: 'Private',
          tags: ['bedrock', 'agent', agentInfo?.agentStatus || '', region],
          metadata: enhancedMetadata,
        };

        assets.push(asset);

      } catch (err: any) {
        errors.push(`Error getting Bedrock agent details: ${err.message}`);
      }
    }

    // Scan Knowledge Bases with vector store details
    const knowledgeBases = await bedrockAgentClient.send(new ListKnowledgeBasesCommand({ maxResults: 50 }));

    for (const kb of knowledgeBases.knowledgeBaseSummaries || []) {
      try {
        const kbDetails = await bedrockAgentClient.send(new GetKnowledgeBaseCommand({
          knowledgeBaseId: kb.knowledgeBaseId!,
        }));

        const kbInfo = kbDetails.knowledgeBase;

        const enhancedMetadata: EnhancedMetadata = {
          knowledgeBaseId: kbInfo?.knowledgeBaseId,
          knowledgeBaseArn: kbInfo?.knowledgeBaseArn,
          roleArn: kbInfo?.roleArn,
          status: kbInfo?.status,

          // Storage configuration
          storageConfiguration: kbInfo?.storageConfiguration,

          // Vector database details
          vectorStoreType: kbInfo?.storageConfiguration?.type,
          opensearchEndpoint: (kbInfo?.storageConfiguration?.opensearchServerlessConfiguration as any)?.collectionArn,
          pineconeEndpoint: (kbInfo?.storageConfiguration?.pineconeConfiguration as any)?.connectionString,

          // Connected services
          connectedServices: [],
        };

        // Add S3 data source connections
        if (kbInfo?.storageConfiguration?.s3Configuration) {
          const s3Config = kbInfo.storageConfiguration.s3Configuration as any;
          enhancedMetadata.connectedServices?.push({
            serviceType: 's3',
            resourceId: s3Config.bucketName,
            connectionType: 'data',
            direction: 'inbound',
          });
        }

        const asset: EnhancedDiscoveredAsset = {
          id: `bedrock-kb-${kb.knowledgeBaseId}`,
          name: kb.name || 'Unknown',
          type: 'Knowledge Base',
          category: 'AI Service',
          source: 'AWS Bedrock',
          externalId: kbInfo?.knowledgeBaseArn || '',
          serviceType: 'Bedrock',
          risk: 'Low',
          exposure: 'Private',
          tags: ['bedrock', 'knowledge-base', kbInfo?.status || '', region],
          metadata: enhancedMetadata,
        };

        assets.push(asset);

      } catch (err: any) {
        errors.push(`Error getting Knowledge Base details: ${err.message}`);
      }
    }

  } catch (err: any) {
    if (!err.message?.includes('not available')) {
      errors.push(`Bedrock scan error in ${region}: ${err.message}`);
    }
  }

  return { assets, relationships, errors };
}

// Phase 4: API Gateway scanning with backend integration mapping
export async function scanEnhancedAPIGateways(creds: AwsCredentials, region: string): Promise<{
  assets: EnhancedDiscoveredAsset[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const assets: EnhancedDiscoveredAsset[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];

  const apiGatewayClient = new APIGatewayClient(getClientConfig(creds, region));

  try {
    const apis = await apiGatewayClient.send(new GetRestApisCommand({ limit: 100 }));

    for (const api of apis.items || []) {
      const enhancedMetadata: EnhancedMetadata = {
        apiId: api.id,
        apiName: api.name,
        description: api.description,
        endpointConfiguration: api.endpointConfiguration,
        apiKeySource: api.apiKeySource,
        createdDate: api.createdDate,

        // Endpoint URLs
        endpoints: [{
          type: api.endpointConfiguration?.types?.includes('PRIVATE') ? 'private-link' : 'public',
          url: `https://${api.id}.execute-api.${region}.amazonaws.com`,
        }],

        // VPC configuration for private APIs
        vpcEndpointIds: api.endpointConfiguration?.vpcEndpointIds,

        // Connected services will be populated from resources
        connectedServices: [],
      };

      // Get API resources and their integrations
      try {
        const resources = await apiGatewayClient.send(new GetResourcesCommand({
          restApiId: api.id!,
          limit: 100,
        }));

        for (const resource of resources.items || []) {
          // Check each method for backend integrations
          for (const [method, methodConfig] of Object.entries(resource.resourceMethods || {})) {
            try {
              const integration = await apiGatewayClient.send(new GetIntegrationCommand({
                restApiId: api.id!,
                resourceId: resource.id!,
                httpMethod: method,
              }));

              // Check for Lambda integration
              if (integration.type === 'AWS' || integration.type === 'AWS_PROXY') {
                if (integration.uri?.includes('lambda')) {
                  const lambdaArn = integration.uri.match(/arn:aws:lambda:[^:]+:[^:]+:function:([^\/]+)/)?.[1];
                  if (lambdaArn) {
                    enhancedMetadata.connectedServices?.push({
                      serviceType: 'lambda',
                      resourceId: lambdaArn,
                      connectionType: 'api',
                      direction: 'outbound',
                    });

                    relationships.push({
                      id: `rel-api-lambda-${api.id}-${lambdaArn}`,
                      sourceId: `api-gateway-${api.id}`,
                      sourceType: 'api-gateway',
                      targetId: `lambda-${lambdaArn}-${region}`,
                      targetType: 'lambda',
                      relationshipType: 'connects-to',
                      protocol: 'https',
                    });
                  }
                }

                // Check for Bedrock/SageMaker integration
                if (integration.uri?.includes('bedrock') || integration.uri?.includes('sagemaker')) {
                  const serviceName = integration.uri.includes('bedrock') ? 'bedrock' : 'sagemaker';
                  enhancedMetadata.connectedServices?.push({
                    serviceType: serviceName,
                    resourceId: integration.uri,
                    connectionType: 'api',
                    direction: 'outbound',
                  });
                }
              }
            } catch (err) {
              // Integration might not exist for all methods
            }
          }
        }
      } catch (err: any) {
        errors.push(`Error getting API Gateway resources for ${api.name}: ${err.message}`);
      }

      const asset: EnhancedDiscoveredAsset = {
        id: `api-gateway-${api.id}`,
        name: api.name || 'Unknown',
        type: 'API Gateway',
        category: 'API Management',
        source: 'AWS API Gateway',
        externalId: api.id || '',
        serviceType: 'APIGateway',
        risk: api.endpointConfiguration?.types?.includes('EDGE') ? 'High' : 'Medium',
        exposure: api.endpointConfiguration?.types?.includes('PRIVATE') ? 'Private' : 'Public',
        tags: ['api-gateway', ...(api.endpointConfiguration?.types || []), region],
        metadata: enhancedMetadata,
      };

      assets.push(asset);

      // Create VPC Endpoint relationships for private APIs
      for (const vpcEndpointId of api.endpointConfiguration?.vpcEndpointIds || []) {
        relationships.push({
          id: `rel-api-vpce-${api.id}-${vpcEndpointId}`,
          sourceId: asset.id,
          sourceType: 'api-gateway',
          targetId: vpcEndpointId,
          targetType: 'vpc-endpoint',
          relationshipType: 'uses',
        });
      }
    }
  } catch (err: any) {
    errors.push(`API Gateway scan error in ${region}: ${err.message}`);
  }

  return { assets, relationships, errors };
}

// Phase 5: Build data flow paths
export function buildDataFlowPaths(
  assets: EnhancedDiscoveredAsset[],
  relationships: ResourceRelationship[],
  networkResources: NetworkResource[]
): DataFlowPath[] {
  const dataFlowPaths: DataFlowPath[] = [];

  // Build a map for quick lookups
  const assetMap = new Map(assets.map(a => [a.id, a]));
  const networkMap = new Map(networkResources.map(n => [n.id, n]));
  const relationshipsBySource = new Map<string, ResourceRelationship[]>();

  relationships.forEach(rel => {
    if (!relationshipsBySource.has(rel.sourceId)) {
      relationshipsBySource.set(rel.sourceId, []);
    }
    relationshipsBySource.get(rel.sourceId)!.push(rel);
  });

  // Find API Gateways as entry points
  const apiGateways = assets.filter(a => a.type === 'API Gateway');

  for (const apiGateway of apiGateways) {
    const paths = traceDataFlow(apiGateway, assetMap, relationshipsBySource, networkMap);
    dataFlowPaths.push(...paths);
  }

  // Find Lambda functions that might be event-driven (not connected to API Gateway)
  const standaloneLambdas = assets.filter(a =>
    a.type === 'Lambda Function' &&
    !relationships.some(r => r.targetId === a.id && r.sourceType === 'api-gateway')
  );

  for (const lambda of standaloneLambdas) {
    if (lambda.metadata.connectedServices?.length) {
      const path = createDataFlowPath(lambda, assetMap, relationshipsBySource, networkMap);
      if (path) dataFlowPaths.push(path);
    }
  }

  return dataFlowPaths;
}

function traceDataFlow(
  startAsset: EnhancedDiscoveredAsset,
  assetMap: Map<string, EnhancedDiscoveredAsset>,
  relationshipsBySource: Map<string, ResourceRelationship[]>,
  networkMap: Map<string, NetworkResource>
): DataFlowPath[] {
  const paths: DataFlowPath[] = [];
  const visited = new Set<string>();

  function traverse(
    current: EnhancedDiscoveredAsset,
    pathSteps: DataFlowPath['steps'],
    depth: number
  ): void {
    if (depth > 10 || visited.has(current.id)) return;
    visited.add(current.id);

    const currentStep: DataFlowPath['steps'][0] = {
      resourceId: current.id,
      resourceType: current.type,
      resourceName: current.name,
      action: determineAction(current.type),
      encrypted: current.metadata.endpoints?.some(e => e.url?.startsWith('https')) ?? true,
    };

    const newPathSteps = [...pathSteps, currentStep];

    // Get outbound relationships
    const outboundRels = relationshipsBySource.get(current.id) || [];

    if (outboundRels.length === 0) {
      // End of path
      if (newPathSteps.length > 1) {
        paths.push({
          id: `flow-${startAsset.id}-${current.id}`,
          name: `${startAsset.name} → ${current.name}`,
          description: `Data flow from ${startAsset.type} to ${current.type}`,
          steps: newPathSteps,
          securityPosture: analyzeSecurityPosture(newPathSteps, assetMap, networkMap),
        });
      }
    } else {
      // Continue traversing
      for (const rel of outboundRels) {
        const nextAsset = assetMap.get(rel.targetId);
        if (nextAsset) {
          traverse(nextAsset, newPathSteps, depth + 1);
        }
      }
    }
  }

  traverse(startAsset, [], 0);
  return paths;
}

function createDataFlowPath(
  asset: EnhancedDiscoveredAsset,
  assetMap: Map<string, EnhancedDiscoveredAsset>,
  relationshipsBySource: Map<string, ResourceRelationship[]>,
  networkMap: Map<string, NetworkResource>
): DataFlowPath | null {
  const steps: DataFlowPath['steps'] = [];

  // Add the initial asset
  steps.push({
    resourceId: asset.id,
    resourceType: asset.type,
    resourceName: asset.name,
    action: determineAction(asset.type),
    encrypted: true,
  });

  // Add connected services
  for (const service of asset.metadata.connectedServices || []) {
    steps.push({
      resourceId: service.resourceId,
      resourceType: service.serviceType,
      resourceName: service.resourceId,
      action: service.connectionType === 'data' ? 'read' : 'invoke',
      encrypted: true,
    });
  }

  if (steps.length < 2) return null;

  return {
    id: `flow-${asset.id}`,
    name: `${asset.name} Data Flow`,
    description: `Data flow for ${asset.type}`,
    steps,
    securityPosture: analyzeSecurityPosture(steps, assetMap, networkMap),
  };
}

function determineAction(resourceType: string): DataFlowPath['steps'][0]['action'] {
  switch (resourceType.toLowerCase()) {
    case 'lambda function': return 'process';
    case 'api gateway': return 'route';
    case 'bedrock agent': return 'invoke';
    case 'knowledge base': return 'read';
    case 's3 bucket': return 'read';
    case 'sagemaker endpoint': return 'invoke';
    default: return 'process';
  }
}

function analyzeSecurityPosture(
  steps: DataFlowPath['steps'],
  assetMap: Map<string, EnhancedDiscoveredAsset>,
  networkMap: Map<string, NetworkResource>
): DataFlowPath['securityPosture'] {
  let encrypted = true;
  let publiclyAccessible = false;
  const authentication = new Set<string>();
  const complianceFlags: string[] = [];

  for (const step of steps) {
    const asset = assetMap.get(step.resourceId);
    if (asset) {
      // Check exposure
      if (asset.exposure === 'Public') {
        publiclyAccessible = true;
        complianceFlags.push(`${asset.name} is publicly accessible`);
      }

      // Check encryption
      if (!step.encrypted) {
        encrypted = false;
        complianceFlags.push(`${asset.name} uses unencrypted communication`);
      }

      // Check authentication
      if (asset.type === 'API Gateway') {
        if (asset.metadata.apiKeySource) {
          authentication.add('api-key');
        }
      }

      // Check for VPC endpoints (good for compliance)
      if (asset.metadata.vpcEndpointIds?.length) {
        complianceFlags.push(`${asset.name} uses VPC endpoints for private access`);
      }

      // Check security groups
      if (asset.metadata.securityGroupIds?.length) {
        for (const sgId of asset.metadata.securityGroupIds) {
          const sg = networkMap.get(sgId);
          if (sg) {
            // Check for overly permissive rules
            const hasOpenIngress = sg.metadata.inboundRules?.some(r =>
              r.source === '0.0.0.0/0' || r.source === '::/0'
            );
            if (hasOpenIngress) {
              complianceFlags.push(`${asset.name} has security group with open ingress (0.0.0.0/0)`);
            }
          }
        }
      }
    }
  }

  if (authentication.size === 0) {
    authentication.add('none');
    complianceFlags.push('No authentication detected in data flow');
  }

  return {
    encrypted,
    publiclyAccessible,
    authentication: Array.from(authentication),
    complianceFlags: complianceFlags.length > 0 ? complianceFlags : undefined,
  };
}

// Main enhanced scanner function
export async function performEnhancedAwsScan(creds: AwsCredentials): Promise<EnhancedScanResult> {
  const allAssets: EnhancedDiscoveredAsset[] = [];
  const allModels: any[] = [];
  const allNetworkResources: NetworkResource[] = [];
  const allRelationships: ResourceRelationship[] = [];
  const allDataFlowPaths: DataFlowPath[] = [];
  const errors: string[] = [];
  const regionsScanned: string[] = [];

  // Test connection first
  const connectionTest = await testAwsConnection(creds);
  if (!connectionTest.success) {
    throw new Error(connectionTest.error);
  }

  const accountId = connectionTest.accountId || 'unknown';

  // Scan regions
  const SCAN_REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1']; // Limited for testing

  for (const region of SCAN_REGIONS) {
    console.log(`Scanning region: ${region}`);
    regionsScanned.push(region);

    // Phase 1: Network Infrastructure
    const networkScan = await scanNetworkInfrastructure(creds, region);
    allNetworkResources.push(...networkScan.networkResources);
    allRelationships.push(...networkScan.relationships);
    errors.push(...networkScan.errors);

    // Phase 2 & 3: Enhanced Lambda Functions
    const lambdaScan = await scanEnhancedLambdaFunctions(creds, region);
    allAssets.push(...lambdaScan.assets);
    allRelationships.push(...lambdaScan.relationships);
    errors.push(...lambdaScan.errors);

    // Phase 4: Enhanced Bedrock Resources
    const bedrockScan = await scanEnhancedBedrockResources(creds, region);
    allAssets.push(...bedrockScan.assets);
    allRelationships.push(...bedrockScan.relationships);
    errors.push(...bedrockScan.errors);

    // Enhanced API Gateways
    const apiGatewayScan = await scanEnhancedAPIGateways(creds, region);
    allAssets.push(...apiGatewayScan.assets);
    allRelationships.push(...apiGatewayScan.relationships);
    errors.push(...apiGatewayScan.errors);
  }

  // Phase 5: Build data flow paths
  const dataFlowPaths = buildDataFlowPaths(allAssets, allRelationships, allNetworkResources);
  allDataFlowPaths.push(...dataFlowPaths);

  return {
    assets: allAssets,
    models: allModels,
    networkResources: allNetworkResources,
    relationships: allRelationships,
    dataFlowPaths: allDataFlowPaths,
    accountId,
    regionsScanned,
    scanTimestamp: new Date().toISOString(),
    errors: errors.filter((e, i, arr) => arr.indexOf(e) === i), // Remove duplicates
  };
}

// Test connection function
async function testAwsConnection(creds: AwsCredentials): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const sts = new STSClient(getClientConfig(creds, 'us-east-1'));
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    return { success: true, accountId: identity.Account || 'unknown' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Export for use in main scanner
export const enhancedScanners = {
  scanNetworkInfrastructure,
  scanEnhancedLambdaFunctions,
  scanEnhancedBedrockResources,
  scanEnhancedAPIGateways,
  buildDataFlowPaths,
  performEnhancedAwsScan,
};