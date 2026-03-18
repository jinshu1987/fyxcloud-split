import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-01-27.acacia" as any,
    });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    slug: "free",
    maxUnits: 100,
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Up to 100 cloud assets",
      "50 repo model scans",
      "3 cloud connectors",
      "5 team members",
      "3 projects",
      "Basic security scanning",
      "Community support",
    ],
  },
  starter: {
    name: "Starter",
    slug: "starter",
    maxUnits: 500,
    monthlyPrice: 99,
    annualPrice: 996,
    features: [
      "Up to 500 cloud assets",
      "200 repo model scans",
      "10 cloud connectors",
      "15 team members",
      "10 projects",
      "Advanced security scanning",
      "Compliance reporting",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    slug: "professional",
    maxUnits: 5000,
    monthlyPrice: 499,
    annualPrice: 4992,
    features: [
      "Up to 5,000 cloud assets",
      "1,000 repo model scans",
      "30 cloud connectors",
      "50 team members",
      "30 projects",
      "Full security scanning",
      "All compliance frameworks",
      "Priority support",
      "API access",
    ],
  },
  enterprise: {
    name: "Enterprise",
    slug: "enterprise",
    maxUnits: 50000,
    monthlyPrice: 1499,
    annualPrice: 14988,
    features: [
      "Up to 50,000 cloud assets",
      "Unlimited repo model scans",
      "Unlimited connectors",
      "Unlimited team members",
      "Unlimited projects",
      "Full security scanning",
      "All compliance frameworks",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
} as const;

export type PlanSlug = keyof typeof SUBSCRIPTION_PLANS;
export type BillingInterval = "monthly" | "annual";

const PLAN_LIMITS: Record<PlanSlug, { maxConnectors: number; maxUsers: number; maxProjects: number; maxPolicies: number; maxModels: number; maxRepoScans: number }> = {
  free: { maxConnectors: 3, maxUsers: 5, maxProjects: 3, maxPolicies: 50, maxModels: 100, maxRepoScans: 50 },
  starter: { maxConnectors: 10, maxUsers: 15, maxProjects: 10, maxPolicies: 200, maxModels: 500, maxRepoScans: 200 },
  professional: { maxConnectors: 30, maxUsers: 50, maxProjects: 30, maxPolicies: 500, maxModels: 5000, maxRepoScans: 1000 },
  enterprise: { maxConnectors: 999999, maxUsers: 999999, maxProjects: 999999, maxPolicies: 999999, maxModels: 999999, maxRepoScans: 999999 },
};

export function getPlanLimits(plan: PlanSlug) {
  const planConfig = SUBSCRIPTION_PLANS[plan];
  const limits = PLAN_LIMITS[plan];
  return {
    maxAssets: planConfig.maxUnits,
    maxModels: limits.maxModels,
    maxRepoScans: limits.maxRepoScans,
    maxConnectors: limits.maxConnectors,
    maxUsers: limits.maxUsers,
    maxProjects: limits.maxProjects,
    maxPolicies: limits.maxPolicies,
  };
}

export async function findOrCreateStripeCustomer(
  stripe: Stripe,
  orgId: string,
  orgName: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) {
    return existingCustomerId;
  }
  const customer = await stripe.customers.create({
    name: orgName,
    email,
    metadata: { orgId },
  });
  return customer.id;
}

export async function createCheckoutSession(
  stripe: Stripe,
  customerId: string,
  plan: PlanSlug,
  interval: BillingInterval,
  successUrl: string,
  cancelUrl: string,
  orgId: string
): Promise<string> {
  const planConfig = SUBSCRIPTION_PLANS[plan];
  const unitAmount = interval === "monthly"
    ? planConfig.monthlyPrice * 100
    : planConfig.annualPrice * 100;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Fyx Cloud AI - ${planConfig.name} Plan`,
            description: `Up to ${planConfig.maxUnits.toLocaleString()} cloud assets`,
          },
          unit_amount: unitAmount,
          recurring: {
            interval: interval === "monthly" ? "month" : "year",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      orgId,
      plan,
      interval,
    },
    subscription_data: {
      metadata: {
        orgId,
        plan,
        interval,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session.url!;
}

export async function createPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export function constructWebhookEvent(
  stripe: Stripe,
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
