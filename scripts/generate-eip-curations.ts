/**
 * Regenerate EIP curation content with AI from each EIP's own spec, replacing
 * the imported (legacy-seeded) text. Never overwrites admin-edited rows.
 *
 * Usage:
 *   bun run scripts/generate-eip-curations.ts                # in-progress upgrades
 *   bun run scripts/generate-eip-curations.ts --all          # every machine-authored row
 *   bun run scripts/generate-eip-curations.ts 7594 7702      # specific EIPs
 *   LIMIT=10 bun run scripts/generate-eip-curations.ts       # cap this run
 */
import { prisma } from '../src/lib/prisma';
import {
  generateEipCuration,
  isMachineAuthored,
  currentAiActor,
} from '../src/lib/ai-curation';
import { Prisma } from '../src/generated/prisma/client';

const IN_PROGRESS_SLUGS = ['glamsterdam', 'hegota'];
const DELAY_MS = Number(process.env.DELAY_MS ?? 1200); // Groq free-tier friendly

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function targetEipNumbers(): Promise<number[]> {
  const args = process.argv.slice(2);
  const explicit = args.filter((a) => /^\d+$/.test(a)).map(Number);
  if (explicit.length > 0) return explicit;

  if (args.includes('--all')) {
    const rows = await prisma.eip_curations.findMany({ select: { eip_number: true } });
    return rows.map((r) => r.eip_number);
  }

  // Rows still authored by an import actor (i.e. not yet AI-generated) — used
  // to finish a run that partially failed on rate limits.
  if (args.includes('--pending')) {
    const actor = currentAiActor();
    const rows = await prisma.eip_curations.findMany({
      where: { updated_by: { notIn: [actor] } },
      select: { eip_number: true, updated_by: true },
    });
    return rows
      .filter((r) => isMachineAuthored(r.updated_by))
      .map((r) => r.eip_number);
  }

  // Default: EIPs in the composition of in-progress upgrades.
  const upgrades = await prisma.upgrades.findMany({
    where: { slug: { in: IN_PROGRESS_SLUGS } },
    select: { id: true },
  });
  const comp = await prisma.upgrade_composition_current.findMany({
    where: { upgrade_id: { in: upgrades.map((u) => u.id) } },
    select: { eip_number: true },
  });
  return Array.from(new Set(comp.map((c) => c.eip_number))).sort((a, b) => a - b);
}

async function main() {
  if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error('No GROQ_API_KEY or ANTHROPIC_API_KEY set — cannot generate.');
    process.exit(1);
  }
  const actor = currentAiActor();
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

  const numbers = (await targetEipNumbers()).slice(0, limit);
  console.log(`Generating curations for ${numbers.length} EIPs via ${actor}…`);

  let generated = 0;
  let skippedHuman = 0;
  let failed = 0;

  for (const eipNumber of numbers) {
    const existing = await prisma.eip_curations.findUnique({
      where: { eip_number: eipNumber },
      select: { updated_by: true, headliner_of: true, headliner_note: true, layer: true },
    });
    if (existing && !isMachineAuthored(existing.updated_by)) {
      skippedHuman += 1;
      console.log(`  EIP-${eipNumber}: skip (edited by ${existing.updated_by})`);
      continue;
    }

    try {
      const gen = await generateEipCuration(eipNumber);
      if (!gen) {
        failed += 1;
        console.log(`  EIP-${eipNumber}: no spec / no output`);
        continue;
      }
      // Preserve curated headliner/layer flags; replace only the prose.
      const data = {
        layman_title: gen.laymanTitle ?? null,
        layman_summary: gen.laymanSummary ?? null,
        benefits: gen.benefits ?? Prisma.DbNull,
        tradeoffs: gen.tradeoffs ?? Prisma.DbNull,
        stakeholder_impacts: gen.stakeholderImpacts ?? Prisma.DbNull,
        headliner_of: existing?.headliner_of ?? null,
        headliner_note: existing?.headliner_note ?? null,
        layer: existing?.layer ?? null,
        updated_by: actor,
      };
      await prisma.eip_curations.upsert({
        where: { eip_number: eipNumber },
        create: { eip_number: eipNumber, ...data },
        update: data,
      });
      generated += 1;
      const bits = [
        gen.laymanSummary ? 'summary' : null,
        gen.benefits?.length ? `${gen.benefits.length} benefits` : null,
        gen.stakeholderImpacts ? `${Object.keys(gen.stakeholderImpacts).length} stakeholders` : null,
      ].filter(Boolean);
      console.log(`  EIP-${eipNumber}: ✓ ${bits.join(', ')}`);
    } catch (err) {
      failed += 1;
      console.log(`  EIP-${eipNumber}: error — ${(err as Error).message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. Generated ${generated}, skipped ${skippedHuman} human-edited, ${failed} failed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
