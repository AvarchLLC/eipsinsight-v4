import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EditorialActivityDashboard } from "@/components/editorial-activity-dashboard";
import { EIPIP_MEETINGS } from "@/data/eipip-meetings.generated";

export const revalidate = 300;

export default function EipipOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Plain-English explainer */}
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What it is</p>
        <h2 className="mt-1 dec-title text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          The working group that improves how EIPs are made.
        </h2>
        <div className="mt-3 grid gap-4 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
          <p>
            EIPIP (the EIP Improvement Process working group) is the recurring call where EIP editors and contributors
            work on the process itself: editor policies, the EIP template and numbering, tooling, and disputes. It is
            separate from the EIP Editing Office Hours, which triage individual proposals.
          </p>
          <p>
            The group has met monthly since 2020. Below is the editorial activity around these meetings: the editors
            who worked, the pull requests they reviewed, and the proposals that changed status. Pick a meeting to focus
            the window on that date, or use a custom range. Recaps and agendas live on the{" "}
            <Link href="/eipip/calls" className="text-primary hover:underline">
              Meetings
            </Link>{" "}
            tab.
          </p>
        </div>
        <div className="mt-3">
          <Link
            href="/officehours"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            EIP Editing Office Hours <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <EditorialActivityDashboard
        meetings={EIPIP_MEETINGS}
        meetingNoun="EIPIP Meeting"
        meetingNounPlural="EIPIP Meetings"
        csvPrefix="eipip"
      />
    </div>
  );
}
