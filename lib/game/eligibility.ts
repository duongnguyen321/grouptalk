import { Category } from "@/generated/prisma/enums";
import {
  CRUSH_TOPIC_NAME,
  TEASER_CARD_COUNT,
  VOTE_HIDE_DELETE_RATIO,
} from "@/lib/constants";

export type EligibleQuestion = {
  id: string;
  isDeleted: boolean;
  topicName: string;
  categories: Category[];
};

export function filterEligibleQuestions(
  questions: EligibleQuestion[],
  options: {
    sessionCategories: Category[];
    crushQuestionEnabled: boolean;
    hiddenQuestionIds: ReadonlySet<string>;
    answeredQuestionIds: ReadonlySet<string>;
    allowAnsweredRepeats: boolean;
  },
) {
  return questions.filter((question) => {
    if (question.isDeleted) {
      return false;
    }

    if (options.hiddenQuestionIds.has(question.id)) {
      return false;
    }

    if (
      !question.categories.some((category) =>
        options.sessionCategories.includes(category),
      )
    ) {
      return false;
    }

    if (
      !options.crushQuestionEnabled &&
      question.topicName === CRUSH_TOPIC_NAME
    ) {
      return false;
    }

    if (
      !options.allowAnsweredRepeats &&
      options.answeredQuestionIds.has(question.id)
    ) {
      return false;
    }

    return true;
  });
}

export function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = items[index];
    const swap = items[swapIndex];
    if (current === undefined || swap === undefined) {
      continue;
    }
    items[index] = swap;
    items[swapIndex] = current;
  }

  return items;
}

export function pickRandomItem<T>(items: readonly T[]) {
  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export function takeTeaserQuestions<T>(items: T[]) {
  return shuffleInPlace([...items]).slice(0, TEASER_CARD_COUNT);
}

export function shouldSoftDeleteQuestion(voteCount: number, userCount: number) {
  if (userCount <= 0) {
    return false;
  }

  return voteCount / userCount >= VOTE_HIDE_DELETE_RATIO;
}
