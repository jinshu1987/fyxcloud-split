import type { PolicyFinding, Policy } from "@shared/schema";

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  mappedRuleIds: string[];
}

export interface ComplianceFramework {
  id: string;
  name: string;
  shortName: string;
  version: string;
  description: string;
  icon: string;
  controls: ComplianceControl[];
}

export interface ControlPosture {
  controlId: string;
  controlName: string;
  controlDescription: string;
  status: "pass" | "fail" | "partial" | "not_assessed";
  mappedRuleIds: string[];
  enabledPolicyCount: number;
  totalPolicyCount: number;
  findingsCount: number;
  openFindingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: { id: string; ruleId: string; severity: string; status: string; assetName: string; finding: string }[];
}

export interface FrameworkPosture {
  framework: ComplianceFramework;
  overallScore: number;
  passCount: number;
  failCount: number;
  partialCount: number;
  notAssessedCount: number;
  totalControls: number;
  controls: ControlPosture[];
}

const EU_AI_ACT: ComplianceFramework = {
  id: "eu-ai-act",
  name: "EU Artificial Intelligence Act",
  shortName: "EU AI Act",
  version: "2024/1689",
  description: "Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence",
  icon: "Scale",
  controls: [
    {
      id: "art-5",
      name: "Article 5 — Prohibited AI Practices",
      description: "Prohibits AI systems that deploy subliminal techniques, exploit vulnerabilities, perform social scoring, or use real-time remote biometric identification in public spaces",
      mappedRuleIds: ["COM-095"],
    },
    {
      id: "art-9",
      name: "Article 9 — Risk Management System",
      description: "Requires a continuous, iterative risk management system throughout the lifecycle of high-risk AI systems, including identification, estimation, evaluation, and mitigation of risks",
      mappedRuleIds: ["COM-099", "COM-100", "MON-034", "GOV-040", "RUN-044", "SM-146", "SM-149", "SM-150", "CGR-125", "AZ-AI-003", "GC-AI-003"],
    },
    {
      id: "art-10",
      name: "Article 10 — Data and Data Governance",
      description: "Training, validation and testing datasets must meet quality criteria including relevance, representativeness, and freedom from errors; subject to appropriate data governance and management practices",
      mappedRuleIds: ["DAT-011", "DAT-013", "DAT-014", "DAT-015", "SUP-076", "SUP-077", "SUP-078", "SUP-080", "SUP-082", "SUP-084", "SM-142", "SM-143", "KEN-111", "HF-001", "HF-002"],
    },
    {
      id: "art-11",
      name: "Article 11 — Technical Documentation",
      description: "High-risk AI systems must be accompanied by technical documentation drawn up before the system is placed on the market, kept up to date, and demonstrating compliance",
      mappedRuleIds: ["GOV-037", "COM-096", "SUP-089", "SM-149"],
    },
    {
      id: "art-12",
      name: "Article 12 — Record-Keeping",
      description: "High-risk AI systems shall technically allow for automatic recording of events (logs) over their lifetime to ensure traceability of system functioning",
      mappedRuleIds: ["MON-031", "MON-032", "MON-033", "BCM-136", "LEX-114", "SM-151", "CGR-124", "GC-AI-007"],
    },
    {
      id: "art-13",
      name: "Article 13 — Transparency and Provision of Information",
      description: "High-risk AI systems shall be designed and developed to ensure their operation is sufficiently transparent to enable deployers to interpret and use the system output appropriately",
      mappedRuleIds: ["COM-097", "COM-093", "COM-092"],
    },
    {
      id: "art-14",
      name: "Article 14 — Human Oversight",
      description: "High-risk AI systems shall be designed to be effectively overseen by natural persons during their period of use, including through appropriate human-machine interface tools",
      mappedRuleIds: ["COM-091", "GOV-038", "COM-094"],
    },
    {
      id: "art-15",
      name: "Article 15 — Accuracy, Robustness and Cybersecurity",
      description: "High-risk AI systems shall achieve appropriate levels of accuracy, robustness and cybersecurity, and perform consistently throughout their lifecycle against unauthorized third-party attempts to alter their use or performance",
      mappedRuleIds: [
        "HEX-101", "HEX-102", "HEX-105", "HEX-109", "GRD-022",
        "INF-006", "INF-007", "INF-008", "NET-061", "NET-066", "NET-072",
        "SM-140", "SM-143", "SM-144", "SM-147", "SM-148",
        "BCM-133", "EDG-120", "INF-127", "INF-128", "INF-129",
        "AZ-AI-002", "AZ-AI-006", "GC-AI-001", "GC-AI-004",
        "HF-003", "HF-006", "HF-007",
      ],
    },
    {
      id: "art-17",
      name: "Article 17 — Quality Management System",
      description: "Providers of high-risk AI systems shall put a quality management system in place that ensures compliance, covering strategy for regulatory compliance, techniques and procedures for design and development, and data management",
      mappedRuleIds: ["MON-031", "MON-032", "MON-033", "MON-034", "MON-035", "SM-146", "CGR-124", "CGR-126"],
    },
    {
      id: "art-50",
      name: "Article 50 — Transparency Obligations for Certain AI Systems",
      description: "Providers shall ensure that AI systems intended to interact with persons, generate synthetic content, or perform emotion recognition or biometric categorisation are designed so that persons are informed of AI involvement",
      mappedRuleIds: ["COM-092"],
    },
    {
      id: "art-53",
      name: "Article 53 — Obligations for GPAI Model Providers",
      description: "Providers of general-purpose AI models shall draw up and maintain technical documentation, provide information to downstream providers, put in place a policy to comply with copyright, and publish a summary of training data content",
      mappedRuleIds: ["GOV-036", "GOV-037", "COM-096", "HEX-107", "SUP-089", "AZ-AI-007", "HF-005"],
    },
  ],
};

