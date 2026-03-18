import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { IStorage } from "./storage";
import type { InsertPolicyFinding } from "@shared/schema";

const execFileAsync = promisify(execFile);

export interface HexResult {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  file_path: string;
  line_number?: number;
  confidence: number;
  cvss?: {
    version: string;
    vector_string: string;
    base_score: number;
    base_severity: string;
  };
  cwe?: string[];
  remediation: string;
  references?: string[];
}

export interface HexScanOutput {
  summary: {
    total_issues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    security_score: number;
    security_grade: string;
    verdict: string;
  };
  results: HexResult[];
}

export interface HexScanRequest {
  bucketName: string;
  modelFiles: { key: string; size: number; extension: string; framework: string }[];
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

const HEX_SEVERITY_MAP: Record<string, string> = {
  "CRITICAL": "Critical",
  "HIGH": "High",
  "MEDIUM": "Medium",
  "LOW": "Low",
  "INFO": "Low",
};

const HEX_TYPE_TO_RULE: Record<string, string> = {
  "vulnerability": "HEX-101",
  "backdoor": "HEX-102",
  "supply_chain": "HEX-103",
  "pickle_exploit": "HEX-104",
  "adversarial": "HEX-105",
  "privacy": "HEX-106",
  "license": "HEX-107",
  "compliance": "HEX-108",
  "malware": "HEX-109",
  "entropy": "HEX-110",
};

function mapHexTypeToRuleId(type: string): string {
  const lower = type.toLowerCase().replace(/[^a-z_]/g, "");
  return HEX_TYPE_TO_RULE[lower] || "HEX-101";
}

function mapHexSeverity(severity: string): string {
  return HEX_SEVERITY_MAP[severity?.toUpperCase()] || "Medium";
}

async function downloadModelFiles(
  s3Client: S3Client,
  bucketName: string,
  modelFiles: { key: string; size: number }[],
  targetDir: string,
  maxTotalBytes: number = 500 * 1024 * 1024
): Promise<string[]> {
  const downloaded: string[] = [];
  let totalBytes = 0;

  const sortedFiles = [...modelFiles].sort((a, b) => a.size - b.size);

  for (const file of sortedFiles) {
    if (totalBytes + file.size > maxTotalBytes) {
      console.log(`[hex-scanner] Skipping ${file.key} (would exceed ${maxTotalBytes / (1024 * 1024)}MB limit)`);
      continue;
    }

    try {
      const resp = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: file.key,
      }));

      const filePath = path.join(targetDir, path.basename(file.key));
      const body = resp.Body;
      if (body) {
        const chunks: Buffer[] = [];
        for await (const chunk of body as AsyncIterable<Buffer>) {
          chunks.push(chunk);
        }
        fs.writeFileSync(filePath, Buffer.concat(chunks));
        downloaded.push(filePath);
        totalBytes += file.size;
      }
    } catch (err: any) {
      console.error(`[hex-scanner] Failed to download ${file.key}: ${err.message}`);
    }
  }

  return downloaded;
}

async function runHexContainer(scanDir: string, timeoutSeconds: number = 600): Promise<HexScanOutput> {
  const args = [
    "run", "--rm",
    "--security-opt=no-new-privileges:true",
    "--cap-drop=ALL",
    "--read-only",
    "-v", `${scanDir}:/scan:ro`,
    "-e", `HEX_TIMEOUT=${timeoutSeconds}`,
    "layerd/hex:latest",
    "/scan",
    "--json",
  ];

  try {
    const { stdout, stderr } = await execFileAsync("docker", args, {
      timeout: (timeoutSeconds + 30) * 1000,
      maxBuffer: 50 * 1024 * 1024,
    });

    if (stderr) {
      console.log(`[hex-scanner] stderr: ${stderr.substring(0, 500)}`);
    }

    const output = JSON.parse(stdout) as HexScanOutput;
    return output;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new Error("Docker is not available on this system. Install Docker to use Hex scanner.");
    }
    if (err.killed) {
      throw new Error(`Hex scan timed out after ${timeoutSeconds} seconds`);
    }
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout) as HexScanOutput;
      } catch {}
    }
    throw new Error(`Hex scan failed: ${err.message}`);
  }
}

