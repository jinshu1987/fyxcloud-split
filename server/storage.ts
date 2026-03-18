import { db } from "./db";
import {
  organizations, users, projects, cloudConnectors, resources, aiModels, alerts, passwordResets,
  policies, policyFindings, projectMemberships, notifications, webhooks, reports, bugReports,
  smtpSettings, apiKeys, licenses, auditLogs, subscriptions,
  type Organization, type InsertOrganization,
  type User, type InsertUser,
  type Project, type InsertProject,
  type CloudConnector, type InsertCloudConnector,
  type Resource, type InsertResource,
  type AiModel, type InsertAiModel,
  type Alert, type InsertAlert,
  type Policy, type InsertPolicy,
  type PolicyFinding, type InsertPolicyFinding,
  type ProjectMembership, type InsertProjectMembership,
  type Notification, type InsertNotification,
  type Webhook, type InsertWebhook,
  type Report, type InsertReport,
  type BugReport, type InsertBugReport,
  type SmtpSettings, type InsertSmtpSettings,
  type ApiKey, type InsertApiKey,
  type License, type InsertLicense,
  type AuditLog, type InsertAuditLog,
  type Subscription, type InsertSubscription,
  type UserRole,
} from "@shared/schema";
import { eq, and, sql, like, desc } from "drizzle-orm";

export interface IStorage {
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined>;

