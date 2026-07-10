'use client';

import { useState, useMemo } from 'react';
import { Search, Clock, ExternalLink } from 'lucide-react';

export interface TranscriptCue {
  start: string;
  end: string;
  text: string;
}

function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

interface CallTranscriptProps {
  cues: TranscriptCue[];
  videoUrl: string | null;
}

export function CallTranscript({ cues, videoUrl }: CallTranscriptProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const isYoutube = useMemo(() => {
    if (!videoUrl) return false;
    return videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  }, [videoUrl]);

  const filteredCues = useMemo(() => {
    if (!searchQuery.trim()) return cues;
    const query = searchQuery.toLowerCase();
    return cues.filter((cue) => cue.text.toLowerCase().includes(query));
  }, [cues, searchQuery]);

  const getTimestampLink = (startStr: string) => {
    if (!videoUrl) return '#';
    const seconds = timeToSeconds(startStr);
    if (isYoutube) {
      const urlObj = new URL(videoUrl);
      urlObj.searchParams.set('t', `${seconds}s`);
      return urlObj.toString();
    }
    return `${videoUrl}#t=${seconds}`;
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Transcript</h3>
          <p className="text-xs text-muted-foreground">
            Search conversation cues. Click timestamps to jump to video recording.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background/50 pl-8 pr-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto divide-y divide-border/40 pr-2 space-y-2">
        {filteredCues.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            No matching cues found.
          </p>
        ) : (
          filteredCues.map((cue, idx) => (
            <div key={idx} className="flex gap-4 py-2.5 items-start text-sm group">
              <a
                href={getTimestampLink(cue.start)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 shrink-0 font-mono text-xs text-primary hover:underline hover:text-primary-focus bg-primary/5 px-2 py-0.5 rounded transition-colors"
                title="Jump to time"
              >
                <Clock className="h-3 w-3" />
                {cue.start}
                <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <p className="text-foreground/90 leading-relaxed min-w-0 flex-1">
                {cue.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
