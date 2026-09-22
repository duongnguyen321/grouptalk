import { Category, QuestionType } from "@/generated/prisma/enums";
import { ANONYMOUS_DISPLAY_NAME } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  filterEligibleQuestions,
  takeTeaserQuestions,
} from "@/lib/game/eligibility";
import type { RevealedCard, TeaserCard } from "@/lib/game/play-types";

type QuestionWithMeta = {
  id: string;
  title: string;
  type: QuestionType;
  isDeleted: boolean;
  categories: Category[];
  topicId?: string;
  topic: { name: string };
  contributedBy: { displayName: string | null } | null;
};

function toEligible(question: QuestionWithMeta) {
  return {
    id: question.id,
    isDeleted: question.isDeleted,
    topicName: question.topic.name,
    topicId: question.topicId,
    categories: question.categories,
  };
}

function contributorName(question: QuestionWithMeta) {
  return question.contributedBy?.displayName?.trim() || ANONYMOUS_DISPLAY_NAME;
}

function cardAccent(
  question: QuestionWithMeta,
  sessionCategories: Category[],
) {
  return (
    question.categories.find((category) =>
      sessionCategories.includes(category),
    ) ??
    question.categories[0] ??
    Category.FRIENDS
  );
}

export async function pickThreeQuestions(
  sessionId: string,
  sessionPlayerId: string,
  userId: string,
): Promise<TeaserCard[]> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      categories: true,
      crushQuestionEnabled: true,
      selectedTopicIds: true,
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const [questions, answers, votes] = await Promise.all([
    prisma.question.findMany({
      where: {
        isDeleted: false,
        categories: { hasSome: session.categories },
      },
      select: {
        id: true,
        title: true,
        type: true,
        isDeleted: true,
        categories: true,
        topicId: true,
        topic: { select: { name: true } },
        contributedBy: { select: { displayName: true } },
      },
    }),
    prisma.sessionAnswer.findMany({
      where: { sessionId, sessionPlayerId },
      select: { questionId: true },
    }),
    prisma.questionVote.findMany({
      where: { userId },
      select: { questionId: true },
    }),
  ]);

  const hiddenQuestionIds = new Set(votes.map((vote) => vote.questionId));
  const answeredQuestionIds = new Set(
    answers.map((answer) => answer.questionId),
  );
  const selectedTopicIds =
    Array.isArray(session.selectedTopicIds) && session.selectedTopicIds.length > 0
      ? new Set<string>(session.selectedTopicIds as string[])
      : undefined;
  const byId = new Map(questions.map((question) => [question.id, question]));
  const eligibilityInput = {
    sessionCategories: session.categories,
    crushQuestionEnabled: session.crushQuestionEnabled,
    hiddenQuestionIds,
    answeredQuestionIds,
    selectedTopicIds,
  };

  let pool = filterEligibleQuestions(questions.map(toEligible), {
    ...eligibilityInput,
    allowAnsweredRepeats: false,
  });

  if (pool.length === 0) {
    pool = filterEligibleQuestions(questions.map(toEligible), {
      ...eligibilityInput,
      allowAnsweredRepeats: true,
    });
  }

  return takeTeaserQuestions(pool, {
    crushQuestionEnabled: session.crushQuestionEnabled,
  }).flatMap((item) => {
    const question = byId.get(item.id);
    if (!question) {
      return [];
    }

    return [
      {
        id: question.id,
        contributedBy: contributorName(question),
        accent: cardAccent(question, session.categories),
      },
    ];
  });
}

export async function loadRevealedCard(input: {
  questionId: string;
  playerName: string;
  sessionCategories: Category[];
}): Promise<RevealedCard | null> {
  const question = await prisma.question.findUnique({
    where: { id: input.questionId },
    select: {
      id: true,
      title: true,
      type: true,
      isDeleted: true,
      categories: true,
      topic: { select: { name: true } },
      contributedBy: { select: { displayName: true } },
    },
  });

  if (!question) {
    return null;
  }

  return {
    id: question.id,
    title: question.title,
    type: question.type,
    playerName: input.playerName,
    accent: cardAccent(question, input.sessionCategories),
  };
}
