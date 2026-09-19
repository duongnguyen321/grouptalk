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

// Từ khóa giao diện hoặc nội dung mô tả bài viết cần loại trừ
const BLACKLIST_KEYWORDS = [
  "wikihow", "đăng nhập", "đăng ký", "chuyên mục", "sơ đồ trang web",
  "điều khoản", "quyền riêng tư", "liên hệ", "not selling info",
  "bình chọn", "quiz", "đám mây", "báo cáo", "tính năng", "bài viết liên quan",
  "khuyên", "nguyên tắc", "luật chơi", "hướng dẫn", "mẹo", "bước ",
  "tạo sự hấp dẫn", "câu hỏi sự thật", "câu hỏi thật hay", "làm nóng đêm chơi",
  "thảo luận về các chủ đề"
];

// Helper kiểm tra từ nguyên vẹn với boundary tiếng Việt thay vì substring thông thường
function hasWord(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^a-zà-ỹ0-9])${escaped}([^a-zà-ỹ0-9]|$)`, "i");
  return regex.test(text);
}

function hasAnyWord(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => hasWord(text, phrase));
}

// Làm sạch toàn bộ prefix, số thứ tự, ngắt dòng
function cleanText(raw: string): { title: string; isExplicitChallenge: boolean; isExplicitTruth: boolean } {
  let text = raw.replace(/[\r\n\t]+/g, " ").replace(/\s\s+/g, " ").trim();

  let isExplicitChallenge = false;
  let isExplicitTruth = false;

  let modified = true;
  while (modified) {
    const prev = text;
    // Xóa số thứ tự đầu chuỗi ("1.", "15 ", "Câu 1: ", "- ")
    text = text.replace(/^(câu\s*\d+[\.:\s]*|\d+[\.\)\/\-\:]\s*|\d+\s+|[\-\•\*]\s*)/i, "").trim();

    // Bóc nhãn Thử thách
    if (/^(thử thách|thách thức|thách|dare)\s*[\:\-\.]\s*/i.test(text)) {
      isExplicitChallenge = true;
      text = text.replace(/^(thử thách|thách thức|thách|dare)\s*[\:\-\.]\s*/i, "").trim();
    }

    // Bóc nhãn Sự thật
    if (/^(sự thật|thật|truth)\s*[\:\-\.]\s*/i.test(text)) {
      isExplicitTruth = true;
      text = text.replace(/^(sự thật|thật|truth)\s*[\:\-\.]\s*/i, "").trim();
    }

    modified = prev !== text;
  }

  // Viết hoa lại chữ cái đầu
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return { title: text, isExplicitChallenge, isExplicitTruth };
}

// Kiểm tra câu có hợp lệ về mặt ngữ pháp / cấu trúc trò chơi
function isValidEntry(text: string): boolean {
  const lower = text.toLowerCase();

  if (text.length < 10 || text.length > 200) return false;
  if (BLACKLIST_KEYWORDS.some((kw) => lower.includes(kw))) return false;

  const isQuestion =
    text.endsWith("?") ||
    lower.startsWith("ai ") ||
    lower.startsWith("điều gì") ||
    lower.startsWith("cái gì") ||
    lower.startsWith("nơi nào") ||
    lower.startsWith("nếu ") ||
    lower.startsWith("lần cuối") ||
    lower.startsWith("lần gần nhất") ||
    hasAnyWord(lower, ["là gì", "ở đâu", "bao giờ", "khi nào", "bao nhiêu", "tại sao", "như thế nào", "mấy lần"]);

  const challengePrefixes = [
    "hãy", "hôn", "gọi", "khoe", "chỉ", "ăn", "uống", "nhảy", "đăng", 
    "bắt chước", "cho người", "cho phép", "đọc", "làm", "uống", "gửi",
    "bật mí", "kể", "diễn", "cắn", "liếm", "ngửi", "chụp", "tải", "xoay",
    "múa", "đập", "bịt mắt", "đổi", "nhại", "thực hiện", "nói bằng",
    "vẽ", "tỏ tình", "chống đẩy", "viết", "khen"
  ];

  const isChallenge = challengePrefixes.some((p) => lower.startsWith(p));

  return isQuestion || isChallenge;
}

function inferType(text: string, isChallenge: boolean): QuestionType {
  if (isChallenge) return QuestionType.CHALLENGE;

  const lower = text.toLowerCase();

  // Động từ mệnh lệnh đầu câu
  const actionPrefixes = [
    "hãy", "hôn", "gọi", "khoe", "uống", "nhảy", "đăng", "bắt chước",
    "gửi tin nhắn", "cởi", "thực hiện", "múa", "diễn lại", "nhại lại",
    "ăn", "liếm", "ngửi", "chụp", "cắn", "xoa bóp", "mở", "khen ngợi"
  ];
  if (actionPrefixes.some((w) => lower.startsWith(w))) {
    return QuestionType.CHALLENGE;
  }

  // Nhận diện câu Yes/No
  const isYesNoStart =
    lower.startsWith("bạn có") ||
    lower.startsWith("có bao giờ") ||
    lower.startsWith("bạn từng") ||
    lower.startsWith("đã từng") ||
    lower.startsWith("đã bao giờ") ||
    lower.startsWith("có khi nào");

  const isYesNoEnd =
    lower.endsWith("không?") ||
    lower.endsWith("chưa?") ||
    lower.endsWith("phải không?") ||
    lower.endsWith("đúng không?");

  if (isYesNoStart || isYesNoEnd) {
    // Nếu chứa các từ nghi vấn hỏi lựa chọn cụ thể -> chuyển thành câu hỏi mở
    if (hasAnyWord(lower, ["bao nhiêu", "ai", "gì", "như thế nào", "tại sao", "về chuyện gì"])) {
      return QuestionType.OPEN_ENDED;
    }
    return QuestionType.YESNO;
  }

  return QuestionType.OPEN_ENDED;
}

function inferTopic(text: string, type: QuestionType): Topic {
  if (type === QuestionType.CHALLENGE) return "Thử thách";

  const lower = text.toLowerCase();

  // 1. Gia đình
  if (hasAnyWord(lower, ["bố", "mẹ", "ba", "má", "phụ huynh", "gia đình", "anh trai", "em trai", "chị gái", "em gái", "anh chị em"])) {
    return "Gia đình";
  }

  // 2. Thích thầm (Crush)
  if (hasAnyWord(lower, ["crush", "thích thầm", "yêu thầm", "phải lòng", "say nắng"])) {
    return "Thích thầm";
  }

  // 3. Tình cảm (Couple, hẹn hò, lãng mạn)
  if (hasAnyWord(lower, [
    "người yêu", "tình yêu", "hẹn hò", "bạn trai", "bạn gái",
    "người yêu cũ", "tình cũ", "nụ hôn", "hôn", "lãng mạn", "chia tay",
    "đính hôn", "bạn đời", "tỏ tình", "tán tỉnh"
  ])) {
    return "Tình cảm";
  }

  // 4. Kỷ niệm (Quá khứ, lần đầu, hồi nhỏ)
  if (hasAnyWord(lower, [
    "kỷ niệm", "lần đầu tiên", "hồi bé", "tuổi thơ", "hồi nhỏ",
    "quá khứ", "ngày xưa", "thời đi học", "ấn tượng đầu tiên"
  ])) {
    return "Kỷ niệm";
  }

  // Mặc định các câu hỏi còn lại là chủ đề bạn bè / giao lưu nhóm
  return "Bạn bè";
}

function inferCategories(text: string, topic: Topic): Category[] {
  const lower = text.toLowerCase();
  const categories = new Set<Category>();

  // 1. Phân loại theo giới tính cụ thể
  if (hasAnyWord(lower, ["bạn nam", "con trai", "anh em", "nam giới", "đàn ông"])) {
    categories.add(Category.BOYS);
  }
  if (hasAnyWord(lower, ["bạn nữ", "con gái", "chị em", "nữ giới", "phụ nữ"])) {
    categories.add(Category.GIRLS);
  }

  // 2. Cặp đôi: CHỈ gán khi câu hướng trực tiếp vào mối quan hệ 2 người yêu nhau
  const coupleSignals = [
    "hai đứa", "người yêu", "bạn đời", "đối phương", "người ấy",
    "mối quan hệ của chúng ta", "mối quan hệ của bạn", "chúng mình",
    "hẹn hò lại từ đầu", "nụ hôn đầu", "yêu nhau", "chia tay"
  ];
  if (hasAnyWord(lower, coupleSignals)) {
    categories.add(Category.COUPLE);
  }

  // 3. Nhóm bạn bè chung:
  // Nếu đề cập rõ đến không gian nhóm, tiệc tùng HOẶC không phải câu hỏi dành riêng cho couple
  const isGroupContext = hasAnyWord(lower, [
    "ở đây", "trong phòng này", "nhóm", "ai trong số", "bạn bè",
    "mọi người", "cùng chơi", "bạn thân", "chúng ta"
  ]);

  if (categories.size === 0 || isGroupContext || topic === "Bạn bè" || topic === "Kỷ niệm") {
    // Nếu câu hỏi về tập thể trong phòng, đảm bảo luôn có FRIENDS
    categories.add(Category.FRIENDS);
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

    // Xóa bỏ tất cả các thành phần điều hướng, footer, bảng quảng cáo
    $("nav, footer, header, aside, .sidebar, .menu, script, style, noscript, form").remove();

    $("article li, .entry-content li, .post-content li, .content-detail li, ol li").each((_, el) => {
      const rawText = $(el).text();
      const { title, isExplicitChallenge } = cleanText(rawText);

      if (!isValidEntry(title)) return;

      const type = inferType(title, isExplicitChallenge);
      const topic = inferTopic(title, type);
      const categories = inferCategories(title, topic);

      questions.push({ title, type, topic, categories });
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

  fs.writeFileSync("output_questions.json", JSON.stringify(allQuestions, null, 2), "utf-8");
  console.log(`Đã làm sạch và xuất ${allQuestions.length} câu hỏi hợp lệ vào output_questions.json`);
}

main();