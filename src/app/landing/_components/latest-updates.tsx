"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Twitter, 
  Linkedin, 
  Globe, 
  Copy, 
  Check,
  ExternalLink
} from "lucide-react";
import { PageHeader } from "@/components/header";
import { cn } from "@/lib/utils";

// Tweet data structure
const tweets = [
  {
    id: "1965126348252250180",
    account: "@EIPsInsight",
    date: "September 8, 2025",
    content: `Milestone 2 completed!✅

EIPsInsight, supported by a grant from @EF_ESP, now delivers:

☞ EIP Submission Trends Dashboard
☞ Trending EIPs Module
☞ Proposal Builder Enhancements
☞ EIP Status Notification Bot

🔗 https://t.co/DeoJ5ILGQJ

Building open tools for transparent…`,
  },
  {
    id: "1965068884291342713",
    account: "@EIPsInsight",
    date: "September 8, 2025",
    content: `EIP‑7892: Blob‑Parameter‑Only Hardforks (Included for Fusaka)

It's timely, operationally important and pairs well with recent blob/fee topics by enabling quick, low‑risk tweaks to blob capacity without a full feature fork.

Why EIP‑7892
☞ Creates a special "parameter‑only" fork…`,
  },
  {
    id: "1963550043040088510",
    account: "@EIPsInsight",
    date: "September 4, 2025",
    content: `EIP‑7939: Count Leading Zeros

EIP‑7939 adds a tiny built‑in tool to Ethereum called CLZ that counts how many zero bits are at the start of a number when written in binary. Think of it like a quick "how big is this number?" helper.
https://t.co/yFHJTaNsF6

Today, smart contracts…`,
  },
  {
    id: "1963145344453075155",
    account: "@EIPsInsight",
    date: "September 3, 2025",
    content: `Block Access List (EIP‑7928) is being actively worked on for Glamsterdam. What's the biggest win if BAL ships?

1. Lower MEV risk
2. Faster block building
3. Cheaper access checks
4. Not sure/need info
#Glamsterdam #EIP7928 #BAL`,
  },
  {
    id: "1962569184459792435",
    account: "@TeamAvarch",
    date: "September 1, 2025",
    content: `EIP-7918: stabilizing blob fees for rollups.

By setting a fee floor tied to L1 gas, it prevents "too-cheap" blobspace, reduces volatility, and makes L2 costs more predictable.
https://t.co/PX9cnZTPxm

Part of the Fusaka upgrade, it aligns blob pricing with execution demand,…`,
  },
  {
    id: "1962382873572598064",
    account: "@TeamAvarch",
    date: "September 1, 2025",
    content: `🏆 Editors Leaderboard

1. @g11tech – 51
2. @_SamWilsn_ – 21
3. @lightclients – 8
4. @xinbenlv - 4
5. @nconsigny – 1

🔍 Reviewers Leaderboard

1. @JochemBrouwer96 - 4
2. @naps_thelma - 2
3. Marchhill - 1

📎 Source: https://t.co/7c6gFdamO1`,
  },
  {
    id: "1961405069284270189",
    account: "@TeamAvarch",
    date: "August 29, 2025",
    content: `Don't let old habits hold you back. Switch to scheduled insights and see your workflow soar.

Visit https://t.co/mXCeU990gC
#EIPsInsight #Efficiency #MemeFriday`,
  },
  {
    id: "1961139312080392361",
    account: "@TeamAvarch",
    date: "August 28, 2025",
    content: `New on the blog: EIP Proposal Builder and Validation Issues with Legacy EIPs
https://t.co/bk3ooSCZ6u`,
  },
];

