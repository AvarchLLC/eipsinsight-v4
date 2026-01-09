import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - EIPsInsight",
  description: "Sign in to your EIPsInsight account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Subtle background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Soft grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1b1b1b_1px,transparent_1px),linear-gradient(to_bottom,#1b1b1b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-20" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}