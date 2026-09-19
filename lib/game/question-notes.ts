import { QuestionType } from "@/generated/prisma/enums";

export const QUESTION_TYPE_NOTES: Record<QuestionType, string> = {
  [QuestionType.YESNO]:
    "Nếu là câu hỏi Yes/No, hãy giải thích hoặc kể câu chuyện xoay quanh đó tối thiểu 3 câu.",
  [QuestionType.CHALLENGE]:
    "Đây là câu hỏi thử thách — hãy thực hiện thử thách này!",
  [QuestionType.OPEN_ENDED]: "Trả lời tự do theo cách của bạn.",
};

export const QUESTION_TYPE_OPTIONS = [
  { value: QuestionType.YESNO, label: "Có / Không" },
  { value: QuestionType.CHALLENGE, label: "Thử thách" },
  { value: QuestionType.OPEN_ENDED, label: "Câu hỏi mở" },
] as const;