const NIST_AI_RMF: ComplianceFramework = {
  id: "nist-ai-rmf",
  name: "NIST AI Risk Management Framework",
  shortName: "NIST AI RMF",
  version: "1.0",
  description: "NIST AI 100-1, a framework for managing risks to individuals, organizations, and society associated with AI",
  icon: "Shield",
  controls: [
    {
      id: "govern-1",
      name: "GOVERN 1 — Policies, Processes, Procedures",
      description: "Policies, processes, procedures, and practices across the organization related to the mapping, measuring, and managing of AI risks are in place, transparent, and implemented effectively",
      mappedRuleIds: ["GOV-036", "GOV-037", "COM-096", "COM-099", "SUP-089"],
    },
    {
      id: "govern-2",
      name: "GOVERN 2 — Accountability Structures",
      description: "Accountability structures are in place so that the appropriate teams and individuals are empowered, responsible, and trained for mapping, measuring, and managing AI risks",
      mappedRuleIds: ["COM-091", "COM-094", "GOV-038", "COM-100"],
    },
    {
      id: "govern-3",
      name: "GOVERN 3 — Workforce Diversity",
      description: "Workforce diversity, equity, inclusion, and accessibility processes are prioritized in the mapping, measuring, and managing of AI risks throughout the lifecycle",
      mappedRuleIds: ["GOV-040", "COM-098"],
    },
    {
      id: "govern-4",
      name: "GOVERN 4 — Organizational Culture",
      description: "Organizational teams are committed to a culture that considers and communicates AI risk",
      mappedRuleIds: ["COM-097", "DIS-001", "DIS-002"],
    },
    {
      id: "govern-5",
      name: "GOVERN 5 — Processes Defined for Engagement",
      description: "Processes are defined for operator and practitioner proficiency with AI system performance and trustworthiness, and for operators to have adequate knowledge to interpret AI system output",
      mappedRuleIds: ["SM-149", "SM-150", "FLO-122", "GOV-039"],
    },
    {
      id: "govern-6",
      name: "GOVERN 6 — Policies and Procedures Updated",
      description: "Policies and procedures are in place to address AI risks, and are updated periodically based on evaluations of AI system performance and new risk information",
      mappedRuleIds: ["COM-099", "GOV-036", "GOV-037"],
    },
    {
      id: "map-1",
      name: "MAP 1 — Context Established",
      description: "Context is established and understood, including the intended purpose, potential beneficial uses, costs, risk tolerance of each AI system component",
      mappedRuleIds: ["DIS-001", "DIS-002", "DIS-003", "DIS-004", "DIS-005", "GOV-036", "GOV-039", "AZ-AI-001", "GC-AI-005", "HF-001", "HF-002"],
    },
    {
      id: "map-2",
      name: "MAP 2 — AI System Categorized",
      description: "Categorization of the AI system is performed to inform risk management practices",
      mappedRuleIds: ["COM-095", "COM-100", "GOV-036"],
    },
    {
      id: "map-3",
      name: "MAP 3 — AI Benefits and Costs",
      description: "Scientific integrity and TEVV considerations are identified and documented, including those related to benefits and costs",
      mappedRuleIds: ["GOV-037", "COM-096", "SUP-089"],
    },
    {
      id: "map-5",
      name: "MAP 5 — Impacts Characterized",
      description: "Likelihood and magnitude of each identified impact is characterized or estimated based on established methods",
      mappedRuleIds: ["COM-098", "COM-100", "SUP-086"],
    },
    {
      id: "measure-1",
      name: "MEASURE 1 — Appropriate Metrics Identified",
      description: "Appropriate methods and metrics are identified and applied to measure AI system trustworthiness",
      mappedRuleIds: ["MON-034", "GOV-040", "HEX-105", "SM-146"],
    },
    {
      id: "measure-2",
      name: "MEASURE 2 — AI Systems Evaluated",
      description: "AI systems are evaluated for trustworthy characteristics, and their evaluations inform system improvements",
      mappedRuleIds: ["HEX-101", "HEX-102", "HEX-103", "HEX-104", "HEX-105", "HEX-106", "RUN-044", "SM-148"],
    },
    {
      id: "measure-3",
      name: "MEASURE 3 — Mechanisms for Tracking Risks",
      description: "Mechanisms for tracking identified AI risks over time are in place",
      mappedRuleIds: ["MON-031", "MON-032", "MON-033", "MON-035", "COM-093", "CGR-124", "CGR-125", "CGR-126", "GC-AI-007"],
    },
    {
      id: "measure-4",
      name: "MEASURE 4 — Feedback Collected",
      description: "Feedback about efficacy of measurement is collected and assessed regularly, including stakeholder feedback",
      mappedRuleIds: ["COM-093", "MON-035"],
    },
    {
      id: "manage-1",
      name: "MANAGE 1 — AI Risks Prioritized",
      description: "AI risks based on assessments and other analytical output are prioritized, responded to, and managed",
      mappedRuleIds: ["COM-100", "IAM-016", "IAM-020", "NET-061", "INF-006", "AZ-AI-002", "GC-AI-002", "HF-003", "HF-008"],
    },
    {
      id: "manage-2",
      name: "MANAGE 2 — Strategies Planned and Implemented",
      description: "Strategies to maximize AI benefits and minimize negative impacts are planned, prepared, and implemented",
      mappedRuleIds: ["GRD-021", "GRD-022", "GRD-023", "GRD-024", "GRD-025", "NET-072", "QBI-118", "AZ-AI-003", "GC-AI-003", "HF-004", "HF-007"],
    },
    {
      id: "manage-3",
      name: "MANAGE 3 — AI Risk Responses Documented",
      description: "AI risk management is prioritized and integrated into broader enterprise risk management",
      mappedRuleIds: ["RUN-041", "RUN-042", "RUN-043", "RUN-045", "SUP-029"],
    },
    {
      id: "manage-4",
      name: "MANAGE 4 — Risk Treatments Monitored",
      description: "Risk treatments, including response and recovery, and communication plans for the identified and measured AI risks are documented and monitored regularly",
      mappedRuleIds: ["COM-100", "MON-034", "GOV-036"],
    },
  ],
};

