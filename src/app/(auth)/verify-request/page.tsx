"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

function VerifyRequestContent() {
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
      toast.success("Signed in successfully");
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
      toast.success("Verification code resent", {
        description: email,
      });
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend code";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-8 shadow-lg shadow-primary/10 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/10 to-transparent" />

        <div className="relative z-10">
          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
              Check Your Email
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a verification code to
            </p>
            <p className="mt-1 font-semibold text-foreground">{email}</p>
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Verified!</p>
                <p className="text-sm text-muted-foreground">Redirecting you now...</p>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    Verification Code
                  </label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    maxLength={6}
                    className="h-14 border-border bg-muted/40 text-center text-2xl tracking-widest text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={cn(
                    "group relative h-12 w-full overflow-hidden border border-primary/30 bg-primary/10 text-primary transition-all duration-300",
                    "hover:bg-primary/15 hover:shadow-lg hover:shadow-primary/10",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="relative flex items-center justify-center gap-3">
                    {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                    <span className="font-semibold">
                      {loading ? "Verifying..." : "Verify & Sign In"}
                    </span>
                  </div>
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="mb-2 text-sm text-muted-foreground">Didn&apos;t receive the code?</p>
                <Button
                  onClick={handleResend}
                  disabled={resending}
                  variant="ghost"
                  className="text-primary hover:bg-primary/10 hover:text-primary/80"
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

              <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
                <p className="mb-1 font-semibold text-foreground">Code expires in 5 minutes</p>
                <p>You have 3 attempts to enter the correct code. After that, you&apos;ll need to request a new one.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-8 backdrop-blur-2xl">
          <div className="animate-pulse space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted" />
            <div className="h-8 w-48 mx-auto rounded bg-muted" />
            <div className="h-4 w-64 mx-auto rounded bg-muted" />
            <div className="h-16 rounded-lg bg-muted" />
            <div className="h-12 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    }>
      <VerifyRequestContent />
    </Suspense>
  );
}
