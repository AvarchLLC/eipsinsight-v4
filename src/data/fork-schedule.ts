/**
 * Projected fork schedules, computed backwards from a curated mainnet target
 * (no external data needed — just phase-duration math).
 * Update the targets/devnet counts here as ACD announces changes.
 */

export interface PhaseDurations {
  HOODI_TO_MAINNET: number;
  SEPOLIA_TO_HOODI: number;
  DEVNET_TO_SEPOLIA: number;
  DEVNET_DURATION: number;
  EIP_SELECTION_TO_DEVNET: number;
  EIP_PFI_DURATION: number;
  HEADLINER_SELECTION_DURATION: number;
  SELECTION_TO_EIP_PFI: number;
}

export const DEFAULT_PHASE_DURATIONS: PhaseDurations = {
  HOODI_TO_MAINNET: 30,
  SEPOLIA_TO_HOODI: 14,
  DEVNET_TO_SEPOLIA: 30,
  DEVNET_DURATION: 14,
  EIP_SELECTION_TO_DEVNET: 30,
  EIP_PFI_DURATION: 30,
  HEADLINER_SELECTION_DURATION: 30,
  SELECTION_TO_EIP_PFI: 7,
};

export interface ForkScheduleConfig {
  slug: string;
  mainnetTarget: string; // YYYY-MM-DD, curated projection
  devnetCount: number;
  /**
   * Curated ACTUAL dates that override the computed projection, keyed by
   * milestone id (e.g. `headliner-selection`, `devnet-0`, `sepolia`).
   * Fill these in as milestones really happen so past phases show history,
   * not back-computed estimates.
   */
  lockedDates?: Record<string, string>;
}

/** Curated projections — keep in sync with ACD announcements. */
export const FORK_SCHEDULE_CONFIGS: ForkScheduleConfig[] = [
  {
    slug: 'glamsterdam',
    mainnetTarget: '2026-09-16',
    devnetCount: 8,
    lockedDates: {
      // ACDE #240 (2026-07-02): devnet-7 launch targeting week of July 7.
      'devnet-7': '2026-07-08',
    },
  },
  {
    slug: 'hegota',
    mainnetTarget: '2027-04-01',
    devnetCount: 5,
    lockedDates: {
      // ACDE #240 (2026-07-02): Hegotá EIP proposal deadline set to Aug 6, 2026.
      'eip-pfi': '2026-08-06',
    },
  },
];

export interface ScheduleMilestone {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD
  kind: 'selection' | 'eip' | 'devnet' | 'testnet' | 'mainnet';
  /** True when the date is a curated actual, not a projection. */
  locked?: boolean;
}

export type SchedulePhaseId = 'scoping' | 'development' | 'testnets' | 'mainnet';

export interface SchedulePhase {
  id: SchedulePhaseId;
  label: string;
  description: string;
  milestones: ScheduleMilestone[];
  status: 'completed' | 'active' | 'upcoming';
}

const PHASE_OF_KIND: Record<ScheduleMilestone['kind'], SchedulePhaseId> = {
  selection: 'scoping',
  eip: 'scoping',
  devnet: 'development',
  testnet: 'testnets',
  mainnet: 'mainnet',
};

const PHASE_META: Record<SchedulePhaseId, { label: string; description: string }> = {
  scoping: {
    label: 'Scoping',
    description: 'Headliners chosen, EIPs proposed and selected for inclusion.',
  },
  development: {
    label: 'Development',
    description: 'Client teams implement and iterate across devnets.',
  },
  testnets: {
    label: 'Public testnets',
    description: 'The fork runs on Sepolia and Hoodi before mainnet.',
  },
  mainnet: {
    label: 'Mainnet',
    description: 'Activation on Ethereum mainnet.',
  },
};

