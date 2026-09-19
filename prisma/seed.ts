import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
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

interface SeedQuestion {
  title: string;
  type: QuestionType;
  topic: (typeof TOPICS)[number];
  categories: Category[];
}

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

  const filePath = path.resolve(__dirname, "../output_questions.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file câu hỏi: ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const questions: SeedQuestion[] = JSON.parse(rawData);

  const existingQuestions = await prisma.question.findMany({
    select: { title: true },
  });
  const existingTitles = new Set(
    existingQuestions.map((q) => q.title.trim().toLowerCase()),
  );

  const seenInBatch = new Set<string>();
  const toInsert: Array<{
    title: string;
    type: QuestionType;
    topicId: string;
    categories: Category[];
  }> = [];

  for (const question of questions) {
    const normalizedTitle = question.title.trim();
    const key = normalizedTitle.toLowerCase();

    if (existingTitles.has(key) || seenInBatch.has(key)) {
      continue;
    }

    seenInBatch.add(key);
    const topicId = topicByName.get(question.topic);
    if (!topicId) {
      throw new Error(`Missing topic: ${question.topic}`);
    }

    toInsert.push({
      title: normalizedTitle,
      type: question.type,
      topicId,
      categories: question.categories,
    });
  }

  if (toInsert.length > 0) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      await prisma.question.createMany({
        data: chunk,
      });
    }
    console.log(
      `Đã seed thành công ${toInsert.length} câu hỏi mới từ output_questions.json.`,
    );
  } else {
    console.log(
      `Tất cả ${questions.length} câu hỏi trong output_questions.json đã tồn tại trong cơ sở dữ liệu.`,
    );
  }
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
