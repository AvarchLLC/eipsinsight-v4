import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [snapshotProposals, ripProposals, monitoredUpgrades, openGovernancePrs, activeContributors] = await Promise.all([
      prisma.eip_snapshots.count(),
      prisma.rips.count(),
      prisma.upgrades.count(),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count
         FROM pull_requests pr
         JOIN repositories r ON r.id = pr.repository_id
         WHERE pr.state = 'open'
           AND LOWER(SPLIT_PART(r.name, '/', 2)) IN ('eips', 'ercs', 'rips')`
      ).then((rows) => Number(rows[0]?.count ?? 0)),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT actor)::bigint AS count
         FROM contributor_activity
         WHERE actor IS NOT NULL
           AND TRIM(actor) <> ''
           AND occurred_at >= (NOW() - INTERVAL '180 days')`
      ).then((rows) => Number(rows[0]?.count ?? 0)),
    ]);

    return NextResponse.json({
      proposalsTracked: snapshotProposals + ripProposals,
      governancePrsOpen: openGovernancePrs,
      upgradesMonitored: monitoredUpgrades,
      activeContributors180d: activeContributors,
    });
  } catch (error) {
    console.error('[team-glance] Failed to load metrics', error);

    return NextResponse.json(
      {
        proposalsTracked: 0,
        governancePrsOpen: 0,
        upgradesMonitored: 0,
        activeContributors180d: 0,
      },
      { status: 200 }
    );
  }
}
