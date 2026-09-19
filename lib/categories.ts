import { Category } from "@/generated/prisma/enums";

export const CATEGORY_OPTIONS = [
  {
    value: Category.COUPLE,
    label: "Cặp đôi",
    icon: "💕",
    selectedClass:
      "bg-linear-to-br from-cat-couple to-cat-couple-deep text-white shadow-[0_10px_24px_rgba(196,69,105,0.35)]",
  },
  {
    value: Category.GIRLS,
    label: "Nhóm nữ",
    icon: "💁",
    selectedClass:
      "bg-linear-to-br from-cat-girls to-cat-girls-deep text-white shadow-[0_10px_24px_rgba(253,121,168,0.35)]",
  },
  {
    value: Category.BOYS,
    label: "Nhóm nam",
    icon: "🙋",
    selectedClass:
      "bg-linear-to-br from-cat-boys to-cat-boys-deep text-white shadow-[0_10px_24px_rgba(72,52,212,0.35)]",
  },
  {
    value: Category.FRIENDS,
    label: "Nhóm bạn",
    icon: "🎉",
    selectedClass:
      "bg-linear-to-br from-cat-friends to-cat-friends-deep text-white shadow-[0_10px_24px_rgba(225,112,85,0.35)]",
  },
] as const;

export const CATEGORY_VALUES = CATEGORY_OPTIONS.map((option) => option.value);

export function isCategory(value: string): value is Category {
  return CATEGORY_VALUES.includes(value as Category);
}
