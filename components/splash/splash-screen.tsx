"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/app/auth/actions";
import { getDeviceId, getOrCreateDeviceId } from "@/lib/device";
import { createSessionDraft } from "@/app/session/actions";
import { StatsOverviewCard } from "@/components/ui/stats-overview-card";
import { SiteFooter } from "@/components/ui/site-footer";
import type { OverviewStats } from "@/app/questions/actions";

type SplashScreenProps = {
  hasGoogleSession: boolean;
  googleSignInAvailable: boolean;
  stats?: OverviewStats;
};

function subscribeNoop() {
  return () => undefined;
}

export function SplashScreen({
  hasGoogleSession,
  googleSignInAvailable,
  stats,
}: SplashScreenProps) {
  const router = useRouter();
  const storedDeviceId = useSyncExternalStore(
    subscribeNoop,
    getDeviceId,
    () => null,
  );
  const hasIdentity = hasGoogleSession || Boolean(storedDeviceId);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasIdentity) {
      router.replace("/session");
    }
  }, [hasIdentity, router]);

  async function playAsGuest() {
    setIsStarting(true);
    setError(null);

    try {
      const deviceId = getOrCreateDeviceId();
      await createSessionDraft({ deviceId });
      router.replace("/session");
    } catch {
      setError("Không thể bắt đầu. Thử lại nhé.");
      setIsStarting(false);
    }
  }

  if (hasIdentity) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center bg-canvas px-6">
        <p className="text-ink-muted">Đang mở GroupTalk…</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-canvas px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-8 size-48 rounded-full bg-cat-friends/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-24 size-56 rounded-full bg-cat-couple/30 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-between">
        <header className="pt-10">
          <p className="text-sm font-medium tracking-[0.28em] text-ink-muted uppercase">
            Trò chơi nhóm
          </p>
          <h1 className="mt-4 font-display text-6xl leading-none font-extrabold text-ink">
            GroupTalk
          </h1>
          <p className="mt-5 max-w-[16rem] text-lg leading-snug text-ink-soft">
            Quay. Rút thẻ. Deeptalking.
          </p>
        </header>

        {stats && (stats.questionCount > 0 || stats.playerCount > 0) ? (
          <div className="my-auto py-4">
            <StatsOverviewCard
              questionCount={stats.questionCount}
              playerCount={stats.playerCount}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pb-6">
          {error ? (
            <p
              className="text-center text-sm text-cat-couple-deep"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={playAsGuest}
            disabled={isStarting}
            className="min-h-14 w-full rounded-2xl bg-ink px-6 text-lg font-extrabold text-canvas shadow-[0_10px_24px_rgba(28,25,23,0.18)] transition enabled:active:translate-y-px disabled:opacity-60"
          >
            {isStarting ? "Đang vào…" : "Chơi ngay"}
          </button>

          {googleSignInAvailable ? (
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="min-h-12 w-full rounded-2xl border border-ink/15 bg-transparent px-6 text-base font-semibold text-ink-soft"
              >
                Đăng nhập với Google
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-ink-muted">
              Tài khoản ẩn danh.
            </p>
          )}

          <Link
            href="/contribute"
            className="mt-2 text-center text-sm font-bold text-ink-muted underline underline-offset-4 transition hover:text-ink"
          >
            Đóng góp câu hỏi
          </Link>

          <SiteFooter className="pt-2 pb-0" />
        </div>
      </div>
    </main>
  );
}