const ISO_42001: ComplianceFramework = {
  id: "iso-42001",
  name: "ISO/IEC 42001:2023",
  shortName: "ISO 42001",
  version: "2023",
  description: "Artificial Intelligence Management System (AIMS) — requirements for establishing, implementing, maintaining and continually improving an AI management system",
  icon: "FileCheck",
  controls: [
    {
      id: "a-2",
      name: "A.2 — AI Policies",
      description: "Policies related to the development and use of AI shall be established, approved by management, published, communicated, and reviewed at planned intervals",
      mappedRuleIds: ["GOV-036", "GOV-037", "COM-096", "COM-099"],
    },
    {
      id: "a-3",
      name: "A.3 — Internal Organization",
      description: "Roles and responsibilities for AI risk management shall be defined and allocated, including cross-functional coordination and resource allocation",
      mappedRuleIds: ["COM-091", "COM-094", "GOV-038", "COM-100"],
    },
    {
      id: "a-4",
      name: "A.4 — Resources for AI Systems",
      description: "Resources including data, tools, infrastructure, and human resources needed for the development, deployment, and operation of AI systems shall be identified and made available",
      mappedRuleIds: ["DIS-001", "DIS-002", "DIS-003", "DIS-004", "DIS-005", "IAM-053", "HF-001", "HF-004"],
    },
    {
      id: "a-5",
      name: "A.5 — Assessing Impacts of AI Systems",
      description: "The organization shall identify and assess the potential impacts, including societal, economic, and environmental impacts, of AI systems throughout their lifecycle",
      mappedRuleIds: ["COM-095", "COM-098", "COM-100", "GOV-040"],
    },
    {
      id: "a-6",
      name: "A.6 — AI System Lifecycle",
      description: "Processes shall be established for the AI system lifecycle including design, data processing, model building, verification, validation, deployment, operation, and retirement",
      mappedRuleIds: [
        "SUP-026", "SUP-027", "SUP-028", "SUP-029", "SUP-030",
        "SM-149", "SM-150", "FLO-121", "FLO-122", "FLO-123",
        "HEX-103", "HEX-104", "INF-010",
      ],
    },
    {
      id: "a-7",
      name: "A.7 — Data for AI Systems",
      description: "Data used for AI systems shall be managed, including requirements for data quality, data provenance, data preparation, and data bias",
      mappedRuleIds: ["DAT-011", "DAT-012", "DAT-013", "DAT-014", "DAT-015", "DAT-132", "SUP-076", "SUP-077", "SUP-082", "AZ-AI-005", "AZ-AI-006", "GC-AI-004", "HF-002"],
    },
    {
      id: "a-8",
      name: "A.8 — Information for Interested Parties",
      description: "The organization shall determine and provide information to relevant interested parties about the AI system, including its purpose, capabilities, limitations, and known risks",
      mappedRuleIds: ["COM-092", "COM-093", "COM-097", "GOV-037"],
    },
    {
      id: "a-9",
      name: "A.9 — Use of AI Systems",
      description: "The use of AI systems shall be monitored and controlled, including deployment, operation, input/output handling, and decommissioning",
      mappedRuleIds: ["GRD-021", "GRD-022", "GRD-023", "GRD-024", "GRD-025", "RUN-041", "RUN-043", "QBI-118", "AZ-AI-003", "GC-AI-003"],
    },
    {
      id: "a-10",
      name: "A.10 — Third-Party and Customer Relationships",
      description: "AI-related risks from third-party components, services, and relationships shall be identified and managed, including supply chain considerations",
      mappedRuleIds: ["SUP-081", "SUP-083", "SUP-085", "SUP-087", "SUP-088", "HEX-107", "HF-006"],
    },
  ],
};