  getUsers(orgId?: string): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithPassword(user: InsertUser & { passwordHash: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  getProjects(orgId?: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  getCloudConnectors(orgId?: string, projectId?: string): Promise<CloudConnector[]>;
  getCloudConnector(id: string): Promise<CloudConnector | undefined>;
  createCloudConnector(connector: InsertCloudConnector): Promise<CloudConnector>;
  updateCloudConnector(id: string, connector: Partial<InsertCloudConnector>): Promise<CloudConnector | undefined>;
  deleteCloudConnector(id: string): Promise<void>;

  getResources(orgId?: string, projectId?: string): Promise<Resource[]>;
  getResource(id: string): Promise<Resource | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: string, resource: Partial<InsertResource>): Promise<Resource | undefined>;
  deleteResource(id: string): Promise<void>;
  updateResourceTags(id: string, tags: string[]): Promise<Resource | undefined>;

  getAiModels(orgId?: string, projectId?: string): Promise<AiModel[]>;
  getAiModel(id: string): Promise<AiModel | undefined>;
  createAiModel(model: InsertAiModel): Promise<AiModel>;
  updateAiModel(id: string, model: Partial<InsertAiModel>): Promise<AiModel | undefined>;

  getDashboardStats(orgId?: string): Promise<{ resources: number; models: number; connectors: number; alerts: number }>;

  getAlerts(orgId?: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;

  upsertResourceByExternalId(resource: InsertResource): Promise<Resource>;
  upsertAiModelByExternalId(model: InsertAiModel): Promise<AiModel>;
  deleteResourcesByConnector(connectorId: string): Promise<void>;
  deleteAiModelsByConnector(connectorId: string): Promise<void>;

  getPolicies(orgId?: string): Promise<Policy[]>;
  getPolicy(id: string): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: string, data: Partial<InsertPolicy>): Promise<Policy | undefined>;
  deletePolicy(id: string): Promise<void>;

  getPolicyFindings(orgId?: string, policyId?: string, projectId?: string): Promise<PolicyFinding[]>;
  createPolicyFinding(finding: InsertPolicyFinding): Promise<PolicyFinding>;
  updatePolicyFinding(id: string, data: Partial<InsertPolicyFinding>): Promise<PolicyFinding | undefined>;
  deletePolicyFindingsByPolicy(policyId: string): Promise<void>;
  deletePolicyFindingsByRulePrefix(prefix: string, orgId: string, assetId?: string): Promise<void>;
  deleteAllPolicyFindings(orgId: string): Promise<void>;

  getProjectMemberships(projectId: string): Promise<ProjectMembership[]>;
  getUserProjectMemberships(userId: string): Promise<ProjectMembership[]>;
  addProjectMember(data: InsertProjectMembership): Promise<ProjectMembership>;
  removeProjectMember(userId: string, projectId: string): Promise<void>;
  updateProjectMemberRole(userId: string, projectId: string, role: string): Promise<ProjectMembership | undefined>;
  getUserAccessibleProjectIds(userId: string, orgRole: string, orgId: string): Promise<string[]>;

  getNotifications(userId: string, orgId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string, orgId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string, orgId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;

  getWebhooks(orgId: string): Promise<Webhook[]>;
  getWebhook(id: string): Promise<Webhook | undefined>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: string): Promise<void>;
  getWebhooksByEvent(orgId: string, event: string): Promise<Webhook[]>;

  getReports(orgId: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, data: Partial<InsertReport>): Promise<Report | undefined>;
  deleteReport(id: string): Promise<void>;

  getBugReports(): Promise<BugReport[]>;
  getBugReportsByOrg(orgId: string): Promise<BugReport[]>;
  createBugReport(report: InsertBugReport): Promise<BugReport>;
  updateBugReport(id: string, data: Partial<InsertBugReport>): Promise<BugReport | undefined>;

  getSmtpSettings(): Promise<SmtpSettings | undefined>;
  upsertSmtpSettings(data: InsertSmtpSettings): Promise<SmtpSettings>;

  getApiKeys(userId: string, orgId: string): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  createApiKey(key: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, data: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<void>;

  findNotificationByDedup(userId: string, orgId: string, title: string, type: string): Promise<Notification | undefined>;

  getUserByVerificationToken(token: string): Promise<User | undefined>;

  getLicense(orgId: string): Promise<License | undefined>;
  getLicenses(): Promise<License[]>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: string, data: Partial<InsertLicense>): Promise<License | undefined>;

  getSubscription(orgId: string): Promise<Subscription | undefined>;
  getSubscriptionById(id: string): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubId: string): Promise<Subscription | undefined>;
  getSubscriptionByStripeCustomerId(customerId: string): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  updateOrgStripeCustomerId(orgId: string, customerId: string): Promise<Organization | undefined>;

  getAuditLogs(orgId: string, options?: { limit?: number; offset?: number; category?: string; action?: string; userId?: string; startDate?: string; endDate?: string; search?: string }): Promise<AuditLog[]>;
  getAuditLogCount(orgId: string, options?: { category?: string; action?: string; userId?: string; startDate?: string; endDate?: string; search?: string }): Promise<number>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  async getOrganizations(): Promise<Organization[]> {
    return db.select().from(organizations);
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations).set(org).where(eq(organizations.id, id)).returning();
    return updated;
  }

