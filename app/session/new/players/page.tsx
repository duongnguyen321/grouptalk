import type { Metadata } from "next";
import { PlayerEntry } from "@/components/session/player-entry";

export const metadata: Metadata = {
  title: "Nhập danh sách người chơi",
  description:
    "Thêm tên các thành viên tham gia vòng quay GroupTalk. Tối thiểu 2 người chơi để bắt đầu cuộc vui.",
  alternates: {
    canonical: "/session/new/players",
  },
};

export default function PlayerEntryPage() {
  return <PlayerEntry />;
}
