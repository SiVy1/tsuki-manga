import {
  ChapterStatus,
  CommentStatus,
  SeriesVisibility,
} from "@/generated/prisma/client";
import { getLocale, getTranslations } from "next-intl/server";

import { prisma } from "@/app/_lib/db/client";
import { formatDateTime } from "@/app/_lib/utils/formatting";

import type {
  ChapterDiscussionData,
  PublicCommentItem,
} from "@/app/_lib/comments/types";

function resolveAuthorName(input: {
  displayName: string | null;
  name: string | null;
}, fallbackName: string) {
  return input.displayName ?? input.name ?? fallbackName;
}

function getPublicPlaceholder(
  status: CommentStatus,
  t: Awaited<ReturnType<typeof getTranslations<"Comments.placeholders">>>,
) {
  switch (status) {
    case CommentStatus.DELETED:
      return t("deleted");
    case CommentStatus.HIDDEN:
      return t("hidden");
    default:
      return null;
  }
}

function shouldRenderPublicComment(input: {
  status: CommentStatus;
  hasVisibleChildren: boolean;
}) {
  if (input.status === CommentStatus.VISIBLE || input.status === CommentStatus.DELETED) {
    return true;
  }

  return input.hasVisibleChildren;
}

function mapPublicCommentItem(
  comment: {
    id: string;
    parentId: string | null;
    body: string;
    status: CommentStatus;
    isEdited: boolean;
    createdAt: Date;
    editedAt: Date | null;
    authorId: string | null;
    author: {
      id: string;
      name: string | null;
      displayName: string | null;
      image: string | null;
    } | null;
    replies?: Array<{
      id: string;
      parentId: string | null;
      body: string;
      status: CommentStatus;
      isEdited: boolean;
      createdAt: Date;
      editedAt: Date | null;
      authorId: string | null;
      author: {
        id: string;
        name: string | null;
        displayName: string | null;
        image: string | null;
      } | null;
    }>;
  },
  viewerUserId: string | null,
  threadRootId: string,
  locale: string,
  readerLabel: string,
  placeholderT: Awaited<ReturnType<typeof getTranslations<"Comments.placeholders">>>,
): PublicCommentItem {
  const placeholder = getPublicPlaceholder(comment.status, placeholderT);
  const isAuthor = Boolean(viewerUserId && viewerUserId === comment.authorId);

  return {
    id: comment.id,
    threadRootId,
    parentId: comment.parentId,
    status: comment.status,
    body: comment.status === CommentStatus.VISIBLE ? comment.body : null,
    createdAt: comment.createdAt.toISOString(),
    createdAtLabel: formatDateTime(comment.createdAt, locale),
    editedAtLabel: comment.editedAt ? formatDateTime(comment.editedAt, locale) : null,
    isEdited: comment.isEdited,
    author: comment.author
      ? {
          id: comment.author.id,
          name: resolveAuthorName(comment.author, readerLabel),
          image: comment.author.image,
        }
      : null,
    canEdit: isAuthor && comment.status === CommentStatus.VISIBLE,
    canDelete: isAuthor && comment.status === CommentStatus.VISIBLE,
    canReply: comment.status === CommentStatus.VISIBLE && comment.parentId === null,
    canReport:
      comment.status === CommentStatus.VISIBLE &&
      Boolean(viewerUserId) &&
      !isAuthor,
    placeholder,
    replies:
      comment.replies?.map((reply) =>
        mapPublicCommentItem(
          reply,
          viewerUserId,
          threadRootId,
          locale,
          readerLabel,
          placeholderT,
        ),
      ) ?? [],
  };
}

export async function getChapterDiscussionData(
  chapterId: string,
  chapterSlug: string,
  viewerUserId: string | null,
): Promise<ChapterDiscussionData> {
  const [locale, placeholderT, entityT] = await Promise.all([
    getLocale(),
    getTranslations("Comments.placeholders"),
    getTranslations("Common.entities"),
  ]);
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      slug: chapterSlug,
      deletedAt: null,
      status: ChapterStatus.PUBLISHED,
      series: {
        deletedAt: null,
        visibility: SeriesVisibility.PUBLIC,
      },
    },
    select: {
      id: true,
      slug: true,
      comments: {
        where: {
          parentId: null,
          status: {
            in: [CommentStatus.VISIBLE, CommentStatus.DELETED, CommentStatus.HIDDEN],
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          parentId: true,
          body: true,
          status: true,
          isEdited: true,
          createdAt: true,
          editedAt: true,
          authorId: true,
          author: {
            select: {
              id: true,
              name: true,
              displayName: true,
              image: true,
            },
          },
          replies: {
            where: {
              status: {
                in: [CommentStatus.VISIBLE, CommentStatus.DELETED, CommentStatus.HIDDEN],
              },
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              parentId: true,
              body: true,
              status: true,
              isEdited: true,
              createdAt: true,
              editedAt: true,
              authorId: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!chapter) {
    return {
      chapter: {
        id: chapterId,
        slug: chapterSlug,
      },
      viewer: {
        isSignedIn: Boolean(viewerUserId),
        userId: viewerUserId,
      },
      threads: [],
      totalCount: 0,
    };
  }

  const threads = chapter.comments
    .map((comment) => {
      const visibleReplies = comment.replies.filter(
        (reply) => reply.status !== CommentStatus.HIDDEN,
      );
      const hasVisibleChildren = visibleReplies.length > 0;

      if (
        !shouldRenderPublicComment({
          status: comment.status,
          hasVisibleChildren,
        })
      ) {
        return null;
      }

      return mapPublicCommentItem(
        {
          ...comment,
          replies: visibleReplies,
        },
        viewerUserId,
        comment.id,
        locale,
        entityT("reader"),
        placeholderT,
      );
    })
    .filter((comment): comment is PublicCommentItem => comment !== null);

  return {
    chapter: {
      id: chapter.id,
      slug: chapter.slug,
    },
    viewer: {
      isSignedIn: Boolean(viewerUserId),
      userId: viewerUserId,
    },
    threads,
    totalCount: threads.reduce((count, thread) => count + 1 + thread.replies.length, 0),
  };
}
