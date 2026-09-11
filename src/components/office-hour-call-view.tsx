import Link from "next/link";
import { ArrowLeft, CalendarClock, FileText, Gavel } from "lucide-react";
import {
  CallPlayer,
  CallVideoFallback,
} from "@/components/upgrade/call-player";
import { OfficeHourRecap } from "@/components/office-hour-recap";
import type { OhRecap } from "@/data/office-hour-recaps";
import type { TranscriptCue } from "@/lib/call-artifacts";
import cues111 from "@/data/office-hour-111-transcript.json";
import cuesEthproofs009 from "@/data/ethproofs-009-transcript.json";
import cuesEthproofs010 from "@/data/ethproofs-010-transcript.json";
import { CallTldr } from "@/components/upgrade/call-tldr";
import { KeyDecisionsList } from "@/components/upgrade/key-decisions";

// Static transcripts per office-hour call, keyed "<series>-<meeting>".
// Add EIPIP / future office-hour transcripts here until the artifact pipeline covers them.
const TRANSCRIPTS: Record<string, TranscriptCue[]> = {
  "eipoh-111": cues111 as TranscriptCue[],
  "ethproofs-9": cuesEthproofs009 as TranscriptCue[],
  "ethproofs-10": cuesEthproofs010 as TranscriptCue[],
};

function getYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
  );
  return m ? m[1] : null;
}

/** Detail view for a static office-hour / EIPIP call, rendered at /calls/<series>/<number>. */
export function OfficeHourCallView({ recap }: { recap: OhRecap }) {
  const youtubeId = getYoutubeId(recap.youtube);
  const cues = TRANSCRIPTS[`${recap.series}-${recap.meeting}`] ?? [];
  const backHref =
    recap.series === "eipip"
      ? "/eipip/calls"
      : recap.series === "ethproofs"
        ? "/calls"
        : "/officehours/calls";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6">
      {/* Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to {recap.series === "eipip" ? "Meetings" : "Calls"}
        </Link>
      </div>

      <header className="border-b border-border/40 pb-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 uppercase">
            {recap.series}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{String(recap.meeting).padStart(3, '0')}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {recap.title}
          </h1>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" /> {recap.displayDate}
          </span>
          {recap.keyDecisions && recap.keyDecisions.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Gavel className="h-4 w-4" /> {recap.keyDecisions.length} decision{recap.keyDecisions.length === 1 ? '' : 's'}
            </span>
          )}
          {cues.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> {cues.length} transcript lines
            </span>
          )}
        </div>
      </header>

      {youtubeId ? (
        <CallPlayer youtubeId={youtubeId} cues={cues} />
      ) : recap.youtube ? (
        <CallVideoFallback videoUrl={recap.youtube} />
      ) : null}

      {recap.tldr ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Call summary
              </h2>
              <CallTldr tldr={recap.tldr} />
            </section>
          </div>
          
          <div className="space-y-6 lg:col-span-1">
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                <Gavel className="h-4 w-4 text-muted-foreground" />
                Key decisions
              </h2>
              {recap.keyDecisions && recap.keyDecisions.length > 0 ? (
                <KeyDecisionsList
                  decisions={recap.keyDecisions}
                  seekable={Boolean(youtubeId)}
                />
              ) : (
                <div className="rounded-xl border border-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
                  No key decisions recorded for this call.
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <OfficeHourRecap recap={recap} defaultOpen />
      )}
    </div>
  );
}
