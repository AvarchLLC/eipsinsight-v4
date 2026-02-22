-- Performance indexes for EIPsInsight
-- Run with: psql $DIRECT_DATABASE_URL -f prisma/add_performance_indexes.sql

-- eip_snapshots: most queried table, had ZERO indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_snapshots_status ON eip_snapshots(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_snapshots_category ON eip_snapshots(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_snapshots_type ON eip_snapshots(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_snapshots_repository_id ON eip_snapshots(repository_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_snapshots_status_repo ON eip_snapshots(status, repository_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_snapshots_updated_at ON eip_snapshots(updated_at);

-- eip_status_events: heavily queried for timelines, aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_status_events_changed_at ON eip_status_events(changed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_status_events_eip_changed ON eip_status_events(eip_id, changed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_status_events_to_status_changed ON eip_status_events(to_status, changed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eip_status_events_repo_changed ON eip_status_events(repository_id, changed_at);

-- eips: date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eips_created_at ON eips(created_at);

-- pull_requests: state/date filters used everywhere in analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pull_requests_state ON pull_requests(state);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pull_requests_created_at ON pull_requests(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pull_requests_repo_state ON pull_requests(repository_id, state);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pull_requests_repo_created ON pull_requests(repository_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pull_requests_merged_at ON pull_requests(merged_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pull_requests_closed_at ON pull_requests(closed_at);

-- contributor_activity: role-based and action-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contributor_activity_role_occurred ON contributor_activity(role, occurred_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contributor_activity_action_occurred ON contributor_activity(action_type, occurred_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contributor_activity_pr_repo ON contributor_activity(pr_number, repository_id);

-- pull_request_eips: join optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pull_request_eips_repo_pr ON pull_request_eips(repository_id, pr_number);

-- rip_commits: date range for getRIPKPIs recent 30 days
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rip_commits_commit_date ON rip_commits(commit_date);

-- rips: status filter for getRIPKPIs active count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rips_status ON rips(status);
