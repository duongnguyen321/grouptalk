import type { Metadata } from "next";
import { CategorySelect } from "@/components/session/category-select";

export const metadata: Metadata = {
  title: "Chọn thể loại chơi",
  description:
    "Lựa chọn các thể loại câu hỏi phù hợp: Cặp đôi, Nhóm bạn, Nhóm nữ, Nhóm nam và chế độ Thích thầm trong trò chơi GroupTalk.",
  alternates: {
    canonical: "/session/new/categories",
  },
};

export default function CategorySelectPage() {
  return <CategorySelect />;
}
