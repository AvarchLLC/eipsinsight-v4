import AnalyticsLayout from "@/app/analytics/analytics-layout-client";
import EditorsAnalyticsPage from "@/app/analytics/editors/page";

/**
 * Editors analytics as an Office Hours tab: the full editor leaderboard,
 * action breakdowns, category coverage, and the PR & action explorer.
 * Rendered "embedded" so it reuses the analytics provider + a compact
 * time-range / repo controls bar under the Office Hours shell (no duplicate
 * page chrome), keeping it in sync with /analytics/editors.
 */
export default function OfficeHoursEditorsPage() {
  return (
    <AnalyticsLayout
      embedded
      embeddedTitle="Editor Analytics"
      embeddedSubtitle="Leaderboard, action & category breakdowns, coverage, and a filterable PR / action explorer."
    >
      <EditorsAnalyticsPage />
    </AnalyticsLayout>
  );
}
