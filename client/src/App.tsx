import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { ProjectProvider } from "@/hooks/use-project";
import { ErrorBoundary } from "@/components/error-boundary";

import LandingPage from "@/pages/landing";
import FeaturesPage from "@/pages/features";
import PricingPage from "@/pages/pricing";
import ComparePage from "@/pages/compare";
import TrustPage from "@/pages/trust";
import ArchitecturePage from "@/pages/architecture";
import ResourcesPage from "@/pages/resources";
import LegalPage from "@/pages/legal";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import ModelsPage from "@/pages/models";
import InventoryPage from "@/pages/inventory";
import ConnectorsPage from "@/pages/connectors";
import AddConnectorPage from "@/pages/add-connector";
import UsersPage from "@/pages/users";
import OrganizationPage from "@/pages/organization";
import SuperAdminPage from "@/pages/superadmin";
import DataSecurityPage from "@/pages/data-security";
import PoliciesPage from "@/pages/policies";
import FindingsPage from "@/pages/findings";
import ProjectsPage from "@/pages/projects";
import WebhooksPage from "@/pages/webhooks";
import ReportsPage from "@/pages/reports";
import SecurityGraphPage from "@/pages/security-graph";
import CompliancePage from "@/pages/compliance";
import ApiKeysPage from "@/pages/api-keys";
import AuditLogsPage from "@/pages/audit-logs";
import ApiDocsPage from "@/pages/api-docs";
import DocumentationPage from "@/pages/documentation";
import LicenseExpiredPage from "@/pages/license-expired";
import BillingPage from "@/pages/billing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/trust" component={TrustPage} />
      <Route path="/architecture" component={ArchitecturePage} />
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/legal/:page">{(params: any) => <LegalPage page={params.page} />}</Route>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />

      <Route path="/dashboard">{() => <ProtectedRoute><Dashboard /></ProtectedRoute>}</Route>
      <Route path="/projects">{() => <ProtectedRoute><ProjectsPage /></ProtectedRoute>}</Route>
      <Route path="/models">{() => <ProtectedRoute><ModelsPage /></ProtectedRoute>}</Route>
      <Route path="/inventory">{() => <ProtectedRoute><InventoryPage /></ProtectedRoute>}</Route>
      <Route path="/connectors">{() => <ProtectedRoute><ConnectorsPage /></ProtectedRoute>}</Route>
      <Route path="/connectors/add">{() => <ProtectedRoute><AddConnectorPage /></ProtectedRoute>}</Route>
      <Route path="/users">{() => <ProtectedRoute><UsersPage /></ProtectedRoute>}</Route>
      <Route path="/organization">{() => <ProtectedRoute><OrganizationPage /></ProtectedRoute>}</Route>
      <Route path="/superadmin">{() => <ProtectedRoute><SuperAdminPage /></ProtectedRoute>}</Route>
      <Route path="/data">{() => <ProtectedRoute><DataSecurityPage /></ProtectedRoute>}</Route>
      <Route path="/policies">{() => <ProtectedRoute><PoliciesPage /></ProtectedRoute>}</Route>
      <Route path="/findings">{() => <ProtectedRoute><FindingsPage /></ProtectedRoute>}</Route>
      <Route path="/webhooks">{() => <ProtectedRoute><WebhooksPage /></ProtectedRoute>}</Route>
      <Route path="/reports">{() => <ProtectedRoute><ReportsPage /></ProtectedRoute>}</Route>
      <Route path="/security-graph">{() => <ProtectedRoute><SecurityGraphPage /></ProtectedRoute>}</Route>
      <Route path="/compliance">{() => <ProtectedRoute><CompliancePage /></ProtectedRoute>}</Route>
      <Route path="/api-keys">{() => <ProtectedRoute><ApiKeysPage /></ProtectedRoute>}</Route>
      <Route path="/audit-logs">{() => <ProtectedRoute><AuditLogsPage /></ProtectedRoute>}</Route>
      <Route path="/api-docs">{() => <ProtectedRoute><ApiDocsPage /></ProtectedRoute>}</Route>
      <Route path="/docs">{() => <ProtectedRoute><DocumentationPage /></ProtectedRoute>}</Route>
      <Route path="/license-expired">{() => <ProtectedRoute><LicenseExpiredPage /></ProtectedRoute>}</Route>
      <Route path="/billing">{() => <ProtectedRoute><BillingPage /></ProtectedRoute>}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ProjectProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </ProjectProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