const SOC2_AI: ComplianceFramework = {
  id: "soc2-ai",
  name: "SOC 2 Trust Services Criteria (AI Systems)",
  shortName: "SOC 2 (AI)",
  version: "2017/2024",
  description: "AICPA Trust Services Criteria applied to AI system environments — Security, Availability, Processing Integrity, Confidentiality, and Privacy",
  icon: "ShieldCheck",
  controls: [
    {
      id: "cc1",
      name: "CC1 — Control Environment",
      description: "The entity demonstrates a commitment to integrity and ethical values; the board of directors demonstrates independence and exercises oversight of internal control",
      mappedRuleIds: ["COM-091", "COM-094", "COM-095", "GOV-036", "GOV-038"],
    },
    {
      id: "cc2",
      name: "CC2 — Communication and Information",
      description: "The entity internally and externally communicates information, including objectives and responsibilities, necessary to support the functioning of internal control",
      mappedRuleIds: ["COM-097", "COM-092", "GOV-037", "COM-096"],
    },
    {
      id: "cc3",
      name: "CC3 — Risk Assessment",
      description: "The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks, including fraud risk and change-related risks",
      mappedRuleIds: ["COM-099", "COM-100", "MON-034", "GOV-040", "HEX-105", "RUN-044"],
    },
    {
      id: "cc4",
      name: "CC4 — Monitoring Activities",
      description: "The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning",
      mappedRuleIds: [
        "MON-031", "MON-032", "MON-033", "MON-034", "MON-035",
        "SM-146", "SM-151", "BCM-136", "LEX-114",
        "CGR-124", "CGR-125", "CGR-126", "GC-AI-007",
      ],
    },
    {
      id: "cc5",
      name: "CC5 — Control Activities",
      description: "The entity selects and develops control activities that contribute to the mitigation of risks to acceptable levels, including general controls over technology",
      mappedRuleIds: [
        "GRD-021", "GRD-022", "GRD-023", "GRD-024", "GRD-025",
        "INF-006", "INF-007", "QBI-118",
        "INF-127", "INF-128", "INF-129", "INF-130", "INF-131",
        "HF-003", "HF-007",
      ],
    },
    {
      id: "cc6",
      name: "CC6 — Logical and Physical Access Controls",
      description: "The entity implements logical access security over its information assets, restricts access to authorized users, and prevents and detects unauthorized access",
      mappedRuleIds: [
        "IAM-016", "IAM-017", "IAM-018", "IAM-019", "IAM-020",
        "IAM-046", "IAM-047", "IAM-048", "IAM-049", "IAM-050",
        "IAM-051", "IAM-052", "IAM-053", "IAM-054", "IAM-055",
        "IAM-056", "IAM-057", "IAM-058", "IAM-059", "IAM-060",
        "SM-139", "SM-141", "SM-145", "QBI-117", "EDG-119",
        "AZ-AI-001", "AZ-AI-004", "GC-AI-002", "GC-AI-005",
        "HF-008",
      ],
    },
    {
      id: "cc7",
      name: "CC7 — System Operations",
      description: "The entity detects and monitors system configuration changes, vulnerabilities, and anomalies in infrastructure and software to manage system operations",
      mappedRuleIds: [
        "HEX-101", "HEX-102", "HEX-109", "HEX-110",
        "NET-061", "NET-066", "NET-069", "NET-072",
        "SM-147", "SM-148", "SM-138",
      ],
    },
    {
      id: "cc8",
      name: "CC8 — Change Management",
      description: "The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives",
      mappedRuleIds: [
        "SUP-026", "SUP-027", "SUP-028", "SUP-029", "SUP-030",
        "SM-149", "SM-150", "FLO-121", "FLO-122",
        "HEX-103", "HEX-104", "INF-010",
      ],
    },
    {
      id: "cc9",
      name: "CC9 — Risk Mitigation",
      description: "The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions and the use of vendors and business partners",
      mappedRuleIds: [
        "DAT-011", "DAT-012", "DAT-013", "DAT-014", "DAT-015", "DAT-132",
        "SUP-077", "SUP-082", "COM-098", "SUP-086", "HEX-106",
        "HF-001", "HF-002", "HF-005",
      ],
    },
    {
      id: "cc-enc",
      name: "C1 — Confidentiality: Encryption and Data Protection",
      description: "The entity identifies and maintains confidential information, restricts access and transmission, and disposes of confidential information to meet the entity's objectives",
      mappedRuleIds: [
        "INF-008", "SM-140", "SM-143", "SM-144",
        "BCM-133", "EDG-120", "KEN-111", "LEX-115",
        "NET-063", "NET-067",
        "AZ-AI-006", "GC-AI-004",
      ],
    },
  ],
};

