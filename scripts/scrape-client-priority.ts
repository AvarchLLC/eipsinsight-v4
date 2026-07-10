/**
 * Scrape client-team EIP priorities from each team's primary source, extract
 * structured stances with an LLM, and write them to `upgrade_client_priority`
 * as our own owned data (replacing the seeded snapshot).
 *
 * Usage: bun run scripts/scrape-client-priority.ts [fork-slug] [--dry-run]
 *   default fork: glamsterdam. --dry-run prints results without writing.
 *
 * Skips forks whose row was hand-edited by an admin (updated_by is an email).
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { CLIENT_PRIORITY_SOURCES } from '../src/data/client-priority-sources';
import {
  aggregateStances,
  extractStances,
  fetchSourceText,
} from '../src/lib/client-priority-scrape';
import { isMachineAuthored, currentAiActor } from '../src/lib/ai-curation';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const slug = args.find((a) => !a.startsWith('--')) ?? 'glamsterdam';
  const sources = CLIENT_PRIORITY_SOURCES[slug];
  if (!sources) {
    console.error(`No sources configured for "${slug}".`);
    process.exit(1);
  }

  const existing = await prisma.upgrade_client_priority.findUnique({
    where: { fork_slug: slug },
    select: { updated_by: true },
  });
  if (existing && !isMachineAuthored(existing.updated_by)) {
    console.log(`Skipping ${slug}: row was hand-edited by ${existing.updated_by}.`);
    return;
  }

  const perSource: Array<{ source: (typeof sources)[number]; stances: Awaited<ReturnType<typeof extractStances>> }> = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let first = true;

  for (const source of sources) {
    if (source.skip) {
      console.log(`· skip   ${source.url} (${source.note ?? 'flagged'})`);
      continue;
    }
    const text = await fetchSourceText(source);
    if (!text) {
      console.log(`· FETCH  ${source.url} → no content`);
      continue;
    }
    if (!first) {
      console.log(`· sleep  25s to respect rate limits...`);
      await sleep(25_000);
    }
    first = false;
    const stances = await extractStances(source, text);
    console.log(
      `· ok     ${source.url} → ${stances.length} stances (${new Set(stances.map((s) => s.clientName)).size} teams)`
    );
    perSource.push({ source, stances });
  }

  const eips = aggregateStances(perSource);
  const totalStances = eips.reduce((sum, e) => sum + e.stances.length, 0);
  if (eips.length === 0) {
    console.log('No stances extracted — leaving existing data untouched.');
    return;
  }

  const teams = new Set(eips.flatMap((e) => e.stances.map((s) => s.clientName)));
  console.log(
    `\nExtracted ${eips.length} EIPs, ${totalStances} stances, ${teams.size} teams: ${[...teams].sort().join(', ')}`
  );

  if (dryRun) {
    console.log('\n--- DRY RUN sample (first 5 EIPs) ---');
    for (const e of eips.slice(0, 5)) {
      console.log(
        `EIP-${e.eipId}: ${e.stances.map((s) => `${s.clientName}=${s.rawRating}(${s.normalizedScore ?? '?'})`).join(', ')}`
      );
    }
    console.log('\nDry run — nothing written.');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  await prisma.upgrade_client_priority.upsert({
    where: { fork_slug: slug },
    create: {
      fork_slug: slug,
      last_updated: today,
      eips: eips as object,
      updated_by: `scraper:${currentAiActor().split(':')[1]}`,
    },
    update: {
      last_updated: today,
      eips: eips as object,
      updated_by: `scraper:${currentAiActor().split(':')[1]}`,
    },
  });

  console.log(
    `\nWrote ${eips.length} EIPs, ${totalStances} stances for ${slug} from ${perSource.length} sources.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
