"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { 
  Github, 
  Twitter, 
  Mail, 
  BookOpen
} from "lucide-react";
export default function Footer() {

  const footerLinks = {
    product: [
      { name: "EIP Explorer", href: "/eips" },
      { name: "Analytics", href: "/analytics" },
      { name: "Governance", href: "/governance" },
    ],
    legal: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
    ],
  };

  return (
    <footer className="relative overflow-hidden border-t border-cyan-400/20 bg-slate-950 bg-dot-white/[0.02]">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_50%),_radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.12),_transparent_50%),_radial-gradient(circle_at_center,_rgba(34,211,238,0.05),_transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
      </div>

      <div className="relative">
        {/* Main Footer Content */}
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 lg:px-8">
          {/* Top Section: Logo + Links + Social */}
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
            {/* Left: Branding */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Link href="/" className="group inline-block">
                  <div className="relative flex items-center gap-3 overflow-hidden rounded-xl p-2 transition-all duration-300">
                    <div className="absolute inset-0 scale-110 bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-emerald-400/20 opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
                    
                    <div className="relative z-10">
                      <Image
                        src="/brand/logo/EIPsInsights.gif"
                        alt="EIPsInsight"
                        width={40}
                        height={40}
                        className="transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                    
                    <span className="dec-title relative z-10 text-xl font-bold tracking-tight text-white transition-colors group-hover:text-cyan-300">
                      EIPsInsight
                    </span>
                  </div>
                </Link>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-4 text-sm leading-relaxed text-slate-400"
              >
                Clear, visual insights into Ethereum Improvement Proposals.
              </motion.p>

              {/* Social Links */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 flex items-center gap-3"
              >
                <a
                  href="https://github.com/ethereum/EIPs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-lg border border-cyan-400/20 bg-slate-900/40 p-2.5 backdrop-blur-sm transition-all duration-300 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-110"
                >
                  <Github className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:text-emerald-400" />
                </a>
                <a
                  href="https://twitter.com/EIPsInsight"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-lg border border-cyan-400/20 bg-slate-900/40 p-2.5 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-110"
                >
                  <Twitter className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:text-cyan-400" />
                </a>
                <a
                  href="mailto:hello@eipsinsight.com"
                  className="group relative rounded-lg border border-cyan-400/20 bg-slate-900/40 p-2.5 backdrop-blur-sm transition-all duration-300 hover:border-blue-400/50 hover:bg-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-110"
                >
                  <Mail className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:text-blue-400" />
                </a>
              </motion.div>
            </div>

            {/* Links Grid */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid gap-6 sm:grid-cols-2"
              >
                {Object.entries(footerLinks).map(([category, links]) => (
                  <div key={category}>
                    <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-300">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h4>
                    <ul className="space-y-2.5">
                      {links.map((link) => (
                        <li key={link.name}>
                          <Link
                            href={link.href}
                            className="group flex items-center text-sm text-slate-400 transition-all duration-300 hover:text-cyan-300"
                          >
                            <span className="mr-2 h-0.5 w-0 bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300 group-hover:w-3" />
                            <span className="transition-transform duration-300 group-hover:translate-x-0.5">{link.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="relative border-t border-cyan-400/10">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-center text-xs text-slate-500">
                © 2026 EIPsInsight. Built for the <span className="text-cyan-400">Ethereum</span> community.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <BookOpen className="h-3 w-3 text-cyan-400/60" />
                <span>Data from ethereum/EIPs repository</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Designer Typography Effect */}
        <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 select-none overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative"
          >
            <h2 
              className="dec-title bg-gradient-to-r from-emerald-500/8 via-cyan-500/8 to-emerald-500/8 bg-clip-text text-[120px] font-black leading-none tracking-tighter text-transparent sm:text-[180px] lg:text-[240px]"
              style={{
                WebkitTextStroke: "1px rgba(34,211,238,0.12)",
                textShadow: "0 0 100px rgba(52,211,153,0.2), 0 0 200px rgba(34,211,238,0.1)"
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
