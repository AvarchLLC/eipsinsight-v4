import { redirect } from "next/navigation";

/**
 * The Office Hours "Analytics" tab was removed; the Overview page now carries
 * the editorial-activity metrics. Redirect any old links to the Overview.
 */
export default function OfficeHoursAnalyticsRedirect() {
  redirect("/officehours");
}
