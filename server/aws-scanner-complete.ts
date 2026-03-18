import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeSecurityGroupsCommand, DescribeRouteTablesCommand, DescribeNatGatewaysCommand, DescribeInternetGatewaysCommand, DescribeNetworkInterfacesCommand, DescribeVpcEndpointsCommand, DescribeFlowLogsCommand, DescribeNetworkAclsCommand, DescribeVpcPeeringConnectionsCommand, DescribeTransitGatewaysCommand, DescribeTransitGatewayAttachmentsCommand, DescribeInstancesCommand, DescribeVolumesCommand, DescribeSnapshotsCommand, DescribeImagesCommand, DescribeKeyPairsCommand, DescribeElasticIpsCommand, DescribeLoadBalancersCommand as DescribeClassicLoadBalancersCommand, DescribeTargetGroupsCommand } from "@aws-sdk/client-ec2";
import { ElasticLoadBalancingV2Client, DescribeLoadBalancersCommand, DescribeTargetGroupsCommand as DescribeALBTargetGroupsCommand, DescribeListenersCommand, DescribeRulesCommand, DescribeTargetHealthCommand } from "@aws-sdk/client-elastic-load-balancing-v2";
import { RDSClient, DescribeDBClustersCommand, DescribeDBInstancesCommand, DescribeDBSubnetGroupsCommand, DescribeDBProxiesCommand, DescribeDBProxyTargetsCommand } from "@aws-sdk/client-rds";
import { DynamoDBClient, ListTablesCommand, DescribeTableCommand, ListGlobalTablesCommand, DescribeGlobalTableCommand } from "@aws-sdk/client-dynamodb";
import { ElastiCacheClient, DescribeCacheClustersCommand, DescribeCacheSubnetGroupsCommand, DescribeReplicationGroupsCommand, DescribeCacheParameterGroupsCommand } from "@aws-sdk/client-elasticache";
import { EFSClient, DescribeFileSystemsCommand, DescribeMountTargetsCommand, DescribeAccessPointsCommand } from "@aws-sdk/client-efs";
import { CloudFrontClient, ListDistributionsCommand, GetDistributionCommand, ListOriginAccessControlsCommand, ListCachePoliciesCommand } from "@aws-sdk/client-cloudfront";
import { SQSClient, ListQueuesCommand, GetQueueAttributesCommand } from "@aws-sdk/client-sqs";
import { SNSClient, ListTopicsCommand, GetTopicAttributesCommand, ListSubscriptionsCommand } from "@aws-sdk/client-sns";
import { Route53Client, ListHostedZonesCommand, ListResourceRecordSetsCommand, ListHealthChecksCommand } from "@aws-sdk/client-route-53";
import { AutoScalingClient, DescribeAutoScalingGroupsCommand, DescribeLaunchConfigurationsCommand, DescribeScalingActivitiesCommand } from "@aws-sdk/client-auto-scaling";
import { ECSClient, ListClustersCommand as ECSListClustersCommand, ListServicesCommand, DescribeServicesCommand, ListTaskDefinitionsCommand, DescribeTaskDefinitionCommand, ListTasksCommand, DescribeTasksCommand } from "@aws-sdk/client-ecs";
import { EKSClient, ListClustersCommand as EKSListClustersCommand, DescribeClusterCommand, ListNodegroupsCommand, DescribeNodegroupCommand } from "@aws-sdk/client-eks";
import { LambdaClient, ListFunctionsCommand, GetFunctionCommand, GetFunctionConfigurationCommand, ListEventSourceMappingsCommand } from "@aws-sdk/client-lambda";
import { S3Client, ListBucketsCommand, GetBucketVersioningCommand, GetBucketEncryptionCommand, GetBucketPolicyCommand, GetBucketReplicationCommand, GetBucketWebsiteCommand, GetBucketCorsCommand, GetBucketLifecycleConfigurationCommand, GetBucketNotificationConfigurationCommand } from "@aws-sdk/client-s3";
import { APIGatewayClient, GetRestApisCommand, GetResourcesCommand, GetIntegrationCommand, GetDeploymentCommand, GetStagesCommand } from "@aws-sdk/client-api-gateway";
import { CloudWatchClient, ListMetricsCommand, ListAlarmsCommand, DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient, DescribeLogGroupsCommand, DescribeLogStreamsCommand, DescribeSubscriptionFiltersCommand } from "@aws-sdk/client-cloudwatch-logs";
import { IAMClient, ListRolesCommand, ListPoliciesCommand, GetRoleCommand, GetPolicyCommand, ListAttachedRolePoliciesCommand, ListInstanceProfilesCommand, GetInstanceProfileCommand } from "@aws-sdk/client-iam";
import { SecretsManagerClient, ListSecretsCommand, DescribeSecretCommand } from "@aws-sdk/client-secrets-manager";
import { SSMClient, DescribeParametersCommand, GetParameterCommand, ListDocumentsCommand, ListAssociationsCommand } from "@aws-sdk/client-ssm";
import { WAFv2Client, ListWebACLsCommand, GetWebACLCommand, ListIPSetsCommand } from "@aws-sdk/client-wafv2";
import { ShieldClient, DescribeProtectionCommand, ListProtectionsCommand } from "@aws-sdk/client-shield";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { EventBridgeClient, ListRulesCommand, ListTargetsByRuleCommand, ListEventBusesCommand, ListConnectionsCommand } from "@aws-sdk/client-eventbridge";
import { KinesisClient, ListStreamsCommand, DescribeStreamCommand, ListStreamConsumersCommand } from "@aws-sdk/client-kinesis";
import { FirehoseClient, ListDeliveryStreamsCommand, DescribeDeliveryStreamCommand } from "@aws-sdk/client-firehose";
import { AthenaClient, ListDataCatalogsCommand, ListDatabasesCommand, ListTableMetadataCommand } from "@aws-sdk/client-athena";
import { GlueClient, GetDatabasesCommand, GetTablesCommand, GetJobsCommand, GetCrawlersCommand, GetConnectionsCommand } from "@aws-sdk/client-glue";
import { RedshiftClient, DescribeClustersCommand as RedshiftDescribeClustersCommand, DescribeClusterSubnetGroupsCommand } from "@aws-sdk/client-redshift";
import { OpenSearchClient, ListDomainNamesCommand, DescribeDomainCommand } from "@aws-sdk/client-opensearch";
import { NeptuneClient, DescribeDBClustersCommand as NeptuneDescribeDBClustersCommand } from "@aws-sdk/client-neptune";
import { DocDBClient, DescribeDBClustersCommand as DocDBDescribeDBClustersCommand } from "@aws-sdk/client-docdb";
// Some clients commented out as they need to be installed separately if needed
// import { MemoryDBClient, DescribeClustersCommand as MemoryDBDescribeClustersCommand } from "@aws-sdk/client-memorydb";
// import { AppSyncClient, ListGraphqlApisCommand, GetGraphqlApiCommand, ListDataSourcesCommand } from "@aws-sdk/client-appsync";
// import { CognitoIdentityProviderClient, ListUserPoolsCommand, DescribeUserPoolCommand, ListUserPoolClientsCommand } from "@aws-sdk/client-cognito-identity-provider";

// Comprehensive interfaces for all AWS resources
export interface UniversalResource {
  id: string;
  arn?: string;
  type: string;
  service: string;
  name: string;
  region: string;
  accountId?: string;
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  availabilityZones?: string[];
  publicAccess?: boolean;
  encrypted?: boolean;
  tags?: Record<string, string>;
  metadata: Record<string, any>;
  networkConfig?: NetworkConfiguration;
  iamConfig?: IAMConfiguration;
  dataConfig?: DataConfiguration;
  monitoringConfig?: MonitoringConfiguration;
}

export interface NetworkConfiguration {
  vpcId?: string;
  subnetIds?: string[];
  availabilityZones?: string[];
  securityGroupIds?: string[];
  privateIpAddresses?: string[];
  publicIpAddresses?: string[];
  elasticIpAddresses?: string[];
  dnsNames?: string[];
  privateDnsName?: string;
  publicDnsName?: string;
  networkInterfaceIds?: string[];
  loadBalancerArns?: string[];
  targetGroupArns?: string[];
  vpcEndpointIds?: string[];
  routeTableIds?: string[];
  natGatewayIds?: string[];
  internetGatewayId?: string;
  transitGatewayId?: string;
  directConnectGatewayId?: string;
  vpcPeeringConnectionIds?: string[];
  networkAclIds?: string[];
  flowLogIds?: string[];
  port?: number;
  protocol?: string;
}

export interface IAMConfiguration {
  roleArn?: string;
  instanceProfileArn?: string;
  serviceLinkedRoleArn?: string;
  executionRoleArn?: string;
  taskRoleArn?: string;
  assumeRolePolicyDocument?: string;
  attachedPolicies?: Array<{
    policyArn: string;
    policyName: string;
    policyDocument?: string;
  }>;
  permissions?: string[];
  principalArn?: string;
  crossAccountAccess?: boolean;
  externalId?: string;
  mfaRequired?: boolean;
}

