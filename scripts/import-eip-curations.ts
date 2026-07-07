/**
 * One-off/repeatable importer: seeds `eip_curations` from a public upstream
 * curation dataset (src/data/eips/*.json in the source checkout).
 *
 * Usage:
 *   bun run scripts/import-eip-curations.ts [path-to-upstream-eips-dir]
 *
 * Only rows last written by this importer (or brand-new EIPs) are updated, so
 * manual edits made in /admin/curations are never clobbered.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { prisma } from '../src/lib/prisma';

const IMPORT_ACTOR = 'dataset-import';
const LEGACY_IMPORT_ACTORS = ['upstream-import', 'dataset-import'];

interface UpstreamForkRelationship {
  forkName?: string;
  isHeadliner?: boolean;
}

interface UpstreamEip {
  id: number;
  title?: string;
  layer?: 'EL' | 'CL';
  laymanDescription?: string;
  laymanTitle?: string;
  benefits?: string[] | null;
  tradeoffs?: string[] | null;
  stakeholderImpacts?: Record<string, { description?: string; impact?: string }> | null;
  northStarAlignment?: Record<string, { description?: string }> | null;
  forkRelationships?: UpstreamForkRelationship[];
}

async function main() {
  const dir = resolve(
    process.argv[2] ?? join(process.cwd(), '../upstream/src/data/eips')
  );
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  console.log(`Reading ${files.length} EIP files from ${dir}`);

  let imported = 0;
  let skippedNoContent = 0;
  let skippedManuallyEdited = 0;

  for (const file of files) {
    let eip: UpstreamEip;
    try {
      eip = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (err) {
      console.warn(`Skipping unparseable file ${file}:`, err);
      continue;
    }

    if (!eip.id || !Number.isFinite(eip.id)) continue;

    const headlinerFork = eip.forkRelationships?.find((rel) => rel.isHeadliner);
    const hasContent =
      eip.layer ||
      eip.laymanDescription ||
      (eip.benefits && eip.benefits.length > 0) ||
      (eip.tradeoffs && eip.tradeoffs.length > 0) ||
      (eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0) ||
      headlinerFork;

    if (!hasContent) {
      skippedNoContent += 1;
      continue;
    }

    const existing = await prisma.eip_curations.findUnique({
      where: { eip_number: eip.id },
      select: { updated_by: true },
    });
    if (existing && !LEGACY_IMPORT_ACTORS.includes(existing.updated_by ?? '')) {
      skippedManuallyEdited += 1;
      continue;
    }

    const data = {
      layman_title: eip.laymanTitle ?? null,
      layman_summary: eip.laymanDescription ?? null,
      benefits: eip.benefits && eip.benefits.length > 0 ? eip.benefits : undefined,
      tradeoffs: eip.tradeoffs && eip.tradeoffs.length > 0 ? eip.tradeoffs : undefined,
      stakeholder_impacts:
        eip.stakeholderImpacts && Object.keys(eip.stakeholderImpacts).length > 0
          ? eip.stakeholderImpacts
          : undefined,
      north_star:
        eip.northStarAlignment && Object.keys(eip.northStarAlignment).length > 0
          ? eip.northStarAlignment
          : undefined,
      headliner_of: headlinerFork?.forkName?.toLowerCase() ?? null,
      layer: eip.layer ?? null,
      updated_by: IMPORT_ACTOR,
    };

    await prisma.eip_curations.upsert({
      where: { eip_number: eip.id },
      create: { eip_number: eip.id, ...data },
      update: data,
    });
    imported += 1;
  }

  console.log(
    `Done. Upserted ${imported}, skipped ${skippedNoContent} without curated content, ` +
      `left ${skippedManuallyEdited} manually-edited rows untouched.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
