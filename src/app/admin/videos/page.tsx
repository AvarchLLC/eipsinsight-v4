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
  ArrowUp,
  ArrowDown,
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
      {/* Enhanced Header */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 py-12">
          <Link
            href="/resources/videos"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Videos
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <h1 className="dec-title text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2">
                Manage Videos
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Create, edit, and organize your video collection.
              </p>
            </div>
            <Link
              href="/admin/videos/new"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-linear-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 w-fit"
            >
              <Plus className="h-5 w-5" />
              Add New Video
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-r from-cyan-500 to-emerald-500 rounded-full blur-2xl opacity-20" />
              <Loader2 className="relative h-12 w-12 animate-spin text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-400">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-32 max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-8">
              <Video className="h-12 w-12 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              No Videos Yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Start building your video library by adding your first video.
            </p>
            <Link
              href="/admin/videos/new"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-linear-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              Add First Video
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header info */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg px-4 py-3 text-sm text-slate-600 dark:text-slate-400 mb-6">
              <p>
                <span className="font-semibold text-slate-900 dark:text-white">{videos.length}</span> video{videos.length !== 1 ? 's' : ''} in your library
              </p>
            </div>

            {/* Video list */}
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="group relative rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 p-5 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 hover:border-cyan-500/50 dark:hover:border-cyan-500/50"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Drag handle + thumbnail */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveVideo(index, "up")}
                        disabled={index === 0 || reordering}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </button>
                      <button
                        onClick={() => moveVideo(index, "down")}
                        disabled={index === videos.length - 1 || reordering}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </button>
                    </div>
                    <div className="relative h-20 w-32 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md">
                      <Image
                        src={
                          video.thumbnail ??
                          `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`
                        }
                        alt={video.title}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  </div>

                  {/* Video info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate text-lg mb-1">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                      <span>Order: <span className="font-semibold text-slate-700 dark:text-slate-300">{video.displayOrder}</span></span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Status and actions */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        video.published
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30"
                      }`}
                    >
                      {video.published ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      {video.published ? "Published" : "Draft"}
                    </span>
                    
                    <Link
                      href={`/admin/videos/${video.id}/edit`}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    
                    <button
                      onClick={() => handleDelete(video.id)}
                      disabled={deletingId === video.id}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
