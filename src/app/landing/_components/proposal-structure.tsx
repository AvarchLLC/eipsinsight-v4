"use client";

import React from "react";
import { motion } from "motion/react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";
import { PageHeader } from "@/components/header";

const typeData = [
  { name: "Core", value: 245, color: "#52f6d6" },
  { name: "ERC", value: 412, color: "#7f6dff" },
  { name: "Networking", value: 68, color: "#3b82f6" },
  { name: "Interface", value: 89, color: "#06b6d4" },
  { name: "Informational", value: 124, color: "#10b981" },
  { name: "RIPs", value: 34, color: "#8b5cf6" },
];

const lifecycleData = [
  { name: "Draft", value: 156, color: "#52f6d6" },
  { name: "Review", value: 89, color: "#7f6dff" },
  { name: "Final", value: 412, color: "#10b981" },
  { name: "Withdrawn", value: 134, color: "#64748b" },
  { name: "Stagnant", value: 56, color: "#475569" },
];

const typeConfig = {
  value: {
    label: "Proposals",
  },
} satisfies ChartConfig;

const lifecycleConfig = {
  value: {
    label: "Proposals",
  },
} satisfies ChartConfig;

export default function ProposalStructure() {
  return (
    <>
      <PageHeader
        indicator={{ icon: "sparkles", label: "Structure" }}
        title="How Ethereum Proposals Evolve"
        description="Ethereum proposals move through defined stages and categories. This structure helps the ecosystem coordinate upgrades and standards."
        sectionId="proposal-structure"
        className="bg-background"
      />
      <section className="relative overflow-hidden bg-background pb-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_50%,rgba(34,211,238,0.12),transparent_45%)]" />

      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="grid gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-cyan-400/20 bg-white/80 dark:bg-black/50 p-6 backdrop-blur"
          >
            <h3 className="dec-title mb-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
              EIPs by Type
            </h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              Proposals are categorized by their domain and scope
            </p>

            <ChartContainer
              config={typeConfig}
              className="mx-auto aspect-square h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{name}:</span>
                          <span className="font-bold">{value}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={2}
                >
                  {typeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {typeData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-cyan-400/20 bg-white/80 dark:bg-black/50 p-6 backdrop-blur"
          >
            <h3 className="dec-title mb-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
              EIPs by Lifecycle Status
            </h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              Track proposals through their journey to finalization
            </p>

            <ChartContainer
              config={lifecycleConfig}
              className="mx-auto aspect-square h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{name}:</span>
                          <span className="font-bold">{value}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={lifecycleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={2}
                >
                  {lifecycleData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {lifecycleData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
    </>
  );
}
