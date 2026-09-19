import { Category } from "@/generated/prisma/enums";
import { CATEGORY_OPTIONS } from "@/lib/categories";

const TONE: Record<
  Category,
  { light: string; deep: string; solid: string }
> = {
  [Category.COUPLE]: {
    light: "var(--cat-couple)",
    deep: "var(--cat-couple-deep)",
    solid: "var(--cat-couple-deep)",
  },
  [Category.GIRLS]: {
    light: "var(--cat-girls)",
    deep: "var(--cat-girls-deep)",
    solid: "var(--cat-girls-deep)",
  },
  [Category.BOYS]: {
    light: "var(--cat-boys)",
    deep: "var(--cat-boys-deep)",
    solid: "var(--cat-boys)",
  },
  [Category.FRIENDS]: {
    light: "var(--cat-friends)",
    deep: "var(--cat-friends-deep)",
    solid: "var(--cat-friends-deep)",
  },
};

export function categoryTone(category: Category) {
  return TONE[category];
}

export function primaryCategory(categories: Category[]) {
  return categories[0] ?? Category.FRIENDS;
}

export function categoryLabel(category: Category) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category
  );
}

export function categoryIcon(category: Category) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.icon ?? "🎉"
  );
}

export function wheelSliceFill(category: Category, index: number) {
  const tone = categoryTone(category);
  return index % 2 === 0 ? tone.light : tone.deep;
}
