"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteOwnCommentAction } from "@/app/_actions/comments/actions";
import { CommentComposer } from "@/app/_components/comment-composer";
import { CommentReportButton } from "@/app/_components/comment-report-button";

import type { PublicCommentItem as PublicCommentItemData } from "@/app/_lib/comments/types";

type CommentItemProps = {
  chapterId: string;
  chapterSlug: string;
  comment: PublicCommentItemData;
  depth?: 0 | 1;
};

function buildAuthorBadge(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export function CommentItem({
  chapterId,
  chapterSlug,
  comment,
  depth = 0,
}: CommentItemProps) {
  const router = useRouter();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteOwnCommentAction({
        chapterId,
        chapterSlug,
        commentId: comment.id,
      });

      if (!result.success) {
        setDeleteError(result.error);
        return;
      }

      setDeleteError(null);
      setIsEditing(false);
      setIsReplying(false);
      router.refresh();
    });
  }

  return (
    <article
      className={`space-y-4 border-t border-border/70 py-5 ${depth === 1 ? "pl-4 sm:pl-6" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-sm font-medium text-foreground">
          {comment.author ? buildAuthorBadge(comment.author.name) : "?"}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-medium text-foreground">
              {comment.author?.name ?? "Reader"}
            </p>
            <p className="text-xs text-muted">{comment.createdAtLabel}</p>
            {comment.isEdited && comment.editedAtLabel ? (
              <p className="text-xs text-muted">Edited {comment.editedAtLabel}</p>
            ) : null}
          </div>

          {isEditing ? (
            <CommentComposer
              chapterId={chapterId}
              chapterSlug={chapterSlug}
              mode="edit"
              commentId={comment.id}
              initialBody={comment.body ?? ""}
              submitLabel="Save"
              rows={4}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => setIsEditing(false)}
            />
          ) : comment.body ? (
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-foreground">
              {comment.body}
            </p>
          ) : (
            <p className="text-sm italic text-muted">{comment.placeholder}</p>
          )}

          {!isEditing ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {comment.canReply && depth === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsReplying((current) => !current);
                    setIsEditing(false);
                  }}
                  className="text-muted transition hover:text-foreground"
                >
                  Reply
                </button>
              ) : null}

              {comment.canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setIsReplying(false);
                  }}
                  className="text-muted transition hover:text-foreground"
                >
                  Edit
                </button>
              ) : null}

              {comment.canDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-muted transition hover:text-foreground disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              ) : null}

              {comment.canReport ? (
                <CommentReportButton
                  chapterId={chapterId}
                  chapterSlug={chapterSlug}
                  commentId={comment.id}
                />
              ) : null}
            </div>
          ) : null}

          {deleteError ? (
            <p className="text-sm text-[var(--danger-foreground)]">{deleteError}</p>
          ) : null}

          {isReplying ? (
            <div className="max-w-3xl rounded-[1.3rem] bg-[var(--surface-muted)] px-4 py-4">
              <CommentComposer
                chapterId={chapterId}
                chapterSlug={chapterSlug}
                mode="reply"
                parentId={comment.id}
                submitLabel="Reply"
                placeholder="Write a reply..."
                rows={3}
                onCancel={() => setIsReplying(false)}
                onSuccess={() => setIsReplying(false)}
              />
            </div>
          ) : null}

          {comment.replies.length ? (
            <div className="space-y-0">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  chapterId={chapterId}
                  chapterSlug={chapterSlug}
                  comment={reply}
                  depth={1}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