const TweetEmbed = ({ tweetId, account, content, date }: { tweetId: string; account: string; content: string; date: string }) => {
  useEffect(() => {
    // Load Twitter widget script
    const loadTwitterWidget = () => {
      if (typeof window !== "undefined") {
        if ((window as any).twttr && (window as any).twttr.widgets) {
          (window as any).twttr.widgets.load();
        } else {
          const script = document.createElement("script");
          script.src = "https://platform.twitter.com/widgets.js";
          script.async = true;
          script.charset = "utf-8";
          script.id = "twitter-wjs";
          
          // Check if script already exists
          if (!document.getElementById("twitter-wjs")) {
            document.body.appendChild(script);
          }

          script.onload = () => {
            if ((window as any).twttr && (window as any).twttr.widgets) {
              (window as any).twttr.widgets.load();
            }
          };
        }
      }
    };

    // Delay to ensure DOM is ready
    const timer = setTimeout(loadTwitterWidget, 100);
    return () => clearTimeout(timer);
  }, [tweetId]);

  const tweetUrl = `https://twitter.com/${account.replace("@", "")}/status/${tweetId}`;
  const accountName = account.replace("@", "");

  // Convert content to HTML with proper line breaks
  const formattedContent = content.split('\n').map((line, i, arr) => (
    <React.Fragment key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <div className="flex justify-center w-full">
      <blockquote
        className="twitter-tweet"
        data-theme="dark"
        data-dnt="true"
        data-conversation="none"
        style={{ margin: "0 auto", width: "100%", maxWidth: "550px" }}
      >
        <p lang="en" dir="ltr">
          {formattedContent}
        </p>
        &mdash; {account} ({accountName})
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
          {date}
        </a>
      </blockquote>
    </div>
  );
};

const socialPresence = [
  {
    name: "EIPsInsight",
    platform: "X (Twitter)",
    platformIcon: Twitter,
    purpose: "Governance insights and proposal updates",
    url: "https://twitter.com/EIPsInsight",
    color: "cyan",
  },
  {
    name: "Team Avarch",
    platform: "X (Twitter)",
    platformIcon: Twitter,
    purpose: "Ecosystem development and standards",
    url: "https://twitter.com/TeamAvarch",
    color: "emerald",
  },
  {
    name: "EIPsInsight",
    platform: "LinkedIn",
    platformIcon: Linkedin,
    purpose: "Professional governance discussions",
    url: "https://linkedin.com/company/eipsinsight",
    color: "blue",
  },
  {
    name: "Official Website",
    platform: "Web",
    platformIcon: Globe,
    purpose: "Full platform access and resources",
    url: "https://eipsinsight.com",
    color: "violet",
  },
];

const getColorClasses = (color: string) => {
  const colors: Record<string, { border: string; bg: string; icon: string }> = {
    cyan: {
      border: "border-cyan-400/30",
      bg: "bg-cyan-500/10",
      icon: "text-cyan-300",
    },
    emerald: {
      border: "border-emerald-400/30",
      bg: "bg-emerald-500/10",
      icon: "text-emerald-300",
    },
    blue: {
      border: "border-blue-400/30",
      bg: "bg-blue-500/10",
      icon: "text-blue-300",
    },
    violet: {
      border: "border-violet-400/30",
      bg: "bg-violet-500/10",
      icon: "text-violet-300",
    },
  };
  return colors[color] || colors.cyan;
};

const SocialCard = ({ item }: { item: typeof socialPresence[0] }) => {
  const [copied, setCopied] = useState(false);
  const colors = getColorClasses(item.color);
  const Icon = item.platformIcon;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col rounded-lg border border-slate-200 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/40"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("rounded-lg p-2 border", colors.bg, colors.border)}>
          <Icon className={cn("h-4 w-4", colors.icon)} />
        </div>
        <button
          onClick={handleCopyLink}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800/50"
          title="Copy link"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          )}
        </button>
      </div>

      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{item.name}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{item.platform}</p>
      <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed mb-3">{item.purpose}</p>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
      >
        Visit
        <ExternalLink className="h-3 w-3" />
      </a>
    </motion.div>
  );
};

export default function LatestUpdates() {
  return (
    <>
      <PageHeader
        title="Latest Updates"
        description="Signals from the ecosystem, not just announcements"
        sectionId="latest-updates"
        className="bg-slate-100/40 dark:bg-slate-950/30"
      />
      <section className="relative w-full bg-slate-100/40 dark:bg-slate-950/30">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Updates Feed - Left Column */}
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex h-5 w-5 items-center justify-center rounded border border-cyan-400/40 bg-cyan-500/15">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded bg-cyan-400/25"
                  />
                  <div className="relative z-10 h-2 w-2 rounded-full bg-cyan-400" />
                </div>
                <span className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-400 uppercase">
                  Live
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 backdrop-blur-sm overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto space-y-4 p-6">
                  {tweets.map((tweet, index) => (
                    <motion.div
                      key={tweet.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="rounded-lg border border-slate-200 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-900/40 p-4"
                    >
                      <TweetEmbed 
                        tweetId={tweet.id} 
                        account={tweet.account}
                        content={tweet.content}
                        date={tweet.date}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Social Presence Cards - Right Column */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">
                Follow & Connect
              </h3>
              <div className="space-y-3">
                {socialPresence.map((item) => (
                  <SocialCard key={`${item.name}-${item.platform}`} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
