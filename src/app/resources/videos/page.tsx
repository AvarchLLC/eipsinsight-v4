"use client";

import Link from "next/link";
import { ArrowLeft, Video, Loader2, Plus, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { client } from "@/lib/orpc";

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
};

const VIDEOS_PER_PAGE = 9;

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const offset = (currentPage - 1) * VIDEOS_PER_PAGE;

    Promise.all([
      client.video.list({ publishedOnly: true, limit: VIDEOS_PER_PAGE, offset }),
      client.account.getMe().then((u) => u.role === "admin").catch(() => false),
    ])
      .then(([res, admin]) => {
        if (!cancelled) {
          setVideos(res.videos as VideoItem[]);
          setTotal(res.total);
          setIsAdmin(admin);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideos([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  const totalPages = Math.ceil(total / VIDEOS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl mb-2">
                Videos
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Talks, walkthroughs, and explainers about Ethereum standards.
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Link
                  href="/admin/videos"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50"
                >
                  <Pencil className="h-4 w-4" />
                  Manage
                </Link>
                <Link
                  href="/admin/videos/new"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
                >
                  <Plus className="h-4 w-4" />
                  Add Video
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-24 max-w-lg mx-auto">
            <div className="rounded-full bg-purple-500/20 p-6 inline-flex mb-6">
              <Video className="h-12 w-12 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Videos Coming Soon
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              We&apos;re curating educational videos, talks, and tutorials about EIPs and the Ethereum ecosystem. Stay tuned!
            </p>
            {isAdmin && (
              <Link
                href="/admin/videos/new"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-linear-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
              >
                <Plus className="h-4 w-4" />
                Add first video
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 overflow-hidden hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
                >
                  <div className="relative aspect-video bg-slate-900">
                    <div className="absolute inset-0">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2 line-clamp-2">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          page === currentPage
                            ? "bg-linear-to-r from-emerald-500 to-cyan-500 text-white"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
