"use client";

import { CommentItem } from "@/app/_components/comment-item";

import type { PublicCommentItem } from "@/app/_lib/comments/types";

type CommentThreadListProps = {
  chapterId: string;
  chapterSlug: string;
  threads: PublicCommentItem[];
};

export function CommentThreadList({
  chapterId,
  chapterSlug,
  threads,
}: CommentThreadListProps) {
  return (
    <div className="space-y-0">
      {threads.map((thread) => (
        <CommentItem
          key={thread.id}
          chapterId={chapterId}
          chapterSlug={chapterSlug}
          comment={thread}
        />
      ))}
    </div>
  );
}
