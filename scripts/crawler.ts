import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import { Category, QuestionType } from "../generated/prisma/enums";

export const TOPICS = [
  "Gia đình",
  "Tình cảm",
  "Bạn bè",
  "Kỷ niệm",
  "Thử thách",
  "Thích thầm",
] as const;

export type Topic = (typeof TOPICS)[number];

export interface Question {
  title: string;
  type: QuestionType;
  topic: Topic;
  categories: Category[];
}

const TARGET_URLS: string[] = [
  "https://www.wikihow.vn/C%C3%A1c-c%C3%A2u-h%E1%BB%8Fi-c%E1%BB%A7a-tr%C3%B2-ch%C6%A1i-S%E1%BB%B1-Th%E1%BA%ADt-hay-Th%E1%BB%AD-Th%C3%A1ch-cho-thanh-thi%E1%BA%BFu-ni%C3%AAn",
  "https://ahaslides.com/vi/blog/truth-or-dare-questions/",
  "https://mytour.vn/vi/blog/bai-viet/280-cau-hoi-su-that-hoac-thu-thach-tot-nhat-de-lam-nong-dem-choi-tiep-theo-cua-ban.html",
];

const BLACKLIST_KEYWORDS = [
  "wikihow",
  "đăng nhập",
  "đăng ký",
  "chuyên mục",
  "sơ đồ trang web",
  "điều khoản",
  "quyền riêng tư",
  "liên hệ",
  "not selling info",
  "bình chọn",
  "quiz",
  "đám mây",
  "báo cáo",
  "tính năng",
  "bài viết liên quan",
  "khuyên",
  "nguyên tắc",
  "luật chơi",
  "hướng dẫn",
  "mẹo",
  "bước ",
  "tạo sự hấp dẫn",
  "câu hỏi sự thật",
  "câu hỏi thật hay",
  "làm nóng đêm chơi",
  "thảo luận về các chủ đề",
];

// Danh sách động từ mệnh lệnh/hành động mở đầu của một CHALLENGE
const IMPERATIVE_VERBS = [
  "hãy",
  "hôn",
  "gọi",
  "khoe",
  "chỉ",
  "ăn",
  "uống",
  "nhảy",
  "đăng",
  "bắt chước",
  "cho người",
  "cho phép",
  "đọc",
  "làm",
  "gửi",
  "viết",
  "bật mí",
  "kể",
  "diễn",
  "cắn",
  "liếm",
  "ngửi",
  "chụp",
  "tải",
  "xoay",
  "múa",
  "đập",
  "bịt mắt",
  "đổi",
  "nhại",
  "thực hiện",
  "nói bằng",
  "vẽ",
  "tỏ tình",
  "chống đẩy",
  "khen",
  "mặc",
  "cởi",
  "chạy",
  "ngồi",
  "bò",
  "đứng",
  "hát",
  "chia sẻ",
  "nhắn",
  "chọn",
  "tạo",
  "quay",
  "đóng vai",
  "thử dập",
  "trộn",
  "phủ",
  "dạy",
];

// Danh sách từ để hỏi chuẩn tiếng Việt
const QUESTION_WORDS = [
  "là gì",
  "ở đâu",
  "bao giờ",
  "khi nào",
  "bao nhiêu",
  "tại sao",
  "như thế nào",
  "mấy lần",
  "ai là",
  "điều gì",
  "cái gì",
  "nơi nào",
  "thế nào",
  "vì sao",
];