export interface DataConfiguration {
  storageType?: string;
  storageSize?: number;
  storageClass?: string;
  dataSource?: string;
  dataDestination?: string;
  replicationConfig?: {
    enabled: boolean;
    regions?: string[];
    replicationGroupId?: string;
  };
  backupConfig?: {
    enabled: boolean;
    retentionDays?: number;
    backupVaultName?: string;
  };
  encryptionConfig?: {
    enabled: boolean;
    kmsKeyId?: string;
    encryptionType?: string;
  };
  dataTransferConfig?: {
    transferProtocol?: string;
    compressionEnabled?: boolean;
    accelerationEnabled?: boolean;
  };
}

export interface MonitoringConfiguration {
  cloudwatchEnabled?: boolean;
  logGroupName?: string;
  logStreamName?: string;
  metricsEnabled?: boolean;
  tracingEnabled?: boolean;
  alarmsConfigured?: string[];
  dashboardName?: string;
  enhancedMonitoring?: boolean;
  performanceInsightsEnabled?: boolean;
}

export interface ResourceRelationship {
  id: string;
  sourceId: string;
  sourceType: string;
  sourceService: string;
  targetId: string;
  targetType: string;
  targetService: string;
  relationshipType:
    | 'contains'          // VPC contains subnet
    | 'uses'             // Lambda uses VPC
    | 'connects-to'      // API Gateway connects to Lambda
    | 'routes-to'        // Route table routes to IGW
    | 'attached-to'      // EBS attached to EC2
    | 'managed-by'       // Resource managed by service
    | 'backed-by'        // CloudFront backed by S3
    | 'triggers'         // EventBridge triggers Lambda
    | 'reads-from'       // Lambda reads from DynamoDB
    | 'writes-to'        // Lambda writes to S3
    | 'replicates-to'    // RDS replicates to read replica
    | 'load-balances'    // ALB load balances to EC2
    | 'peers-with'       // VPC peers with another VPC
    | 'monitors'         // CloudWatch monitors EC2
    | 'secures'          // WAF secures CloudFront
    | 'resolves-to'      // Route53 resolves to ALB
    | 'subscribes-to'    // Lambda subscribes to SNS
    | 'publishes-to'     // Service publishes to SNS
    | 'processes'        // Kinesis processes to Lambda
    | 'aggregates'       // Glue aggregates from S3
    | 'caches'           // CloudFront caches from origin
    | 'authenticates'    // Cognito authenticates API
    | 'authorizes';      // IAM authorizes access

  direction?: 'unidirectional' | 'bidirectional';
  protocol?: string;
  ports?: number[];
  dataFlow?: boolean;
  latency?: number;
  throughput?: number;
  metadata?: Record<string, any>;
}

export interface DataFlowPath {
  id: string;
  name: string;
  description: string;
  entryPoint: string;
  exitPoint: string;
  steps: Array<{
    order: number;
    resourceId: string;
    resourceType: string;
    resourceService: string;
    resourceName: string;
    action: string;
    inputData?: string;
    outputData?: string;
    transformation?: string;
    protocol?: string;
    port?: number;
    encrypted?: boolean;
    authenticated?: boolean;
    latency?: number;
    errorRate?: number;
  }>;
  totalLatency?: number;
  dataVolumePerDay?: number;
  costPerMonth?: number;
  securityPosture: {
    encrypted: boolean;
    publiclyAccessible: boolean;
    crossAccount: boolean;
    authentication: string[];
    authorization: string[];
    complianceStandards?: string[];
    vulnerabilities?: string[];
    recommendations?: string[];
  };
}

export interface ComprehensiveScanResult {
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  dataFlowPaths: DataFlowPath[];
  networkTopology: {
    vpcs: number;
    subnets: number;
    securityGroups: number;
    vpcEndpoints: number;
    internetGateways: number;
    natGateways: number;
    transitGateways: number;
    vpcPeerings: number;
  };
  serviceInventory: Record<string, number>;
  securityFindings: Array<{
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    resourceId: string;
    finding: string;
    recommendation: string;
  }>;
  costOptimizations: Array<{
    resourceId: string;
    currentCost: number;
    optimizedCost: number;
    recommendation: string;
  }>;
  complianceStatus: {
    compliant: number;
    nonCompliant: number;
    standards: string[];
  };
  accountId: string;
  regionsScanned: string[];
  scanTimestamp: string;
  scanDuration: number;
  errors: string[];
}

// Utility functions
function getClientConfig(creds: any, region: string) {
  return {
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  };
}

function generateRelationshipId(sourceId: string, targetId: string, type: string): string {
  return `rel-${type}-${sourceId}-${targetId}`.replace(/[^a-zA-Z0-9-]/g, '-');
}

