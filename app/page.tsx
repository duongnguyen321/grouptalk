import type { Metadata } from "next";
import { SplashScreen } from "@/components/splash/splash-screen";
import { auth } from "@/lib/auth";
import { getOverviewStats } from "@/app/questions/actions";

export const metadata: Metadata = {
  title: "GroupTalk - Vòng quay & Rút thẻ bài kết nối nhóm",
  description:
    "Bắt đầu ngay trò chơi vòng quay và rút thẻ bài GroupTalk cùng bạn bè. Quay ngẫu nhiên, mở thẻ câu hỏi thật lòng, deeptalking gắn kết bạn bè và cặp đôi.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const [session, stats] = await Promise.all([
    auth(),
    getOverviewStats(),
  ]);

  return (
    <SplashScreen
      user={session?.user ?? null}
      hasGoogleSession={Boolean(session?.user)}
      googleSignInAvailable={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
      stats={stats}
    />
  );
}