/** Group a computed schedule into phases with completed/active/upcoming status. */
export function groupScheduleIntoPhases(
  milestones: ScheduleMilestone[],
  today: string
): SchedulePhase[] {
  const order: SchedulePhaseId[] = ['scoping', 'development', 'testnets', 'mainnet'];
  const phases = order.map((id) => ({
    id,
    ...PHASE_META[id],
    milestones: milestones
      .filter((m) => PHASE_OF_KIND[m.kind] === id)
      .sort((a, b) => a.date.localeCompare(b.date)),
  }));

  let activeAssigned = false;
  return phases.map((phase) => {
    const allPast = phase.milestones.every((m) => m.date < today);
    let status: SchedulePhase['status'];
    if (allPast) {
      status = 'completed';
    } else if (!activeAssigned) {
      status = 'active';
      activeAssigned = true;
    } else {
      status = 'upcoming';
    }
    return { ...phase, status };
  });
}

const PHASE_SHORT_LABELS: Record<SchedulePhaseId, string> = {
  scoping: 'Scoping',
  development: 'Devnets',
  testnets: 'Testnets',
  mainnet: 'Launching',
};

/**
 * The phase a fork is in right now (derived from its schedule), for status
 * badges — e.g. "Devnets" instead of a generic "Upcoming".
 * Returns null for forks without a schedule config.
 */
export function getCurrentPhase(
  slug: string,
  today: string
): { id: SchedulePhaseId; label: string; targetYear: string } | null {
  const config = FORK_SCHEDULE_CONFIGS.find((c) => c.slug === slug);
  if (!config) return null;
  const phases = groupScheduleIntoPhases(calculateForkSchedule(config), today);
  const active = phases.find((phase) => phase.status === 'active') ?? phases[phases.length - 1];
  return {
    id: active.id,
    label: PHASE_SHORT_LABELS[active.id],
    targetYear: config.mainnetTarget.slice(0, 4),
  };
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Walk backwards from the mainnet target to project every milestone.
 */
export function calculateForkSchedule(
  config: ForkScheduleConfig,
  durations: PhaseDurations = DEFAULT_PHASE_DURATIONS
): ScheduleMilestone[] {
  const mainnet = config.mainnetTarget;
  const hoodi = addDays(mainnet, -durations.HOODI_TO_MAINNET);
  const sepolia = addDays(hoodi, -durations.SEPOLIA_TO_HOODI);
  const lastDevnet = addDays(sepolia, -durations.DEVNET_TO_SEPOLIA);

  const devnets: ScheduleMilestone[] = [];
  for (let i = 0; i < config.devnetCount; i += 1) {
    devnets.push({
      id: `devnet-${i}`,
      label: `Devnet ${i}`,
      date: addDays(lastDevnet, -durations.DEVNET_DURATION * (config.devnetCount - 1 - i)),
      kind: 'devnet',
    });
  }

  const firstDevnet = devnets[0]?.date ?? lastDevnet;
  const eipSfiDeadline = addDays(firstDevnet, -durations.EIP_SELECTION_TO_DEVNET);
  const eipPfiDeadline = addDays(eipSfiDeadline, -durations.EIP_PFI_DURATION);
  const headlinerSelection = addDays(eipPfiDeadline, -durations.SELECTION_TO_EIP_PFI);
  const headlinerProposals = addDays(headlinerSelection, -durations.HEADLINER_SELECTION_DURATION);

  const projected: ScheduleMilestone[] = [
    { id: 'headliner-proposals', label: 'Headliner proposal deadline', date: headlinerProposals, kind: 'selection' },
    { id: 'headliner-selection', label: 'Headliner selection', date: headlinerSelection, kind: 'selection' },
    { id: 'eip-pfi', label: 'EIP proposal (PFI) deadline', date: eipPfiDeadline, kind: 'eip' },
    { id: 'eip-sfi', label: 'EIP selection (CFI/SFI) deadline', date: eipSfiDeadline, kind: 'eip' },
    ...devnets,
    { id: 'sepolia', label: 'Sepolia testnet fork', date: sepolia, kind: 'testnet' },
    { id: 'hoodi', label: 'Hoodi testnet fork', date: hoodi, kind: 'testnet' },
    { id: 'mainnet', label: 'Mainnet activation', date: mainnet, kind: 'mainnet' },
  ];

  // Curated actuals override projections.
  return projected.map((milestone) => {
    const lockedDate = config.lockedDates?.[milestone.id];
    return lockedDate ? { ...milestone, date: lockedDate, locked: true } : milestone;
  });
}
