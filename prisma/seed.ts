import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import { Category, QuestionType } from "../generated/prisma/enums";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

interface SeedQuestion {
  title: string;
  type: QuestionType;
  topic: string;
  categories: Category[];
}

async function main() {
  const filePath = path.resolve(__dirname, "../output_questions.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file câu hỏi: ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const questions: SeedQuestion[] = JSON.parse(rawData);

  const detectedTopics = Array.from(
    new Set(
      questions
        .map((q) => q.topic?.trim())
        .filter((topic): topic is string => Boolean(topic)),
    ),
  );

  for (const name of detectedTopics) {
    await prisma.topic.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const topics = await prisma.topic.findMany();
  const topicByName = new Map(topics.map((topic) => [topic.name, topic.id]));

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
    const topicName = question.topic?.trim();
    const topicId = topicName ? topicByName.get(topicName) : undefined;
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