const OWASP_LLM: ComplianceFramework = {
  id: "owasp-llm-top10",
  name: "OWASP Top 10 for LLM Applications",
  shortName: "OWASP LLM",
  version: "2025 v2.0",
  description: "OWASP Top 10 most critical security risks specific to Large Language Model applications (2025 release)",
  icon: "Bug",
  controls: [
    {
      id: "llm01",
      name: "LLM01 — Prompt Injection",
      description: "A crafted input can manipulate a large language model, causing unintended actions — this can result in data exfiltration, social engineering, and other issues via direct or indirect prompt injection",
      mappedRuleIds: ["GRD-022", "GRD-023", "MON-035", "RUN-041", "RUN-043", "RUN-045", "SUP-088", "NET-068", "GC-AI-003"],
    },
    {
      id: "llm02",
      name: "LLM02 — Sensitive Information Disclosure",
      description: "LLMs may inadvertently reveal confidential data in their responses, leading to unauthorized data access, privacy violations, and security breaches via training data memorization or retrieval",
      mappedRuleIds: ["DAT-011", "DAT-012", "DAT-014", "HEX-106", "SUP-077", "SUP-082", "RUN-045", "SM-151", "SM-142", "AZ-AI-005", "HF-001", "HF-002"],
    },
    {
      id: "llm03",
      name: "LLM03 — Supply Chain Vulnerabilities",
      description: "The LLM supply chain can be susceptible to various vulnerabilities affecting model integrity, training data, and deployment including compromised pre-trained models, poisoned data, and insecure plugins",
      mappedRuleIds: [
        "SUP-026", "SUP-027", "SUP-028", "SUP-029", "SUP-030",
        "HEX-101", "HEX-103", "HEX-104", "HEX-107", "HEX-109",
        "SM-148", "GC-AI-006",
        "HF-005", "HF-006",
      ],
    },
    {
      id: "llm04",
      name: "LLM04 — Data and Model Poisoning",
      description: "Manipulation of pre-training, fine-tuning data, or embeddings can introduce vulnerabilities, backdoors, or biases that compromise model security, performance, or ethical behavior",
      mappedRuleIds: ["SUP-076", "SUP-078", "SUP-081", "SUP-083", "HEX-102", "DAT-011", "DAT-014", "SM-143"],
    },
    {
      id: "llm05",
      name: "LLM05 — Improper Output Handling",
      description: "Failure to validate, sanitize, and handle LLM outputs downstream can result in XSS, CSRF, SSRF, privilege escalation, remote code execution in backend systems",
      mappedRuleIds: ["RUN-041", "RUN-042", "GRD-023", "GRD-024"],
    },
    {
      id: "llm06",
      name: "LLM06 — Excessive Agency",
      description: "An LLM-based system may undertake actions leading to unintended consequences due to excessive permissions, functionality, or autonomy granted to the LLM agent",
      mappedRuleIds: ["GOV-038", "IAM-016", "IAM-051", "IAM-054", "IAM-057", "IAM-060", "SM-141", "FLO-123"],
    },
    {
      id: "llm07",
      name: "LLM07 — System Prompt Leakage",
      description: "System prompts or instructions used to steer LLM behavior can be unintentionally exposed through model output, enabling attackers to extract sensitive operational logic or bypass safety measures",
      mappedRuleIds: ["GRD-022", "GRD-025", "MON-035", "INF-008"],
    },
    {
      id: "llm08",
      name: "LLM08 — Vector and Embedding Weaknesses",
      description: "Weaknesses in how vectors and embeddings are generated, stored, or retrieved can be exploited to inject harmful content, manipulate model behavior, or access unauthorized data",
      mappedRuleIds: ["KEN-111", "KEN-112", "KEN-113", "DAT-013", "DAT-014", "NET-061", "INF-009"],
    },
    {
      id: "llm09",
      name: "LLM09 — Misinformation",
      description: "LLMs can generate inaccurate or fabricated information that appears authoritative, leading to security vulnerabilities, reputational damage, and legal liability",
      mappedRuleIds: ["GRD-025", "COM-091", "COM-094", "GOV-040", "SM-146"],
    },
    {
      id: "llm10",
      name: "LLM10 — Unbounded Consumption",
      description: "LLMs are susceptible to attacks that manipulate resource usage, causing service degradation, increased costs, or denial of service through unbounded or excessive consumption of computational resources",
      mappedRuleIds: ["GRD-023", "MON-031", "INF-009", "NET-072", "RUN-044", "INF-130", "INF-131", "HF-003", "HF-004"],
    },
  ],
};

