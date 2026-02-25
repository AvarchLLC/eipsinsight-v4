"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Video,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";

type VideoItem = {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
  displayOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const fetchVideos = () => {
    setLoading(true);
    client.video
      .list({ publishedOnly: false, limit: 100 })
      .then((res) => setVideos(res.videos as VideoItem[]))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    setDeletingId(id);
    try {
      await client.video.delete({ id });
      setVideos((v) => v.filter((x) => x.id !== id));
    } catch {
      alert("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const moveVideo = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === videos.length - 1)
    )
      return;

    const newVideos = [...videos];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newVideos[index], newVideos[targetIndex]] = [
      newVideos[targetIndex],
      newVideos[index],
    ];

    setVideos(newVideos);
    setReordering(true);

    try {
      await client.video.reorder({
        videoIds: newVideos.map((v) => v.id),
      });
    } catch {
      alert("Failed to reorder");
      fetchVideos();
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/resources/videos"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Videos
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="dec-title text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-1">
                Manage Videos
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add, edit, and organize video content.
              </p>
            </div>
            <Link
              href="/admin/videos/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Add Video
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-24">
            <div className="rounded-full bg-purple-500/20 p-6 inline-flex mb-6">
              <Video className="h-12 w-12 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              No videos yet
            </h2>
            <Link
              href="/admin/videos/new"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-linear-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Add first video
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveVideo(index, "up")}
                      disabled={index === 0 || reordering}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <GripVertical className="h-4 w-4 text-slate-400 rotate-90" />
                    </button>
                    <button
                      onClick={() => moveVideo(index, "down")}
                      disabled={index === videos.length - 1 || reordering}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <GripVertical className="h-4 w-4 text-slate-400 -rotate-90" />
                    </button>
                  </div>
                  <div className="relative h-16 w-28 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                    {video.thumbnail ? (
                      <Image
                        src={video.thumbnail}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 dark:text-white truncate">
                    {video.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Order: {video.displayOrder} ·{" "}
                    {new Date(video.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                      video.published
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-slate-500/20 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {video.published ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                    {video.published ? "Published" : "Draft"}
                  </span>
                  <Link
                    href={`/admin/videos/${video.id}/edit`}
                    className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(video.id)}
                    disabled={deletingId === video.id}
                    className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === video.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
