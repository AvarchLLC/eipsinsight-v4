"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Github, Mail } from "lucide-react";
import { ThemedLogoGif } from "@/components/themed-logo-gif";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizeAuthError = (input: unknown) => {
    const message = input instanceof Error ? input.message : "Failed to send verification code";
    const lower = message.toLowerCase();

    if (
      lower.includes("unusual sending activity") ||
      lower.includes("outgoing rate has exceeded") ||
      lower.includes("temporarily limited by our mail provider")
    ) {
      return "Email delivery is temporarily limited. Please try again in a few minutes.";
    }

    return message;
  };

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
      const message = normalizeAuthError(err);
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
    <div className="w-full max-w-[440px]">
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-9 shadow-xl">
        {/* Top Ledger Rule */}
        <div className="mb-6 flex items-center">
          <span className="h-px w-8 bg-[var(--brand)]" />
          <span className="h-px flex-1 bg-[var(--ink)]" />
        </div>

        {/* Header Block */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow text-[var(--brand-strong)]">00 AUTHENTICATION</p>
            <Link href="/" className="inline-flex items-center gap-1.5 group">
              <ThemedLogoGif
                alt="EIPsInsight"
                width={26}
                height={26}
                unoptimized
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-serif text-base font-bold tracking-tight text-[var(--ink)]">
                EIPsInsight
              </span>
            </Link>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)] leading-snug">
            Sign In
          </h1>
          <p className="mt-1.5 text-xs text-[var(--ink-muted)] font-sans leading-relaxed">
            Access Ethereum standards tracking, pull request triage, and custom notifications.
          </p>
        </div>

        {/* Social Logins */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGitHub}
            className="group relative flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 text-xs font-sans font-medium text-[var(--ink)] transition-all hover:border-[var(--brand)]/60 hover:bg-[var(--surface)] cursor-pointer shadow-2xs active:scale-[0.99]"
          >
            <Github className="h-4 w-4 text-[var(--ink)]" />
            <span>Continue with GitHub</span>
          </button>

          <button
            type="button"
            onClick={handleGoogle}
            className="group relative flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 text-xs font-sans font-medium text-[var(--ink)] transition-all hover:border-[var(--brand)]/60 hover:bg-[var(--surface)] cursor-pointer shadow-2xs active:scale-[0.99]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-[var(--border)]" />
          <span className="absolute bg-[var(--surface)] px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-faint)]">
            or email passcode
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailOTP} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              placeholder="developer@ethereum.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-xs font-sans text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--brand)] focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 font-sans">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary h-11 w-full rounded-lg font-sans font-semibold text-xs tracking-wide bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Mail className="h-4 w-4" />
            <span>{loading ? "Sending passcode…" : "Send Email Passcode →"}</span>
          </button>
        </form>

        {/* Platform Features Strip */}
        <div className="mt-7 pt-5 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)]">
          <span className="flex items-center gap-1">
            <span className="text-[var(--brand-strong)]">✓</span> EIP / ERC Audit
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--brand-strong)]">✓</span> ACD Agendas
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[var(--brand-strong)]">✓</span> Watchlists
          </span>
        </div>

        {/* Footnote */}
        <div className="mt-4 text-center text-[10px] font-mono text-[var(--ink-faint)] leading-relaxed">
          <p>New visitors are automatically provisioned an account.</p>
          <p className="mt-1">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-[var(--ink-muted)] hover:text-[var(--ink)] underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="text-[var(--ink-muted)] hover:text-[var(--ink)] underline">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
