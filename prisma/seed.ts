import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import { Category, QuestionType } from "../generated/prisma/enums";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TOPICS = [
  "Gia đình",
  "Tình cảm",
  "Bạn bè",
  "Kỷ niệm",
  "Thử thách",
  "Thích thầm",
] as const;

const QUESTIONS: Array<{
  title: string;
  type: QuestionType;
  topic: (typeof TOPICS)[number];
  categories: Category[];
}> = [
  {
    title: "Điều gì ở đối phương khiến bạn muốn kể cho mẹ nghe?",
    type: QuestionType.OPEN_ENDED,
    topic: "Tình cảm",
    categories: [Category.COUPLE],
  },
  {
    title: "Lần gần nhất bạn dỗi nhau, chuyện gì đã hóa giải?",
    type: QuestionType.OPEN_ENDED,
    topic: "Tình cảm",
    categories: [Category.COUPLE],
  },
  {
    title: "Bạn có muốn hẹn hò lại từ đầu với nhau không?",
    type: QuestionType.YESNO,
    topic: "Tình cảm",
    categories: [Category.COUPLE],
  },
  {
    title: "Hôn đối phương ngay bây giờ, không giải thích.",
    type: QuestionType.CHALLENGE,
    topic: "Thử thách",
    categories: [Category.COUPLE],
  },
  {
    title: "Ai trong nhóm từng khóc vì chuyện nhỏ mà không dám nói?",
    type: QuestionType.OPEN_ENDED,
    topic: "Bạn bè",
    categories: [Category.GIRLS],
  },
  {
    title: "Bạn có đang giữ bí mật của một người trong nhóm không?",
    type: QuestionType.YESNO,
    topic: "Bạn bè",
    categories: [Category.GIRLS],
  },
  {
    title: "Khoe một tin nhắn gần đây khiến bạn cười một mình.",
    type: QuestionType.CHALLENGE,
    topic: "Thử thách",
    categories: [Category.GIRLS],
  },
  {
    title: "Ai trong nhóm từng thích thầm crush của bạn thân?",
    type: QuestionType.OPEN_ENDED,
    topic: "Tình cảm",
    categories: [Category.GIRLS, Category.FRIENDS],
  },
  {
    title: "Lần cuối bạn xin lỗi một người bạn nam là vì chuyện gì?",
    type: QuestionType.OPEN_ENDED,
    topic: "Bạn bè",
    categories: [Category.BOYS],
  },
  {
    title: "Bạn có từng giả vờ mạnh mẽ trước nhóm không?",
    type: QuestionType.YESNO,
    topic: "Bạn bè",
    categories: [Category.BOYS],
  },
  {
    title: "Gọi một người trong nhóm bằng biệt danh xấu hổ nhất.",
    type: QuestionType.CHALLENGE,
    topic: "Thử thách",
    categories: [Category.BOYS],
  },
  {
    title: "Ai trong nhóm là người bạn sẽ gọi lúc 3 giờ sáng?",
    type: QuestionType.OPEN_ENDED,
    topic: "Bạn bè",
    categories: [Category.BOYS, Category.FRIENDS],
  },
  {
    title: "Kỷ niệm nhóm nào bạn vẫn kể đi kể lại?",
    type: QuestionType.OPEN_ENDED,
    topic: "Kỷ niệm",
    categories: [Category.FRIENDS],
  },
  {
    title: "Trong nhóm có ai đang thích thầm người khác không?",
    type: QuestionType.YESNO,
    topic: "Thích thầm",
    categories: [Category.FRIENDS],
  },
  {
    title: "Chỉ người bạn nghĩ đang thích thầm ai đó, không nói tên.",
    type: QuestionType.CHALLENGE,
    topic: "Thích thầm",
    categories: [Category.FRIENDS],
  },
  {
    title: "Ai trong nhóm từng suýt nói ra điều không nên nói?",
    type: QuestionType.OPEN_ENDED,
    topic: "Bạn bè",
    categories: [Category.FRIENDS, Category.GIRLS, Category.BOYS],
  },
];

async function main() {
  for (const name of TOPICS) {
    await prisma.topic.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const topics = await prisma.topic.findMany();
  const topicByName = new Map(topics.map((topic) => [topic.name, topic.id]));

  const existingCount = await prisma.question.count();
  if (existingCount > 0) {
    return;
  }

  await prisma.question.createMany({
    data: QUESTIONS.map((question) => {
      const topicId = topicByName.get(question.topic);
      if (!topicId) {
        throw new Error(`Missing topic: ${question.topic}`);
      }

      return {
        title: question.title,
        type: question.type,
        topicId,
        categories: question.categories,
      };
    }),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
