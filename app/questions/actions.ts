"use server";

import type { Category, QuestionType } from "@/generated/prisma/enums";
import { QUESTIONS_PAGE_SIZE } from "@/lib/constants";
import { prisma } from "@/lib/db";

export type OverviewStats = {
  questionCount: number;
  playerCount: number;
};

export type TopicWithCount = {
  id: string;
  name: string;
  count: number;
};

export type QuestionItem = {
  id: string;
  title: string;
  type: QuestionType;
  categories: Category[];
  topic: {
    id: string;
    name: string;
  };
  contributorName: string | null;
  createdAt: string;
};

export type QuestionsBatchResponse = {
  items: QuestionItem[];
  totalCount: number;
  hasMore: boolean;
};

export async function getOverviewStats(): Promise<OverviewStats> {
  try {
    const [questionCount, playerCount] = await Promise.all([
      prisma.question.count({ where: { isDeleted: false } }),
      prisma.sessionPlayer.count(),
    ]);

    return { questionCount, playerCount };
  } catch (error) {
    console.error("Lỗi truy vấn getOverviewStats:", error);
    return { questionCount: 0, playerCount: 0 };
  }
}

export async function getTopicsWithCounts(): Promise<TopicWithCount[]> {
  try {
    const topics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            questions: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return topics.map((t) => ({
      id: t.id,
      name: t.name,
      count: t._count.questions,
    }));
  } catch (error) {
    console.error("Lỗi truy vấn getTopicsWithCounts:", error);
    return [];
  }
}

export async function fetchQuestionsBatch({
  topicId,
  page = 0,
  limit = QUESTIONS_PAGE_SIZE,
}: {
  topicId?: string | null;
  page?: number;
  limit?: number;
}): Promise<QuestionsBatchResponse> {
  try {
    const where = {
      isDeleted: false,
      ...(topicId ? { topicId } : {}),
    };

    const safeLimit = Math.max(1, Math.min(limit, 50));
    const safePage = Math.max(0, page);

    const [rows, totalCount] = await Promise.all([
      prisma.question.findMany({
        where,
        select: {
          id: true,
          title: true,
          type: true,
          categories: true,
          createdAt: true,
          topic: {
            select: {
              id: true,
              name: true,
            },
          },
          contributedBy: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: safePage * safeLimit,
        take: safeLimit,
      }),
      prisma.question.count({ where }),
    ]);

    const items: QuestionItem[] = rows.map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type,
      categories: q.categories,
      topic: q.topic,
      contributorName: q.contributedBy?.displayName ?? null,
      createdAt: q.createdAt.toISOString(),
    }));

    return {
      items,
      totalCount,
      hasMore: (safePage + 1) * safeLimit < totalCount,
    };
  } catch (error) {
    console.error("Lỗi truy vấn fetchQuestionsBatch:", error);
    return {
      items: [],
      totalCount: 0,
      hasMore: false,
    };
  }
}
