import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("Starter"),
  contactEmail: text("contact_email"),
  mfaEnforced: text("mfa_enforced").notNull().default("false"),
  autoDiscovery: text("auto_discovery").notNull().default("true"),
  autoDiscoveryInterval: integer("auto_discovery_interval").notNull().default(20),
  lastAutoDiscovery: text("last_auto_discovery"),
  status: text("status").notNull().default("Active"),
  stripeCustomerId: text("stripe_customer_id"),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull().default(""),
  role: text("role").notNull().default("Viewer"),
  status: text("status").notNull().default("Active"),
  lastLogin: text("last_login"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaSecret: text("mfa_secret"),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: text("email_verification_expiry"),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, passwordHash: true, mfaEnabled: true, mfaSecret: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  orgName: z.string().min(2, "Organization name must be at least 2 characters").optional(),
  orgId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  mfaCode: z.string().optional(),
});

export const resetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const userRoles = ["Owner", "Admin", "Security Engineer", "Analyst", "Viewer"] as const;
export type UserRole = typeof userRoles[number];

export const inviteUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(userRoles),
  password: passwordSchema,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(userRoles),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["Active", "Disabled"]),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  environments: text("environments").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("Active"),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const cloudConnectors = pgTable("cloud_connectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  accountId: text("account_id").notNull(),
  status: text("status").notNull().default("Pending"),
  lastSync: text("last_sync"),
  region: text("region"),
  encryptedCredentials: text("encrypted_credentials"),
  syncStatus: text("sync_status").notNull().default("never"),
  syncError: text("sync_error"),
  assetsFound: integer("assets_found").notNull().default(0),
  projectId: varchar("project_id").references(() => projects.id),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertCloudConnectorSchema = createInsertSchema(cloudConnectors).omit({ id: true });
export type InsertCloudConnector = z.infer<typeof insertCloudConnectorSchema>;
export type CloudConnector = typeof cloudConnectors.$inferSelect;

export const createAwsConnectorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  accessKeyId: z.string().min(16, "Invalid Access Key ID"),
  secretAccessKey: z.string().min(20, "Invalid Secret Access Key"),
  projectId: z.string().optional(),
});

export const createAzureConnectorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  tenantId: z.string().min(8, "Invalid Tenant ID"),
  clientId: z.string().min(8, "Invalid Client (Application) ID"),
  clientSecret: z.string().min(8, "Invalid Client Secret"),
  subscriptionId: z.string().min(8, "Invalid Subscription ID"),
  projectId: z.string().optional(),
});

export const createGcpConnectorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  projectId: z.string().min(4, "Invalid GCP Project ID"),
  serviceAccountKey: z.string().min(50, "Invalid Service Account JSON key"),
  connectorProjectId: z.string().optional(),
});

export const createHuggingFaceConnectorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  apiToken: z.string().min(8, "Invalid API Token"),
  organization: z.string().min(1, "Organization is required"),
  connectorProjectId: z.string().optional(),
});

