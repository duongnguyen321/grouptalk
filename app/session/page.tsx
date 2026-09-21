import type { Metadata } from "next";
import { SessionHome } from "@/components/session/session-home";
import { getOverviewStats } from "@/app/questions/actions";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Bắt đầu phiên chơi",
  description:
    "Tạo phiên chơi GroupTalk mới hoặc nhập mã 8 số để tiếp tục phiên chơi từ thiết bị khác mà không lo gián đoạn cuộc vui.",
  alternates: {
    canonical: "/session",
  },
};

type SessionPageProps = {
  searchParams: Promise<{ unauthorized?: string }>;
};

export default async function SessionPage({ searchParams }: SessionPageProps) {
  const [{ unauthorized }, stats, session] = await Promise.all([
    searchParams,
    getOverviewStats(),
    auth(),
  ]);

  return (
    <SessionHome
      user={session?.user ?? null}
      unauthorized={Boolean(unauthorized)}
      stats={stats}
      googleSignInAvailable={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
    />
  );
}



