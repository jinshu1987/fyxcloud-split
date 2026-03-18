import { performEnhancedAwsScan, enhancedScanners } from './aws-scanner-enhanced';
import type { AwsCredentials, EnhancedScanResult } from './aws-scanner-enhanced';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Test credentials (these should be replaced with real credentials for actual testing)
const testCredentials: AwsCredentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
};

console.log('DEBUG: AWS_ACCESS_KEY_ID from env:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set');
console.log('DEBUG: testCredentials.accessKeyId:', testCredentials.accessKeyId ? 'Set' : 'Not set');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(80));
}

function logSubSection(title: string) {
  console.log('\n' + '-'.repeat(60));
  log(title, colors.bright + colors.blue);
  console.log('-'.repeat(60));
}

function logSuccess(message: string) {
  log('✓ ' + message, colors.green);
}

function logWarning(message: string) {
  log('⚠ ' + message, colors.yellow);
}

function logError(message: string) {
  log('✗ ' + message, colors.red);
}

function logInfo(message: string) {
  log('ℹ ' + message, colors.cyan);
}

// Test individual components
async function testNetworkInfrastructure(creds: AwsCredentials) {
  logSubSection('Testing Network Infrastructure Discovery (Phase 1)');

  try {
    const result = await enhancedScanners.scanNetworkInfrastructure(creds, 'us-east-1');

    logSuccess(`Found ${result.networkResources.length} network resources`);
    logSuccess(`Found ${result.relationships.length} network relationships`);

    // Group by type
    const resourcesByType = new Map<string, number>();
    result.networkResources.forEach(r => {
      resourcesByType.set(r.type, (resourcesByType.get(r.type) || 0) + 1);
    });

    log('\nNetwork Resources by Type:', colors.bright);
    for (const [type, count] of resourcesByType) {
      console.log(`  - ${type}: ${count}`);
    }

    // Find VPC Endpoints for AI services
    const aiEndpoints = result.networkResources.filter(r =>
      r.type === 'vpc-endpoint' &&
      (r.metadata.serviceName?.includes('bedrock') || r.metadata.serviceName?.includes('sagemaker'))
    );

    if (aiEndpoints.length > 0) {
      logSuccess(`Found ${aiEndpoints.length} AI service VPC endpoints:`);
      aiEndpoints.forEach(ep => {
        console.log(`  - ${ep.name}: ${ep.metadata.serviceName}`);
      });
    } else {
      logWarning('No VPC endpoints found for AI services (Bedrock/SageMaker)');
    }

    // Analyze security groups
    const securityGroups = result.networkResources.filter(r => r.type === 'security-group');
    const openSGs = securityGroups.filter(sg =>
      sg.metadata.inboundRules?.some(r => r.source === '0.0.0.0/0')
    );

    if (openSGs.length > 0) {
      logWarning(`Found ${openSGs.length} security groups with open ingress (0.0.0.0/0)`);
    } else {
      logSuccess('No overly permissive security groups found');
    }

    if (result.errors.length > 0) {
      logWarning(`Encountered ${result.errors.length} errors during scan`);
    }

    return { success: true, data: result };
  } catch (err: any) {
    logError(`Network infrastructure scan failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function testEnhancedLambda(creds: AwsCredentials) {
  logSubSection('Testing Enhanced Lambda Scanning (Phase 2)');

  try {
    const result = await enhancedScanners.scanEnhancedLambdaFunctions(creds, 'us-east-1');

    logSuccess(`Found ${result.assets.length} Lambda functions`);
    logSuccess(`Created ${result.relationships.length} Lambda relationships`);

    // Check for AI-related Lambda functions
    const aiLambdas = result.assets.filter(a =>
      a.metadata.hasBedrockConfig || a.metadata.hasSageMakerConfig
    );

    if (aiLambdas.length > 0) {
      logSuccess(`Found ${aiLambdas.length} AI-related Lambda functions:`);
      aiLambdas.forEach(lambda => {
        console.log(`  - ${lambda.name}:`);
        if (lambda.metadata.hasBedrockConfig) console.log('    • Bedrock configuration detected');
        if (lambda.metadata.hasSageMakerConfig) console.log('    • SageMaker configuration detected');
        if (lambda.metadata.vpcId) console.log(`    • VPC: ${lambda.metadata.vpcId}`);
        if (lambda.metadata.connectedServices?.length) {
          console.log(`    • Connected services: ${lambda.metadata.connectedServices.map(s => s.serviceType).join(', ')}`);
        }
      });
    } else {
      logInfo('No AI-related Lambda functions detected');
    }

    // Check VPC configurations
    const vpcLambdas = result.assets.filter(a => a.metadata.vpcId);
    logInfo(`${vpcLambdas.length}/${result.assets.length} Lambda functions are VPC-attached`);

    return { success: true, data: result };
  } catch (err: any) {
    logError(`Lambda scan failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function testEnhancedBedrock(creds: AwsCredentials) {
  logSubSection('Testing Enhanced Bedrock Scanning (Phase 3-4)');

  try {
    const result = await enhancedScanners.scanEnhancedBedrockResources(creds, 'us-east-1');

    logSuccess(`Found ${result.assets.length} Bedrock resources`);
    logSuccess(`Created ${result.relationships.length} Bedrock relationships`);

    // Group by type
    const bedrockByType = new Map<string, number>();
    result.assets.forEach(a => {
      bedrockByType.set(a.type, (bedrockByType.get(a.type) || 0) + 1);
    });

    if (bedrockByType.size > 0) {
      log('\nBedrock Resources by Type:', colors.bright);
      for (const [type, count] of bedrockByType) {
        console.log(`  - ${type}: ${count}`);
      }

      // Show agent details
      const agents = result.assets.filter(a => a.type === 'Bedrock Agent');
      agents.forEach(agent => {
        console.log(`\n  Agent: ${agent.name}`);
        console.log(`    - Model: ${agent.metadata.foundationModel || 'Not specified'}`);
        console.log(`    - Status: ${agent.metadata.status}`);
        if (agent.metadata.connectedServices?.length) {
          console.log(`    - Connected KBs: ${agent.metadata.connectedServices.length}`);
        }
      });
    } else {
      logInfo('No Bedrock resources found (this is normal if Bedrock is not in use)');
    }

    return { success: true, data: result };
  } catch (err: any) {
    if (err.message?.includes('not available')) {
      logInfo('Bedrock not available in this region');
      return { success: true, data: { assets: [], relationships: [], errors: [] } };
    }
    logError(`Bedrock scan failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function testAPIGateway(creds: AwsCredentials) {
  logSubSection('Testing API Gateway Scanning');

  try {
    const result = await enhancedScanners.scanEnhancedAPIGateways(creds, 'us-east-1');

    logSuccess(`Found ${result.assets.length} API Gateways`);
    logSuccess(`Created ${result.relationships.length} API Gateway relationships`);

    // Check for AI service integrations
    result.assets.forEach(api => {
      const aiConnections = api.metadata.connectedServices?.filter(s =>
        s.serviceType === 'bedrock' || s.serviceType === 'sagemaker'
      );

      if (aiConnections?.length) {
        logSuccess(`API Gateway "${api.name}" connects to AI services:`);
        aiConnections.forEach(conn => {
          console.log(`  - ${conn.serviceType}: ${conn.resourceId}`);
        });
      }

      // Check exposure
      if (api.exposure === 'Public') {
        logWarning(`API Gateway "${api.name}" is publicly exposed`);
      } else if (api.metadata.vpcEndpointIds?.length) {
        logSuccess(`API Gateway "${api.name}" uses VPC endpoints for private access`);
      }
    });

    return { success: true, data: result };
  } catch (err: any) {
    logError(`API Gateway scan failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function testDataFlowPaths(scanResult: EnhancedScanResult) {
  logSubSection('Testing Data Flow Path Generation (Phase 5)');

  try {
    const paths = enhancedScanners.buildDataFlowPaths(
      scanResult.assets,
      scanResult.relationships,
      scanResult.networkResources
    );

    logSuccess(`Generated ${paths.length} data flow paths`);

    paths.forEach((path, index) => {
      console.log(`\nPath ${index + 1}: ${path.name}`);
      console.log('  Steps:');
      path.steps.forEach((step, i) => {
        console.log(`    ${i + 1}. ${step.resourceName} (${step.resourceType}) - ${step.action}`);
      });

      console.log('  Security Posture:');
      console.log(`    - Encrypted: ${path.securityPosture.encrypted ? '✓' : '✗'}`);
      console.log(`    - Public Access: ${path.securityPosture.publiclyAccessible ? '⚠' : '✓'}`);
      console.log(`    - Authentication: ${path.securityPosture.authentication.join(', ')}`);

      if (path.securityPosture.complianceFlags?.length) {
        console.log('  Compliance Flags:');
        path.securityPosture.complianceFlags.forEach(flag => {
          console.log(`    ⚠ ${flag}`);
        });
      }
    });

    // Analyze security issues
    const publicPaths = paths.filter(p => p.securityPosture.publiclyAccessible);
    const unencryptedPaths = paths.filter(p => !p.securityPosture.encrypted);
    const unauthenticatedPaths = paths.filter(p =>
      p.securityPosture.authentication.includes('none')
    );

    if (publicPaths.length > 0) {
      logWarning(`${publicPaths.length} data flow paths are publicly accessible`);
    }
    if (unencryptedPaths.length > 0) {
      logWarning(`${unencryptedPaths.length} data flow paths use unencrypted communication`);
    }
    if (unauthenticatedPaths.length > 0) {
      logWarning(`${unauthenticatedPaths.length} data flow paths lack authentication`);
    }

    return { success: true, data: paths };
  } catch (err: any) {
    logError(`Data flow path generation failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Main test function
async function runEnhancedScannerTests() {
  logSection('AWS Enhanced Scanner Test Suite');

  // Check for credentials
  if (!testCredentials.accessKeyId || !testCredentials.secretAccessKey) {
    logError('AWS credentials not found in environment variables');
    logInfo('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  logSuccess('AWS credentials found');

  const testResults: any = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  try {
    // Test individual components
    logSection('Component Tests');

    // Test Phase 1: Network Infrastructure
    const networkTest = await testNetworkInfrastructure(testCredentials);
    testResults.tests.networkInfrastructure = networkTest;

    // Test Phase 2: Enhanced Lambda
    const lambdaTest = await testEnhancedLambda(testCredentials);
    testResults.tests.enhancedLambda = lambdaTest;

    // Test Phase 3-4: Enhanced Bedrock
    const bedrockTest = await testEnhancedBedrock(testCredentials);
    testResults.tests.enhancedBedrock = bedrockTest;

    // Test API Gateway
    const apiGatewayTest = await testAPIGateway(testCredentials);
    testResults.tests.apiGateway = apiGatewayTest;

    // Test Full Integration
    logSection('Full Integration Test');
    logInfo('Running complete enhanced scan...');

    const startTime = Date.now();
    const fullScanResult = await performEnhancedAwsScan(testCredentials);
    const scanTime = (Date.now() - startTime) / 1000;

    logSuccess(`Full scan completed in ${scanTime.toFixed(2)} seconds`);
    logSuccess(`Scanned ${fullScanResult.regionsScanned.length} regions`);
    logSuccess(`Found ${fullScanResult.assets.length} assets`);
    logSuccess(`Found ${fullScanResult.networkResources.length} network resources`);
    logSuccess(`Created ${fullScanResult.relationships.length} relationships`);
    logSuccess(`Generated ${fullScanResult.dataFlowPaths.length} data flow paths`);

    if (fullScanResult.errors.length > 0) {
      logWarning(`Encountered ${fullScanResult.errors.length} errors during scan`);
      console.log('\nErrors:');
      fullScanResult.errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err}`);
      });
      if (fullScanResult.errors.length > 5) {
        console.log(`  ... and ${fullScanResult.errors.length - 5} more`);
      }
    }

    // Test Phase 5: Data Flow Paths
    if (fullScanResult.assets.length > 0) {
      await testDataFlowPaths(fullScanResult);
    }

    // Save results to file
    const outputPath = join(process.cwd(), 'enhanced-scan-results.json');
    writeFileSync(outputPath, JSON.stringify(fullScanResult, null, 2));
    logSuccess(`Results saved to ${outputPath}`);

    // Summary
    logSection('Test Summary');

    const totalTests = Object.keys(testResults.tests).length;
    const successfulTests = Object.values(testResults.tests).filter((t: any) => t.success).length;

    if (successfulTests === totalTests) {
      logSuccess(`All ${totalTests} component tests passed!`);
    } else {
      logWarning(`${successfulTests}/${totalTests} component tests passed`);
    }

    // Recommendations
    logSection('Security Recommendations');

    // Check for VPC endpoints
    const vpcEndpoints = fullScanResult.networkResources.filter(r =>
      r.type === 'vpc-endpoint' &&
      (r.metadata.serviceName?.includes('bedrock') || r.metadata.serviceName?.includes('sagemaker'))
    );

    if (vpcEndpoints.length === 0) {
      logWarning('Consider creating VPC endpoints for Bedrock/SageMaker to enable private access');
    }

    // Check for public resources
    const publicAssets = fullScanResult.assets.filter(a => a.exposure === 'Public');
    if (publicAssets.length > 0) {
      logWarning(`${publicAssets.length} resources are publicly exposed. Review if this is intentional.`);
    }

    // Check for Lambda functions without VPC
    const lambdasWithoutVPC = fullScanResult.assets.filter(a =>
      a.type === 'Lambda Function' && !a.metadata.vpcId
    );
    if (lambdasWithoutVPC.length > 0) {
      logWarning(`${lambdasWithoutVPC.length} Lambda functions are not VPC-attached. Consider VPC attachment for better network isolation.`);
    }

    logSection('Test Complete');
    logSuccess('Enhanced AWS scanner testing completed successfully!');

  } catch (err: any) {
    logError(`Test suite failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run tests if executed directly
runEnhancedScannerTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export { runEnhancedScannerTests };