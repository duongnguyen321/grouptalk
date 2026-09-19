import { Category } from "@/generated/prisma/enums";
import { Heart, User, Users, UsersRound, type LucideIcon } from "lucide-react";

export type CategoryOption = {
  value: Category;
  label: string;
  icon: LucideIcon;
  selectedClass: string;
};

export const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  {
    value: Category.COUPLE,
    label: "Cặp đôi",
    icon: Heart,
    selectedClass: "bg-grad-couple shadow-(--cat-couple-glow) text-white",
  },
  {
    value: Category.GIRLS,
    label: "Nhóm nữ",
    icon: User,
    selectedClass: "bg-grad-girls shadow-(--cat-girls-glow) text-white",
  },
  {
    value: Category.BOYS,
    label: "Nhóm nam",
    icon: Users,
    selectedClass: "bg-grad-boys shadow-(--cat-boys-glow) text-white",
  },
  {
    value: Category.FRIENDS,
    label: "Nhóm bạn",
    icon: UsersRound,
    selectedClass: "bg-grad-friends shadow-(--cat-friends-glow) text-white",
  },
] as const;

export const CATEGORY_VALUES = CATEGORY_OPTIONS.map((option) => option.value);

export function isCategory(value: string): value is Category {
  return CATEGORY_VALUES.includes(value as Category);
}
