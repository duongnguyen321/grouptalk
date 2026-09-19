"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/identity";
import {
  parseContributeCategories,
  parseQuestionTitle,
  parseQuestionType,
  resolveContributorName,
} from "@/lib/game/contribute-form";

type SubmitQuestionInput = {
  title: string;
  categories: string[];
  topicId: string;
  type: string;
  nickname?: string;
  deviceId?: string;
};

export async function loadContributeContext(deviceId?: string) {
  const user = await getCurrentUser({ deviceId });
  return { needsNickname: !user.displayName };
}

export async function submitQuestion(
  input: SubmitQuestionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const title = parseQuestionTitle(input.title);
  if (!title) {
    return { ok: false, error: "Nhập câu hỏi từ 4 đến 280 ký tự." };
  }

  const categories = parseContributeCategories(input.categories);
  if (!categories) {
    return { ok: false, error: "Chọn ít nhất một thể loại." };
  }

  const type = parseQuestionType(input.type);
  if (!type) {
    return { ok: false, error: "Chọn loại câu hỏi." };
  }

  if (!input.topicId) {
    return { ok: false, error: "Chọn chủ đề." };
  }

  try {
    const user = await getCurrentUser({ deviceId: input.deviceId });
    const topic = await prisma.topic.findUnique({
      where: { id: input.topicId },
      select: { id: true },
    });

    if (!topic) {
      return { ok: false, error: "Chủ đề không tồn tại." };
    }

    if (!user.displayName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { displayName: resolveContributorName(input.nickname) },
      });
    }

    await prisma.question.create({
      data: {
        title,
        type,
        topicId: topic.id,
        categories,
        contributedByUserId: user.id,
      },
    });

    return { ok: true };
  } catch {
    return { ok: false, error: "Không gửi được câu hỏi. Thử lại nhé." };
  }
}
