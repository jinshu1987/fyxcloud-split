import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { UserRole, ApiKey } from "@shared/schema";

export type Permission =
  | "manage_org"
  | "manage_users"
  | "manage_projects"
  | "manage_connectors"
  | "run_scans"
  | "manage_policies"
  | "triage_findings"
  | "view_data"
  | "manage_project_members";

export const PERMISSIONS: Record<string, Permission[]> = {
  Owner: ["manage_org", "manage_users", "manage_projects", "manage_connectors", "run_scans", "manage_policies", "triage_findings", "view_data", "manage_project_members"],
  Admin: ["manage_org", "manage_users", "manage_projects", "manage_connectors", "run_scans", "manage_policies", "triage_findings", "view_data", "manage_project_members"],
  "Security Engineer": ["manage_connectors", "run_scans", "manage_policies", "triage_findings", "view_data"],
  Analyst: ["triage_findings", "view_data"],
  Viewer: ["view_data"],
};

const ORG_WIDE_ROLES = ["Owner", "Admin"];

export function getPermissionsForRole(role: string): Permission[] {
  return PERMISSIONS[role] || [];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateMfaSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function verifyMfaToken(token: string, secret: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: "Fyx Cloud AI-SPM",
    label: "Fyx Cloud",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function generateMfaUri(secret: string, email: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "Fyx Cloud AI-SPM",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

export async function authenticateApiKey(req: Request): Promise<{ user: any; apiKey: ApiKey } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer fyx_")) return null;

  const rawKey = authHeader.substring(7);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const apiKey = await storage.getApiKeyByHash(keyHash);

  if (!apiKey || apiKey.status !== "active") return null;

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return null;

  const user = apiKey.userId ? await storage.getUser(apiKey.userId) : null;
  if (!user || user.status !== "Active") return null;

  storage.updateApiKey(apiKey.id, { lastUsedAt: new Date().toISOString() }).catch(() => {});

  return { user, apiKey };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any).userId) {
    return next();
  }

  const apiKeyResult = await authenticateApiKey(req);
  if (apiKeyResult) {
    (req.session as any).userId = apiKeyResult.user.id;
    (req.session as any).orgId = apiKeyResult.user.orgId;
    (req as any).user = apiKeyResult.user;
    (req as any).apiKey = apiKeyResult.apiKey;
    (req as any).isApiKeyAuth = true;
    return next();
  }

  return res.status(401).json({ error: "Authentication required" });
}

export function requireSuperAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as any;
    if (!session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.status !== "Active") {
      return res.status(403).json({ error: "Account is disabled" });
    }

    if (!user.isSuperAdmin) {
      return res.status(403).json({ error: "Superadmin access required" });
    }

    (req as any).user = user;
    next();
  };
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as any;
    if (!session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.status !== "Active" && !session.impersonatingFrom) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as any;
    if (!session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.status !== "Active" && !session.impersonatingFrom) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    const userPermissions = getPermissionsForRole(user.role);
    const hasPermission = permissions.every((p) => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export function requireProjectAccess(paramName: string = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as any;
    if (!session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.status !== "Active" && !session.impersonatingFrom) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    if (ORG_WIDE_ROLES.includes(user.role)) {
      return next();
    }

    const projectId = req.params[paramName] || req.query[paramName] as string || req.body?.[paramName] || req.body?.projectId;
    if (!projectId) {
      return next();
    }

    const memberships = await storage.getUserProjectMemberships(user.id);
    const hasAccess = memberships.some((m) => m.projectId === projectId);

    if (!hasAccess) {
      return res.status(403).json({ error: "No access to this project" });
    }

    next();
  };
}

export async function requireActiveUser(req: Request, res: Response, next: NextFunction) {
  if ((req as any).isApiKeyAuth && (req as any).user) {
    return next();
  }

  const session = req.session as any;
  if (!session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await storage.getUser(session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (user.status !== "Active" && !session.impersonatingFrom) {
    req.session.destroy(() => {});
    return res.status(403).json({ error: "Account is disabled" });
  }

  (req as any).user = user;
  next();
}