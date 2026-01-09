"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function VerifyRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : "Invalid verification code. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      setError("");
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend code";
      setError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Main Card */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-black/40 p-8 backdrop-blur-2xl">
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-cyan-500/5 to-blue-500/5" />

        <div className="relative z-10">
          {/* Back button */}
          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-300 transition-colors hover:text-cyan-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10">
              <Mail className="h-8 w-8 text-cyan-300" />
            </div>
            <h1 className="dec-title mb-2 text-3xl font-bold text-white">
              Check Your Email
            </h1>
            <p className="text-sm text-cyan-200/60">
              We sent a verification code to
            </p>
            <p className="mt-1 font-semibold text-white">{email}</p>
          </div>

          {/* Success state */}
          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Verified!</p>
                <p className="text-sm text-cyan-200/60">Redirecting you now...</p>
              </div>
            </div>
          ) : (
            <>
              {/* OTP Form */}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-cyan-200/70">
                    Verification Code
                  </label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    maxLength={6}
                    className="border-cyan-300/20 bg-black/20 py-6 text-center text-2xl tracking-widest text-white placeholder:text-slate-400 focus:border-cyan-400/40 focus:ring-cyan-400/20"
                  />
                  <p className="mt-2 text-xs text-cyan-200/60">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={cn(
                    "group relative w-full overflow-hidden border border-transparent bg-gradient-to-r from-emerald-500/20 to-cyan-600/20 py-6 transition-all duration-300",
                    "hover:from-emerald-500/30 hover:to-cyan-600/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:border-emerald-400/30",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-600/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex items-center justify-center gap-3">
                    {loading && <Loader2 className="h-5 w-5 animate-spin text-white" />}
                    <span className="font-semibold text-white">
                      {loading ? "Verifying..." : "Verify & Sign In"}
                    </span>
                  </div>
                </Button>
              </form>

              {/* Resend */}
              <div className="mt-6 text-center">
                <p className="mb-2 text-sm text-slate-400">Didn&apos;t receive the code?</p>
                <Button
                  onClick={handleResend}
                  disabled={resending}
                  variant="ghost"
                  className="text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200"
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend code"
                  )}
                </Button>
              </div>

              {/* Info box */}
              <div className="mt-6 rounded-lg border border-cyan-400/10 bg-cyan-500/5 p-4 text-xs text-cyan-200/70">
                <p className="mb-1 font-semibold text-cyan-300">Code expires in 5 minutes</p>
                <p>You have 3 attempts to enter the correct code. After that, you&apos;ll need to request a new one.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}