import type {
  CommentReportReason,
  CommentStatus,
} from "@/generated/prisma/client";

export type PublicCommentAuthor = {
  id: string | null;
  name: string;
  image: string | null;
};

export type PublicCommentItem = {
  id: string;
  threadRootId: string;
  parentId: string | null;
  status: CommentStatus;
  body: string | null;
  createdAt: string;
  createdAtLabel: string;
  editedAtLabel: string | null;
  isEdited: boolean;
  author: PublicCommentAuthor | null;
  canEdit: boolean;
  canDelete: boolean;
  canReply: boolean;
  canReport: boolean;
  placeholder: string | null;
  replies: PublicCommentItem[];
};

export type ChapterDiscussionData = {
  chapter: {
    id: string;
    slug: string;
  };
  viewer: {
    isSignedIn: boolean;
    userId: string | null;
  };
  threads: PublicCommentItem[];
  totalCount: number;
};

export type CommentActionPayload = {
  chapterId: string;
  chapterSlug: string;
};

export type CreateCommentInput = CommentActionPayload & {
  body: string;
};

export type ReplyToCommentInput = CommentActionPayload & {
  parentId: string;
  body: string;
};

export type EditCommentInput = CommentActionPayload & {
  commentId: string;
  body: string;
};

export type DeleteCommentInput = CommentActionPayload & {
  commentId: string;
};

export type ReportCommentInput = CommentActionPayload & {
  commentId: string;
  reason: CommentReportReason;
  details?: string | null;
};

export type DashboardCommentReportItem = {
  id: string;
  latestReportId: string;
  reportCount: number;
  latestReason: string;
  latestReasonLabel: string;
  latestCreatedAt: string;
  latestCreatedAtLabel: string;
  latestDetails: string | null;
  comment: {
    id: string;
    status: CommentStatus;
    excerpt: string;
    createdAtLabel: string;
    authorName: string;
    chapter: {
      id: string;
      slug: string;
      number: string;
      label: string | null;
      title: string | null;
      seriesTitle: string;
      seriesSlug: string;
    };
  };
};

export type ModerateCommentInput = {
  commentId: string;
};

export type ModerateReportInput = {
  reportId: string;
};
