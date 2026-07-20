-- Dedupe marker for the scheduler's "call artifacts ready" Discord announcement.
ALTER TABLE "protocol_calls" ADD COLUMN "announced_at" TIMESTAMPTZ(6);

CREATE INDEX "protocol_calls_announced_at_idx" ON "protocol_calls"("announced_at");

-- Backfill: mark every ALREADY-populated call as announced.
--
-- This is the important part. Without it, the notifier's first run would see
-- ~300 historical calls sitting at announced_at IS NULL, consider them all
-- newly populated, and fire a Discord post for every one of them.
--
-- Calls that are not yet populated stay NULL so they announce normally once
-- their transcript/decisions land.
UPDATE "protocol_calls"
SET "announced_at" = COALESCE("source_updated_at", "updated_at", NOW())
WHERE "key_decisions" IS NOT NULL
   OR "has_transcript" = true
   OR "has_tldr" = true;
