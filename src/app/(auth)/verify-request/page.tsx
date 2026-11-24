"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ThemedLogoGif } from "@/components/themed-logo-gif";

function VerifyRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const readCooldownFromMessage = (message: string): number | null => {
    const match = message.match(/wait\s+(\d+)s/i);
    if (!match) return null;
    const seconds = Number.parseInt(match[1], 10);
    return Number.isFinite(seconds) ? seconds : null;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccess(true);
      toast.success("Signed in successfully");
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Invalid verification code. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError("");

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      setError("");
      setResendCooldown(60);
      toast.success("Verification code resent", {
        description: email,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resend code";
      const cooldown = readCooldownFromMessage(errorMessage);
      if (cooldown && cooldown > 0) {
        setResendCooldown(cooldown);
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setResending(false);
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

        <div className="mb-5 flex items-center justify-between">
          <p className="eyebrow text-[var(--brand-strong)]">00 VERIFICATION</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)] leading-snug">
            Verify Passcode
          </h1>
          <p className="mt-1 text-xs font-sans text-[var(--ink-muted)]">
            We sent a 6-digit verification code to
          </p>
          <p className="mt-1 font-mono text-xs font-semibold text-[var(--brand-strong)]">
            {email}
          </p>
        </div>

        {success ? (
          <div className="space-y-3 py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-sans font-bold text-[var(--ink)]">Verified!</p>
              <p className="text-xs font-sans text-[var(--ink-muted)]">Redirecting to home…</p>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] text-center">
                  Enter 6-digit passcode
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-center font-mono text-2xl tracking-[0.3em] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--brand)] focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 font-sans text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn btn-primary h-11 w-full rounded-lg font-sans font-semibold text-xs tracking-wide bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-xs"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{loading ? "Verifying…" : "Verify Passcode →"}</span>
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="text-xs font-sans font-medium text-[var(--brand-strong)] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
              >
                {resending
                  ? "Resending code…"
                  : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't receive code? Resend"}
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[11px] font-sans text-[var(--ink-muted)] text-center">
              Code expires in 5 minutes. Check spam folder if not received.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center animate-pulse">
            <div className="mx-auto h-12 w-12 rounded-xl bg-[var(--surface-2)] mb-4" />
            <div className="h-5 w-36 mx-auto rounded bg-[var(--surface-2)] mb-2" />
            <div className="h-4 w-48 mx-auto rounded bg-[var(--surface-2)]" />
          </div>
        </div>
      }
    >
      <VerifyRequestContent />
    </Suspense>
  );
}
