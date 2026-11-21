import AnalyticsLayout from "@/app/analytics/analytics-layout-client";
import ReviewersAnalyticsPage from "@/app/analytics/reviewers/page";

/**
 * Reviewers analytics as an Office Hours tab: the full reviewer leaderboard,
 * PR & action explorer, repository distribution, and review velocity trends.
 * Rendered "embedded" so it reuses the analytics provider + a compact
 * time-range / repo controls bar under the Office Hours shell.
 */
export default function OfficeHoursReviewersPage() {
  return (
    <AnalyticsLayout
      embedded
      embeddedTitle="Reviewer Analytics"
      embeddedSubtitle="Leaderboard, review velocity, activity explorer, and repository distribution for EIP reviewers."
    >
      <ReviewersAnalyticsPage />
    </AnalyticsLayout>
  );
}
