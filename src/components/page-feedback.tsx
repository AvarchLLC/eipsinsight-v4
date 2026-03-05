"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Loader2, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { client } from "@/lib/orpc";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [selectedSeverity, setSelectedSeverity] = useState<FeedbackSeverity>("medium");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
    fetchFeedbacks();
  }, [fetchFeedbacks]);

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
    <Card className="mx-auto w-full max-w-7xl rounded-xl border border-border bg-card/60">
      <CardHeader className="px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
              <span className="persona-glow inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/35 bg-primary/12 text-primary">
                <MessageSquare className="h-4 w-4" />
              </span>
              Page Feedback
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              Help us improve this page by sharing feedback, bugs, or feature suggestions.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded((v) => !v)}
            className={cn(
              "shrink-0 border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10",
              isExpanded && "border-primary/40 text-primary"
            )}
          >
            {isExpanded ? (
              <>
                Collapse <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Give feedback <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
      <CardContent className="space-y-4 px-4 pb-5 sm:px-6">
        {/* Feedback form */}
        <div className="space-y-3 border-b border-border pb-4">
          <div className="space-y-2">
            <label htmlFor="feedback" className="text-sm font-medium text-foreground">
              Your feedback
            </label>
            <textarea
              id="feedback"
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              placeholder="Let us know what you think. What can we improve?"
              disabled={sessionLoading}
              maxLength={2000}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={sessionLoading}
                className="w-full rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="general">General</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="content">Content Issue</option>
                <option value="ui">UI/UX</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="severity" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Severity (optional)
              </label>
              <select
                id="severity"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as FeedbackSeverity)}
                disabled={sessionLoading}
                className="w-full rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                disabled={sessionLoading}
                className="rounded border-border bg-muted/60 text-primary focus-visible:ring-ring/40"
              />
              <span className="text-sm text-muted-foreground">
                Submit anonymously
              </span>
            </label>
            <Button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={!feedbackContent.trim() || isSubmitting || sessionLoading}
              className="persona-gradient border border-primary/35 text-black hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Feedback
            </Button>
          </div>
        </div>

        {/* Feedbacks list */}
        {sessionLoading || loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No feedback yet on this page</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {feedback.is_anonymous ? "Anonymous" : feedback.user_name || "Anonymous"}
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        severityColors[feedback.severity as keyof typeof severityColors]
                      )}>
                        {feedback.severity}
                      </span>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {feedback.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(feedback.created_at).toLocaleString()}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteFeedback(feedback.id)}
                      disabled={deletingId === feedback.id}
                      title="Delete feedback"
                    >
                      {deletingId === feedback.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>

                <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">
                  {feedback.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      )}
    </Card>
  );
}
