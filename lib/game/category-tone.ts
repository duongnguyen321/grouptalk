import { Category } from "@/generated/prisma/enums";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { Heart, User, Users, UsersRound, type LucideIcon } from "lucide-react";

const TONE: Record<
  Category,
  { light: string; deep: string; gradient: string }
> = {
  [Category.COUPLE]: {
    light: "var(--cat-couple)",
    deep: "var(--cat-couple-deep)",
    gradient: "var(--grad-couple)",
  },
  [Category.GIRLS]: {
    light: "var(--cat-girls)",
    deep: "var(--cat-girls-deep)",
    gradient: "var(--grad-girls)",
  },
  [Category.BOYS]: {
    light: "var(--cat-boys)",
    deep: "var(--cat-boys-deep)",
    gradient: "var(--grad-boys)",
  },
  [Category.FRIENDS]: {
    light: "var(--cat-friends)",
    deep: "var(--cat-friends-deep)",
    gradient: "var(--grad-friends)",
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

export function categoryIcon(category: Category): LucideIcon {
  switch (category) {
    case Category.COUPLE:
      return Heart;
    case Category.GIRLS:
      return User;
    case Category.BOYS:
      return Users;
    case Category.FRIENDS:
      return UsersRound;
  }
}

const WHEEL_GRADIENT_VARIANTS = 2;

/** SVG ids must be stable and match between the `<defs>` and each slice's `fill`. */
export function wheelSliceGradientId(category: Category, variant: number) {
  return `wheel-slice-${category}-${variant % WHEEL_GRADIENT_VARIANTS}`;
}

/**
 * Adjacent slices alternate between the forward and reversed gradient so each slice
 * still reads as a distinct wedge while both stay true gradients (§7.6).
 */
export function wheelSliceFill(category: Category, index: number) {
  return `url(#${wheelSliceGradientId(category, index)})`;
}
