import { ElastiCacheClient, DescribeCacheClustersCommand, DescribeReplicationGroupsCommand } from "@aws-sdk/client-elasticache";
import { EFSClient, DescribeFileSystemsCommand, DescribeMountTargetsCommand, DescribeAccessPointsCommand } from "@aws-sdk/client-efs";
import { FSxClient, DescribeFileSystemsCommand as FSxDescribeFileSystemsCommand } from "@aws-sdk/client-fsx";
import { SQSClient, ListQueuesCommand, GetQueueAttributesCommand } from "@aws-sdk/client-sqs";
import { SNSClient, ListTopicsCommand, GetTopicAttributesCommand, ListSubscriptionsCommand } from "@aws-sdk/client-sns";
import { EventBridgeClient, ListRulesCommand, ListTargetsByRuleCommand, ListEventBusesCommand } from "@aws-sdk/client-eventbridge";
import { KinesisClient, ListStreamsCommand, DescribeStreamCommand, ListStreamConsumersCommand } from "@aws-sdk/client-kinesis";
import { MSKClient, ListClustersV2Command, DescribeClusterV2Command } from "@aws-sdk/client-kafka";
// ElasticSearch client is deprecated, use OpenSearch instead
import { OpenSearchClient, ListDomainNamesCommand as OSListDomainNamesCommand, DescribeDomainCommand } from "@aws-sdk/client-opensearch";
import { CloudWatchClient, ListMetricsCommand, DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient, DescribeLogGroupsCommand, DescribeLogStreamsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { Route53Client, ListHostedZonesCommand, ListResourceRecordSetsCommand } from "@aws-sdk/client-route-53";
import { ACMClient, ListCertificatesCommand, DescribeCertificateCommand } from "@aws-sdk/client-acm";
import { WAFv2Client, ListWebACLsCommand, GetWebACLCommand } from "@aws-sdk/client-wafv2";
import type { UniversalResource, ResourceRelationship } from "./aws-scanner-complete";

// ElastiCache (Redis/Memcached) scanning
export async function scanElastiCache(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const elastiCacheClient = new ElastiCacheClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  try {
    // Scan cache clusters
    const clusters = await elastiCacheClient.send(new DescribeCacheClustersCommand({
      ShowCacheNodeInfo: true,
    }));

    for (const cluster of clusters.CacheClusters || []) {
      const resource: UniversalResource = {
        id: cluster.CacheClusterId!,
        arn: cluster.ARN,
        type: cluster.Engine === 'redis' ? 'ElastiCache Redis' : 'ElastiCache Memcached',
        service: 'ElastiCache',
        name: cluster.CacheClusterId!,
        region,
        vpcId: cluster.CacheSubnetGroupName ? 'in-vpc' : undefined, // VPC ID not directly available
        securityGroupIds: cluster.SecurityGroups?.map(sg => sg.SecurityGroupId!),
        availabilityZones: cluster.CacheNodes?.map(node => node.CustomerAvailabilityZone!),
        publicAccess: false, // ElastiCache is always private
        encrypted: cluster.AtRestEncryptionEnabled || false,
        metadata: {
          engine: cluster.Engine,
          engineVersion: cluster.EngineVersion,
          cacheNodeType: cluster.CacheNodeType,
          numCacheNodes: cluster.NumCacheNodes,
          preferredMaintenanceWindow: cluster.PreferredMaintenanceWindow,
          cacheClusterStatus: cluster.CacheClusterStatus,
          cacheSubnetGroupName: cluster.CacheSubnetGroupName,
          transitEncryptionEnabled: cluster.TransitEncryptionEnabled,
          authTokenEnabled: cluster.AuthTokenEnabled,
          snapshotRetentionLimit: cluster.SnapshotRetentionLimit,
          endpoint: cluster.CacheNodes?.[0]?.Endpoint,
        },
        networkConfig: {
          port: cluster.CacheNodes?.[0]?.Endpoint?.Port,
          securityGroupIds: cluster.SecurityGroups?.map(sg => sg.SecurityGroupId!),
        },
        dataConfig: {
          encryptionConfig: {
            enabled: cluster.AtRestEncryptionEnabled || false,
          },
          backupConfig: {
            enabled: (cluster.SnapshotRetentionLimit || 0) > 0,
            retentionDays: cluster.SnapshotRetentionLimit,
          },
        },
      };

      resources.push(resource);

      // Create security group relationships
      for (const sg of cluster.SecurityGroups || []) {
        relationships.push({
          id: `rel-elasticache-sg-${cluster.CacheClusterId}-${sg.SecurityGroupId}`,
          sourceId: cluster.CacheClusterId!,
          sourceType: resource.type,
          sourceService: 'ElastiCache',
          targetId: sg.SecurityGroupId!,
          targetType: 'Security Group',
          targetService: 'EC2',
          relationshipType: 'uses',
        });
      }
    }

    // Scan replication groups (Redis with replicas)
    const replicationGroups = await elastiCacheClient.send(new DescribeReplicationGroupsCommand({}));

    for (const group of replicationGroups.ReplicationGroups || []) {
      const resource: UniversalResource = {
        id: group.ReplicationGroupId!,
        arn: group.ARN,
        type: 'ElastiCache Replication Group',
        service: 'ElastiCache',
        name: group.ReplicationGroupId!,
        region,
        publicAccess: false,
        encrypted: group.AtRestEncryptionEnabled || false,
        metadata: {
          description: group.Description,
          status: group.Status,
          multiAZ: group.MultiAZ === 'enabled',
          automaticFailover: group.AutomaticFailover === 'enabled',
          clusterEnabled: group.ClusterEnabled,
          cacheNodeType: group.CacheNodeType,
          snapshotRetentionLimit: group.SnapshotRetentionLimit,
          transitEncryptionEnabled: group.TransitEncryptionEnabled,
          authTokenEnabled: group.AuthTokenEnabled,
          primaryEndpoint: group.ConfigurationEndpoint || group.NodeGroups?.[0]?.PrimaryEndpoint,
          readerEndpoint: group.NodeGroups?.[0]?.ReaderEndpoint,
        },
        networkConfig: {
          port: group.ConfigurationEndpoint?.Port || group.NodeGroups?.[0]?.PrimaryEndpoint?.Port,
        },
      };

      resources.push(resource);

      // Create relationships for member clusters
      for (const member of group.MemberClusters || []) {
        relationships.push({
          id: `rel-replication-group-member-${group.ReplicationGroupId}-${member}`,
          sourceId: group.ReplicationGroupId!,
          sourceType: 'ElastiCache Replication Group',
          sourceService: 'ElastiCache',
          targetId: member,
          targetType: 'ElastiCache Redis',
          targetService: 'ElastiCache',
          relationshipType: 'contains',
        });
      }
    }

  } catch (err: any) {
    errors.push(`ElastiCache scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// EFS (Elastic File System) scanning
export async function scanEFS(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const efsClient = new EFSClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  try {
    const fileSystems = await efsClient.send(new DescribeFileSystemsCommand({}));

    for (const fs of fileSystems.FileSystems || []) {
      const resource: UniversalResource = {
        id: fs.FileSystemId!,
        arn: fs.FileSystemArn,
        type: 'EFS File System',
        service: 'EFS',
        name: fs.Name || fs.FileSystemId!,
        region,
        encrypted: fs.Encrypted || false,
        metadata: {
          creationTime: fs.CreationTime,
          lifecycleState: fs.LifeCycleState,
          numberOfMountTargets: fs.NumberOfMountTargets,
          sizeInBytes: fs.SizeInBytes?.Value,
          performanceMode: fs.PerformanceMode,
          throughputMode: fs.ThroughputMode,
          provisionedThroughputInMibps: fs.ProvisionedThroughputInMibps,
          availabilityZoneName: fs.AvailabilityZoneName,
        },
        dataConfig: {
          storageSize: fs.SizeInBytes?.Value,
          encryptionConfig: {
            enabled: fs.Encrypted || false,
            kmsKeyId: fs.KmsKeyId,
          },
        },
      };

      resources.push(resource);

      // Get mount targets
      try {
        const mountTargets = await efsClient.send(new DescribeMountTargetsCommand({
          FileSystemId: fs.FileSystemId!,
        }));

        const vpcIds = new Set<string>();
        const subnetIds = new Set<string>();
        const securityGroupIds = new Set<string>();
        const availabilityZones = new Set<string>();

        for (const mt of mountTargets.MountTargets || []) {
          if (mt.VpcId) vpcIds.add(mt.VpcId);
          if (mt.SubnetId) subnetIds.add(mt.SubnetId);
          if (mt.AvailabilityZoneName) availabilityZones.add(mt.AvailabilityZoneName);

          // Create mount target resource
          resources.push({
            id: mt.MountTargetId!,
            type: 'EFS Mount Target',
            service: 'EFS',
            name: `${fs.Name || fs.FileSystemId}-mount-${mt.AvailabilityZoneName}`,
            region,
            vpcId: mt.VpcId,
            subnetIds: mt.SubnetId ? [mt.SubnetId] : [],
            availabilityZones: mt.AvailabilityZoneName ? [mt.AvailabilityZoneName] : [],
            metadata: {
              mountTargetId: mt.MountTargetId,
              fileSystemId: mt.FileSystemId,
              ipAddress: mt.IpAddress,
              lifecycleState: mt.LifeCycleState,
              networkInterfaceId: mt.NetworkInterfaceId,
            },
            networkConfig: {
              vpcId: mt.VpcId,
              subnetIds: mt.SubnetId ? [mt.SubnetId] : [],
              privateIpAddresses: mt.IpAddress ? [mt.IpAddress] : [],
              networkInterfaceIds: mt.NetworkInterfaceId ? [mt.NetworkInterfaceId] : [],
            },
          });

          // Create relationships
          relationships.push({
            id: `rel-efs-mount-${fs.FileSystemId}-${mt.MountTargetId}`,
            sourceId: fs.FileSystemId!,
            sourceType: 'EFS File System',
            sourceService: 'EFS',
            targetId: mt.MountTargetId!,
            targetType: 'EFS Mount Target',
            targetService: 'EFS',
            relationshipType: 'contains',
          });

          if (mt.SubnetId) {
            relationships.push({
              id: `rel-mount-subnet-${mt.MountTargetId}-${mt.SubnetId}`,
              sourceId: mt.MountTargetId!,
              sourceType: 'EFS Mount Target',
              sourceService: 'EFS',
              targetId: mt.SubnetId,
              targetType: 'Subnet',
              targetService: 'EC2',
              relationshipType: 'uses',
            });
          }
        }

        // Update the main resource with aggregated network info
        resource.vpcId = Array.from(vpcIds)[0];
        resource.subnetIds = Array.from(subnetIds);
        resource.securityGroupIds = Array.from(securityGroupIds);
        resource.availabilityZones = Array.from(availabilityZones);

      } catch (err) {
        // Skip mount target errors
      }

      // Get access points
      try {
        const accessPoints = await efsClient.send(new DescribeAccessPointsCommand({
          FileSystemId: fs.FileSystemId!,
        }));

        for (const ap of accessPoints.AccessPoints || []) {
          resources.push({
            id: ap.AccessPointId!,
            arn: ap.AccessPointArn,
            type: 'EFS Access Point',
            service: 'EFS',
            name: ap.Name || ap.AccessPointId!,
            region,
            metadata: {
              fileSystemId: ap.FileSystemId,
              lifecycleState: ap.LifeCycleState,
              rootDirectory: ap.RootDirectory,
              posixUser: ap.PosixUser,
            },
          });

          relationships.push({
            id: `rel-efs-accesspoint-${fs.FileSystemId}-${ap.AccessPointId}`,
            sourceId: fs.FileSystemId!,
            sourceType: 'EFS File System',
            sourceService: 'EFS',
            targetId: ap.AccessPointId!,
            targetType: 'EFS Access Point',
            targetService: 'EFS',
            relationshipType: 'contains',
          });
        }
      } catch (err) {
        // Skip access point errors
      }
    }

  } catch (err: any) {
    errors.push(`EFS scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// SQS Queue scanning
export async function scanSQS(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const sqsClient = new SQSClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  try {
    const queues = await sqsClient.send(new ListQueuesCommand({}));

    for (const queueUrl of queues.QueueUrls || []) {
      try {
        const attributes = await sqsClient.send(new GetQueueAttributesCommand({
          QueueUrl: queueUrl,
          AttributeNames: ['All'],
        }));

        const attrs = attributes.Attributes || {};
        const queueArn = attrs.QueueArn || '';
        const queueName = queueUrl.split('/').pop() || queueUrl;

        const resource: UniversalResource = {
          id: queueArn,
          arn: queueArn,
          type: attrs.FifoQueue === 'true' ? 'SQS FIFO Queue' : 'SQS Queue',
          service: 'SQS',
          name: queueName,
          region,
          publicAccess: false, // SQS is always private
          encrypted: attrs.KmsMasterKeyId ? true : false,
          metadata: {
            queueUrl,
            visibilityTimeout: attrs.VisibilityTimeout,
            messageRetentionPeriod: attrs.MessageRetentionPeriod,
            approximateNumberOfMessages: attrs.ApproximateNumberOfMessages,
            approximateNumberOfMessagesNotVisible: attrs.ApproximateNumberOfMessagesNotVisible,
            approximateNumberOfMessagesDelayed: attrs.ApproximateNumberOfMessagesDelayed,
            delaySeconds: attrs.DelaySeconds,
            receiveMessageWaitTimeSeconds: attrs.ReceiveMessageWaitTimeSeconds,
            fifoQueue: attrs.FifoQueue === 'true',
            contentBasedDeduplication: attrs.ContentBasedDeduplication === 'true',
            deduplicationScope: attrs.DeduplicationScope,
            fifoThroughputLimit: attrs.FifoThroughputLimit,
            redrivePolicy: attrs.RedrivePolicy ? JSON.parse(attrs.RedrivePolicy) : undefined,
            redriveAllowPolicy: attrs.RedriveAllowPolicy ? JSON.parse(attrs.RedriveAllowPolicy) : undefined,
          },
          dataConfig: {
            encryptionConfig: {
              enabled: !!attrs.KmsMasterKeyId,
              kmsKeyId: attrs.KmsMasterKeyId,
            },
          },
        };

        resources.push(resource);

        // Dead letter queue relationship
        if (attrs.RedrivePolicy) {
          try {
            const policy = JSON.parse(attrs.RedrivePolicy);
            if (policy.deadLetterTargetArn) {
              relationships.push({
                id: `rel-sqs-dlq-${queueArn}-${policy.deadLetterTargetArn}`,
                sourceId: queueArn,
                sourceType: resource.type,
                sourceService: 'SQS',
                targetId: policy.deadLetterTargetArn,
                targetType: 'SQS Queue',
                targetService: 'SQS',
                relationshipType: 'publishes-to',
                metadata: {
                  purpose: 'dead-letter-queue',
                  maxReceiveCount: policy.maxReceiveCount,
                },
              });
            }
          } catch (err) {
            // Skip JSON parse errors
          }
        }

      } catch (err) {
        // Skip queue attribute errors
      }
    }

  } catch (err: any) {
    errors.push(`SQS scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// SNS Topic scanning
export async function scanSNS(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const snsClient = new SNSClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  try {
    const topics = await snsClient.send(new ListTopicsCommand({}));

    for (const topic of topics.Topics || []) {
      try {
        const attributes = await snsClient.send(new GetTopicAttributesCommand({
          TopicArn: topic.TopicArn!,
        }));

        const attrs = attributes.Attributes || {};
        const topicName = topic.TopicArn!.split(':').pop() || topic.TopicArn!;

        const resource: UniversalResource = {
          id: topic.TopicArn!,
          arn: topic.TopicArn,
          type: attrs.FifoTopic === 'true' ? 'SNS FIFO Topic' : 'SNS Topic',
          service: 'SNS',
          name: topicName,
          region,
          publicAccess: false, // SNS is always private
          encrypted: attrs.KmsMasterKeyId ? true : false,
          metadata: {
            displayName: attrs.DisplayName,
            subscriptionsConfirmed: attrs.SubscriptionsConfirmed,
            subscriptionsPending: attrs.SubscriptionsPending,
            subscriptionsDeleted: attrs.SubscriptionsDeleted,
            fifoTopic: attrs.FifoTopic === 'true',
            contentBasedDeduplication: attrs.ContentBasedDeduplication === 'true',
            policy: attrs.Policy ? JSON.parse(attrs.Policy) : undefined,
          },
          dataConfig: {
            encryptionConfig: {
              enabled: !!attrs.KmsMasterKeyId,
              kmsKeyId: attrs.KmsMasterKeyId,
            },
          },
        };

        resources.push(resource);

        // Get subscriptions
        const subscriptions = await snsClient.send(new ListSubscriptionsCommand({}));
        const topicSubscriptions = subscriptions.Subscriptions?.filter(s =>
          s.TopicArn === topic.TopicArn
        ) || [];

        for (const subscription of topicSubscriptions) {
          if (subscription.Endpoint && subscription.Protocol) {
            let targetType = 'Endpoint';
            let targetService = 'Unknown';

            if (subscription.Protocol === 'lambda') {
              targetType = 'Lambda Function';
              targetService = 'Lambda';
            } else if (subscription.Protocol === 'sqs') {
              targetType = 'SQS Queue';
              targetService = 'SQS';
            } else if (subscription.Protocol === 'email' || subscription.Protocol === 'email-json') {
              targetType = 'Email';
              targetService = 'Email';
            } else if (subscription.Protocol === 'sms') {
              targetType = 'SMS';
              targetService = 'SMS';
            } else if (subscription.Protocol === 'http' || subscription.Protocol === 'https') {
              targetType = 'HTTP Endpoint';
              targetService = 'HTTP';
            }

            relationships.push({
              id: `rel-sns-subscription-${topic.TopicArn}-${subscription.SubscriptionArn}`,
              sourceId: topic.TopicArn!,
              sourceType: resource.type,
              sourceService: 'SNS',
              targetId: subscription.Endpoint,
              targetType,
              targetService,
              relationshipType: 'publishes-to',
              metadata: {
                subscriptionArn: subscription.SubscriptionArn,
                protocol: subscription.Protocol,
                owner: subscription.Owner,
              },
            });
          }
        }

      } catch (err) {
        // Skip topic attribute errors
      }
    }

  } catch (err: any) {
    errors.push(`SNS scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// EventBridge scanning
export async function scanEventBridge(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const eventBridgeClient = new EventBridgeClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  try {
    // Get event buses
    const eventBuses = await eventBridgeClient.send(new ListEventBusesCommand({}));

    for (const bus of eventBuses.EventBuses || []) {
      const resource: UniversalResource = {
        id: bus.Arn!,
        arn: bus.Arn,
        type: 'EventBridge Bus',
        service: 'EventBridge',
        name: bus.Name!,
        region,
        publicAccess: false,
        metadata: {
          state: bus.State,
        },
      };

      resources.push(resource);
    }

    // Get rules
    const rules = await eventBridgeClient.send(new ListRulesCommand({ Limit: 100 }));

    for (const rule of rules.Rules || []) {
      const resource: UniversalResource = {
        id: rule.Arn!,
        arn: rule.Arn,
        type: 'EventBridge Rule',
        service: 'EventBridge',
        name: rule.Name!,
        region,
        publicAccess: false,
        metadata: {
          state: rule.State,
          description: rule.Description,
          scheduleExpression: rule.ScheduleExpression,
          eventPattern: rule.EventPattern,
          eventBusName: rule.EventBusName,
        },
      };

      resources.push(resource);

      // Get targets for the rule
      try {
        const targets = await eventBridgeClient.send(new ListTargetsByRuleCommand({
          Rule: rule.Name!,
        }));

        for (const target of targets.Targets || []) {
          let targetType = 'Target';
          let targetService = 'Unknown';

          if (target.Arn?.includes(':lambda:')) {
            targetType = 'Lambda Function';
            targetService = 'Lambda';
          } else if (target.Arn?.includes(':sqs:')) {
            targetType = 'SQS Queue';
            targetService = 'SQS';
          } else if (target.Arn?.includes(':sns:')) {
            targetType = 'SNS Topic';
            targetService = 'SNS';
          } else if (target.Arn?.includes(':states:')) {
            targetType = 'Step Functions';
            targetService = 'StepFunctions';
          } else if (target.Arn?.includes(':ecs:')) {
            targetType = 'ECS Task';
            targetService = 'ECS';
          } else if (target.Arn?.includes(':kinesis:')) {
            targetType = 'Kinesis Stream';
            targetService = 'Kinesis';
          }

          relationships.push({
            id: `rel-eventbridge-target-${rule.Arn}-${target.Id}`,
            sourceId: rule.Arn!,
            sourceType: 'EventBridge Rule',
            sourceService: 'EventBridge',
            targetId: target.Arn!,
            targetType,
            targetService,
            relationshipType: 'triggers',
            metadata: {
              targetId: target.Id,
              roleArn: target.RoleArn,
              retryPolicy: target.RetryPolicy,
              deadLetterConfig: target.DeadLetterConfig,
            },
          });
        }
      } catch (err) {
        // Skip target errors
      }
    }

  } catch (err: any) {
    errors.push(`EventBridge scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// Kinesis Stream scanning
export async function scanKinesis(creds: any, region: string): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const kinesisClient = new KinesisClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  try {
    const streams = await kinesisClient.send(new ListStreamsCommand({}));

    for (const streamName of streams.StreamNames || []) {
      try {
        const streamDetails = await kinesisClient.send(new DescribeStreamCommand({
          StreamName: streamName,
        }));

        const stream = streamDetails.StreamDescription!;

        const resource: UniversalResource = {
          id: stream.StreamARN!,
          arn: stream.StreamARN,
          type: 'Kinesis Stream',
          service: 'Kinesis',
          name: streamName,
          region,
          publicAccess: false,
          encrypted: stream.EncryptionType !== 'NONE',
          metadata: {
            streamStatus: stream.StreamStatus,
            streamModeDetails: stream.StreamModeDetails,
            retentionPeriodHours: stream.RetentionPeriodHours,
            shardCount: stream.Shards?.length,
            encryptionType: stream.EncryptionType,
            keyId: stream.KeyId,
            streamCreationTimestamp: stream.StreamCreationTimestamp,
          },
          dataConfig: {
            encryptionConfig: {
              enabled: stream.EncryptionType !== 'NONE',
              kmsKeyId: stream.KeyId,
              encryptionType: stream.EncryptionType,
            },
          },
        };

        resources.push(resource);

        // Get stream consumers
        try {
          const consumers = await kinesisClient.send(new ListStreamConsumersCommand({
            StreamARN: stream.StreamARN!,
          }));

          for (const consumer of consumers.Consumers || []) {
            relationships.push({
              id: `rel-kinesis-consumer-${stream.StreamARN}-${consumer.ConsumerARN}`,
              sourceId: stream.StreamARN!,
              sourceType: 'Kinesis Stream',
              sourceService: 'Kinesis',
              targetId: consumer.ConsumerARN!,
              targetType: 'Kinesis Consumer',
              targetService: 'Kinesis',
              relationshipType: 'publishes-to',
              metadata: {
                consumerName: consumer.ConsumerName,
                consumerStatus: consumer.ConsumerStatus,
              },
            });
          }
        } catch (err) {
          // Skip consumer errors
        }

      } catch (err) {
        // Skip stream detail errors
      }
    }

  } catch (err: any) {
    errors.push(`Kinesis scan error in ${region}: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// Route53 DNS scanning
export async function scanRoute53(creds: any): Promise<{
  resources: UniversalResource[];
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const resources: UniversalResource[] = [];
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const route53Client = new Route53Client({
    region: 'us-east-1', // Route53 is global
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  try {
    const hostedZones = await route53Client.send(new ListHostedZonesCommand({}));

    for (const zone of hostedZones.HostedZones || []) {
      const resource: UniversalResource = {
        id: zone.Id!,
        type: zone.Config?.PrivateZone ? 'Route53 Private Zone' : 'Route53 Public Zone',
        service: 'Route53',
        name: zone.Name!,
        region: 'global',
        publicAccess: !zone.Config?.PrivateZone,
        metadata: {
          hostedZoneId: zone.Id,
          resourceRecordSetCount: zone.ResourceRecordSetCount,
          callerReference: zone.CallerReference,
          comment: zone.Config?.Comment,
          privateZone: zone.Config?.PrivateZone,
        },
      };

      resources.push(resource);

      // Get record sets
      try {
        const recordSets = await route53Client.send(new ListResourceRecordSetsCommand({
          HostedZoneId: zone.Id!,
        }));

        for (const recordSet of recordSets.ResourceRecordSets || []) {
          // Look for aliases to AWS resources
          if (recordSet.AliasTarget) {
            let targetType = 'DNS Target';
            let targetService = 'Unknown';

            if (recordSet.AliasTarget.DNSName?.includes('.elb.amazonaws.com')) {
              targetType = 'Load Balancer';
              targetService = 'ELB';
            } else if (recordSet.AliasTarget.DNSName?.includes('.cloudfront.net')) {
              targetType = 'CloudFront Distribution';
              targetService = 'CloudFront';
            } else if (recordSet.AliasTarget.DNSName?.includes('.s3-website')) {
              targetType = 'S3 Static Website';
              targetService = 'S3';
            } else if (recordSet.AliasTarget.DNSName?.includes('.execute-api.')) {
              targetType = 'API Gateway';
              targetService = 'API Gateway';
            }

            relationships.push({
              id: `rel-route53-alias-${zone.Id}-${recordSet.Name}`,
              sourceId: zone.Id!,
              sourceType: resource.type,
              sourceService: 'Route53',
              targetId: recordSet.AliasTarget.DNSName!,
              targetType,
              targetService,
              relationshipType: 'resolves-to',
              metadata: {
                recordName: recordSet.Name,
                recordType: recordSet.Type,
                hostedZoneId: recordSet.AliasTarget.HostedZoneId,
                evaluateTargetHealth: recordSet.AliasTarget.EvaluateTargetHealth,
              },
            });
          }
        }
      } catch (err) {
        // Skip record set errors
      }
    }

  } catch (err: any) {
    errors.push(`Route53 scan error: ${err.message}`);
  }

  return { resources, relationships, errors };
}

// CloudWatch monitoring relationships
export async function scanCloudWatchRelationships(creds: any, region: string): Promise<{
  relationships: ResourceRelationship[];
  errors: string[];
}> {
  const relationships: ResourceRelationship[] = [];
  const errors: string[] = [];
  const cloudWatchClient = new CloudWatchClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });

  try {
    const alarms = await cloudWatchClient.send(new DescribeAlarmsCommand({ MaxRecords: 100 }));

    for (const alarm of alarms.MetricAlarms || []) {
      // Parse the monitored resource from the dimensions
      for (const dimension of alarm.Dimensions || []) {
        if (dimension.Name === 'FunctionName' && dimension.Value) {
          // Lambda function monitoring
          relationships.push({
            id: `rel-cloudwatch-monitors-lambda-${alarm.AlarmArn}-${dimension.Value}`,
            sourceId: alarm.AlarmArn!,
            sourceType: 'CloudWatch Alarm',
            sourceService: 'CloudWatch',
            targetId: dimension.Value,
            targetType: 'Lambda Function',
            targetService: 'Lambda',
            relationshipType: 'monitors',
            metadata: {
              alarmName: alarm.AlarmName,
              metricName: alarm.MetricName,
              threshold: alarm.Threshold,
            },
          });
        } else if (dimension.Name === 'DBInstanceIdentifier' && dimension.Value) {
          // RDS monitoring
          relationships.push({
            id: `rel-cloudwatch-monitors-rds-${alarm.AlarmArn}-${dimension.Value}`,
            sourceId: alarm.AlarmArn!,
            sourceType: 'CloudWatch Alarm',
            sourceService: 'CloudWatch',
            targetId: dimension.Value,
            targetType: 'RDS Instance',
            targetService: 'RDS',
            relationshipType: 'monitors',
            metadata: {
              alarmName: alarm.AlarmName,
              metricName: alarm.MetricName,
              threshold: alarm.Threshold,
            },
          });
        } else if (dimension.Name === 'InstanceId' && dimension.Value) {
          // EC2 monitoring
          relationships.push({
            id: `rel-cloudwatch-monitors-ec2-${alarm.AlarmArn}-${dimension.Value}`,
            sourceId: alarm.AlarmArn!,
            sourceType: 'CloudWatch Alarm',
            sourceService: 'CloudWatch',
            targetId: dimension.Value,
            targetType: 'EC2 Instance',
            targetService: 'EC2',
            relationshipType: 'monitors',
            metadata: {
              alarmName: alarm.AlarmName,
              metricName: alarm.MetricName,
              threshold: alarm.Threshold,
            },
          });
        }
      }

      // Check alarm actions (SNS topics)
      for (const action of alarm.AlarmActions || []) {
        if (action.includes(':sns:')) {
          relationships.push({
            id: `rel-cloudwatch-notifies-${alarm.AlarmArn}-${action}`,
            sourceId: alarm.AlarmArn!,
            sourceType: 'CloudWatch Alarm',
            sourceService: 'CloudWatch',
            targetId: action,
            targetType: 'SNS Topic',
            targetService: 'SNS',
            relationshipType: 'publishes-to',
            metadata: {
              alarmName: alarm.AlarmName,
              actionType: 'alarm',
            },
          });
        }
      }
    }

  } catch (err: any) {
    errors.push(`CloudWatch relationship scan error in ${region}: ${err.message}`);
  }

  return { relationships, errors };
}

// Export all additional scanners
export const additionalScanners = {
  scanElastiCache,
  scanEFS,
  scanSQS,
  scanSNS,
  scanEventBridge,
  scanKinesis,
  scanRoute53,
  scanCloudWatchRelationships,
};