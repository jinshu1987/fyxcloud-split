import { ShieldAlert, Clock, Mail, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export default function LicenseExpiredPage() {
  const { user, license, logout } = useAuth();

  const expiredDate = license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : "Unknown";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-xl">
        <CardContent className="pt-8 pb-8 px-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold" data-testid="text-license-expired-title">License Expired</h1>
            <p className="text-muted-foreground text-sm">
              Your {license?.plan === "free" ? "free trial" : "license"} has expired. Access to the platform is temporarily restricted.
            </p>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 space-y-3 text-left border border-border/50">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Expired on</p>
                <p className="text-sm font-medium" data-testid="text-expired-date">{expiredDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-sm font-medium capitalize" data-testid="text-expired-plan">{license?.plan || "Free Trial"}</p>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-left">
            <h3 className="text-sm font-semibold mb-2 text-primary">What you can do</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <Mail className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                Contact your organization administrator to renew
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                Reach out to sales@fyxcloud.ai for a paid plan
              </li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => logout()}
            data-testid="button-logout-expired"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
