import { useState, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Check, X } from "lucide-react";
import { FyxLogo } from "@/components/fyx-logo";
import { motion } from "framer-motion";

function validatePasswordComplexity(pw: string): string[] {
  const errors: string[] = [];
  if (pw.length < 8) errors.push("Password must be at least 8 characters");
  if (!/[A-Z]/.test(pw)) errors.push("Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(pw)) errors.push("Password must contain at least one lowercase letter");
  if (!/[0-9]/.test(pw)) errors.push("Password must contain at least one number");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("Password must contain at least one special character");
  return errors;
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const rules = useMemo(() => [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  if (!password) return null;

  const metCount = rules.filter(r => r.met).length;
  const strength = metCount <= 2 ? "Weak" : metCount <= 4 ? "Fair" : "Strong";
  const strengthColor = metCount <= 2 ? "text-red-500" : metCount <= 4 ? "text-yellow-500" : "text-emerald-500";
  const barColor = metCount <= 2 ? "bg-red-500" : metCount <= 4 ? "bg-yellow-500" : "bg-emerald-500";

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Password strength</span>
        <span className={`text-[11px] font-medium ${strengthColor}`}>{strength}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= metCount ? barColor : "bg-muted"}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {rules.map(r => (
          <div key={r.label} className="flex items-center gap-1.5">
            {r.met ? <Check className="h-3 w-3 text-emerald-500" /> : <X className="h-3 w-3 text-muted-foreground/50" />}
            <span className={`text-[11px] ${r.met ? "text-emerald-500" : "text-muted-foreground/70"}`}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token") || "";
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const complexityErrors = validatePasswordComplexity(password);
    if (complexityErrors.length > 0) {
      setError(complexityErrors[0]);
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      const raw = err.message || "";
      let msg = raw;
      try { const parsed = JSON.parse(raw.replace(/^\d+:\s*/, "")); msg = parsed.error || msg; } catch {}
      setError(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "") || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md border-border/50 shadow-xl">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-foreground font-medium">Invalid or missing reset token.</p>
                <Link href="/forgot-password" className="text-[#007aff] hover:text-[#0066d6] transition-colors text-sm font-medium">
                  Request a new reset link
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-[#007aff]/20 rounded-full" />
          <div className="absolute top-1/3 left-1/3 w-96 h-96 border border-[#007aff]/10 rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 border border-[#007aff]/15 rounded-full" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#007aff]/20 to-transparent" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-[#007aff]/20 to-transparent" />
          <div className="absolute top-20 right-20 w-2 h-2 bg-[#007aff]/40 rounded-full" />
          <div className="absolute bottom-32 left-16 w-1.5 h-1.5 bg-[#007aff]/30 rounded-full" />
          <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-[#007aff]/50 rounded-full" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#007aff]/10 border border-[#007aff]/20 mb-8 overflow-hidden">
            <FyxLogo className="h-16 w-16" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white font-mono mb-3">FYX CLOUD</h1>
          <p className="text-lg text-slate-400">AI Security Posture Management</p>
          <div className="mt-8 w-16 h-px bg-gradient-to-r from-transparent via-[#007aff]/50 to-transparent mx-auto" />
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-[#007aff]/10 border border-[#007aff]/20 flex items-center justify-center overflow-hidden">
              <FyxLogo className="h-8 w-8" />
            </div>
            <span className="text-xl font-bold tracking-tight font-mono">FYX CLOUD</span>
          </div>

          <Card className="border-border/50 shadow-xl" data-testid="reset-password-card">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">New Password</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account</p>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm" data-testid="text-reset-complete">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Password has been reset successfully!
                  </div>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full h-11 bg-gradient-to-r from-[#007aff] to-[#0066d6] hover:from-[#0066d6] hover:to-[#1d4ed8] text-white shadow-lg shadow-[#007aff]/25 transition-all duration-200"
                    data-testid="button-go-login"
                  >
                    Go to Login
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="reset-error">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 chars, upper, lower, number, special"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        data-testid="input-new-password"
                        className="h-11 bg-background border-border/60 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      data-testid="input-confirm-password"
                      className="h-11 bg-background border-border/60 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-[#007aff] to-[#0066d6] hover:from-[#0066d6] hover:to-[#1d4ed8] text-white shadow-lg shadow-[#007aff]/25 transition-all duration-200"
                    disabled={loading}
                    data-testid="button-reset-password"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Resetting...
                      </span>
                    ) : "Reset Password"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
