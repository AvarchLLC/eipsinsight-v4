"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Mail, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      toast.success("Verification code sent", {
        description: email,
      });
      router.push(`/verify-request?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send verification code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = async () => {
    try {
      toast.loading("Redirecting to GitHub…", { id: "auth-github" });
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/profile",
        errorCallbackURL: "/login",
      });
    } catch (err) {
      toast.dismiss("auth-github");
      const message = err instanceof Error ? err.message : "Failed to sign in with GitHub";
      setError(message);
      toast.error(message);
    }
  };

  const handleGoogle = async () => {
    try {
      toast.loading("Redirecting to Google…", { id: "auth-google" });
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/profile",
        errorCallbackURL: "/login",
      });
    } catch (err) {
      toast.dismiss("auth-google");
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-8 shadow-lg shadow-primary/10 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/10 to-transparent" />

        <div className="relative z-10">
          <div className="mb-8 text-center">
            <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
              Welcome Back
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Sign in to access Ethereum standards intelligence.
            </p>
          </div>

          <div className="mb-6 space-y-3">
            <Button
              onClick={handleGitHub}
              className={cn(
                "group relative h-12 w-full overflow-hidden border border-border bg-muted/40 text-foreground transition-all duration-300",
                "hover:border-primary/40 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10"
              )}
            >
              <div className="relative flex items-center justify-center gap-3">
                <Github className="h-5 w-5" />
                <span className="font-semibold">Continue with GitHub</span>
              </div>
            </Button>

            <Button
              onClick={handleGoogle}
              className={cn(
                "group relative h-12 w-full overflow-hidden border border-border bg-muted/40 text-foreground transition-all duration-300",
                "hover:border-primary/40 hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/10"
              )}
            >
              <div className="relative flex items-center justify-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-semibold text-foreground">Continue with Google</span>
              </div>
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card/80 px-4 text-muted-foreground">Or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailOTP} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "group relative h-12 w-full overflow-hidden border border-primary/30 bg-primary/10 text-primary transition-all duration-300",
                "hover:bg-primary/15 hover:shadow-lg hover:shadow-primary/10",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className="relative flex items-center justify-center gap-3">
                <Mail className="h-5 w-5" />
                <span className="font-semibold">{loading ? "Sending code..." : "Send verification code"}</span>
              </div>
            </Button>
          </form>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs text-primary">New to EIPsInsight? You&apos;ll be automatically registered.</p>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:text-primary/80 hover:underline">Terms of Service</Link>{" "}and{" "}
              <Link href="/privacy" className="text-primary hover:text-primary/80 hover:underline">Privacy Policy</Link>
            </div>

            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <strong>Disclaimer:</strong> This service is provided &quot;as is&quot; without warranty of any kind. Always verify information from official sources.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
