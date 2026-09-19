import { Category } from "@/generated/prisma/enums";

export const CATEGORY_OPTIONS = [
  {
    value: Category.COUPLE,
    label: "Cặp đôi",
    icon: "💕",
    selectedClass: "bg-grad-couple shadow-(--cat-couple-glow) text-white",
  },
  {
    value: Category.GIRLS,
    label: "Nhóm nữ",
    icon: "💁",
    selectedClass: "bg-grad-girls shadow-(--cat-girls-glow) text-white",
  },
  {
    value: Category.BOYS,
    label: "Nhóm nam",
    icon: "🙋",
    selectedClass: "bg-grad-boys shadow-(--cat-boys-glow) text-white",
  },
  {
    value: Category.FRIENDS,
    label: "Nhóm bạn",
    icon: "🎉",
    selectedClass: "bg-grad-friends shadow-(--cat-friends-glow) text-white",
  },
] as const;

export const CATEGORY_VALUES = CATEGORY_OPTIONS.map((option) => option.value);

export function isCategory(value: string): value is Category {
  return CATEGORY_VALUES.includes(value as Category);
}
