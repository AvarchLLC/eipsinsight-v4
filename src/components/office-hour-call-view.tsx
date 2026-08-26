import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { CallPlayer, CallVideoFallback } from "@/components/upgrade/call-player";
import { OfficeHourRecap } from "@/components/office-hour-recap";
import type { OhRecap } from "@/data/office-hour-recaps";
import type { TranscriptCue } from "@/lib/call-artifacts";
import cues111 from "@/data/office-hour-111-transcript.json";

// Static transcripts per office-hour call, keyed "<series>-<meeting>".
// Add EIPIP / future office-hour transcripts here until the artifact pipeline covers them.
const TRANSCRIPTS: Record<string, TranscriptCue[]> = {
  "eipoh-111": cues111 as TranscriptCue[],
};

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return m ? m[1] : null;
}

/** Detail view for a static office-hour / EIPIP call, rendered at /calls/<series>/<number>. */
export function OfficeHourCallView({ recap }: { recap: OhRecap }) {
  const youtubeId = getYoutubeId(recap.youtube);
  const cues = TRANSCRIPTS[`${recap.series}-${recap.meeting}`] ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <Link href="/officehours/calls" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Calls
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" /> {recap.displayDate} · Meeting #{recap.meeting}
        </div>
        <h1 className="persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{recap.title}</h1>
        {cues.length > 0 && <p className="text-xs text-muted-foreground">{cues.length} transcript lines · recording synced below</p>}
      </header>

      {youtubeId ? <CallPlayer youtubeId={youtubeId} cues={cues} /> : <CallVideoFallback videoUrl={recap.youtube} />}

      <OfficeHourRecap recap={recap} defaultOpen />
    </div>
  );
}
