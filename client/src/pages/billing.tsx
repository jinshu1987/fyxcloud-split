import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Check, CreditCard, ExternalLink, Zap, Cloud, Brain, Link, Users, FolderOpen, ShieldCheck, GitBranch } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type BillingInterval = "monthly" | "annual";

interface Plan {
  name: string;
  slug: string;
  maxUnits: number;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

interface LimitDetail {
  current: number;
  max: number;
}

interface UsageData {
  cloudAssets: number;
  hfRepos: number;
  totalUnits: number;
  maxUnits: number;
  percentage: number;
  warningLevel: string | null;
  plan: string;
  connectors: number;
  limits?: {
    assets: LimitDetail;
    models: LimitDetail;
    repoScans: LimitDetail;
    connectors: LimitDetail;
    users: LimitDetail;
    projects: LimitDetail;
    policies: LimitDetail;
  };
}

interface SubscriptionData {
  subscription: {
    id: string;
    plan: string;
    billingInterval: string;
    status: string;
    maxUnits: number;
    cancelAtPeriodEnd: string;
    currentPeriodEnd: string | null;
    stripeSubscriptionId: string | null;
  } | null;
}

export default function BillingPage() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      apiRequest("POST", "/api/billing/verify-checkout")
        .then(r => r.json())
        .then((data) => {
          if (data.synced) {
            toast({ title: "Subscription Activated", description: `Your ${data.plan} plan is now active.` });
            queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
            queryClient.invalidateQueries({ queryKey: ["/api/billing/usage"] });
          }
          window.history.replaceState({}, "", "/billing");
        })
        .catch(() => {
          window.history.replaceState({}, "", "/billing");
        });
    }
  }, []);

  const { data: plans } = useQuery<Record<string, Plan>>({
    queryKey: ["/api/billing/plans"],
  });

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/billing/usage"],
  });

  const { data: subData } = useQuery<SubscriptionData>({
    queryKey: ["/api/billing/subscription"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: BillingInterval }) => {
      const res = await apiRequest("POST", "/api/billing/checkout", { plan, interval });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: "Checkout Error",
        description: err.message || "Failed to start checkout. Stripe may not be configured.",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: "Portal Error",
        description: err.message || "Failed to open billing portal.",
        variant: "destructive",
      });
    },
  });

  const currentPlan = subData?.subscription?.plan || usage?.plan || "free";
  const subscription = subData?.subscription;
  const planOrder = ["free", "starter", "professional", "enterprise"];
  const currentIdx = planOrder.indexOf(currentPlan);

  const formatPrice = (plan: Plan) => {
    if (plan.monthlyPrice === 0) return "$0";
    if (interval === "monthly") return `$${plan.monthlyPrice}`;
    return `$${Math.round(plan.annualPrice / 12)}`;
  };

  const formatUnits = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 0)}K`;
    return n.toString();
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-billing-title">Billing & Subscription</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your plan and usage</p>
          </div>
          {subscription?.stripeSubscriptionId && (
            <Button
              variant="outline"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-billing"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>

        {subscription?.status === "past_due" && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3" data-testid="banner-past-due">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">Payment Failed</p>
              <p className="text-sm text-red-600 dark:text-red-300">Your subscription payment has failed. Please update your payment method to avoid service interruption.</p>
              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                onClick={() => portalMutation.mutate()}
                data-testid="button-update-payment"
              >
                Update Payment Method
              </Button>
            </div>
          </div>
        )}

        {subscription?.cancelAtPeriodEnd === "true" && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3" data-testid="banner-canceling">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">Subscription Canceling</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">
                Your subscription will be canceled at the end of the current billing period
                {subscription.currentPeriodEnd && ` (${new Date(subscription.currentPeriodEnd).toLocaleDateString()})`}.
                You will be moved to the Free plan afterwards.
              </p>
            </div>
          </div>
        )}

        {usage && (
          <Card data-testid="card-usage">
            <CardHeader>
              <CardTitle className="text-lg">Usage Overview</CardTitle>
              <CardDescription>
                {usage.totalUnits.toLocaleString()} of {usage.maxUnits.toLocaleString()} units used
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Units Used</span>
                  <span className="font-medium">{usage.percentage}%</span>
                </div>
                <Progress
                  value={Math.min(usage.percentage, 100)}
                  className={`h-3 ${usage.warningLevel === "at_limit" ? "[&>div]:bg-red-500" : usage.warningLevel === "approaching_limit" ? "[&>div]:bg-yellow-500" : ""}`}
                />
              </div>

              {usage.warningLevel === "approaching_limit" && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 flex items-center gap-2" data-testid="banner-approaching-limit">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">Approaching limit — consider upgrading your plan</span>
                </div>
              )}

              {usage.warningLevel === "at_limit" && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-center gap-2" data-testid="banner-at-limit">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700 dark:text-red-300">Limit reached — auto-discovery scanning is paused. Upgrade to continue.</span>
                </div>
              )}

              {usage.limits && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-muted-foreground">Resource Usage by Category</p>
                  {[
                    { key: "assets" as const, label: "Cloud Assets", Icon: Cloud },
                    { key: "models" as const, label: "AI Models", Icon: Brain },
                    { key: "repoScans" as const, label: "Repo Model Scans", Icon: GitBranch },
                    { key: "connectors" as const, label: "Connectors", Icon: Link },
                    { key: "users" as const, label: "Team Members", Icon: Users },
                    { key: "projects" as const, label: "Projects", Icon: FolderOpen },
                    { key: "policies" as const, label: "Policies", Icon: ShieldCheck },
                  ].map(({ key, label, Icon }) => {
                    const limit = usage.limits![key];
                    const pct = limit.max > 0 ? Math.round((limit.current / limit.max) * 100) : 0;
                    const isAtLimit = pct >= 100;
                    const isApproaching = pct >= 80 && pct < 100;
                    return (
                      <div key={key} data-testid={`limit-row-${key}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{label}</span>
                          <span className={`font-medium ${isAtLimit ? "text-red-600" : isApproaching ? "text-yellow-600" : ""}`}>
                            {limit.current.toLocaleString()} / {limit.max.toLocaleString()}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(pct, 100)}
                          className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isApproaching ? "[&>div]:bg-yellow-500" : ""}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Choose Your Plan</h2>
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${interval === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                onClick={() => setInterval("monthly")}
                data-testid="button-monthly"
              >
                Monthly
              </button>
              <button
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${interval === "annual" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                onClick={() => setInterval("annual")}
                data-testid="button-annual"
              >
                Annual
                <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Save 17%</Badge>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans && planOrder.map((slug) => {
              const plan = (plans as any)[slug] as Plan | undefined;
              if (!plan) return null;
              const isCurrent = slug === currentPlan;
              const planIdx = planOrder.indexOf(slug);
              const isUpgrade = planIdx > currentIdx;
              const isPopular = slug === "professional";

              return (
                <Card
                  key={slug}
                  className={`relative flex flex-col ${isCurrent ? "border-[#007aff] border-2" : ""} ${isPopular ? "shadow-lg" : ""}`}
                  data-testid={`card-plan-${slug}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#007aff] text-white">Most Popular</Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="outline" className="bg-background border-[#007aff] text-[#007aff]">Current Plan</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">{formatPrice(plan)}</span>
                      {plan.monthlyPrice > 0 && <span className="text-muted-foreground text-sm">/mo</span>}
                    </div>
                    <CardDescription className="mt-1">
                      Up to {plan.maxUnits.toLocaleString()} units
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled data-testid={`button-current-${slug}`}>
                        Current Plan
                      </Button>
                    ) : slug === "free" ? (
                      <Button variant="outline" className="w-full" disabled data-testid={`button-plan-${slug}`}>
                        Free Forever
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${isPopular ? "bg-[#007aff] hover:bg-[#0066d6]" : ""}`}
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => checkoutMutation.mutate({ plan: slug, interval })}
                        disabled={checkoutMutation.isPending}
                        data-testid={`button-upgrade-${slug}`}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        {isUpgrade ? "Upgrade" : "Switch"} to {plan.name}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {subscription?.stripeSubscriptionId && (
          <Card data-testid="card-subscription-details">
            <CardHeader>
              <CardTitle className="text-lg">Subscription Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize" data-testid="text-current-plan">{subscription.plan}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billing</p>
                  <p className="font-medium capitalize" data-testid="text-billing-interval">{subscription.billingInterval}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={subscription.status === "active" ? "default" : "destructive"}
                    data-testid="badge-status"
                  >
                    {subscription.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Renewal</p>
                  <p className="font-medium" data-testid="text-renewal-date">
                    {subscription.currentPeriodEnd
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
