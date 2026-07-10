/**
 * One-time force-regeneration script for key decisions.
 * Query all rows that have tldr and decisions, generate decisions using local LLM,
 * and mark them with a provenance marker { generated_by: 'llm' }.
 *
 * Usage:
 *   bun run scripts/regenerate-key-decisions.ts
 *   LIMIT=10 bun run scripts/regenerate-key-decisions.ts
 */
import { prisma } from '../src/lib/prisma';
import { callLLM, extractJson } from '../src/lib/ai-curation';

import { Prisma } from '../src/generated/prisma/client';

const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;
const SLEEP_MS = 4000; // Groq free tier limit friendly delay

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error('Error: GROQ_API_KEY or GEMINI_API_KEY must be configured in your environment.');
    process.exit(1);
  }

  console.log('Querying protocol calls with tldr and existing decisions...');
  const calls = await prisma.protocol_calls.findMany({
    where: {
      tldr: { not: Prisma.AnyNull },
      key_decisions: { not: Prisma.AnyNull },
    },
    select: {
      id: true,
      series: true,
      call_id: true,
      call_number: true,
      occurred_on: true,
      tldr: true,
      key_decisions: true,
    },
    orderBy: { occurred_on: 'desc' },
    take: LIMIT,
  });

  console.log(`Found ${calls.length} calls to regenerate.`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    const key = `${call.series}:${call.call_id}`;

    // Skip if already processed in a previous run of this script to make it resumeable/idempotent
    const currentDecisions = call.key_decisions as any;
    if (currentDecisions && currentDecisions.generated_by === 'llm') {
      console.log(`[${i + 1}/${calls.length}] Skipping ${key} (already marked as generated_by: 'llm')`);
      succeeded++;
      continue;
    }

    console.log(`[${i + 1}/${calls.length}] Processing ${key}...`);

    let tldrObj = call.tldr;
    if (typeof tldrObj === 'string') {
      try {
        tldrObj = JSON.parse(tldrObj);
      } catch {
        console.error(`  Error parsing stored tldr for ${key}`);
        failed++;
        continue;
      }
    }

    if (!tldrObj || typeof tldrObj !== 'object') {
      console.error(`  Invalid tldr payload for ${key}`);
      failed++;
      continue;
    }

    const meetingName = (tldrObj as any).meeting || `${call.series.toUpperCase()} #${call.call_number || ''}`;

    const systemPrompt = "You extract structured governance decisions from an Ethereum protocol call summary. Use only what the summary states; never invent EIPs or decisions. Return one JSON object.";

    const userPrompt = `Meeting name: "${meetingName}"
Call summary (tldr.json):
${JSON.stringify(tldrObj, null, 2)}

Please extract any key decisions made during this meeting.
You must return a single JSON object matching this schema:
{
  "meeting": "${meetingName}",
  "key_decisions": [
    {
      "original_text": "verbatim text or clear summary of the decision (e.g. 'EIP-8282 deferred; revisit at ACDT Monday')",
      "timestamp": "HH:MM:SS or MM:SS format if mentioned in the text, otherwise omit",
      "type": "stage_change | devnet_inclusion | headliner_selected | other",
      "eips": [8282], // array of EIP numbers (integers only) explicitly mentioned in the decision
      "stage_change": { "to": "Proposed | Considered | Scheduled | Included | Declined | Withdrawn" }, // optional, only for type="stage_change"
      "devnet": "devnet name, e.g. 'glamsterdam-devnet-7'", // optional, only for type="devnet_inclusion"
      "context": "short explanation or rationale" // optional
    }
  ]
}

Ensure:
- "eips" contains only actual numeric EIP IDs found in the text.
- Omit fields that cannot be grounded in the text.
- Do not invent any decisions. If there are no key decisions, "key_decisions" should be an empty array.
- Return ONLY valid JSON matching this schema.`;

    try {
      const response = await callLLM(systemPrompt, userPrompt, 'llama-3.1-8b-instant');
      if (!response) {
        throw new Error('Received empty response from LLM');
      }

      const jsonText = extractJson(response);
      if (!jsonText) {
        throw new Error(`Failed to extract JSON from response: ${response.slice(0, 100)}`);
      }

      const parsed = JSON.parse(jsonText);
      const updatedDecisions = {
        ...parsed,
        generated_by: 'llm',
      };

      await prisma.protocol_calls.update({
        where: { id: call.id },
        data: { key_decisions: updatedDecisions },
      });

      console.log(`  Successfully regenerated key decisions for ${key}`);
      succeeded++;
    } catch (e: any) {
      console.error(`  Error regenerating ${key}: ${e.message}`);
      failed++;
    }

    if (i < calls.length - 1) {
      await sleep(SLEEP_MS);
    }
  }

  console.log('\n--- Run Summary ---');
  console.log(`Total: ${calls.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
}

main()
  .catch((e) => {
    console.error('Fatal execution error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
