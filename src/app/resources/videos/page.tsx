"use client";

import Link from "next/link";
import { ArrowLeft, Video, Loader2, Plus, Pencil, ChevronLeft, ChevronRight, Play, Sparkles, Filter, X } from "lucide-react";
import { useEffect, useState } from "react";
import { client } from "@/lib/orpc";

type VideoItem = {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  tags?: string[];
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
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Load available tags
  useEffect(() => {
    client.video.getAllTags()
      .then(tags => setAllTags(tags))
      .catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const offset = (currentPage - 1) * VIDEOS_PER_PAGE;

    Promise.all([
      client.video.list({ 
        publishedOnly: true, 
        limit: VIDEOS_PER_PAGE, 
        offset,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      }),
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
  }, [currentPage, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(total / VIDEOS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 py-12">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Resources
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Play className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                  <Sparkles className="inline h-3 w-3 mr-1" />
                  Video Library
                </span>
              </div>
              <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-4xl sm:text-5xl font-bold tracking-tight text-transparent mb-3">
                Learn with Videos
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md">
                Curated educational content, talks, and walkthroughs about Ethereum standards and EIPs.
              </p>
            </div>
            
            {isAdmin && (
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Link
                  href="/admin#videos"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all hover:shadow-md"
                >
                  <Pencil className="h-4 w-4" />
                  Manage Videos
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tag Filter Section */}
      {allTags.length > 0 && (
        <div className="w-full px-2 sm:px-3 lg:px-4 py-6 border-b border-slate-200 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Filter className="h-4 w-4" />
                Filter by Tags:
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedTags.includes(tag)
                        ? "bg-linear-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-cyan-500/30 scale-105"
                        : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
            {selectedTags.length > 0 && (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Showing {total} video{total !== 1 ? 's' : ''} with tag{selectedTags.length !== 1 ? 's' : ''}: {selectedTags.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full px-2 sm:px-3 lg:px-4 py-16">
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
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Video Collection Coming Soon
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
              We&apos;re carefully curating high-quality educational videos, talks, and tutorials about Ethereum standards.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
              Check back soon for in-depth explorations of EIPs and the Ethereum ecosystem.
            </p>
            {isAdmin && (
              <Link
                href="/admin/videos/new"
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-linear-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Be the First to Add
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-500 hover:scale-105"
                  style={{
                    animation: `slideInUp 0.6s ease-out ${index * 50}ms backwards`
                  }}
                >
                  <style>{`
                    @keyframes slideInUp {
                      from {
                        opacity: 0;
                        transform: translateY(20px);
                      }
                      to {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                  `}</style>
                  
                  {/* Card background with gradient border effect */}
                  <div className="absolute inset-0 bg-linear-to-br from-slate-200/50 to-slate-300/50 dark:from-slate-700/50 dark:to-slate-800/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Main card */}
                  <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 dark:hover:shadow-cyan-500/10 transition-all duration-300 backdrop-blur-sm">
                    {/* Video embed container */}
                    <div className="relative aspect-video bg-slate-900 overflow-hidden">
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 z-10">
                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40">
                          <Play className="h-8 w-8 text-white fill-white ml-1" />
                        </div>
                      </div>
                      <iframe
                        src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full group-hover:scale-110 transition-transform duration-300"
                      ></iframe>
                    </div>
                    
                    {/* Content section */}
                    <div className="p-6 space-y-3">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 group-hover:line-clamp-3 transition-all">
                          {video.description}
                        </p>
                      )}
                      {video.tags && video.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {video.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>Featured Content</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-8">
                <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                  Page <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> of <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${
                            page === currentPage
                              ? "bg-linear-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-cyan-500/30"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50"
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