export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull().default("General"),
  source: text("source").notNull(),
  risk: text("risk").notNull().default("Low"),
  exposure: text("exposure").notNull().default("Private"),
  owner: text("owner"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  externalId: text("external_id"),
  serviceType: text("service_type"),
  excludedFromScanning: boolean("excluded_from_scanning").notNull().default(false),
  connectorId: varchar("connector_id").references(() => cloudConnectors.id),
  projectId: varchar("project_id").references(() => projects.id),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertResourceSchema = createInsertSchema(resources).omit({ id: true });
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

export const aiModels = pgTable("ai_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull().default("Custom Models"),
  status: text("status").notNull().default("Active"),
  riskScore: integer("risk_score").notNull().default(0),
  lastScan: text("last_scan"),
  vulnerabilities: integer("vulnerabilities").notNull().default(0),
  owner: text("owner"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  externalId: text("external_id"),
  serviceType: text("service_type"),
  connectorId: varchar("connector_id").references(() => cloudConnectors.id),
  projectId: varchar("project_id").references(() => projects.id),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertAiModelSchema = createInsertSchema(aiModels).omit({ id: true });
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModel = typeof aiModels.$inferSelect;

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("Medium"),
  time: text("time"),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export const policies = pgTable("policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: text("rule_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull().default("Medium"),
  applicability: text("applicability").notNull().default("Multi-Cloud"),
  enabled: boolean("enabled").notNull().default(true),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertPolicySchema = createInsertSchema(policies).omit({ id: true });
export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Policy = typeof policies.$inferSelect;

export const policyFindings = pgTable("policy_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => policies.id),
  ruleId: text("rule_id").notNull(),
  assetId: varchar("asset_id"),
  assetName: text("asset_name").notNull(),
  assetType: text("asset_type").notNull(),
  finding: text("finding").notNull(),
  severity: text("severity").notNull().default("Medium"),
  status: text("status").notNull().default("open"),
  impact: text("impact"),
  remediation: text("remediation"),
  evidence: text("evidence"),
  falsePositiveReason: text("false_positive_reason"),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: text("acknowledged_at"),
  resolvedAt: text("resolved_at"),
  detectedAt: text("detected_at"),
  projectId: varchar("project_id").references(() => projects.id),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertPolicyFindingSchema = createInsertSchema(policyFindings).omit({ id: true });
export type InsertPolicyFinding = z.infer<typeof insertPolicyFindingSchema>;
export type PolicyFinding = typeof policyFindings.$inferSelect;

export const projectMemberships = pgTable("project_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  role: text("role").notNull(),
  assignedAt: text("assigned_at").notNull(),
  assignedBy: text("assigned_by"),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertProjectMembershipSchema = createInsertSchema(projectMemberships).omit({ id: true });
export type InsertProjectMembership = z.infer<typeof insertProjectMembershipSchema>;
export type ProjectMembership = typeof projectMemberships.$inferSelect;

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["Security Engineer", "Analyst", "Viewer"]),
});

export const updateProjectMemberSchema = z.object({
  role: z.enum(["Security Engineer", "Analyst", "Viewer"]),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  icon: text("icon"),
  createdAt: text("created_at").notNull(),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().default("custom"),
  authType: text("auth_type").notNull().default("none"),
  authConfig: text("auth_config"),
  events: text("events").array().notNull().default(sql`'{}'::text[]`),
  enabled: boolean("enabled").notNull().default(true),
  lastTriggered: text("last_triggered"),
  lastStatus: text("last_status"),
  failureCount: integer("failure_count").notNull().default(0),
  projectId: varchar("project_id").references(() => projects.id),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true });
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

export const webhookTypes = ["jira", "splunk", "armorcode", "slack", "custom"] as const;
export type WebhookType = typeof webhookTypes[number];

export const webhookEvents = [
  "finding.created",
  "finding.resolved",
  "finding.acknowledged",
  "finding.suppressed",
  "scan.completed",
  "scan.failed",
  "connector.synced",
  "policy.violated",
] as const;
export type WebhookEvent = typeof webhookEvents[number];

export const createWebhookSchema = z.object({
  name: z.string().min(2, "Name is required"),
  url: z.string().url("Valid URL is required"),
  type: z.enum(webhookTypes),
  authType: z.enum(["none", "bearer", "basic", "api_key", "custom_header"]),
  authConfig: z.string().optional(),
  events: z.array(z.string()).min(1, "At least one event is required"),
  enabled: z.boolean().optional(),
  projectId: z.string().optional(),
});

export const updateWebhookSchema = z.object({
  name: z.string().min(2).optional(),
  url: z.string().url().optional(),
  type: z.enum(webhookTypes).optional(),
  authType: z.enum(["none", "bearer", "basic", "api_key", "custom_header"]).optional(),
  authConfig: z.string().optional(),
  events: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("generating"),
  filters: jsonb("filters").default(sql`'{}'::jsonb`),
  generatedAt: text("generated_at"),
  generatedBy: text("generated_by"),
  data: jsonb("data").default(sql`'{}'::jsonb`),
  orgId: varchar("org_id").references(() => organizations.id),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export const bugReports = pgTable("bug_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("Medium"),
  status: text("status").notNull().default("Open"),
  page: text("page"),
  screenshot: text("screenshot"),
  reportedBy: varchar("reported_by").references(() => users.id),
  reportedByName: text("reported_by_name"),
  reportedByEmail: text("reported_by_email"),
  orgId: varchar("org_id").references(() => organizations.id),
  orgName: text("org_name"),
  adminNotes: text("admin_notes"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertBugReportSchema = createInsertSchema(bugReports).omit({ id: true });
export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;

export const reportTypes = [
  "executive_summary",
  "compliance",
  "risk_assessment",
  "finding_detail",
  "asset_inventory",
  "policy_coverage",
] as const;
export type ReportType = typeof reportTypes[number];

export const generateReportSchema = z.object({
  type: z.enum(reportTypes),
  name: z.string().min(1, "Report name is required"),
  filters: z.object({
    dateRange: z.enum(["7d", "14d", "30d", "60d", "90d", "all"]).optional(),
    severity: z.array(z.string()).optional(),
    category: z.array(z.string()).optional(),
    projectId: z.string().optional(),
    status: z.array(z.string()).optional(),
  }).optional(),
});

export const smtpSettings = pgTable("smtp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  host: text("host").notNull(),
  port: integer("port").notNull().default(587),
  secure: boolean("secure").notNull().default(false),
  username: text("username").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull().default("Fyx Cloud"),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: text("updated_at"),
});

export const insertSmtpSettingsSchema = createInsertSchema(smtpSettings).omit({ id: true });
export type InsertSmtpSettings = z.infer<typeof insertSmtpSettingsSchema>;
export type SmtpSettings = typeof smtpSettings.$inferSelect;

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
  userId: varchar("user_id").references(() => users.id),
  orgId: varchar("org_id").references(() => organizations.id),
  expiresAt: text("expires_at"),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull(),
  status: text("status").notNull().default("active"),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true });
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

export const apiKeyPermissions = [
  "read:resources",
  "read:models",
  "read:findings",
  "read:policies",
  "read:reports",
  "read:connectors",
  "write:findings",
  "write:reports",
  "run:scans",
] as const;
export type ApiKeyPermission = typeof apiKeyPermissions[number];

export const createApiKeySchema = z.object({
  name: z.string().min(2, "Name is required"),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
  expiresAt: z.string().optional(),
});

export const licenses = pgTable("licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  maxAssets: integer("max_assets").notNull().default(1000),
  maxModels: integer("max_models").notNull().default(100),
  maxRepoScans: integer("max_repo_scans").notNull().default(50),
  maxConnectors: integer("max_connectors").notNull().default(3),
  maxUsers: integer("max_users").notNull().default(5),
  maxPolicies: integer("max_policies").notNull().default(50),
  maxProjects: integer("max_projects").notNull().default(3),
  startsAt: text("starts_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  activatedBy: text("activated_by"),
  createdAt: text("created_at").notNull(),
  notes: text("notes"),
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({ id: true });
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type License = typeof licenses.$inferSelect;

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").references(() => users.id),
  userEmail: text("user_email"),
  action: text("action").notNull(),
  category: text("category").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  targetName: text("target_name"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("success"),
  createdAt: text("created_at").notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizations.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  plan: text("plan").notNull().default("free"),
  billingInterval: text("billing_interval").notNull().default("monthly"),
  status: text("status").notNull().default("active"),
  maxUnits: integer("max_units").notNull().default(100),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  cancelAtPeriodEnd: text("cancel_at_period_end").notNull().default("false"),
  canceledAt: text("canceled_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const freeLicenseLimits = {
  maxAssets: 100,
  maxModels: 100,
  maxRepoScans: 50,
  maxConnectors: 3,
  maxUsers: 5,
  maxPolicies: 50,
  maxProjects: 3,
} as const;

export const paidLicenseDefaults = {
  maxAssets: 50000,
  maxModels: 5000,
  maxRepoScans: 2000,
  maxConnectors: 50,
  maxUsers: 100,
  maxPolicies: 500,
  maxProjects: 50,
} as const;