// Comprehensive EC2 Instance scanning with all relationships
export async function scanEC2Instances(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const ec2Client = new EC2Client(getClientConfig(creds, region));

  try {
    const instances = await ec2Client.send(new DescribeInstancesCommand({}));

    for (const reservation of instances.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        const resource: UniversalResource = {
          id: instance.InstanceId!,
          arn: `arn:aws:ec2:${region}:${reservation.OwnerId}:instance/${instance.InstanceId}`,
          type: 'EC2 Instance',
          service: 'EC2',
          name: instance.Tags?.find(t => t.Key === 'Name')?.Value || instance.InstanceId!,
          region,
          accountId: reservation.OwnerId,
          vpcId: instance.VpcId,
          subnetIds: instance.SubnetId ? [instance.SubnetId] : [],
          securityGroupIds: instance.SecurityGroups?.map(sg => sg.GroupId!),
          availabilityZones: instance.Placement?.AvailabilityZone ? [instance.Placement.AvailabilityZone] : [],
          publicAccess: !!instance.PublicIpAddress,
          encrypted: instance.BlockDeviceMappings?.some(bd => bd.Ebs?.Encrypted) || false,
          tags: Object.fromEntries(instance.Tags?.map(t => [t.Key!, t.Value!]) || []),
          metadata: {
            instanceType: instance.InstanceType,
            state: instance.State?.Name,
            platform: instance.Platform || 'Linux',
            architecture: instance.Architecture,
            hypervisor: instance.Hypervisor,
            virtualizationType: instance.VirtualizationType,
            cpuOptions: instance.CpuOptions,
            monitoring: instance.Monitoring?.State,
            launchTime: instance.LaunchTime,
          },
          networkConfig: {
            vpcId: instance.VpcId,
            subnetIds: instance.SubnetId ? [instance.SubnetId] : [],
            securityGroupIds: instance.SecurityGroups?.map(sg => sg.GroupId!),
            privateIpAddresses: instance.PrivateIpAddress ? [instance.PrivateIpAddress] : [],
            publicIpAddresses: instance.PublicIpAddress ? [instance.PublicIpAddress] : [],
            privateDnsName: instance.PrivateDnsName,
            publicDnsName: instance.PublicDnsName,
            networkInterfaceIds: instance.NetworkInterfaces?.map(ni => ni.NetworkInterfaceId!),
          },
          iamConfig: {
            instanceProfileArn: instance.IamInstanceProfile?.Arn,
          },
        };

        resources.push(resource);

        // Create relationships
        if (instance.VpcId) {
          relationships.push({
            id: generateRelationshipId(instance.InstanceId!, instance.VpcId, 'uses'),
            sourceId: instance.InstanceId!,
            sourceType: 'EC2 Instance',
            sourceService: 'EC2',
            targetId: instance.VpcId,
            targetType: 'VPC',
            targetService: 'EC2',
            relationshipType: 'uses',
          });
        }

        if (instance.SubnetId) {
          relationships.push({
            id: generateRelationshipId(instance.InstanceId!, instance.SubnetId, 'uses'),
            sourceId: instance.InstanceId!,
            sourceType: 'EC2 Instance',
            sourceService: 'EC2',
            targetId: instance.SubnetId,
            targetType: 'Subnet',
            targetService: 'EC2',
            relationshipType: 'uses',
          });
        }

        for (const sg of instance.SecurityGroups || []) {
          relationships.push({
            id: generateRelationshipId(instance.InstanceId!, sg.GroupId!, 'uses'),
            sourceId: instance.InstanceId!,
            sourceType: 'EC2 Instance',
            sourceService: 'EC2',
            targetId: sg.GroupId!,
            targetType: 'Security Group',
            targetService: 'EC2',
            relationshipType: 'uses',
          });
        }

        // EBS Volume relationships
        for (const blockDevice of instance.BlockDeviceMappings || []) {
          if (blockDevice.Ebs?.VolumeId) {
            relationships.push({
              id: generateRelationshipId(instance.InstanceId!, blockDevice.Ebs.VolumeId, 'attached'),
              sourceId: blockDevice.Ebs.VolumeId,
              sourceType: 'EBS Volume',
              sourceService: 'EC2',
              targetId: instance.InstanceId!,
              targetType: 'EC2 Instance',
              targetService: 'EC2',
              relationshipType: 'attached-to',
              metadata: {
                deviceName: blockDevice.DeviceName,
                deleteOnTermination: blockDevice.Ebs.DeleteOnTermination,
              },
            });
          }
        }

        // Network Interface relationships
        for (const ni of instance.NetworkInterfaces || []) {
          relationships.push({
            id: generateRelationshipId(instance.InstanceId!, ni.NetworkInterfaceId!, 'attached'),
            sourceId: ni.NetworkInterfaceId!,
            sourceType: 'Network Interface',
            sourceService: 'EC2',
            targetId: instance.InstanceId!,
            targetType: 'EC2 Instance',
            targetService: 'EC2',
            relationshipType: 'attached-to',
            metadata: {
              attachmentId: ni.Attachment?.AttachmentId,
              deviceIndex: ni.Attachment?.DeviceIndex,
            },
          });
        }
      }
    }

    // Scan EBS Volumes
    const volumes = await ec2Client.send(new DescribeVolumesCommand({}));
    for (const volume of volumes.Volumes || []) {
      resources.push({
        id: volume.VolumeId!,
        arn: `arn:aws:ec2:${region}:${volume.OwnerId}:volume/${volume.VolumeId}`,
        type: 'EBS Volume',
        service: 'EC2',
        name: volume.Tags?.find(t => t.Key === 'Name')?.Value || volume.VolumeId!,
        region,
        availabilityZones: volume.AvailabilityZone ? [volume.AvailabilityZone] : [],
        encrypted: volume.Encrypted || false,
        metadata: {
          volumeType: volume.VolumeType,
          size: volume.Size,
          iops: volume.Iops,
          throughput: volume.Throughput,
          state: volume.State,
          createTime: volume.CreateTime,
          kmsKeyId: volume.KmsKeyId,
          multiAttachEnabled: volume.MultiAttachEnabled,
        },
        dataConfig: {
          storageType: volume.VolumeType,
          storageSize: volume.Size,
          encryptionConfig: {
            enabled: volume.Encrypted || false,
            kmsKeyId: volume.KmsKeyId,
          },
        },
      });
    }

  } catch (err: any) {
    errors.push(`EC2 scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// RDS and Aurora scanning
export async function scanRDSDatabases(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const rdsClient = new RDSClient(getClientConfig(creds, region));

  try {
    // Scan DB Clusters (Aurora)
    const clusters = await rdsClient.send(new DescribeDBClustersCommand({}));
    for (const cluster of clusters.DBClusters || []) {
      const resource: UniversalResource = {
        id: cluster.DBClusterIdentifier!,
        arn: cluster.DBClusterArn,
        type: cluster.Engine?.includes('aurora') ? 'Aurora Cluster' : 'RDS Cluster',
        service: 'RDS',
        name: cluster.DBClusterIdentifier!,
        region,
        vpcId: cluster.DBSubnetGroup?.VpcId,
        securityGroupIds: cluster.VpcSecurityGroups?.map(sg => sg.VpcSecurityGroupId!),
        availabilityZones: cluster.AvailabilityZones,
        publicAccess: cluster.PubliclyAccessible || false,
        encrypted: cluster.StorageEncrypted || false,
        metadata: {
          engine: cluster.Engine,
          engineVersion: cluster.EngineVersion,
          status: cluster.Status,
          masterUsername: cluster.MasterUsername,
          endpoint: cluster.Endpoint,
          readerEndpoint: cluster.ReaderEndpoint,
          port: cluster.Port,
          backupRetentionPeriod: cluster.BackupRetentionPeriod,
          preferredBackupWindow: cluster.PreferredBackupWindow,
          preferredMaintenanceWindow: cluster.PreferredMaintenanceWindow,
          multiAZ: cluster.MultiAZ,
          deletionProtection: cluster.DeletionProtection,
        },
        networkConfig: {
          port: cluster.Port,
          vpcId: cluster.DBSubnetGroup?.VpcId,
          subnetIds: cluster.DBSubnetGroup?.Subnets?.map(s => s.SubnetIdentifier!),
          securityGroupIds: cluster.VpcSecurityGroups?.map(sg => sg.VpcSecurityGroupId!),
        },
        dataConfig: {
          storageType: cluster.StorageType,
          encryptionConfig: {
            enabled: cluster.StorageEncrypted || false,
            kmsKeyId: cluster.KmsKeyId,
          },
          backupConfig: {
            enabled: true,
            retentionDays: cluster.BackupRetentionPeriod,
          },
        },
      };

      resources.push(resource);

      // Create VPC relationships
      if (cluster.DBSubnetGroup?.VpcId) {
        relationships.push({
          id: generateRelationshipId(cluster.DBClusterIdentifier!, cluster.DBSubnetGroup.VpcId, 'uses'),
          sourceId: cluster.DBClusterIdentifier!,
          sourceType: 'RDS Cluster',
          sourceService: 'RDS',
          targetId: cluster.DBSubnetGroup.VpcId,
          targetType: 'VPC',
          targetService: 'EC2',
          relationshipType: 'uses',
        });
      }

      // Create relationships for cluster members
      for (const member of cluster.DBClusterMembers || []) {
        relationships.push({
          id: generateRelationshipId(cluster.DBClusterIdentifier!, member.DBInstanceIdentifier!, 'contains'),
          sourceId: cluster.DBClusterIdentifier!,
          sourceType: 'RDS Cluster',
          sourceService: 'RDS',
          targetId: member.DBInstanceIdentifier!,
          targetType: member.IsClusterWriter ? 'RDS Writer Instance' : 'RDS Reader Instance',
          targetService: 'RDS',
          relationshipType: 'contains',
          metadata: {
            isWriter: member.IsClusterWriter,
            promotionTier: member.PromotionTier,
          },
        });
      }

      // Read replicas
      for (const replica of cluster.ReadReplicaIdentifiers || []) {
        relationships.push({
          id: generateRelationshipId(cluster.DBClusterIdentifier!, replica, 'replicates'),
          sourceId: cluster.DBClusterIdentifier!,
          sourceType: 'RDS Cluster',
          sourceService: 'RDS',
          targetId: replica,
          targetType: 'RDS Read Replica',
          targetService: 'RDS',
          relationshipType: 'replicates-to',
        });
      }
    }

    // Scan standalone DB Instances
    const instances = await rdsClient.send(new DescribeDBInstancesCommand({}));
    for (const instance of instances.DBInstances || []) {
      // Skip if part of a cluster (already processed)
      if (instance.DBClusterIdentifier) continue;

      const resource: UniversalResource = {
        id: instance.DBInstanceIdentifier!,
        arn: instance.DBInstanceArn,
        type: 'RDS Instance',
        service: 'RDS',
        name: instance.DBInstanceIdentifier!,
        region,
        vpcId: instance.DBSubnetGroup?.VpcId,
        securityGroupIds: instance.VpcSecurityGroups?.map(sg => sg.VpcSecurityGroupId!),
        availabilityZones: instance.AvailabilityZone ? [instance.AvailabilityZone] : [],
        publicAccess: instance.PubliclyAccessible || false,
        encrypted: instance.StorageEncrypted || false,
        metadata: {
          engine: instance.Engine,
          engineVersion: instance.EngineVersion,
          instanceClass: instance.DBInstanceClass,
          status: instance.DBInstanceStatus,
          masterUsername: instance.MasterUsername,
          endpoint: instance.Endpoint?.Address,
          port: instance.Endpoint?.Port,
          allocatedStorage: instance.AllocatedStorage,
          storageType: instance.StorageType,
          iops: instance.Iops,
          multiAZ: instance.MultiAZ,
          backupRetentionPeriod: instance.BackupRetentionPeriod,
        },
        networkConfig: {
          port: instance.Endpoint?.Port,
          vpcId: instance.DBSubnetGroup?.VpcId,
          subnetIds: instance.DBSubnetGroup?.Subnets?.map(s => s.SubnetIdentifier!),
          securityGroupIds: instance.VpcSecurityGroups?.map(sg => sg.VpcSecurityGroupId!),
        },
      };

      resources.push(resource);

      // Read replicas
      for (const replica of instance.ReadReplicaDBInstanceIdentifiers || []) {
        relationships.push({
          id: generateRelationshipId(instance.DBInstanceIdentifier!, replica, 'replicates'),
          sourceId: instance.DBInstanceIdentifier!,
          sourceType: 'RDS Instance',
          sourceService: 'RDS',
          targetId: replica,
          targetType: 'RDS Read Replica',
          targetService: 'RDS',
          relationshipType: 'replicates-to',
        });
      }
    }

  } catch (err: any) {
    errors.push(`RDS scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// Load Balancer scanning (ALB, NLB, Classic)
export async function scanLoadBalancers(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const elbv2Client = new ElasticLoadBalancingV2Client(getClientConfig(creds, region));

  try {
    const loadBalancers = await elbv2Client.send(new DescribeLoadBalancersCommand({}));

    for (const lb of loadBalancers.LoadBalancers || []) {
      const resource: UniversalResource = {
        id: lb.LoadBalancerArn!,
        arn: lb.LoadBalancerArn,
        type: lb.Type === 'application' ? 'Application Load Balancer' : lb.Type === 'network' ? 'Network Load Balancer' : 'Load Balancer',
        service: 'ELB',
        name: lb.LoadBalancerName!,
        region,
        vpcId: lb.VpcId,
        subnetIds: lb.AvailabilityZones?.map(az => az.SubnetId!).filter(Boolean),
        availabilityZones: lb.AvailabilityZones?.map(az => az.ZoneName!).filter(Boolean),
        publicAccess: lb.Scheme === 'internet-facing',
        metadata: {
          type: lb.Type,
          scheme: lb.Scheme,
          state: lb.State?.Code,
          dnsName: lb.DNSName,
          canonicalHostedZoneId: lb.CanonicalHostedZoneId,
          createdTime: lb.CreatedTime,
          ipAddressType: lb.IpAddressType,
        },
        networkConfig: {
          vpcId: lb.VpcId,
          subnetIds: lb.AvailabilityZones?.map(az => az.SubnetId!).filter(Boolean),
          securityGroupIds: lb.SecurityGroups,
          dnsNames: lb.DNSName ? [lb.DNSName] : [],
        },
      };

      resources.push(resource);

      // Create VPC relationship
      if (lb.VpcId) {
        relationships.push({
          id: generateRelationshipId(lb.LoadBalancerArn!, lb.VpcId, 'uses'),
          sourceId: lb.LoadBalancerArn!,
          sourceType: resource.type,
          sourceService: 'ELB',
          targetId: lb.VpcId,
          targetType: 'VPC',
          targetService: 'EC2',
          relationshipType: 'uses',
        });
      }

      // Get target groups
      try {
        const targetGroups = await elbv2Client.send(new DescribeALBTargetGroupsCommand({
          LoadBalancerArn: lb.LoadBalancerArn,
        }));

        for (const tg of targetGroups.TargetGroups || []) {
          // Create target group resource
          resources.push({
            id: tg.TargetGroupArn!,
            arn: tg.TargetGroupArn,
            type: 'Target Group',
            service: 'ELB',
            name: tg.TargetGroupName!,
            region,
            vpcId: tg.VpcId,
            metadata: {
              targetType: tg.TargetType,
              protocol: tg.Protocol,
              port: tg.Port,
              healthCheckEnabled: tg.HealthCheckEnabled,
              healthCheckPath: tg.HealthCheckPath,
              healthCheckProtocol: tg.HealthCheckProtocol,
              healthCheckPort: tg.HealthCheckPort,
            },
            networkConfig: {
              vpcId: tg.VpcId,
              port: tg.Port,
              protocol: tg.Protocol,
            },
          });

          // Load balancer to target group relationship
          relationships.push({
            id: generateRelationshipId(lb.LoadBalancerArn!, tg.TargetGroupArn!, 'routes'),
            sourceId: lb.LoadBalancerArn!,
            sourceType: resource.type,
            sourceService: 'ELB',
            targetId: tg.TargetGroupArn!,
            targetType: 'Target Group',
            targetService: 'ELB',
            relationshipType: 'routes-to',
            metadata: {
              protocol: tg.Protocol,
              port: tg.Port,
            },
          });

          // Get targets in the target group
          try {
            const targetHealth = await elbv2Client.send(new DescribeTargetHealthCommand({
              TargetGroupArn: tg.TargetGroupArn,
            }));

            for (const target of targetHealth.TargetHealthDescriptions || []) {
              relationships.push({
                id: generateRelationshipId(tg.TargetGroupArn!, target.Target?.Id!, 'routes'),
                sourceId: tg.TargetGroupArn!,
                sourceType: 'Target Group',
                sourceService: 'ELB',
                targetId: target.Target?.Id!,
                targetType: tg.TargetType === 'instance' ? 'EC2 Instance' : tg.TargetType === 'lambda' ? 'Lambda Function' : 'Target',
                targetService: tg.TargetType === 'instance' ? 'EC2' : tg.TargetType === 'lambda' ? 'Lambda' : 'Unknown',
                relationshipType: 'load-balances',
                metadata: {
                  port: target.Target?.Port,
                  healthState: target.TargetHealth?.State,
                  healthReason: target.TargetHealth?.Reason,
                },
              });
            }
          } catch (err) {
            // Skip target health check errors
          }
        }
      } catch (err) {
        // Skip target group errors
      }

      // Get listeners
      try {
        const listeners = await elbv2Client.send(new DescribeListenersCommand({
          LoadBalancerArn: lb.LoadBalancerArn,
        }));

        for (const listener of listeners.Listeners || []) {
          relationships.push({
            id: generateRelationshipId(lb.LoadBalancerArn!, listener.ListenerArn!, 'listens'),
            sourceId: lb.LoadBalancerArn!,
            sourceType: resource.type,
            sourceService: 'ELB',
            targetId: listener.ListenerArn!,
            targetType: 'Listener',
            targetService: 'ELB',
            relationshipType: 'contains',
            metadata: {
              protocol: listener.Protocol,
              port: listener.Port,
              sslPolicy: listener.SslPolicy,
              certificates: listener.Certificates?.map(c => c.CertificateArn),
            },
          });
        }
      } catch (err) {
        // Skip listener errors
      }
    }

  } catch (err: any) {
    errors.push(`Load Balancer scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// S3 Bucket scanning with relationships
export async function scanS3Buckets(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const s3Client = new S3Client(getClientConfig(creds, region));

  try {
    const buckets = await s3Client.send(new ListBucketsCommand({}));

    for (const bucket of buckets.Buckets || []) {
      let bucketRegion = region; // Default to current region
      let publicAccess = false;
      let encrypted = false;
      let versioning = false;
      let replication = false;
      let website = false;
      let cors = false;
      let lifecycle = false;
      let notifications: any = {};

      // Get bucket details
      try {
        // Get versioning
        const versioningResp = await s3Client.send(new GetBucketVersioningCommand({
          Bucket: bucket.Name!,
        }));
        versioning = versioningResp.Status === 'Enabled';

        // Get encryption
        try {
          const encryptionResp = await s3Client.send(new GetBucketEncryptionCommand({
            Bucket: bucket.Name!,
          }));
          encrypted = !!encryptionResp.ServerSideEncryptionConfiguration;
        } catch (err) {
          // No encryption
        }

        // Get replication
        try {
          const replicationResp = await s3Client.send(new GetBucketReplicationCommand({
            Bucket: bucket.Name!,
          }));
          replication = !!replicationResp.ReplicationConfiguration;
        } catch (err) {
          // No replication
        }

        // Get website configuration
        try {
          const websiteResp = await s3Client.send(new GetBucketWebsiteCommand({
            Bucket: bucket.Name!,
          }));
          website = !!websiteResp;
        } catch (err) {
          // No website config
        }

        // Get CORS
        try {
          const corsResp = await s3Client.send(new GetBucketCorsCommand({
            Bucket: bucket.Name!,
          }));
          cors = !!corsResp.CORSRules?.length;
        } catch (err) {
          // No CORS
        }

        // Get lifecycle
        try {
          const lifecycleResp = await s3Client.send(new GetBucketLifecycleConfigurationCommand({
            Bucket: bucket.Name!,
          }));
          lifecycle = !!lifecycleResp.Rules?.length;
        } catch (err) {
          // No lifecycle
        }

        // Get notifications
        try {
          const notificationResp = await s3Client.send(new GetBucketNotificationConfigurationCommand({
            Bucket: bucket.Name!,
          }));
          notifications = notificationResp;

          // Create relationships for Lambda notifications
          for (const config of notificationResp.LambdaFunctionConfigurations || []) {
            relationships.push({
              id: generateRelationshipId(bucket.Name!, config.LambdaFunctionArn!, 'triggers'),
              sourceId: bucket.Name!,
              sourceType: 'S3 Bucket',
              sourceService: 'S3',
              targetId: config.LambdaFunctionArn!,
              targetType: 'Lambda Function',
              targetService: 'Lambda',
              relationshipType: 'triggers',
              metadata: {
                events: config.Events,
                filter: config.Filter,
              },
            });
          }

          // Create relationships for SNS notifications
          for (const config of notificationResp.TopicConfigurations || []) {
            relationships.push({
              id: generateRelationshipId(bucket.Name!, config.TopicArn!, 'publishes'),
              sourceId: bucket.Name!,
              sourceType: 'S3 Bucket',
              sourceService: 'S3',
              targetId: config.TopicArn!,
              targetType: 'SNS Topic',
              targetService: 'SNS',
              relationshipType: 'publishes-to',
              metadata: {
                events: config.Events,
                filter: config.Filter,
              },
            });
          }

          // Create relationships for SQS notifications
          for (const config of notificationResp.QueueConfigurations || []) {
            relationships.push({
              id: generateRelationshipId(bucket.Name!, config.QueueArn!, 'publishes'),
              sourceId: bucket.Name!,
              sourceType: 'S3 Bucket',
              sourceService: 'S3',
              targetId: config.QueueArn!,
              targetType: 'SQS Queue',
              targetService: 'SQS',
              relationshipType: 'publishes-to',
              metadata: {
                events: config.Events,
                filter: config.Filter,
              },
            });
          }
        } catch (err) {
          // No notifications
        }

      } catch (err) {
        // Skip bucket if we can't access it
        continue;
      }

      const resource: UniversalResource = {
        id: bucket.Name!,
        arn: `arn:aws:s3:::${bucket.Name}`,
        type: 'S3 Bucket',
        service: 'S3',
        name: bucket.Name!,
        region: bucketRegion,
        publicAccess,
        encrypted,
        metadata: {
          creationDate: bucket.CreationDate,
          versioning,
          replication,
          website,
          cors,
          lifecycle,
          hasLambdaTriggers: (notifications.LambdaFunctionConfigurations || []).length > 0,
          hasSNSTriggers: (notifications.TopicConfigurations || []).length > 0,
          hasSQSTriggers: (notifications.QueueConfigurations || []).length > 0,
        },
        dataConfig: {
          storageClass: 'STANDARD',
          replicationConfig: {
            enabled: replication,
          },
          encryptionConfig: {
            enabled: encrypted,
          },
        },
      };

      resources.push(resource);
    }

  } catch (err: any) {
    errors.push(`S3 scan error: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// Lambda function scanning with all relationships
export async function scanLambdaFunctions(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const lambdaClient = new LambdaClient(getClientConfig(creds, region));

  try {
    const functions = await lambdaClient.send(new ListFunctionsCommand({ MaxItems: 200 }));

    for (const fn of functions.Functions || []) {
      try {
        // Get detailed configuration
        const config = await lambdaClient.send(new GetFunctionConfigurationCommand({
          FunctionName: fn.FunctionName!,
        }));

        const resource: UniversalResource = {
          id: fn.FunctionArn!,
          arn: fn.FunctionArn,
          type: 'Lambda Function',
          service: 'Lambda',
          name: fn.FunctionName!,
          region,
          vpcId: config.VpcConfig?.VpcId,
          subnetIds: config.VpcConfig?.SubnetIds,
          securityGroupIds: config.VpcConfig?.SecurityGroupIds,
          publicAccess: !config.VpcConfig?.VpcId, // Public if not in VPC
          metadata: {
            runtime: config.Runtime,
            handler: config.Handler,
            codeSize: config.CodeSize,
            memorySize: config.MemorySize,
            timeout: config.Timeout,
            lastModified: config.LastModified,
            version: config.Version,
            state: config.State,
            stateReason: config.StateReason,
            layers: config.Layers?.map(l => l.Arn),
            environment: Object.keys(config.Environment?.Variables || {}),
            deadLetterConfig: config.DeadLetterConfig,
            tracingConfig: config.TracingConfig,
            ephemeralStorage: config.EphemeralStorage,
          },
          networkConfig: {
            vpcId: config.VpcConfig?.VpcId,
            subnetIds: config.VpcConfig?.SubnetIds,
            securityGroupIds: config.VpcConfig?.SecurityGroupIds,
          },
          iamConfig: {
            roleArn: config.Role,
          },
        };

        resources.push(resource);

        // VPC relationships
        if (config.VpcConfig?.VpcId) {
          relationships.push({
            id: generateRelationshipId(fn.FunctionArn!, config.VpcConfig.VpcId, 'uses'),
            sourceId: fn.FunctionArn!,
            sourceType: 'Lambda Function',
            sourceService: 'Lambda',
            targetId: config.VpcConfig.VpcId,
            targetType: 'VPC',
            targetService: 'EC2',
            relationshipType: 'uses',
          });

          // Subnet relationships
          for (const subnetId of config.VpcConfig.SubnetIds || []) {
            relationships.push({
              id: generateRelationshipId(fn.FunctionArn!, subnetId, 'uses'),
              sourceId: fn.FunctionArn!,
              sourceType: 'Lambda Function',
              sourceService: 'Lambda',
              targetId: subnetId,
              targetType: 'Subnet',
              targetService: 'EC2',
              relationshipType: 'uses',
            });
          }

          // Security group relationships
          for (const sgId of config.VpcConfig.SecurityGroupIds || []) {
            relationships.push({
              id: generateRelationshipId(fn.FunctionArn!, sgId, 'uses'),
              sourceId: fn.FunctionArn!,
              sourceType: 'Lambda Function',
              sourceService: 'Lambda',
              targetId: sgId,
              targetType: 'Security Group',
              targetService: 'EC2',
              relationshipType: 'uses',
            });
          }
        }

        // Dead letter queue relationships
        if (config.DeadLetterConfig?.TargetArn) {
          const targetService = config.DeadLetterConfig.TargetArn.includes(':sqs:') ? 'SQS' : 'SNS';
          relationships.push({
            id: generateRelationshipId(fn.FunctionArn!, config.DeadLetterConfig.TargetArn, 'publishes'),
            sourceId: fn.FunctionArn!,
            sourceType: 'Lambda Function',
            sourceService: 'Lambda',
            targetId: config.DeadLetterConfig.TargetArn,
            targetType: targetService === 'SQS' ? 'SQS Queue' : 'SNS Topic',
            targetService,
            relationshipType: 'publishes-to',
            metadata: {
              purpose: 'dead-letter-queue',
            },
          });
        }

        // Get event source mappings
        try {
          const mappings = await lambdaClient.send(new ListEventSourceMappingsCommand({
            FunctionName: fn.FunctionName,
          }));

          for (const mapping of mappings.EventSourceMappings || []) {
            if (mapping.EventSourceArn) {
              let targetType = 'Event Source';
              let targetService = 'Unknown';

              if (mapping.EventSourceArn.includes(':dynamodb:')) {
                targetType = 'DynamoDB Stream';
                targetService = 'DynamoDB';
              } else if (mapping.EventSourceArn.includes(':kinesis:')) {
                targetType = 'Kinesis Stream';
                targetService = 'Kinesis';
              } else if (mapping.EventSourceArn.includes(':sqs:')) {
                targetType = 'SQS Queue';
                targetService = 'SQS';
              } else if (mapping.EventSourceArn.includes(':kafka:')) {
                targetType = 'MSK Cluster';
                targetService = 'MSK';
              }

              relationships.push({
                id: generateRelationshipId(mapping.EventSourceArn, fn.FunctionArn!, 'triggers'),
                sourceId: mapping.EventSourceArn,
                sourceType: targetType,
                sourceService: targetService,
                targetId: fn.FunctionArn!,
                targetType: 'Lambda Function',
                targetService: 'Lambda',
                relationshipType: 'triggers',
                metadata: {
                  uuid: mapping.UUID,
                  state: mapping.State,
                  batchSize: mapping.BatchSize,
                  parallelizationFactor: mapping.ParallelizationFactor,
                },
              });
            }
          }
        } catch (err) {
          // Skip event source mapping errors
        }

        // Analyze environment variables for service connections
        const envVars = config.Environment?.Variables || {};

        // Check for DynamoDB tables
        for (const [key, value] of Object.entries(envVars)) {
          if (key.includes('TABLE') || key.includes('DYNAMODB')) {
            relationships.push({
              id: generateRelationshipId(fn.FunctionArn!, value, 'accesses'),
              sourceId: fn.FunctionArn!,
              sourceType: 'Lambda Function',
              sourceService: 'Lambda',
              targetId: value,
              targetType: 'DynamoDB Table',
              targetService: 'DynamoDB',
              relationshipType: 'reads-from',
              metadata: {
                environmentVariable: key,
                inferred: true,
              },
            });
          }

          // Check for S3 buckets
          if (key.includes('BUCKET') || key.includes('S3')) {
            relationships.push({
              id: generateRelationshipId(fn.FunctionArn!, value, 'accesses'),
              sourceId: fn.FunctionArn!,
              sourceType: 'Lambda Function',
              sourceService: 'Lambda',
              targetId: value,
              targetType: 'S3 Bucket',
              targetService: 'S3',
              relationshipType: 'reads-from',
              metadata: {
                environmentVariable: key,
                inferred: true,
              },
            });
          }

          // Check for RDS/Aurora endpoints
          if (key.includes('DATABASE') || key.includes('DB_') || key.includes('RDS')) {
            relationships.push({
              id: generateRelationshipId(fn.FunctionArn!, value, 'connects'),
              sourceId: fn.FunctionArn!,
              sourceType: 'Lambda Function',
              sourceService: 'Lambda',
              targetId: value,
              targetType: 'Database',
              targetService: 'RDS',
              relationshipType: 'connects-to',
              metadata: {
                environmentVariable: key,
                inferred: true,
              },
            });
          }

          // Check for API endpoints
          if (key.includes('API_') || key.includes('ENDPOINT')) {
            relationships.push({
              id: generateRelationshipId(fn.FunctionArn!, value, 'calls'),
              sourceId: fn.FunctionArn!,
              sourceType: 'Lambda Function',
              sourceService: 'Lambda',
              targetId: value,
              targetType: 'API Endpoint',
              targetService: 'API',
              relationshipType: 'connects-to',
              metadata: {
                environmentVariable: key,
                inferred: true,
              },
            });
          }
        }

      } catch (err) {
        // Skip function details errors
      }
    }

  } catch (err: any) {
    errors.push(`Lambda scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// DynamoDB scanning
export async function scanDynamoDB(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const dynamoClient = new DynamoDBClient(getClientConfig(creds, region));

  try {
    const tables = await dynamoClient.send(new ListTablesCommand({}));

    for (const tableName of tables.TableNames || []) {
      try {
        const table = await dynamoClient.send(new DescribeTableCommand({
          TableName: tableName,
        }));

        const tableDetails = table.Table!;

        const resource: UniversalResource = {
          id: tableDetails.TableArn!,
          arn: tableDetails.TableArn,
          type: 'DynamoDB Table',
          service: 'DynamoDB',
          name: tableName,
          region,
          publicAccess: false, // DynamoDB is always private
          encrypted: tableDetails.SSEDescription?.Status === 'ENABLED',
          metadata: {
            tableStatus: tableDetails.TableStatus,
            creationDateTime: tableDetails.CreationDateTime,
            itemCount: tableDetails.ItemCount,
            tableSizeBytes: tableDetails.TableSizeBytes,
            billingMode: tableDetails.BillingModeSummary?.BillingMode,
            provisionedThroughput: tableDetails.ProvisionedThroughput,
            globalSecondaryIndexes: tableDetails.GlobalSecondaryIndexes?.map(gsi => ({
              indexName: gsi.IndexName,
              indexStatus: gsi.IndexStatus,
              provisionedThroughput: gsi.ProvisionedThroughput,
            })),
            streamSpecification: tableDetails.StreamSpecification,
            pointInTimeRecovery: tableDetails.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus,
            deletionProtection: tableDetails.DeletionProtectionEnabled,
          },
          dataConfig: {
            encryptionConfig: {
              enabled: tableDetails.SSEDescription?.Status === 'ENABLED',
              kmsKeyId: tableDetails.SSEDescription?.KMSMasterKeyArn,
              encryptionType: tableDetails.SSEDescription?.SSEType,
            },
            backupConfig: {
              enabled: tableDetails.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus === 'ENABLED',
            },
          },
        };

        resources.push(resource);

        // If stream is enabled, create stream resource and relationship
        if (tableDetails.StreamSpecification?.StreamEnabled && tableDetails.LatestStreamArn) {
          const streamResource: UniversalResource = {
            id: tableDetails.LatestStreamArn,
            arn: tableDetails.LatestStreamArn,
            type: 'DynamoDB Stream',
            service: 'DynamoDB',
            name: `${tableName}-stream`,
            region,
            publicAccess: false,
            metadata: {
              streamViewType: tableDetails.StreamSpecification.StreamViewType,
              streamArn: tableDetails.LatestStreamArn,
            },
          };

          resources.push(streamResource);

          relationships.push({
            id: generateRelationshipId(tableDetails.TableArn!, tableDetails.LatestStreamArn, 'streams'),
            sourceId: tableDetails.TableArn!,
            sourceType: 'DynamoDB Table',
            sourceService: 'DynamoDB',
            targetId: tableDetails.LatestStreamArn,
            targetType: 'DynamoDB Stream',
            targetService: 'DynamoDB',
            relationshipType: 'publishes-to',
            metadata: {
              streamViewType: tableDetails.StreamSpecification.StreamViewType,
            },
          });
        }

        // Check for global tables
        if (tableDetails.GlobalTableVersion) {
          for (const replica of tableDetails.Replicas || []) {
            relationships.push({
              id: generateRelationshipId(tableDetails.TableArn!, replica.RegionName!, 'replicates'),
              sourceId: tableDetails.TableArn!,
              sourceType: 'DynamoDB Table',
              sourceService: 'DynamoDB',
              targetId: `${tableName}-${replica.RegionName}`,
              targetType: 'DynamoDB Table Replica',
              targetService: 'DynamoDB',
              relationshipType: 'replicates-to',
              metadata: {
                replicaRegion: replica.RegionName,
                replicaStatus: replica.ReplicaStatus,
              },
            });
          }
        }

      } catch (err) {
        // Skip table details errors
      }
    }

  } catch (err: any) {
    errors.push(`DynamoDB scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// API Gateway scanning with all integrations
export async function scanAPIGateways(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const apiGatewayClient = new APIGatewayClient(getClientConfig(creds, region));

  try {
    const apis = await apiGatewayClient.send(new GetRestApisCommand({ limit: 100 }));

    for (const api of apis.items || []) {
      const resource: UniversalResource = {
        id: api.id!,
        arn: `arn:aws:apigateway:${region}::/restapis/${api.id}`,
        type: 'API Gateway',
        service: 'API Gateway',
        name: api.name!,
        region,
        publicAccess: api.endpointConfiguration?.types?.includes('EDGE') ||
                     api.endpointConfiguration?.types?.includes('REGIONAL'),
        metadata: {
          apiId: api.id,
          description: api.description,
          createdDate: api.createdDate,
          version: api.version,
          minimumCompressionSize: api.minimumCompressionSize,
          apiKeySource: api.apiKeySource,
          endpointConfiguration: api.endpointConfiguration,
          policy: api.policy,
          tags: api.tags,
        },
        networkConfig: {
          vpcEndpointIds: api.endpointConfiguration?.vpcEndpointIds,
        },
      };

      resources.push(resource);

      // VPC Endpoint relationships for private APIs
      for (const vpcEndpointId of api.endpointConfiguration?.vpcEndpointIds || []) {
        relationships.push({
          id: generateRelationshipId(api.id!, vpcEndpointId, 'uses'),
          sourceId: api.id!,
          sourceType: 'API Gateway',
          sourceService: 'API Gateway',
          targetId: vpcEndpointId,
          targetType: 'VPC Endpoint',
          targetService: 'EC2',
          relationshipType: 'uses',
        });
      }

      // Get resources and their integrations
      try {
        const apiResources = await apiGatewayClient.send(new GetResourcesCommand({
          restApiId: api.id!,
          limit: 100,
        }));

        for (const apiResource of apiResources.items || []) {
          // Check each HTTP method
          for (const [method, methodConfig] of Object.entries(apiResource.resourceMethods || {})) {
            try {
              const integration = await apiGatewayClient.send(new GetIntegrationCommand({
                restApiId: api.id!,
                resourceId: apiResource.id!,
                httpMethod: method,
              }));

              // Determine backend service from integration
              if (integration.type === 'AWS' || integration.type === 'AWS_PROXY') {
                if (integration.uri?.includes(':lambda:')) {
                  // Extract Lambda function ARN
                  const lambdaMatch = integration.uri.match(/arn:aws:lambda:[^:]+:[^:]+:function:([^\/]+)/);
                  if (lambdaMatch) {
                    const lambdaArn = `arn:aws:lambda:${region}:${lambdaMatch[0].split(':')[4]}:function:${lambdaMatch[1]}`;
                    relationships.push({
                      id: generateRelationshipId(api.id!, lambdaArn, 'invokes'),
                      sourceId: api.id!,
                      sourceType: 'API Gateway',
                      sourceService: 'API Gateway',
                      targetId: lambdaArn,
                      targetType: 'Lambda Function',
                      targetService: 'Lambda',
                      relationshipType: 'connects-to',
                      metadata: {
                        resource: apiResource.path,
                        method,
                        integrationType: integration.type,
                      },
                    });
                  }
                } else if (integration.uri?.includes(':dynamodb:')) {
                  // DynamoDB integration
                  relationships.push({
                    id: generateRelationshipId(api.id!, integration.uri, 'accesses'),
                    sourceId: api.id!,
                    sourceType: 'API Gateway',
                    sourceService: 'API Gateway',
                    targetId: integration.uri,
                    targetType: 'DynamoDB',
                    targetService: 'DynamoDB',
                    relationshipType: 'connects-to',
                    metadata: {
                      resource: apiResource.path,
                      method,
                      integrationType: integration.type,
                    },
                  });
                } else if (integration.uri?.includes(':s3:')) {
                  // S3 integration
                  relationships.push({
                    id: generateRelationshipId(api.id!, integration.uri, 'accesses'),
                    sourceId: api.id!,
                    sourceType: 'API Gateway',
                    sourceService: 'API Gateway',
                    targetId: integration.uri,
                    targetType: 'S3 Bucket',
                    targetService: 'S3',
                    relationshipType: 'connects-to',
                    metadata: {
                      resource: apiResource.path,
                      method,
                      integrationType: integration.type,
                    },
                  });
                }
              } else if (integration.type === 'HTTP' || integration.type === 'HTTP_PROXY') {
                // HTTP backend
                relationships.push({
                  id: generateRelationshipId(api.id!, integration.uri || 'http-backend', 'proxies'),
                  sourceId: api.id!,
                  sourceType: 'API Gateway',
                  sourceService: 'API Gateway',
                  targetId: integration.uri || 'http-backend',
                  targetType: 'HTTP Endpoint',
                  targetService: 'External',
                  relationshipType: 'connects-to',
                  metadata: {
                    resource: apiResource.path,
                    method,
                    integrationType: integration.type,
                    connectionType: integration.connectionType,
                    connectionId: integration.connectionId,
                  },
                });
              }
            } catch (err) {
              // Skip integration errors
            }
          }
        }
      } catch (err) {
        // Skip resource errors
      }
    }

  } catch (err: any) {
    errors.push(`API Gateway scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// CloudFront distributions scanning
export async function scanCloudFront(creds: any): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const cloudFrontClient = new CloudFrontClient(getClientConfig(creds, 'us-east-1')); // CloudFront is global

  try {
    const distributions = await cloudFrontClient.send(new ListDistributionsCommand({}));

    for (const dist of distributions.DistributionList?.Items || []) {
      const resource: UniversalResource = {
        id: dist.Id!,
        arn: dist.ARN!,
        type: 'CloudFront Distribution',
        service: 'CloudFront',
        name: dist.DomainName!,
        region: 'global',
        publicAccess: true, // CloudFront is always public
        metadata: {
          domainName: dist.DomainName,
          aliases: dist.Aliases?.Items,
          status: dist.Status,
          enabled: dist.Enabled,
          httpVersion: dist.HttpVersion,
          ipv6Enabled: dist.IsIPV6Enabled,
          priceClass: dist.PriceClass,
          webACLId: dist.WebACLId,
          viewerCertificate: dist.ViewerCertificate,
          comment: dist.Comment,
        },
      };

      resources.push(resource);

      // WAF relationship
      if (dist.WebACLId && dist.WebACLId !== '') {
        relationships.push({
          id: generateRelationshipId(dist.WebACLId, dist.Id!, 'protects'),
          sourceId: dist.WebACLId,
          sourceType: 'WAF WebACL',
          sourceService: 'WAF',
          targetId: dist.Id!,
          targetType: 'CloudFront Distribution',
          targetService: 'CloudFront',
          relationshipType: 'secures',
        });
      }

      // Get distribution details for origins
      try {
        const distDetails = await cloudFrontClient.send(new GetDistributionCommand({
          Id: dist.Id!,
        }));

        const config = distDetails.Distribution?.DistributionConfig;

        // Process origins
        for (const origin of config?.Origins?.Items || []) {
          let originType = 'Origin';
          let originService = 'Unknown';

          if (origin.S3OriginConfig) {
            originType = 'S3 Bucket';
            originService = 'S3';

            // Extract bucket name from domain
            const bucketMatch = origin.DomainName?.match(/([^\.]+)\.s3/);
            if (bucketMatch) {
              relationships.push({
                id: generateRelationshipId(dist.Id!, bucketMatch[1], 'origin'),
                sourceId: dist.Id!,
                sourceType: 'CloudFront Distribution',
                sourceService: 'CloudFront',
                targetId: bucketMatch[1],
                targetType: 'S3 Bucket',
                targetService: 'S3',
                relationshipType: 'backed-by',
                metadata: {
                  originId: origin.Id,
                  originPath: origin.OriginPath,
                  originAccessIdentity: origin.S3OriginConfig.OriginAccessIdentity,
                },
              });
            }
          } else if (origin.CustomOriginConfig) {
            // Check if it's an ALB/ELB
            if (origin.DomainName?.includes('.elb.amazonaws.com')) {
              originType = 'Load Balancer';
              originService = 'ELB';
            } else if (origin.DomainName?.includes('.execute-api.')) {
              originType = 'API Gateway';
              originService = 'API Gateway';
            }

            relationships.push({
              id: generateRelationshipId(dist.Id!, origin.DomainName!, 'origin'),
              sourceId: dist.Id!,
              sourceType: 'CloudFront Distribution',
              sourceService: 'CloudFront',
              targetId: origin.DomainName!,
              targetType: originType,
              targetService: originService,
              relationshipType: 'backed-by',
              metadata: {
                originId: origin.Id,
                originPath: origin.OriginPath,
                protocolPolicy: origin.CustomOriginConfig?.OriginProtocolPolicy,
                httpPort: origin.CustomOriginConfig?.HTTPPort,
                httpsPort: origin.CustomOriginConfig?.HTTPSPort,
              },
            });
          }
        }
      } catch (err) {
        // Skip distribution details errors
      }
    }

  } catch (err: any) {
    errors.push(`CloudFront scan error: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// Build comprehensive data flow paths
export function buildDataFlowPaths(
  resources: UniversalResource[],
  relationships: ResourceRelationship[]
): DataFlowPath[] {
  const dataFlowPaths: DataFlowPath[] = [];
  const resourceMap = new Map(resources.map(r => [r.id, r]));
  const relationshipsBySource = new Map<string, ResourceRelationship[]>();

  relationships.forEach(rel => {
    if (!relationshipsBySource.has(rel.sourceId)) {
      relationshipsBySource.set(rel.sourceId, []);
    }
    relationshipsBySource.get(rel.sourceId)!.push(rel);
  });

  // Find entry points (public-facing resources)
  const entryPoints = resources.filter(r =>
    r.publicAccess && (
      r.type === 'API Gateway' ||
      r.type === 'Application Load Balancer' ||
      r.type === 'Network Load Balancer' ||
      r.type === 'CloudFront Distribution' ||
      r.type === 'API Gateway'
    )
  );

  // Trace data flows from each entry point
  for (const entryPoint of entryPoints) {
    const visited = new Set<string>();
    const paths = traceDataFlow(
      entryPoint,
      resourceMap,
      relationshipsBySource,
      visited,
      []
    );
    dataFlowPaths.push(...paths);
  }

  // Find event-driven flows (starting from event sources)
  const eventSources = resources.filter(r =>
    r.type === 'S3 Bucket' ||
    r.type === 'DynamoDB Stream' ||
    r.type === 'Kinesis Stream' ||
    r.type === 'SQS Queue' ||
    r.type === 'SNS Topic'
  );

  for (const eventSource of eventSources) {
    const eventRelationships = relationships.filter(r =>
      r.sourceId === eventSource.id && r.relationshipType === 'triggers'
    );

    for (const rel of eventRelationships) {
      const target = resourceMap.get(rel.targetId);
      if (target) {
        const path: DataFlowPath = {
          id: `flow-event-${eventSource.id}-${target.id}`,
          name: `${eventSource.name} → ${target.name}`,
          description: `Event-driven flow from ${eventSource.type} to ${target.type}`,
          entryPoint: eventSource.id,
          exitPoint: target.id,
          steps: [
            {
              order: 1,
              resourceId: eventSource.id,
              resourceType: eventSource.type,
              resourceService: eventSource.service,
              resourceName: eventSource.name,
              action: 'emit-event',
              encrypted: true,
            },
            {
              order: 2,
              resourceId: target.id,
              resourceType: target.type,
              resourceService: target.service,
              resourceName: target.name,
              action: 'process-event',
              encrypted: true,
            },
          ],
          securityPosture: analyzeSecurityPosture([eventSource, target]),
        };
        dataFlowPaths.push(path);
      }
    }
  }

  return dataFlowPaths;
}

function traceDataFlow(
  current: UniversalResource,
  resourceMap: Map<string, UniversalResource>,
  relationshipsBySource: Map<string, ResourceRelationship[]>,
  visited: Set<string>,
  currentPath: UniversalResource[]
): DataFlowPath[] {
  if (visited.has(current.id)) return [];
  visited.add(current.id);

  const newPath = [...currentPath, current];
  const paths: DataFlowPath[] = [];

  const outboundRels = relationshipsBySource.get(current.id) || [];
  const flowRels = outboundRels.filter(r =>
    r.relationshipType === 'connects-to' ||
    r.relationshipType === 'routes-to' ||
    r.relationshipType === 'load-balances' ||
    r.relationshipType === 'publishes-to' ||
    r.relationshipType === 'reads-from' ||
    r.relationshipType === 'writes-to'
  );

  if (flowRels.length === 0 && newPath.length > 1) {
    // End of path - create data flow
    const path: DataFlowPath = {
      id: `flow-${newPath[0].id}-${current.id}`,
      name: `${newPath[0].name} → ${current.name}`,
      description: `Data flow from ${newPath[0].type} to ${current.type}`,
      entryPoint: newPath[0].id,
      exitPoint: current.id,
      steps: newPath.map((resource, index) => ({
        order: index + 1,
        resourceId: resource.id,
        resourceType: resource.type,
        resourceService: resource.service,
        resourceName: resource.name,
        action: determineAction(resource.type),
        encrypted: resource.encrypted,
        authenticated: !!resource.iamConfig?.roleArn,
        protocol: resource.networkConfig?.protocol,
        port: resource.networkConfig?.port,
      })),
      securityPosture: analyzeSecurityPosture(newPath),
    };
    paths.push(path);
  } else {
    // Continue tracing
    for (const rel of flowRels) {
      const nextResource = resourceMap.get(rel.targetId);
      if (nextResource && !visited.has(nextResource.id)) {
        const subPaths = traceDataFlow(
          nextResource,
          resourceMap,
          relationshipsBySource,
          new Set(visited),
          newPath
        );
        paths.push(...subPaths);
      }
    }
  }

  return paths;
}

function determineAction(resourceType: string): string {
  const actionMap: Record<string, string> = {
    'API Gateway': 'route',
    'Lambda Function': 'process',
    'EC2 Instance': 'compute',
    'RDS Instance': 'query',
    'RDS Cluster': 'query',
    'DynamoDB Table': 'read-write',
    'S3 Bucket': 'store',
    'Application Load Balancer': 'load-balance',
    'Network Load Balancer': 'load-balance',
    'CloudFront Distribution': 'cache-deliver',
    'SQS Queue': 'queue',
    'SNS Topic': 'publish',
    'Kinesis Stream': 'stream',
    'ElastiCache Cluster': 'cache',
  };

  return actionMap[resourceType] || 'process';
}

function analyzeSecurityPosture(resources: UniversalResource[]): DataFlowPath['securityPosture'] {
  const encrypted = resources.every(r => r.encrypted !== false);
  const publiclyAccessible = resources.some(r => r.publicAccess === true);
  const crossAccount = resources.some(r => r.iamConfig?.crossAccountAccess === true);

  const authentication: string[] = [];
  const authorization: string[] = [];
  const vulnerabilities: string[] = [];
  const recommendations: string[] = [];

  for (const resource of resources) {
    // Check authentication
    if (resource.iamConfig?.roleArn) {
      authorization.push('IAM');
    }
    if (resource.metadata?.apiKeySource) {
      authentication.push('API Key');
    }

    // Check for vulnerabilities
    if (resource.publicAccess && !resource.metadata?.webACLId) {
      vulnerabilities.push(`${resource.name} is publicly accessible without WAF protection`);
    }
    if (!resource.encrypted && resource.type.includes('Database')) {
      vulnerabilities.push(`${resource.name} database is not encrypted`);
    }
    if (resource.securityGroupIds?.length === 0) {
      vulnerabilities.push(`${resource.name} has no security groups attached`);
    }

    // Recommendations
    if (!resource.vpcId && resource.type === 'Lambda Function') {
      recommendations.push(`Attach ${resource.name} to a VPC for network isolation`);
    }
    if (resource.publicAccess && resource.type.includes('Database')) {
      recommendations.push(`Remove public access from ${resource.name} database`);
    }
  }

  return {
    encrypted,
    publiclyAccessible,
    crossAccount,
    authentication: [...new Set(authentication)],
    authorization: [...new Set(authorization)],
    vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}

// Main comprehensive scanner
export async function performComprehensiveScan(creds: any, regions?: string[]): Promise<ComprehensiveScanResult> {
  const scanStart = Date.now();
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const regionsScanned: string[] = [];

  // Default regions if not specified
  const scanRegions = regions || ['us-east-1', 'us-west-2', 'eu-west-1'];

  // Get account ID
  let accountId = 'unknown';
  try {
    const stsClient = new STSClient(getClientConfig(creds, 'us-east-1'));
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    accountId = identity.Account || 'unknown';
  } catch (err: any) {
    errors.push(`Failed to get account ID: ${err.message}`);
  }

  // Scan each region
  for (const region of scanRegions) {
    console.log(`Scanning region: ${region}`);
    regionsScanned.push(region);

    // Run all scanners in parallel for better performance
    const scanPromises = [
      scanEC2Instances(creds, region),
      scanRDSDatabases(creds, region),
      scanLoadBalancers(creds, region),
      scanS3Buckets(creds, region),
      scanLambdaFunctions(creds, region),
      scanDynamoDB(creds, region),
      scanAPIGateways(creds, region),
    ];

    const results = await Promise.allSettled(scanPromises);

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        resources.push(...result.value.resources);
        relationships.push(...result.value.relationships);
        errors.push(...result.value.errors);
      } else {
        errors.push(`Scanner failed: ${result.reason}`);
      }
    });
  }

  // Scan global services (CloudFront is global)
  try {
    const cloudFrontResult = await scanCloudFront(creds);
    resources.push(...cloudFrontResult.resources);
    relationships.push(...cloudFrontResult.relationships);
    errors.push(...cloudFrontResult.errors);
  } catch (err: any) {
    errors.push(`CloudFront scan failed: ${err.message}`);
  }

  // Build data flow paths
  const dataFlowPaths = buildDataFlowPaths(resources, relationships);

  // Analyze network topology
  const networkTopology = {
    vpcs: resources.filter(r => r.type === 'VPC').length,
    subnets: resources.filter(r => r.type === 'Subnet').length,
    securityGroups: resources.filter(r => r.type === 'Security Group').length,
    vpcEndpoints: resources.filter(r => r.type === 'VPC Endpoint').length,
    internetGateways: resources.filter(r => r.type === 'Internet Gateway').length,
    natGateways: resources.filter(r => r.type === 'NAT Gateway').length,
    transitGateways: resources.filter(r => r.type === 'Transit Gateway').length,
    vpcPeerings: relationships.filter(r => r.relationshipType === 'peers-with').length,
  };

  // Build service inventory
  const serviceInventory: Record<string, number> = {};
  resources.forEach(r => {
    serviceInventory[r.service] = (serviceInventory[r.service] || 0) + 1;
  });

  // Analyze security findings
  const securityFindings: ComprehensiveScanResult['securityFindings'] = [];

  // Check for public databases
  resources.filter(r => r.service === 'RDS' && r.publicAccess).forEach(r => {
    securityFindings.push({
      severity: 'CRITICAL',
      resourceId: r.id,
      finding: `Database ${r.name} is publicly accessible`,
      recommendation: 'Remove public access and use VPC endpoints or bastion hosts',
    });
  });

  // Check for unencrypted databases
  resources.filter(r => r.service === 'RDS' && !r.encrypted).forEach(r => {
    securityFindings.push({
      severity: 'HIGH',
      resourceId: r.id,
      finding: `Database ${r.name} is not encrypted`,
      recommendation: 'Enable encryption at rest using AWS KMS',
    });
  });

  // Check for Lambda functions without VPC
  resources.filter(r => r.type === 'Lambda Function' && !r.vpcId).forEach(r => {
    securityFindings.push({
      severity: 'MEDIUM',
      resourceId: r.id,
      finding: `Lambda function ${r.name} is not attached to a VPC`,
      recommendation: 'Attach to VPC for network isolation',
    });
  });

  // Check for S3 buckets without encryption
  resources.filter(r => r.type === 'S3 Bucket' && !r.encrypted).forEach(r => {
    securityFindings.push({
      severity: 'HIGH',
      resourceId: r.id,
      finding: `S3 bucket ${r.name} is not encrypted`,
      recommendation: 'Enable default encryption using SSE-S3 or SSE-KMS',
    });
  });

  // Cost optimizations (simplified example)
  const costOptimizations: ComprehensiveScanResult['costOptimizations'] = [];

  // Check for unattached EBS volumes
  resources.filter(r => r.type === 'EBS Volume').forEach(r => {
    const isAttached = relationships.some(rel =>
      rel.sourceId === r.id && rel.relationshipType === 'attached-to'
    );
    if (!isAttached) {
      costOptimizations.push({
        resourceId: r.id,
        currentCost: 10, // Example monthly cost
        optimizedCost: 0,
        recommendation: `Delete unattached EBS volume ${r.name}`,
      });
    }
  });

  // Compliance status
  const complianceStatus = {
    compliant: resources.filter(r => r.encrypted && !r.publicAccess).length,
    nonCompliant: resources.filter(r => !r.encrypted || (r.publicAccess && r.service === 'RDS')).length,
    standards: ['AWS Well-Architected', 'CIS AWS Foundations'],
  };

  const scanDuration = Date.now() - scanStart;

  return {
    resources,
    relationships,
    dataFlowPaths,
    networkTopology,
    serviceInventory,
    securityFindings,
    costOptimizations,
    complianceStatus,
    accountId,
    regionsScanned,
    scanTimestamp: new Date().toISOString(),
    scanDuration,
    errors: [...new Set(errors)], // Remove duplicates
  };
}