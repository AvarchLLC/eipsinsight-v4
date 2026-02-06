"use client";

import * as React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  RefreshCw,
  Database,
  HardDrive,
  Flag,
  Navigation,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersonaStore } from "@/stores/personaStore";
import { useSession } from "@/hooks/useSession";
import { client } from "@/lib/orpc";
import {
  PERSONAS,
  PERSONA_LIST,
  PERSONA_DEFAULTS,
  PERSONA_NAV_ORDER,
  getPersonaPageConfig,
  type Persona,
} from "@/lib/persona";
import { FEATURES, getEnabledFeatures } from "@/lib/features";

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        enabled
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
      )}
    >
      {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
        <Icon className="h-4 w-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-800/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={cn(
          "text-sm text-white text-right",
          mono && "font-mono text-xs bg-slate-800 px-2 py-0.5 rounded"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function DebugPersonaPage() {
  const { persona, isOnboarded, isHydrated, setPersona, reset } =
    usePersonaStore();
  const { data: session, loading: sessionLoading } = useSession();
  const [serverPrefs, setServerPrefs] = React.useState<{
    persona?: string | null;
    default_view?: Record<string, string> | null;
  } | null>(null);
  const [serverLoading, setServerLoading] = React.useState(false);
  const [localStorageValue, setLocalStorageValue] = React.useState<string | null>(null);

  // Read localStorage value
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("eipsinsight-persona");
      setLocalStorageValue(stored);
    }
  }, [persona]);

  // Fetch server preferences
  const fetchServerPrefs = React.useCallback(async () => {
    if (!session?.user) {
      setServerPrefs(null);
      return;
    }

    setServerLoading(true);
    try {
      const prefs = await client.preferences.get();
      setServerPrefs(prefs);
    } catch (error) {
      console.error("Failed to fetch server preferences:", error);
      setServerPrefs(null);
    } finally {
      setServerLoading(false);
    }
  }, [session?.user]);

  React.useEffect(() => {
    if (!sessionLoading) {
      fetchServerPrefs();
    }
  }, [sessionLoading, fetchServerPrefs]);

  const personaMeta = PERSONAS[persona];
  const PersonaIcon = personaMeta.icon;
  const pageConfig = getPersonaPageConfig(persona);
  const defaultRoute = PERSONA_DEFAULTS[persona];
  const navOrder = PERSONA_NAV_ORDER[persona];
  const enabledFeatures = getEnabledFeatures();

  const handleResetPersona = () => {
    reset();
    window.location.reload();
  };

  const handleSetPersona = (newPersona: Persona) => {
    setPersona(newPersona);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-cyan-400/30 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Persona Debug</h1>
              <p className="text-sm text-slate-400">
                Inspect and test persona configuration
              </p>
            </div>
          </div>

          <button
            onClick={handleResetPersona}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Persona
          </button>
        </div>

        <div className="grid gap-6">
          {/* Current Persona */}
          <Section title="Current Persona" icon={User}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center">
                <PersonaIcon className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {personaMeta.label}
                </h3>
                <p className="text-sm text-slate-400">
                  {personaMeta.description}
                </p>
              </div>
            </div>

            <DataRow label="Persona ID" value={persona} mono />
            <DataRow
              label="Is Onboarded"
              value={<StatusBadge enabled={isOnboarded} />}
            />
            <DataRow
              label="Is Hydrated"
              value={<StatusBadge enabled={isHydrated} />}
            />
            <DataRow
              label="Default Route"
              value={
                <Link
                  href={defaultRoute}
                  className="text-cyan-400 hover:underline"
                >
                  {defaultRoute}
                </Link>
              }
            />

            {/* Quick persona switcher */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 mb-2">Quick switch:</p>
              <div className="flex flex-wrap gap-2">
                {PERSONA_LIST.map((p) => {
                  const meta = PERSONAS[p];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={p}
                      onClick={() => handleSetPersona(p)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        p === persona
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Feature Flags */}
          <Section title="Feature Flags" icon={Flag}>
            <DataRow
              label="PERSONA_ONBOARDING"
              value={<StatusBadge enabled={FEATURES.PERSONA_ONBOARDING} />}
            />
            <DataRow
              label="PERSONA_SWITCHER"
              value={<StatusBadge enabled={FEATURES.PERSONA_SWITCHER} />}
            />
            <DataRow
              label="PERSONA_NAV_REORDER"
              value={<StatusBadge enabled={FEATURES.PERSONA_NAV_REORDER} />}
            />
            <DataRow
              label="PERSONA_CONTEXT_HEADERS"
              value={<StatusBadge enabled={FEATURES.PERSONA_CONTEXT_HEADERS} />}
            />
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">
                Enabled features:{" "}
                {enabledFeatures.length > 0
                  ? enabledFeatures.join(", ")
                  : "None"}
              </p>
            </div>
          </Section>

          {/* Storage State */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LocalStorage */}
            <Section title="LocalStorage" icon={HardDrive}>
              <DataRow
                label="Key"
                value="eipsinsight-persona"
                mono
              />
              <DataRow
                label="Raw Value"
                value={
                  localStorageValue ? (
                    <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded block max-w-[200px] truncate">
                      {localStorageValue}
                    </span>
                  ) : (
                    <span className="text-slate-500">Not set</span>
                  )
                }
              />
            </Section>

            {/* Server Preferences */}
            <Section title="Server Preferences" icon={Database}>
              <DataRow
                label="Authenticated"
                value={<StatusBadge enabled={!!session?.user} />}
              />
              {session?.user && (
                <>
                  <DataRow
                    label="Server Persona"
                    value={
                      serverLoading ? (
                        "Loading..."
                      ) : serverPrefs?.persona ? (
                        serverPrefs.persona
                      ) : (
                        <span className="text-slate-500">Not set</span>
                      )
                    }
                    mono={!!serverPrefs?.persona}
                  />
                  <div className="mt-2">
                    <button
                      onClick={fetchServerPrefs}
                      disabled={serverLoading}
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      {serverLoading ? "Refreshing..." : "Refresh from server"}
                    </button>
                  </div>
                </>
              )}
            </Section>
          </div>

          {/* Page Configuration */}
          <Section title="Page Configuration" icon={Navigation}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Defaults
                </h4>
                <DataRow
                  label="Analytics Default"
                  value={pageConfig.analyticsDefault}
                  mono
                />
                <DataRow
                  label="Upgrades View"
                  value={pageConfig.upgradesView}
                  mono
                />
                <DataRow
                  label="Standards Focus"
                  value={pageConfig.standardsFocus}
                  mono
                />
                <DataRow
                  label="Search Scope"
                  value={pageConfig.searchScope}
                  mono
                />
                <DataRow
                  label="Boards Default"
                  value={pageConfig.boardsDefault}
                  mono
                />
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Display
                </h4>
                <DataRow
                  label="Technical Terms"
                  value={
                    <StatusBadge enabled={pageConfig.showTechnicalTerms} />
                  }
                />
                <DataRow
                  label="Detailed Stats"
                  value={<StatusBadge enabled={pageConfig.showDetailedStats} />}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Navigation Order
              </h4>
              <div className="flex flex-wrap gap-2">
                {navOrder.map((item, i) => (
                  <span
                    key={item}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/50 text-xs text-slate-300"
                  >
                    <span className="text-cyan-400">{i + 1}.</span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
