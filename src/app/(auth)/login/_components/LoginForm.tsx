"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Mail, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/profile",
        errorCallbackURL: "/login",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in with GitHub";
      setError(message);
    }
  };

  const handleGoogle = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/profile",
        errorCallbackURL: "/login",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(message);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Main Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-cyan-300/20 dark:bg-black/40 dark:shadow-none">
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/5 dark:from-emerald-500/5 dark:via-cyan-500/5 dark:to-blue-500/5" />

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="dec-title mb-2 bg-linear-to-r from-emerald-600 via-cyan-700 to-blue-700 bg-clip-text text-3xl font-semibold text-transparent dark:from-emerald-300 dark:via-cyan-300 dark:to-blue-300">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-600 dark:text-cyan-200/60">Sign in to access Ethereum standards intelligence</p>
          </div>

          {/* Social Login Buttons */}
          <div className="mb-6 space-y-3">
            <Button
              onClick={handleGitHub}
              className={cn(
                "group relative w-full overflow-hidden border border-slate-300 bg-white py-6 text-slate-800 transition-all duration-300",
                "hover:border-slate-400 hover:bg-slate-50 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]",
                "dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 dark:hover:shadow-none"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-100/80 to-slate-50/80 opacity-0 transition-opacity group-hover:opacity-100 dark:from-slate-800/60 dark:to-slate-900/60" />
              <div className="relative flex items-center justify-center gap-3">
                <Github className="h-5 w-5" />
                <span className="font-semibold">Continue with GitHub</span>
              </div>
            </Button>

            <Button
              onClick={handleGoogle}
              className={cn(
                "group relative w-full overflow-hidden border border-emerald-200 bg-emerald-50 py-6 text-slate-800 transition-all duration-300",
                "hover:bg-emerald-100 hover:shadow-[0_8px_20px_rgba(16,185,129,0.12)] hover:border-emerald-300",
                "dark:border-transparent dark:bg-gradient-to-r dark:from-emerald-500/20 dark:to-cyan-600/20 dark:text-white dark:hover:from-emerald-500/30 dark:hover:to-cyan-600/30 dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] dark:hover:border-emerald-400/30"
              )}
            >
              <div className="absolute inset-0 bg-emerald-100/60 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gradient-to-r dark:from-emerald-500/10 dark:to-cyan-600/10" />
              <div className="relative flex items-center justify-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-semibold text-slate-800 dark:text-white">Continue with Google</span>
              </div>
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-cyan-300/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/80 px-4 text-slate-500 dark:bg-black/40 dark:text-cyan-200/60">Or sign in with email</span>
            </div>
          </div>

          {/* Email OTP Form */}
          <form onSubmit={handleEmailOTP} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-slate-300 bg-white py-6 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-cyan-500/20 dark:border-cyan-300/20 dark:bg-black/20 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-cyan-400/40 dark:focus:ring-cyan-400/20"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">{error}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "group relative w-full overflow-hidden border border-amber-200 bg-amber-50 py-6 text-amber-900 transition-all duration-300",
                "hover:bg-amber-100 hover:shadow-[0_8px_20px_rgba(245,158,11,0.16)] hover:border-amber-300",
                "dark:border-transparent dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-orange-600/20 dark:text-white dark:hover:from-amber-500/30 dark:hover:to-orange-600/30 dark:hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] dark:hover:border-amber-400/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className="absolute inset-0 bg-amber-100/60 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gradient-to-r dark:from-amber-500/10 dark:to-orange-600/10" />
              <div className="relative flex items-center justify-center gap-3">
                <Mail className="h-5 w-5" />
                <span className="font-semibold">{loading ? "Sending code..." : "Send verification code"}</span>
              </div>
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-50 p-3 dark:border-cyan-400/10 dark:bg-cyan-500/5">
              <Sparkles className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
              <p className="text-xs text-cyan-800 dark:text-cyan-200/70">New to EIPsInsight? You&apos;ll be automatically registered</p>
            </div>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-cyan-700 hover:text-cyan-800 hover:underline dark:text-cyan-300 dark:hover:text-cyan-200">Terms of Service</Link>{" "}and{" "}
              <Link href="/privacy" className="text-cyan-700 hover:text-cyan-800 hover:underline dark:text-cyan-300 dark:hover:text-cyan-200">Privacy Policy</Link>
            </div>

            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800 dark:border-yellow-400/20 dark:bg-yellow-500/5 dark:text-yellow-200/70">
              <strong className="text-yellow-900 dark:text-yellow-300">Disclaimer:</strong> This service is provided &quot;as is&quot; without warranty of any kind. Always verify information from official sources.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
