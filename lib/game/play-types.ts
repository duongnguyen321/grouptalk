import { Category, QuestionType } from "@/generated/prisma/enums";

export type PlayPlayer = {
  id: string;
  displayName: string;
};

export type TeaserCard = {
  id: string;
  contributedBy: string;
  accent: Category;
};

export type RevealedCard = {
  id: string;
  title: string;
  type: QuestionType;
  playerName: string;
  accent: Category;
};