function hasWord(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^a-zà-ỹ0-9])${escaped}([^a-zà-ỹ0-9]|$)`, "i");
  return regex.test(text);
}

function hasAnyWord(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => hasWord(text, phrase));
}

function cleanText(raw: string): {
  title: string;
  isExplicitChallenge: boolean;
  isExplicitTruth: boolean;
} {
  let text = raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s\s+/g, " ")
    .trim();

  let isExplicitChallenge = false;
  let isExplicitTruth = false;

  let modified = true;
  while (modified) {
    const prev = text;
    text = text
      .replace(
        /^(câu\s*\d+[\.:\s]*|\d+[\.\)\/\-\:]\s*|\d+\s+|[\-\•\*]\s*)/i,
        "",
      )
      .trim();

    if (/^(thử thách|thách thức|thách|dare)\s*[\:\-\.]\s*/i.test(text)) {
      isExplicitChallenge = true;
      text = text
        .replace(/^(thử thách|thách thức|thách|dare)\s*[\:\-\.]\s*/i, "")
        .trim();
    }

    if (/^(sự thật|thật|truth)\s*[\:\-\.]\s*/i.test(text)) {
      isExplicitTruth = true;
      text = text.replace(/^(sự thật|thật|truth)\s*[\:\-\.]\s*/i, "").trim();
    }

    modified = prev !== text;
  }

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return { title: text, isExplicitChallenge, isExplicitTruth };
}

function isValidEntry(text: string): boolean {
  const lower = text.toLowerCase();

  if (text.length < 8 || text.length > 220) return false;
  if (BLACKLIST_KEYWORDS.some((kw) => lower.includes(kw))) return false;

  const isQuestion =
    text.endsWith("?") ||
    lower.startsWith("ai ") ||
    lower.startsWith("điều gì") ||
    lower.startsWith("cái gì") ||
    lower.startsWith("nơi nào") ||
    lower.startsWith("nếu ") ||
    hasAnyWord(lower, QUESTION_WORDS);

  const isImperative = IMPERATIVE_VERBS.some((verb) => lower.startsWith(verb));

  return isQuestion || isImperative;
}

// 1. Phân loại TYPE
function inferType(
  text: string,
  isExplicitChallenge: boolean,
  isExplicitTruth: boolean,
): QuestionType {
  if (isExplicitChallenge) return QuestionType.CHALLENGE;
  if (isExplicitTruth) {
    const lower = text.toLowerCase();
    const isYesNo =
      lower.startsWith("bạn có") ||
      lower.startsWith("có bao giờ") ||
      lower.startsWith("bạn từng") ||
      lower.startsWith("đã từng") ||
      lower.endsWith("không?") ||
      lower.endsWith("chưa?");
    return isYesNo ? QuestionType.YESNO : QuestionType.OPEN_ENDED;
  }

  const lower = text.toLowerCase();

  // Kiểm tra nếu là câu hỏi Yes/No
  const isYesNoStart =
    lower.startsWith("bạn có") ||
    lower.startsWith("có bao giờ") ||
    lower.startsWith("bạn từng") ||
    lower.startsWith("đã từng") ||
    lower.startsWith("đã bao giờ") ||
    lower.startsWith("có khi nào") ||
    lower.startsWith("bạn có muốn");

  const isYesNoEnd =
    lower.endsWith("không?") ||
    lower.endsWith("chưa?") ||
    lower.endsWith("phải không?") ||
    lower.endsWith("đúng không?");

  // Nếu là câu hỏi Yes/No nhưng có chứa từ nghi vấn lựa chọn/mô tả -> OPEN_ENDED
  if (isYesNoStart || isYesNoEnd) {
    if (
      hasAnyWord(lower, [
        "bao nhiêu",
        "ai là",
        "điều gì",
        "tại sao",
        "về chuyện gì",
        "như thế nào",
      ])
    ) {
      return QuestionType.OPEN_ENDED;
    }
    return QuestionType.YESNO;
  }

  // Nếu câu bắt đầu bằng động từ hành động hoặc không có dấu hỏi chấm -> CHALLENGE
  const startsWithAction = IMPERATIVE_VERBS.some((verb) =>
    lower.startsWith(verb),
  );
  const hasQuestionIntent =
    text.endsWith("?") || hasAnyWord(lower, QUESTION_WORDS);

  if (startsWithAction || !hasQuestionIntent) {
    return QuestionType.CHALLENGE;
  }

  return QuestionType.OPEN_ENDED;
}

// 2. Phân loại TOPIC
function inferTopic(text: string, type: QuestionType): Topic {
  // QUY TẮC BẮT BUỘC: Nếu là CHALLENGE -> Topic mặc định là "Thử thách"
  // Ngoại lệ: Chỉ đổi sang "Thích thầm" nếu là thử thách tỏ tình/crush rõ rệt
  if (type === QuestionType.CHALLENGE) {
    const lower = text.toLowerCase();
    if (hasAnyWord(lower, ["crush", "yêu thầm", "thích thầm"])) {
      return "Thích thầm";
    }
    return "Thử thách";
  }

  const lower = text.toLowerCase();

  // Gia đình
  if (
    hasAnyWord(lower, [
      "bố",
      "mẹ",
      "ba",
      "má",
      "phụ huynh",
      "gia đình",
      "anh trai",
      "em trai",
      "chị gái",
      "em gái",
      "anh chị em",
    ])
  ) {
    return "Gia đình";
  }

  // Thích thầm
  if (
    hasAnyWord(lower, [
      "crush",
      "thích thầm",
      "yêu thầm",
      "phải lòng",
      "say nắng",
    ])
  ) {
    return "Thích thầm";
  }

  // Kỷ niệm
  if (
    hasAnyWord(lower, [
      "kỷ niệm",
      "lần đầu tiên",
      "hồi bé",
      "tuổi thơ",
      "hồi nhỏ",
      "quá khứ",
      "ngày xưa",
      "thời đi học",
      "ấn tượng đầu tiên",
    ])
  ) {
    return "Kỷ niệm";
  }

  // Tình cảm (chỉ xét cho câu hỏi tâm sự, không áp dụng cho challenge troll)
  if (
    hasAnyWord(lower, [
      "người yêu",
      "tình yêu",
      "hẹn hò",
      "bạn trai",
      "bạn gái",
      "người yêu cũ",
      "tình cũ",
      "nụ hôn đầu",
      "lãng mạn",
      "đính hôn",
      "bạn đời",
      "người ấy",
    ])
  ) {
    return "Tình cảm";
  }

  return "Bạn bè";
}

// 3. Phân loại CATEGORIES
function inferCategories(
  text: string,
  type: QuestionType,
  topic: Topic,
): Category[] {
  const lower = text.toLowerCase();
  const categories = new Set<Category>();

  // 1. Giới tính cụ thể
  if (hasAnyWord(lower, ["bạn nam", "con trai", "nam giới", "đàn ông"])) {
    categories.add(Category.BOYS);
  }
  if (hasAnyWord(lower, ["bạn nữ", "con gái", "nữ giới", "phụ nữ"])) {
    categories.add(Category.GIRLS);
  }

  // 2. COUPLE:
  // CHỈ gán cho COUPLE khi câu hỏi/thử thách là tương tác TRỰC TIẾP giữa hai người yêu nhau
  // Tuyệt đối không gán COUPLE cho các thử thách gửi tin nhắn ngẫu nhiên/troll người lạ
  const isRandomNumberPrank =
    lower.includes("số ngẫu nhiên") ||
    lower.includes("người lạ") ||
    lower.includes("cho ai đó");

  if (!isRandomNumberPrank) {
    const coupleSignals = [
      "hai đứa",
      "đối phương",
      "người yêu của bạn",
      "bạn đời của bạn",
      "mối quan hệ của chúng ta",
      "buổi hẹn hò của chúng ta",
      "chúng mình",
      "hẹn hò lại từ đầu",
      "nụ hôn của hai bạn",
      "người yêu bạn",
    ];

    if (hasAnyWord(lower, coupleSignals)) {
      categories.add(Category.COUPLE);
    }
  }

  // 3. FRIENDS: Mặc định tất cả thử thách tiệc tùng, câu hỏi nhóm, hoặc không thuộc couple riêng tư
  if (
    categories.size === 0 ||
    type === QuestionType.CHALLENGE ||
    topic === "Bạn bè" ||
    topic === "Kỷ niệm" ||
    topic === "Thử thách" ||
    hasAnyWord(lower, [
      "ở đây",
      "trong phòng này",
      "nhóm",
      "bạn bè",
      "mọi người",
      "cùng chơi",
    ])
  ) {
    // Nếu là thử thách troll (như "gửi tin nhắn chia tay cho số ngẫu nhiên"), bắt buộc phải là FRIENDS
    if (!categories.has(Category.COUPLE)) {
      categories.add(Category.FRIENDS);
    }
  }

  return Array.from(categories);
}

async function scrapeUrl(url: string): Promise<Question[]> {
  const questions: Question[] = [];

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    $(
      "nav, footer, header, aside, .sidebar, .menu, script, style, noscript, form",
    ).remove();

    $(
      "article li, .entry-content li, .post-content li, .content-detail li, ol li",
    ).each((_, el) => {
      const rawText = $(el).text();
      const { title, isExplicitChallenge, isExplicitTruth } =
        cleanText(rawText);

      if (!isValidEntry(title)) return;

      const type = inferType(title, isExplicitChallenge, isExplicitTruth);
      const topic = inferTopic(title, type);
      const categories = inferCategories(title, type, topic);
      if (type !== QuestionType.CHALLENGE) {
        questions.push({ title, type, topic, categories });
      }
    });
  } catch (error) {
    console.error(`Lỗi cào URL [${url}]:`, (error as Error).message);
  }

  return questions;
}

async function main() {
  const allQuestions: Question[] = [];
  const seenTitles = new Set<string>();

  for (const url of TARGET_URLS) {
    console.log(`Đang xử lý: ${url}`);
    const items = await scrapeUrl(url);

    for (const item of items) {
      const key = item.title.toLowerCase();
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allQuestions.push(item);
      }
    }
  }

  fs.writeFileSync(
    "output_questions.json",
    JSON.stringify(allQuestions, null, 2),
    "utf-8",
  );
  console.log(
    `Đã làm sạch và xuất ${allQuestions.length} câu hỏi hợp lệ vào output_questions.json`,
  );
}

main();
