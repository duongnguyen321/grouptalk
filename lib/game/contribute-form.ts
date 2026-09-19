import { Category, QuestionType } from "@/generated/prisma/enums";
import { isCategory } from "@/lib/categories";
import {
  ANONYMOUS_DISPLAY_NAME,
  PLAYER_NAME_MAX_LENGTH,
  QUESTION_TITLE_MAX_LENGTH,
  QUESTION_TITLE_MIN_LENGTH,
} from "@/lib/constants";
import { normalizePlayerName } from "@/lib/player-name";

export const FRIENDS_AUTO_CATEGORIES = [Category.BOYS, Category.GIRLS] as const;

export type ContributeCategoryState = {
  categories: Category[];
  autoTagged: Category[];
};

export function toggleContributeCategory(
  state: ContributeCategoryState,
  category: Category,
  checked: boolean,
): ContributeCategoryState {
  const categories = new Set(state.categories);
  const autoTagged = new Set(state.autoTagged);

  if (checked) {
    categories.add(category);
    if (category === Category.FRIENDS) {
      for (const auto of FRIENDS_AUTO_CATEGORIES) {
        categories.add(auto);
        autoTagged.add(auto);
      }
    }
    return { categories: [...categories], autoTagged: [...autoTagged] };
  }

  categories.delete(category);
  autoTagged.delete(category);

  if (category === Category.FRIENDS) {
    for (const auto of FRIENDS_AUTO_CATEGORIES) {
      if (autoTagged.has(auto)) {
        categories.delete(auto);
        autoTagged.delete(auto);
      }
    }
  }

  return { categories: [...categories], autoTagged: [...autoTagged] };
}

export function isFriendsAutoTagged(
  autoTagged: Category[],
  category: Category,
): boolean {
  return autoTagged.includes(category);
}

export function parseContributeCategories(values: string[]): Category[] | null {
  const unique: Category[] = [];

  for (const value of values) {
    if (!isCategory(value)) {
      return null;
    }

    if (!unique.includes(value)) {
      unique.push(value);
    }
  }

  return unique.length > 0 ? unique : null;
}

export function parseQuestionTitle(value: string): string | null {
  const title = value.trim().replace(/\s+/g, " ");
  if (
    title.length < QUESTION_TITLE_MIN_LENGTH ||
    title.length > QUESTION_TITLE_MAX_LENGTH
  ) {
    return null;
  }

  return title;
}

export function parseQuestionType(value: string): QuestionType | null {
  return (Object.values(QuestionType) as string[]).includes(value)
    ? (value as QuestionType)
    : null;
}

export function resolveContributorName(nickname?: string): string {
  const name = nickname ? normalizePlayerName(nickname) : "";
  if (!name) {
    return ANONYMOUS_DISPLAY_NAME;
  }

  return name.slice(0, PLAYER_NAME_MAX_LENGTH);
}
