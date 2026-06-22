-- Add category and subcategory classification columns to pr_governance_state
ALTER TABLE "pr_governance_state" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "pr_governance_state" ADD COLUMN IF NOT EXISTS "subcategory" TEXT;