function convertHexResultToFinding(
  result: HexResult,
  bucketName: string,
  assetId: string,
  policyId: string | undefined,
  orgId: string
): InsertPolicyFinding {
  const ruleId = mapHexTypeToRuleId(result.type);
  const severity = mapHexSeverity(result.severity);

  const cvssInfo = result.cvss
    ? `CVSS ${result.cvss.version}: ${result.cvss.base_score} (${result.cvss.base_severity})\nVector: ${result.cvss.vector_string}`
    : "";

  const cweInfo = result.cwe?.length ? `CWE: ${result.cwe.join(", ")}` : "";

  const evidenceParts = [
    `File: ${result.file_path}`,
    result.line_number ? `Line: ${result.line_number}` : "",
    `Confidence: ${Math.round(result.confidence * 100)}%`,
    cvssInfo,
    cweInfo,
    result.id ? `ID: ${result.id}` : "",
  ].filter(Boolean);

  const impactParts = [
    `Hex Scanner detected: ${result.title}`,
    result.description,
    result.cvss ? `CVSS Base Score: ${result.cvss.base_score}/10 (${result.cvss.base_severity})` : "",
  ].filter(Boolean);

  return {
    policyId: policyId || null,
    ruleId,
    assetId,
    assetName: `${bucketName} — ${path.basename(result.file_path)}`,
    assetType: "Model Artifact (S3)",
    finding: result.title,
    severity,
    status: "open",
    impact: impactParts.join("\n"),
    remediation: result.remediation + (result.references?.length ? `\n\nReferences:\n${result.references.map(r => `• ${r}`).join("\n")}` : ""),
    evidence: evidenceParts.join("\n"),
    detectedAt: new Date().toISOString(),
    orgId,
  };
}

export async function scanBucketWithHex(
  request: HexScanRequest,
  orgId: string,
  assetId: string,
  storage: IStorage
): Promise<{ findings: InsertPolicyFinding[]; summary: HexScanOutput["summary"] | null; error?: string }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hex-scan-"));

  try {
    const s3Client = new S3Client({
      region: request.region || "us-east-1",
      credentials: {
        accessKeyId: request.accessKeyId,
        secretAccessKey: request.secretAccessKey,
      },
    });

    console.log(`[hex-scanner] Downloading ${request.modelFiles.length} model files from s3://${request.bucketName}...`);
    const downloadedFiles = await downloadModelFiles(
      s3Client,
      request.bucketName,
      request.modelFiles,
      tmpDir
    );

    if (downloadedFiles.length === 0) {
      return { findings: [], summary: null, error: "No model files could be downloaded" };
    }

    console.log(`[hex-scanner] Downloaded ${downloadedFiles.length} files. Running Hex scanner...`);
    const hexOutput = await runHexContainer(tmpDir);

    console.log(`[hex-scanner] Hex scan complete: ${hexOutput.summary.total_issues} issues found (Score: ${hexOutput.summary.security_score}, Grade: ${hexOutput.summary.security_grade})`);

    const policies = await storage.getPolicies(orgId);
    const hexPolicyMap: Record<string, string> = {};
    for (const p of policies) {
      if (p.ruleId.startsWith("HEX-")) {
        hexPolicyMap[p.ruleId] = p.id;
      }
    }

    const findings: InsertPolicyFinding[] = [];
    for (const result of hexOutput.results) {
      const ruleId = mapHexTypeToRuleId(result.type);
      const policyId = hexPolicyMap[ruleId];
      const finding = convertHexResultToFinding(result, request.bucketName, assetId, policyId, orgId);
      findings.push(finding);
    }

    await storage.deletePolicyFindingsByRulePrefix("HEX-", orgId, assetId);
    for (const f of findings) {
      await storage.createPolicyFinding(f);
    }

    return { findings, summary: hexOutput.summary };
  } catch (err: any) {
    console.error(`[hex-scanner] Error: ${err.message}`);
    return { findings: [], summary: null, error: err.message };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

export const HEX_POLICIES = [
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
];
