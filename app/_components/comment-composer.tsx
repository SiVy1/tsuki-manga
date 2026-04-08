"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createCommentAction,
  editCommentAction,
  replyToCommentAction,
} from "@/app/_actions/comments/actions";

type CommentComposerProps = {
  chapterId: string;
  chapterSlug: string;
  mode: "create" | "reply" | "edit";
  parentId?: string;
  commentId?: string;
  initialBody?: string;
  submitLabel: string;
  placeholder?: string;
  rows?: number;
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function CommentComposer({
  chapterId,
  chapterSlug,
  mode,
  parentId,
  commentId,
  initialBody = "",
  submitLabel,
  placeholder,
  rows = 4,
  onCancel,
  onSuccess,
}: CommentComposerProps) {
  const t = useTranslations("Comments");
  const commonActions = useTranslations("Common.actions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);

  const resolvedPlaceholder = placeholder ?? t("composer.placeholder");

  function handleSubmit() {
    const trimmedBody = body.trim();

    startTransition(async () => {
      const result =
        mode === "reply" && parentId
          ? await replyToCommentAction({
              chapterId,
              chapterSlug,
              parentId,
              body: trimmedBody,
            })
          : mode === "edit" && commentId
            ? await editCommentAction({
                chapterId,
                chapterSlug,
                commentId,
                body: trimmedBody,
              })
            : await createCommentAction({
                chapterId,
                chapterSlug,
                body: trimmedBody,
              });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setError(null);

      if (mode !== "edit") {
        setBody("");
      }

      router.refresh();
      onSuccess?.();
    });
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-2">
        <span className="sr-only">{submitLabel}</span>
        <textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          rows={rows}
          placeholder={resolvedPlaceholder}
          className="min-h-28 w-full rounded-[1.4rem] border border-border bg-transparent px-4 py-3 text-sm leading-6 outline-none transition focus:border-foreground/25"
        />
      </label>

      {error ? <p className="text-sm text-[var(--danger-foreground)]">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || body.trim().length === 0}
          className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t("composer.pending") : submitLabel}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="text-sm text-muted transition hover:text-foreground disabled:opacity-60"
          >
            {commonActions("cancel")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
