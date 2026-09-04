import AnalyticsLayout from "@/app/analytics/analytics-layout-client";
import PRsAnalyticsPage from "@/app/analytics/prs/page";

/**
 * PR Analytics as an Office Hours tab: created / merged / closed / open PR
 * stats and charts over a selectable time frame. Rendered "bare" (provider +
 * children only) so the PR page owns a single filter bar (time frame + repos)
 * under the Office Hours shell.
 */
export default function OfficeHoursPrsPage() {
  return (
    <AnalyticsLayout embedded embeddedBare>
      <PRsAnalyticsPage />
    </AnalyticsLayout>
  );
}
