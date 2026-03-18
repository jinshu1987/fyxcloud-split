import { useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { FyxLogo } from "@/components/fyx-logo";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: any) {
      const raw = err.message || "";
      let msg = raw;
      try { const parsed = JSON.parse(raw.replace(/^\d+:\s*/, "")); msg = parsed.error || msg; } catch {}
      setError(msg.replace(/^\d+:\s*/, "").replace(/^"/, "").replace(/"$/, "") || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

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

          <Card className="border-border/50 shadow-xl" data-testid="forgot-password-card">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight">Reset Password</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm" data-testid="text-reset-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    If an account exists with that email, a password reset link has been sent.
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please check your inbox. The link expires in 1 hour.
                  </p>
                  <Link href="/login" className="flex items-center gap-1.5 text-sm text-[#007aff] hover:text-[#0066d6] transition-colors font-medium">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                  </Link>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="forgot-error">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-email"
                      className="h-11 bg-background border-border/60 focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-[#007aff] to-[#0066d6] hover:from-[#0066d6] hover:to-[#1d4ed8] text-white shadow-lg shadow-[#007aff]/25 transition-all duration-200"
                    disabled={loading}
                    data-testid="button-send-reset"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : "Send Reset Link"}
                  </Button>

                  <Link href="/login" className="flex items-center gap-1.5 text-sm text-[#007aff] hover:text-[#0066d6] transition-colors font-medium">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                  </Link>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