export function getComplianceFrameworks(): ComplianceFramework[] {
  return [EU_AI_ACT, NIST_AI_RMF, ISO_42001, SOC2_AI, OWASP_LLM];
}

export function getComplianceFramework(id: string): ComplianceFramework | undefined {
  return getComplianceFrameworks().find(f => f.id === id);
}

export function computeCompliancePosture(
  framework: ComplianceFramework,
  findings: PolicyFinding[],
  policies: Policy[]
): FrameworkPosture {
  const policyMap = new Map(policies.map(p => [p.ruleId, p]));
  const findingsByRule = new Map<string, PolicyFinding[]>();
  for (const f of findings) {
    if (!f.ruleId) continue;
    if (!findingsByRule.has(f.ruleId)) findingsByRule.set(f.ruleId, []);
    findingsByRule.get(f.ruleId)!.push(f);
  }

  let passCount = 0;
  let failCount = 0;
  let partialCount = 0;
  let notAssessedCount = 0;

  const controlPostures: ControlPosture[] = framework.controls.map(control => {
    const mappedPolicies = control.mappedRuleIds.map(rid => policyMap.get(rid)).filter(Boolean);
    const enabledCount = mappedPolicies.filter(p => p!.enabled).length;

    const controlFindings: PolicyFinding[] = [];
    for (const rid of control.mappedRuleIds) {
      const rf = findingsByRule.get(rid) || [];
      controlFindings.push(...rf);
    }

    const openFindings = controlFindings.filter(f => f.status === "open" || f.status === "acknowledged");
    const criticalCount = openFindings.filter(f => f.severity === "Critical").length;
    const highCount = openFindings.filter(f => f.severity === "High").length;
    const mediumCount = openFindings.filter(f => f.severity === "Medium").length;
    const lowCount = openFindings.filter(f => f.severity === "Low").length;

    let status: "pass" | "fail" | "partial" | "not_assessed";
    if (enabledCount === 0) {
      status = "not_assessed";
    } else if (criticalCount > 0 || highCount > 0) {
      status = "fail";
    } else if (mediumCount > 0 || lowCount > 0) {
      status = "partial";
    } else {
      status = "pass";
    }

    if (status === "pass") passCount++;
    else if (status === "fail") failCount++;
    else if (status === "partial") partialCount++;
    else notAssessedCount++;

    return {
      controlId: control.id,
      controlName: control.name,
      controlDescription: control.description,
      status,
      mappedRuleIds: control.mappedRuleIds,
      enabledPolicyCount: enabledCount,
      totalPolicyCount: control.mappedRuleIds.length,
      findingsCount: controlFindings.length,
      openFindingsCount: openFindings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      findings: controlFindings.slice(0, 50).map(f => ({
        id: f.id,
        ruleId: f.ruleId || "",
        severity: f.severity,
        status: f.status,
        assetName: f.assetName,
        finding: f.finding,
      })),
    };
  });

  const assessedControls = passCount + failCount + partialCount;
  const overallScore = assessedControls > 0
    ? Math.round(((passCount + partialCount * 0.5) / assessedControls) * 100)
    : 0;

  return {
    framework,
    overallScore,
    passCount,
    failCount,
    partialCount,
    notAssessedCount,
    totalControls: framework.controls.length,
    controls: controlPostures,
  };
}

export function computeAllFrameworkPostures(
  findings: PolicyFinding[],
  policies: Policy[]
): FrameworkPosture[] {
  return getComplianceFrameworks().map(fw => computeCompliancePosture(fw, findings, policies));
}
