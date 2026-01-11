"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { 
  Github, 
  Twitter, 
  Mail, 
  ArrowRight, 
  BookOpen, 
  FileText, 
  TrendingUp,
  Zap,
  Shield,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsSubscribing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Successfully subscribed!", {
      description: "You'll receive monthly reports on EIP trends and governance insights."
    });
    
    setEmail("");
    setIsSubscribing(false);
  };

  const footerLinks = {
    product: [
      { name: "EIP Explorer", href: "/eips" },
      { name: "Analytics", href: "/analytics" },
      { name: "Governance", href: "/governance" },
      { name: "API", href: "/api" },
    ],
    resources: [
      { name: "Documentation", href: "/docs" },
      { name: "Blog", href: "/blog" },
      { name: "Research", href: "/research" },
      { name: "Changelog", href: "/changelog" },
    ],
    company: [
      { name: "About", href: "/about" },
      { name: "Team", href: "/team" },
      { name: "Contact", href: "/contact" },
      { name: "Careers", href: "/careers" },
    ],
    legal: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Security", href: "/security" },
    ],
  };

  const stats = [
    { icon: FileText, label: "Active EIPs", value: "245+" },
    { icon: Users, label: "Contributors", value: "1.2K+" },
    { icon: TrendingUp, label: "Monthly Updates", value: "50+" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-cyan-400/20 bg-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_50%),_radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.08),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative">
        {/* Main Footer Content */}
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
          {/* Top Section: Logo + Newsletter */}
          <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
            {/* Left: Branding + Stats */}
            <div className="lg:col-span-2">
              <Link href="/" className="group inline-block">
                <div className="relative flex items-center gap-3 overflow-hidden rounded-xl p-2">
                  <div className="absolute inset-0 scale-110 bg-linear-to-r from-emerald-400/20 via-cyan-400/20 to-emerald-400/20 opacity-0 blur-md transition-all duration-300 group-hover:opacity-100" />
                  
                  <div className="relative z-10">
                    <Image
                      src="/brand/logo/EIPsInsights.gif"
                      alt="EIPsInsight"
                      width={40}
                      height={40}
                    />
                  </div>
                  
                  <span className="dec-title relative z-10 text-2xl font-bold tracking-tight text-white">
                    EIPsInsight
                  </span>
                </div>
              </Link>
              
              <p className="mt-6 max-w-md text-sm leading-relaxed text-slate-400">
                Clear, visual insights into Ethereum Improvement Proposals. Track EIPs, ERCs, and RIPs with real-time analytics and governance intelligence.
              </p>

              {/* Stats Grid */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                {stats.map((stat) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group relative overflow-hidden rounded-lg border border-cyan-400/20 bg-slate-900/40 p-3 backdrop-blur-sm transition-all hover:border-emerald-400/40"
                  >
                    <stat.icon className="mb-2 h-4 w-4 text-emerald-400" />
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                    <p className="text-[10px] text-slate-500">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Social Links */}
              <div className="mt-8 flex items-center gap-3">
                <a
                  href="https://github.com/ethereum/EIPs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg border border-cyan-400/20 bg-slate-900/40 p-2.5 backdrop-blur-sm transition-all hover:border-emerald-400/40 hover:bg-emerald-500/10"
                >
                  <Github className="h-4 w-4 text-slate-400 transition-colors group-hover:text-emerald-400" />
                </a>
                <a
                  href="https://twitter.com/EIPsInsight"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg border border-cyan-400/20 bg-slate-900/40 p-2.5 backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:bg-cyan-500/10"
                >
                  <Twitter className="h-4 w-4 text-slate-400 transition-colors group-hover:text-cyan-400" />
                </a>
                <a
                  href="mailto:hello@eipsinsight.com"
                  className="group rounded-lg border border-cyan-400/20 bg-slate-900/40 p-2.5 backdrop-blur-sm transition-all hover:border-blue-400/40 hover:bg-blue-500/10"
                >
                  <Mail className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-400" />
                </a>
              </div>
            </div>

            {/* Right: Newsletter */}
            <div className="lg:col-span-3">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-linear-to-br from-emerald-500/10 via-cyan-500/5 to-transparent p-8 backdrop-blur-sm">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(52,211,153,0.15),_transparent_70%)]" />
                
                <div className="relative">
                  <div className="mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-lg font-bold text-white">Subscribe to Reports</h3>
                  </div>
                  
                  <p className="mb-6 text-sm text-slate-300">
                    Get monthly insights on EIP trends, governance updates, and protocol evolution. Join 2,500+ subscribers.
                  </p>
                  
                  <form onSubmit={handleSubscribe} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 border-emerald-400/30 bg-slate-900/60 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-emerald-400/20"
                    />
                    <Button
                      type="submit"
                      disabled={isSubscribing}
                      className="group shrink-0 bg-linear-to-r from-emerald-500 to-cyan-500 text-black hover:from-emerald-400 hover:to-cyan-400"
                    >
                      {isSubscribing ? "Subscribing..." : "Subscribe"}
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </form>
                  
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <Shield className="h-3 w-3 text-emerald-400" />
                    No spam. Unsubscribe anytime. Privacy-first.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="mt-16 grid gap-8 border-t border-cyan-400/10 pt-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-emerald-300">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="group flex items-center text-sm text-slate-400 transition-colors hover:text-cyan-300"
                    >
                      <span className="mr-2 h-px w-0 bg-cyan-400 transition-all group-hover:w-3" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-emerald-300">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="group flex items-center text-sm text-slate-400 transition-colors hover:text-cyan-300"
                    >
                      <span className="mr-2 h-px w-0 bg-cyan-400 transition-all group-hover:w-3" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-emerald-300">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="group flex items-center text-sm text-slate-400 transition-colors hover:text-cyan-300"
                    >
                      <span className="mr-2 h-px w-0 bg-cyan-400 transition-all group-hover:w-3" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-emerald-300">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="group flex items-center text-sm text-slate-400 transition-colors hover:text-cyan-300"
                    >
                      <span className="mr-2 h-px w-0 bg-cyan-400 transition-all group-hover:w-3" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="relative border-t border-cyan-400/10">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-center text-sm text-slate-500">
                © 2026 EIPsInsight. Built for the Ethereum community.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <BookOpen className="h-3 w-3" />
                <span>Data from ethereum/EIPs repository</span>
              </div>
            </div>
          </div>
        </div>

        {/* Designer Typography Effect - Half Cropped */}
        <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 select-none overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <h2 className="dec-title bg-linear-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5 bg-clip-text text-[120px] font-black leading-none tracking-tighter text-transparent sm:text-[180px] lg:text-[240px]"
              style={{
                WebkitTextStroke: "1px rgba(34,211,238,0.08)",
                textShadow: "0 0 80px rgba(52,211,153,0.15)"
              }}
            >
              EIPSINSIGHT
            </h2>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
