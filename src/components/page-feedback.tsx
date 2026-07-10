"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Loader2, Trash2, Send, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { client } from "@/lib/orpc";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Feedback = {
  id: string;
  page_path: string;
  category: string;
  severity: string;
  content: string;
  status: string;
  is_anonymous: boolean;
  user_name?: string | null;
  created_at: string | Date;
};

type FeedbackSeverity = "low" | "medium" | "high" | "critical";

export function PageFeedback() {
  const pathname = usePathname();
  const { data: session, loading: sessionLoading } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [selectedSeverity, setSelectedSeverity] = useState<FeedbackSeverity>("medium");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.feedback.listFeedbackByPage({
        page_path: pathname,
        limit: 50,
        offset: 0,
      });
      setFeedbacks(response.feedbacks as Feedback[]);
    } catch {
      setFeedbacks([]);
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
    }
  }, [isOpen, fetchFeedbacks]);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    const role = (session as { user?: { role?: string }; role?: string })?.user?.role
      ?? (session as { user?: { role?: string }; role?: string })?.role;
    setIsAdmin(role === "admin");
  }, [session]);

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) return;

    setIsSubmitting(true);
    try {
      await client.feedback.createFeedback({
        page_path: pathname,
        category: selectedCategory,
        severity: selectedSeverity,
        content: feedbackContent.trim(),
        is_anonymous: isAnonymous,
      });
      setFeedbackContent("");
      setSelectedCategory("general");
      setSelectedSeverity("medium");
      await fetchFeedbacks();
      toast.success("Thank you for your feedback!");
      setActiveTab("history");
    } catch (error) {
      toast.error("Failed to submit feedback");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Delete this feedback?")) return;

    setDeletingId(id);
    try {
      await client.feedback.deleteFeedback({ id });
      await fetchFeedbacks();
      toast.success("Feedback deleted");
    } catch (error) {
      toast.error("Failed to delete feedback");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const severityColors = {
    low: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25",
    medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25",
    high: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/25",
    critical: "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25",
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 right-16 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-95",
          isOpen
            ? "border-primary/50 bg-primary/20 text-primary scale-105"
            : "border-border bg-card/85 text-foreground hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
        )}
        title="Page Feedback"
      >
        <MessageSquare className="h-4.5 w-4.5" />
      </button>

      {/* Floating Panel Popup */}
      {isOpen && (
        <Card className="fixed bottom-[64px] right-4 z-50 w-[385px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-border bg-card/95 p-0 shadow-2xl shadow-black/30 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="border-b border-border/60 px-4 py-3 flex flex-row items-center justify-between bg-muted/20">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              Page Feedback
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* Toggle Tabs */}
          <div className="flex border-b border-border/60 bg-muted/10 text-xs">
            <button
              onClick={() => setActiveTab("form")}
              className={cn(
                "flex-1 py-2.5 text-center font-semibold border-b-2 transition-colors",
                activeTab === "form"
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Submit Feedback
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 py-2.5 text-center font-semibold border-b-2 transition-colors",
                activeTab === "history"
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Activity Log ({feedbacks.length})
            </button>
          </div>

          <CardContent className="p-4 space-y-4 max-h-[360px] overflow-y-auto">
            {activeTab === "form" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="feedback" className="text-xs font-semibold text-foreground">
                    Your feedback
                  </label>
                  <textarea
                    id="feedback"
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    placeholder="Let us know what you think. What can we improve on this page?"
                    disabled={sessionLoading}
                    maxLength={2000}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="category" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Category
                    </label>
                    <select
                      id="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      disabled={sessionLoading}
                      className="w-full rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs text-foreground disabled:opacity-50 focus:outline-none"
                    >
                      <option value="general">General</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="content">Content Issue</option>
                      <option value="ui">UI/UX</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="severity" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Severity
                    </label>
                    <select
                      id="severity"
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value as FeedbackSeverity)}
                      disabled={sessionLoading}
                      className="w-full rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs text-foreground disabled:opacity-50 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      disabled={sessionLoading}
                      className="rounded border-border bg-muted/40 text-primary focus-visible:ring-primary/40"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Submit anonymously
                    </span>
                  </label>
                  <Button
                    type="button"
                    onClick={handleSubmitFeedback}
                    disabled={!feedbackContent.trim() || isSubmitting || sessionLoading}
                    size="sm"
                    className="h-8 rounded-lg persona-gradient border border-primary/35 text-xs text-black hover:opacity-90 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Submit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {sessionLoading || loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No feedback submitted for this page yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {feedbacks.map((feedback) => (
                      <div
                        key={feedback.id}
                        className="rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-primary/5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground">
                                {feedback.is_anonymous ? "Anonymous" : feedback.user_name || "Anonymous"}
                              </span>
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider",
                                severityColors[feedback.severity as keyof typeof severityColors]
                              )}>
                                {feedback.severity}
                              </span>
                              <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground uppercase">
                                {feedback.category}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(feedback.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteFeedback(feedback.id)}
                              disabled={deletingId === feedback.id}
                              className="h-6 w-6 text-muted-foreground hover:text-rose-500 rounded"
                            >
                              {deletingId === feedback.id ? (
                                <Loader2 className="h-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                          {feedback.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
