import { Category } from "@/generated/prisma/enums";
import {
  CRUSH_GUARANTEED_TOPICS,
  CRUSH_TOPIC_NAME,
  CRUSH_TOPIC_WEIGHT_MAP,
  TEASER_CARD_COUNT,
  VOTE_HIDE_DELETE_RATIO,
} from "@/lib/constants";

export type EligibleQuestion = {
  id: string;
  isDeleted: boolean;
  topicName: string;
  topicId?: string;
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
    selectedTopicIds?: ReadonlySet<string>;
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
      options.selectedTopicIds &&
      options.selectedTopicIds.size > 0 &&
      (!question.topicId || !options.selectedTopicIds.has(question.topicId))
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

export function pickWeightedRandom<T extends { id: string }>(
  items: readonly T[],
  weights: Record<string, number>,
): T | null {
  if (items.length === 0) {
    return null;
  }

  const pool = items.flatMap((item) =>
    Array(Math.max(1, Math.round(weights[item.id] ?? 1))).fill(item),
  );

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

/**
 * Chọn ngẫu nhiên 1 câu hỏi từ pool với xác suất tỷ lệ thuận topic weight.
 * Topics không có trong CRUSH_TOPIC_WEIGHT_MAP nhận weight = 1.
 */
export function pickTopicWeightedRandom<T extends { topicName?: string }>(
  items: readonly T[],
): T | null {
  if (items.length === 0) return null;

  const pool = items.flatMap((item) => {
    const weight = Math.max(
      1,
      Math.round(
        (item.topicName ? CRUSH_TOPIC_WEIGHT_MAP[item.topicName] : undefined) ?? 1,
      ),
    );
    return Array<T>(weight).fill(item);
  });

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export type TakeTeaserOptions = {
  crushQuestionEnabled?: boolean;
};

export function takeTeaserQuestions<T extends { topicName?: string }>(
  items: T[],
  { crushQuestionEnabled = false }: TakeTeaserOptions = {},
): T[] {
  // Fast path: crush mode off -> hành vi cũ (zero regression)
  if (!crushQuestionEnabled || items.length === 0) {
    return shuffleInPlace([...items]).slice(0, TEASER_CARD_COUNT);
  }

  const result: T[] = [];
  const used = new Set<T>();

  // Slot 0 (Guaranteed): Thích thầm/Tình cảm -> fallback Kỷ niệm -> fallback pool chung
  const guaranteedPool = items.filter(
    (q) =>
      q.topicName &&
      (CRUSH_GUARANTEED_TOPICS as readonly string[]).includes(q.topicName),
  );
  const fallbackPool = items.filter((q) => q.topicName === "Kỷ niệm");
  const slot0 =
    pickRandomItem(guaranteedPool) ??
    pickRandomItem(fallbackPool) ??
    pickRandomItem(items);

  if (slot0) {
    result.push(slot0);
    used.add(slot0);
  }

  // Slot 1 & 2 (Weighted): rút không trùng
  for (let i = result.length; i < TEASER_CARD_COUNT; i++) {
    const remaining = items.filter((q) => !used.has(q));
    if (remaining.length === 0) break;
    const picked = pickTopicWeightedRandom(remaining);
    if (picked) {
      result.push(picked);
      used.add(picked);
    }
  }

  // Shuffle để ẩn vị trí thẻ guaranteed
  return shuffleInPlace(result);
}

export function shouldSoftDeleteQuestion(voteCount: number, userCount: number) {
  if (userCount <= 0) {
    return false;
  }

  return voteCount / userCount >= VOTE_HIDE_DELETE_RATIO;
}