  async getUsers(orgId?: string): Promise<User[]> {
    if (orgId) {
      return db.select().from(users).where(eq(users.orgId, orgId));
    }
    return db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async createUserWithPassword(user: InsertUser & { passwordHash: string }): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getProjects(orgId?: string): Promise<Project[]> {
    if (orgId) {
      return db.select().from(projects).where(eq(projects.orgId, orgId));
    }
    return db.select().from(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getCloudConnectors(orgId?: string, projectId?: string): Promise<CloudConnector[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(cloudConnectors.orgId, orgId));
    if (projectId) conditions.push(eq(cloudConnectors.projectId, projectId));
    if (conditions.length > 0) {
      return db.select().from(cloudConnectors).where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    return db.select().from(cloudConnectors);
  }

  async getCloudConnector(id: string): Promise<CloudConnector | undefined> {
    const [connector] = await db.select().from(cloudConnectors).where(eq(cloudConnectors.id, id));
    return connector;
  }

  async createCloudConnector(connector: InsertCloudConnector): Promise<CloudConnector> {
    const [created] = await db.insert(cloudConnectors).values(connector).returning();
    return created;
  }

  async updateCloudConnector(id: string, connector: Partial<InsertCloudConnector>): Promise<CloudConnector | undefined> {
    const [updated] = await db.update(cloudConnectors).set(connector).where(eq(cloudConnectors.id, id)).returning();
    return updated;
  }

  async deleteCloudConnector(id: string): Promise<void> {
    await db.delete(cloudConnectors).where(eq(cloudConnectors.id, id));
  }

  async getResources(orgId?: string, projectId?: string): Promise<Resource[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(resources.orgId, orgId));
    if (projectId) conditions.push(eq(resources.projectId, projectId));
    if (conditions.length > 0) {
      return db.select().from(resources).where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    return db.select().from(resources);
  }

  async getResource(id: string): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [created] = await db.insert(resources).values(resource).returning();
    return created;
  }

  async updateResource(id: string, resource: Partial<InsertResource>): Promise<Resource | undefined> {
    const [updated] = await db.update(resources).set(resource).where(eq(resources.id, id)).returning();
    return updated;
  }

  async deleteResource(id: string): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }

  async updateResourceTags(id: string, tags: string[]): Promise<Resource | undefined> {
    const [updated] = await db.update(resources).set({ tags }).where(eq(resources.id, id)).returning();
    return updated;
  }

  async getAiModels(orgId?: string, projectId?: string): Promise<AiModel[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(aiModels.orgId, orgId));
    if (projectId) conditions.push(eq(aiModels.projectId, projectId));
    if (conditions.length > 0) {
      return db.select().from(aiModels).where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    return db.select().from(aiModels);
  }

  async getAiModel(id: string): Promise<AiModel | undefined> {
    const [model] = await db.select().from(aiModels).where(eq(aiModels.id, id));
    return model;
  }

  async createAiModel(model: InsertAiModel): Promise<AiModel> {
    const [created] = await db.insert(aiModels).values(model).returning();
    return created;
  }

  async updateAiModel(id: string, model: Partial<InsertAiModel>): Promise<AiModel | undefined> {
    const [updated] = await db.update(aiModels).set(model).where(eq(aiModels.id, id)).returning();
    return updated;
  }

  async getDashboardStats(orgId?: string): Promise<{ resources: number; models: number; connectors: number; alerts: number }> {
    const [resourceList, modelList, connectorList, alertList] = await Promise.all([
      this.getResources(orgId),
      this.getAiModels(orgId),
      this.getCloudConnectors(orgId),
      this.getAlerts(orgId),
    ]);
    return {
      resources: resourceList.length,
      models: modelList.length,
      connectors: connectorList.length,
      alerts: alertList.length,
    };
  }

  async getAlerts(orgId?: string): Promise<Alert[]> {
    if (orgId) {
      return db.select().from(alerts).where(eq(alerts.orgId, orgId));
    }
    return db.select().from(alerts);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(alert).returning();
    return created;
  }

  async upsertResourceByExternalId(resource: InsertResource): Promise<Resource & { wasCreated?: boolean }> {
    if (resource.externalId && resource.orgId) {
      const [existing] = await db.select().from(resources)
        .where(and(eq(resources.externalId, resource.externalId), eq(resources.orgId, resource.orgId)));
      if (existing) {
        const [updated] = await db.update(resources)
          .set({ ...resource })
          .where(eq(resources.id, existing.id))
          .returning();
        return { ...updated, wasCreated: false };
      }
    }
    const [created] = await db.insert(resources).values(resource).returning();
    return { ...created, wasCreated: true };
  }

  async upsertAiModelByExternalId(model: InsertAiModel): Promise<AiModel & { wasCreated?: boolean }> {
    if (model.externalId && model.orgId) {
      const [existing] = await db.select().from(aiModels)
        .where(and(eq(aiModels.externalId, model.externalId), eq(aiModels.orgId, model.orgId)));
      if (existing) {
        const [updated] = await db.update(aiModels)
          .set({ ...model })
          .where(eq(aiModels.id, existing.id))
          .returning();
        return { ...updated, wasCreated: false };
      }
    }
    const [created] = await db.insert(aiModels).values(model).returning();
    return { ...created, wasCreated: true };
  }

  async deleteResourcesByConnector(connectorId: string): Promise<void> {
    await db.delete(resources).where(eq(resources.connectorId, connectorId));
  }

  async deleteAiModelsByConnector(connectorId: string): Promise<void> {
    await db.delete(aiModels).where(eq(aiModels.connectorId, connectorId));
  }

  async getPolicies(orgId?: string): Promise<Policy[]> {
    if (orgId) {
      return db.select().from(policies).where(eq(policies.orgId, orgId));
    }
    return db.select().from(policies);
  }

  async getPolicy(id: string): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    return policy;
  }

  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const [created] = await db.insert(policies).values(policy).returning();
    return created;
  }

  async updatePolicy(id: string, data: Partial<InsertPolicy>): Promise<Policy | undefined> {
    const [updated] = await db.update(policies).set(data).where(eq(policies.id, id)).returning();
    return updated;
  }

  async deletePolicy(id: string): Promise<void> {
    await db.delete(policyFindings).where(eq(policyFindings.policyId, id));
    await db.delete(policies).where(eq(policies.id, id));
  }

  async getPolicyFindings(orgId?: string, policyId?: string, projectId?: string): Promise<PolicyFinding[]> {
    const conditions = [];
    if (orgId) conditions.push(eq(policyFindings.orgId, orgId));
    if (policyId) conditions.push(eq(policyFindings.policyId, policyId));
    if (projectId) conditions.push(eq(policyFindings.projectId, projectId));
    if (conditions.length > 0) {
      return db.select().from(policyFindings).where(and(...conditions));
    }
    return db.select().from(policyFindings);
  }

  async createPolicyFinding(finding: InsertPolicyFinding): Promise<PolicyFinding> {
    const [created] = await db.insert(policyFindings).values(finding).returning();
    return created;
  }

  async updatePolicyFinding(id: string, data: Partial<InsertPolicyFinding>): Promise<PolicyFinding | undefined> {
    const [updated] = await db.update(policyFindings).set(data).where(eq(policyFindings.id, id)).returning();
    return updated;
  }

  async deletePolicyFindingsByPolicy(policyId: string): Promise<void> {
    await db.delete(policyFindings).where(eq(policyFindings.policyId, policyId));
  }

  async deletePolicyFindingsByRulePrefix(prefix: string, orgId: string, assetId?: string): Promise<void> {
    const conditions = [like(policyFindings.ruleId, `${prefix}%`), eq(policyFindings.orgId, orgId)];
    if (assetId) {
      conditions.push(eq(policyFindings.assetId, assetId));
    }
    await db.delete(policyFindings).where(and(...conditions));
  }

  async deleteAllPolicyFindings(orgId: string): Promise<void> {
    await db.delete(policyFindings).where(eq(policyFindings.orgId, orgId));
  }

  async getProjectMemberships(projectId: string): Promise<ProjectMembership[]> {
    return db.select().from(projectMemberships).where(eq(projectMemberships.projectId, projectId));
  }

  async getUserProjectMemberships(userId: string): Promise<ProjectMembership[]> {
    return db.select().from(projectMemberships).where(eq(projectMemberships.userId, userId));
  }

  async addProjectMember(data: InsertProjectMembership): Promise<ProjectMembership> {
    const [created] = await db.insert(projectMemberships).values(data).returning();
    return created;
  }

  async removeProjectMember(userId: string, projectId: string): Promise<void> {
    await db.delete(projectMemberships).where(
      and(eq(projectMemberships.userId, userId), eq(projectMemberships.projectId, projectId))
    );
  }

  async updateProjectMemberRole(userId: string, projectId: string, role: string): Promise<ProjectMembership | undefined> {
    const [updated] = await db.update(projectMemberships)
      .set({ role })
      .where(and(eq(projectMemberships.userId, userId), eq(projectMemberships.projectId, projectId)))
      .returning();
    return updated;
  }

  async getUserAccessibleProjectIds(userId: string, orgRole: string, orgId: string): Promise<string[]> {
    if (orgRole === "Owner" || orgRole === "Admin") {
      const allProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.orgId, orgId));
      return allProjects.map(p => p.id);
    }
    const memberships = await db.select({ projectId: projectMemberships.projectId })
      .from(projectMemberships)
      .where(eq(projectMemberships.userId, userId));
    return memberships.map(m => m.projectId);
  }

  async getNotifications(userId: string, orgId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.orgId, orgId)))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string, orgId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId),
        eq(notifications.read, false)
      ));
    return Number(result[0]?.count || 0);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string, orgId: string): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.orgId, orgId)));
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await db.delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async getWebhooks(orgId: string): Promise<Webhook[]> {
    return db.select().from(webhooks).where(eq(webhooks.orgId, orgId));
  }

  async getWebhook(id: string): Promise<Webhook | undefined> {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return webhook;
  }

  async createWebhook(webhook: InsertWebhook): Promise<Webhook> {
    const [created] = await db.insert(webhooks).values(webhook).returning();
    return created;
  }

  async updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    const [updated] = await db.update(webhooks).set(data).where(eq(webhooks.id, id)).returning();
    return updated;
  }

  async deleteWebhook(id: string): Promise<void> {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  }

  async getWebhooksByEvent(orgId: string, event: string): Promise<Webhook[]> {
    const allWebhooks = await db.select().from(webhooks)
      .where(and(eq(webhooks.orgId, orgId), eq(webhooks.enabled, true)));
    return allWebhooks.filter(w => w.events.includes(event));
  }

  async getReports(orgId: string): Promise<Report[]> {
    return db.select().from(reports)
      .where(eq(reports.orgId, orgId))
      .orderBy(desc(reports.generatedAt));
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async updateReport(id: string, data: Partial<InsertReport>): Promise<Report | undefined> {
    const [updated] = await db.update(reports).set(data).where(eq(reports.id, id)).returning();
    return updated;
  }

  async deleteReport(id: string): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  async getBugReports(): Promise<BugReport[]> {
    return db.select().from(bugReports).orderBy(desc(bugReports.createdAt));
  }

  async getBugReportsByOrg(orgId: string): Promise<BugReport[]> {
    return db.select().from(bugReports)
      .where(eq(bugReports.orgId, orgId))
      .orderBy(desc(bugReports.createdAt));
  }

  async createBugReport(report: InsertBugReport): Promise<BugReport> {
    const [created] = await db.insert(bugReports).values(report).returning();
    return created;
  }

  async updateBugReport(id: string, data: Partial<InsertBugReport>): Promise<BugReport | undefined> {
    const [updated] = await db.update(bugReports).set(data).where(eq(bugReports.id, id)).returning();
    return updated;
  }

  async getSmtpSettings(): Promise<SmtpSettings | undefined> {
    const [settings] = await db.select().from(smtpSettings).limit(1);
    return settings;
  }

  async upsertSmtpSettings(data: InsertSmtpSettings): Promise<SmtpSettings> {
    const existing = await this.getSmtpSettings();
    if (existing) {
      const [updated] = await db.update(smtpSettings).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(smtpSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(smtpSettings).values({ ...data, updatedAt: new Date().toISOString() }).returning();
    return created;
  }

  async getApiKeys(userId: string, orgId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.orgId, orgId)))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return key;
  }

  async createApiKey(key: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(key).returning();
    return created;
  }

  async updateApiKey(id: string, data: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const [updated] = await db.update(apiKeys).set(data).where(eq(apiKeys.id, id)).returning();
    return updated;
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token)).limit(1);
    return user;
  }

  async findNotificationByDedup(userId: string, orgId: string, title: string, type: string): Promise<Notification | undefined> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [found] = await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.orgId, orgId),
        eq(notifications.title, title),
        eq(notifications.type, type),
        sql`${notifications.createdAt} >= ${twentyFourHoursAgo}`
      ))
      .limit(1);
    return found;
  }

  async getLicense(orgId: string): Promise<License | undefined> {
    const [found] = await db.select().from(licenses)
      .where(and(eq(licenses.orgId, orgId), sql`${licenses.status} != 'superseded'`))
      .orderBy(desc(licenses.createdAt))
      .limit(1);
    return found;
  }

  async getLicenses(): Promise<License[]> {
    return db.select().from(licenses);
  }

  async createLicense(license: InsertLicense): Promise<License> {
    const [created] = await db.insert(licenses).values(license).returning();
    return created;
  }

  async updateLicense(id: string, data: Partial<InsertLicense>): Promise<License | undefined> {
    const [updated] = await db.update(licenses).set(data).where(eq(licenses.id, id)).returning();
    return updated;
  }

  async getAuditLogs(orgId: string, options?: { limit?: number; offset?: number; category?: string; action?: string; userId?: string; startDate?: string; endDate?: string; search?: string }): Promise<AuditLog[]> {
    const conditions = [eq(auditLogs.orgId, orgId)];
    if (options?.category) conditions.push(eq(auditLogs.category, options.category));
    if (options?.action) conditions.push(eq(auditLogs.action, options.action));
    if (options?.userId) conditions.push(eq(auditLogs.userId, options.userId));
    if (options?.startDate) conditions.push(sql`${auditLogs.createdAt} >= ${options.startDate}`);
    if (options?.endDate) conditions.push(sql`${auditLogs.createdAt} <= ${options.endDate}`);
    if (options?.search) {
      const term = `%${options.search}%`;
      conditions.push(sql`(${auditLogs.userEmail} ILIKE ${term} OR ${auditLogs.action} ILIKE ${term} OR ${auditLogs.targetName} ILIKE ${term})`);
    }
    return db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async getAuditLogCount(orgId: string, options?: { category?: string; action?: string; userId?: string; startDate?: string; endDate?: string; search?: string }): Promise<number> {
    const conditions = [eq(auditLogs.orgId, orgId)];
    if (options?.category) conditions.push(eq(auditLogs.category, options.category));
    if (options?.action) conditions.push(eq(auditLogs.action, options.action));
    if (options?.userId) conditions.push(eq(auditLogs.userId, options.userId));
    if (options?.startDate) conditions.push(sql`${auditLogs.createdAt} >= ${options.startDate}`);
    if (options?.endDate) conditions.push(sql`${auditLogs.createdAt} <= ${options.endDate}`);
    if (options?.search) {
      const term = `%${options.search}%`;
      conditions.push(sql`(${auditLogs.userEmail} ILIKE ${term} OR ${auditLogs.action} ILIKE ${term} OR ${auditLogs.targetName} ILIKE ${term})`);
    }
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(and(...conditions));
    return Number(result.count);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getSubscription(orgId: string): Promise<Subscription | undefined> {
    const [found] = await db.select().from(subscriptions)
      .where(eq(subscriptions.orgId, orgId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return found;
  }

  async getSubscriptionById(id: string): Promise<Subscription | undefined> {
    const [found] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return found;
  }

  async getSubscriptionByStripeId(stripeSubId: string): Promise<Subscription | undefined> {
    const [found] = await db.select().from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
    return found;
  }

  async getSubscriptionByStripeCustomerId(customerId: string): Promise<Subscription | undefined> {
    const [found] = await db.select().from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return found;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  async createSubscription(data: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(data).returning();
    return created;
  }

  async updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return updated;
  }

  async updateOrgStripeCustomerId(orgId: string, customerId: string): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations)
      .set({ stripeCustomerId: customerId })
      .where(eq(organizations.id, orgId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
