"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Plus, Sparkles } from "lucide-react";
import { signInWithGoogle } from "@/app/auth/actions";
import { getOrCreateDeviceId } from "@/lib/device";
import { createSessionDraft } from "@/app/session/actions";
import { StatsOverviewCard } from "@/components/ui/stats-overview-card";
import { SiteFooter } from "@/components/ui/site-footer";
import { UserAccountBar } from "@/components/ui/user-account-bar";
import type { OverviewStats } from "@/app/questions/actions";
import { screenContainer, screenItem, TAP_SCALE } from "@/lib/motion";

type SplashScreenProps = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    displayName?: string | null;
  } | null;
  hasGoogleSession: boolean;
  googleSignInAvailable: boolean;
  stats?: OverviewStats;
};

export function SplashScreen({
  user,
  hasGoogleSession,
  googleSignInAvailable,
  stats,
}: SplashScreenProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function playAsGuest() {
    setIsStarting(true);
    setError(null);

    try {
      const deviceId = getOrCreateDeviceId();
      await createSessionDraft({ deviceId });
      router.push("/session");
    } catch {
      setError("Không thể bắt đầu. Thử lại nhé.");
      setIsStarting(false);
    }
  }

  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-canvas px-6 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-8 size-48 rounded-full bg-cat-friends/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-24 size-56 rounded-full bg-cat-couple/30 blur-3xl"
      />

      <motion.div
        variants={screenContainer}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-between"
      >
        {/* Top account bar */}
        <motion.div variants={screenItem} className="pt-2">
          <UserAccountBar
            user={user}
            googleSignInAvailable={googleSignInAvailable}
          />
        </motion.div>

        <motion.header variants={screenItem} className="pt-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-[0.28em] text-ink-muted uppercase">
              Trò chơi nhóm
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cat-friends/20 px-2 py-0.5 text-[10px] font-extrabold text-cat-friends-deep">
              <Sparkles className="size-2.5" />
              <span>Deeptalking</span>
            </span>
          </div>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl leading-none font-extrabold text-ink">
            GroupTalk
          </h1>
          <p className="mt-4 max-w-[18rem] text-lg leading-snug text-ink-soft">
            Vòng quay & rút thẻ bài thật lòng cho bạn bè, cặp đôi tụ tập.
          </p>
        </motion.header>

        {stats && (stats.questionCount > 0 || stats.playerCount > 0) ? (
          <motion.div variants={screenItem} className="my-auto py-5">
            <StatsOverviewCard
              questionCount={stats.questionCount}
              playerCount={stats.playerCount}
            />
          </motion.div>
        ) : null}

        <motion.div variants={screenItem} className="flex flex-col gap-3 pt-4 pb-2">
          {error ? (
            <p
              className="text-center text-sm text-cat-couple-deep"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {hasGoogleSession ? (
            <>
              <motion.button
                whileTap={{ scale: TAP_SCALE }}
                type="button"
                onClick={() => router.push("/session")}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 text-lg font-extrabold text-canvas shadow-[0_10px_24px_rgba(28,25,23,0.18)] transition hover:bg-ink/90"
              >
                <span>Vào phòng chơi</span>
                <ArrowRight className="size-5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: TAP_SCALE }}
                type="button"
                onClick={() => router.push("/session/new/categories")}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ink/15 bg-white px-6 text-base font-bold text-ink transition hover:bg-ink/5"
              >
                <Plus className="size-4 text-cat-friends-deep" />
                <span>Tạo phiên mới ngay</span>
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: TAP_SCALE }}
                type="button"
                onClick={playAsGuest}
                disabled={isStarting}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 text-lg font-extrabold text-canvas shadow-[0_10px_24px_rgba(28,25,23,0.18)] transition enabled:active:translate-y-px disabled:opacity-60 hover:bg-ink/90"
              >
                <span>{isStarting ? "Đang vào…" : "Chơi ngay (Ẩn danh)"}</span>
                <ArrowRight className="size-5" />
              </motion.button>

              {googleSignInAvailable ? (
                <form action={signInWithGoogle}>
                  <motion.button
                    whileTap={{ scale: TAP_SCALE }}
                    type="submit"
                    className="min-h-12 w-full rounded-2xl border border-ink/15 bg-white px-6 text-base font-semibold text-ink-soft transition hover:border-ink/25 hover:bg-ink/5"
                  >
                    Đăng nhập với Google
                  </motion.button>
                </form>
              ) : null}
            </>
          )}

          <div className="mt-1 flex items-center justify-center gap-4 text-sm font-bold text-ink-muted">
            <Link
              href="/questions"
              className="flex items-center gap-1 underline underline-offset-4 transition hover:text-ink"
            >
              <BookOpen className="size-3.5" />
              <span>Kho câu hỏi</span>
            </Link>
            <span>•</span>
            <Link
              href="/contribute"
              className="underline underline-offset-4 transition hover:text-ink"
            >
              Đóng góp câu hỏi
            </Link>
          </div>

          <SiteFooter className="pt-3 pb-0" />
        </motion.div>
      </motion.div>
    </main>
  );
}

