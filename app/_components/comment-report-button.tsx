"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { reportCommentAction } from "@/app/_actions/comments/actions";

const reportReasonOptions = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "HATE", label: "Hate" },
  { value: "SEXUAL_CONTENT", label: "Sexual content" },
  { value: "VIOLENCE", label: "Violence" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "OTHER", label: "Other" },
] as const;

type CommentReportButtonProps = {
  chapterId: string;
  chapterSlug: string;
  commentId: string;
};

export function CommentReportButton({
  chapterId,
  chapterSlug,
  commentId,
}: CommentReportButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reportReasonOptions)[number]["value"]>("SPAM");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit() {
    startTransition(async () => {
      const result = await reportCommentAction({
        chapterId,
        chapterSlug,
        commentId,
        reason,
        details,
      });

      if (!result.success) {
        setError(result.error);
        setNotice(null);
        return;
      }

      setError(null);
      setNotice("Report sent.");
      setDetails("");
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setError(null);
          setNotice(null);
        }}
        className="text-xs text-muted transition hover:text-foreground"
      >
        Report
      </button>

      {isOpen ? (
        <div className="space-y-3 rounded-[1.2rem] border border-border px-4 py-3">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">Reason</span>
            <select
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as (typeof reportReasonOptions)[number]["value"])
              }
              className="w-full rounded-2xl border border-border bg-transparent px-3 py-2 text-sm outline-none transition focus:border-foreground/25"
            >
              {reportReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">Details</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              placeholder="Add a short note if needed."
              className="w-full rounded-2xl border border-border bg-transparent px-3 py-2 text-sm outline-none transition focus:border-foreground/25"
            />
          </label>

          {error ? <p className="text-sm text-[var(--danger-foreground)]">{error}</p> : null}
          {notice ? <p className="text-sm text-muted">{notice}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition hover:border-foreground/20 disabled:opacity-60"
            >
              {isPending ? "Sending..." : "Send report"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="text-sm text-muted transition hover:text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {!isOpen && notice ? <p className="text-sm text-muted">{notice}</p> : null}
    </div>
  );
}
