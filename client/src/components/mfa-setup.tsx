import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { KeyRound, ShieldCheck, ShieldOff, AlertCircle, CheckCircle2, Copy } from "lucide-react";

export function MfaSetupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, refetch } = useAuth();
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "done">("idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/mfa/setup");
      const data = await res.json();
      setSecret(data.secret);
      setUri(data.uri);
      setStep("setup");
    } catch (err: any) {
      setError("Failed to generate MFA secret");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/mfa/verify", { code });
      setStep("done");
      refetch();
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "") || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/mfa/disable");
      refetch();
      onOpenChange(false);
    } catch (err: any) {
      setError("Failed to disable MFA");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep("idle");
      setSecret("");
      setUri("");
      setCode("");
      setError("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-panel border-white/10 bg-card/95 backdrop-blur-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Multi-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {user?.mfaEnabled
              ? "MFA is currently enabled on your account"
              : "Add an extra layer of security to your account"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="mfa-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {user?.mfaEnabled && step === "idle" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              MFA is enabled. Your account has an additional layer of security.
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={disableMfa} disabled={loading} data-testid="button-disable-mfa">
                <ShieldOff className="h-4 w-4 mr-2" />
                {loading ? "Disabling..." : "Disable MFA"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {!user?.mfaEnabled && step === "idle" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use an authenticator app (Google Authenticator, Authy, etc.) to scan the QR code and generate verification codes.
            </p>
            <DialogFooter>
              <Button onClick={startSetup} disabled={loading} className="bg-primary hover:bg-primary/90" data-testid="button-setup-mfa">
                <KeyRound className="h-4 w-4 mr-2" />
                {loading ? "Setting up..." : "Set Up MFA"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Copy this secret to your authenticator app:</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted/50 rounded text-xs font-mono break-all" data-testid="text-mfa-secret">{secret}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(secret)}
                  className="shrink-0"
                  data-testid="button-copy-secret"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Or use this URI:</Label>
              <code className="block p-2 bg-muted/50 rounded text-xs font-mono break-all" data-testid="text-mfa-uri">{uri}</code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mfaVerifyCode">Enter code from your authenticator app</Label>
              <Input
                id="mfaVerifyCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="bg-background/50 text-center tracking-widest text-lg"
                data-testid="input-mfa-verify-code"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep("idle"); setCode(""); }}>Cancel</Button>
              <Button onClick={verifyCode} disabled={loading || code.length !== 6} className="bg-primary hover:bg-primary/90" data-testid="button-verify-mfa">
                {loading ? "Verifying..." : "Verify & Enable"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm" data-testid="text-mfa-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              MFA has been successfully enabled!
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)} className="bg-primary hover:bg-primary/90" data-testid="button-mfa-done">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
