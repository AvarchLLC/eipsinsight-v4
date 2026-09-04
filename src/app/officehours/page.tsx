"use client";

import Link from "next/link";
import { EditorialActivityDashboard } from "@/components/editorial-activity-dashboard";
import { OFFICE_HOUR_MEETINGS } from "@/data/office-hour-meetings.generated";

/**
 * EIP Editing Office Hours editorial-activity dashboard. The dashboard itself is
 * shared with the EIPIP hub — this page just points it at the office-hour meetings.
 */
export default function OfficeHoursPage() {
  return (
    <EditorialActivityDashboard
      meetings={OFFICE_HOUR_MEETINGS}
      meetingNoun="Office Hour"
      meetingNounPlural="EIP Editing Office Hours"
      csvPrefix="office-hours"
      footer={
        <p className="text-center text-[11px] text-muted-foreground">
          Looking for the June 2 EIP/ERC Blitz event dashboard?{" "}
          <Link href="/EIPOH100" className="text-primary hover:underline">Open /eipoh100</Link>.
        </p>
      }
    />
  );
}
