"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { client } from "@/lib/orpc";
import { VideoEditor } from "../../_components/video-editor";

export default function EditVideoPage() {
  const params = useParams();
  const id = params.id as string;
  const [video, setVideo] = useState<{
    id: string;
    youtubeUrl: string;
    title: string;
    description: string | null;
    tags?: string[];
    published: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    client.video
      .getById({ id })
      .then(setVideo)
      .catch(() => setVideo(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">Video not found</p>
      </div>
    );
  }

  return (
    <VideoEditor
      mode="edit"
      videoId={video.id}
      initialData={{
        youtubeUrl: video.youtubeUrl,
        title: video.title,
        description: video.description ?? "",
        tags: video.tags ?? [],
        published: video.published,
      }}
    />
  );
}
