"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  FolderKanban,
  Play,
  PlusCircle,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { joinSessionByCode } from "@/app/session/actions";
import {
  deleteAllMyGameSessions,
  deleteGameSession,
  fetchMyGameSessions,
} from "@/app/session/server-actions";
import { StatsOverviewCard } from "@/components/ui/stats-overview-card";
import { SiteFooter } from "@/components/ui/site-footer";
import { UserAccountBar } from "@/components/ui/user-account-bar";
import type { OverviewStats } from "@/app/questions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SESSION_CODE_LENGTH } from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import { categoryIcon, categoryLabel } from "@/lib/game/category-tone";
import {
  clearRecentSessions,
  getRecentSessionsServerSnapshot,
  getRecentSessionsSnapshot,
  removeRecentSession,
  saveRecentSession,
  subscribeRecentSessions,
} from "@/lib/recent-sessions";
import {
  PHASE_EASE,
  screenContainer,
  screenItem,
  TAP_SCALE,
} from "@/lib/motion";
import { formatRelativeTime } from "@/lib/date";

function RecentSessions() {
  const router = useRouter();
  const localRecent = useSyncExternalStore(
    subscribeRecentSessions,
    getRecentSessionsSnapshot,
    getRecentSessionsServerSnapshot,
  );
  const [serverSessions, setServerSessions] = useState<typeof localRecent>([]);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  useEffect(() => {
    fetchMyGameSessions().then(setServerSessions).catch(() => {});
  }, []);

  // Merge: server is authoritative, deduplicate by sessionId, sort by createdAt desc
  const seen = new Set<string>();
  const recent = [...serverSessions, ...localRecent]
    .filter((entry) => {
      if (seen.has(entry.sessionId)) return false;
      seen.add(entry.sessionId);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return null;
  }

  function handleDelete(sessionId: string) {
    removeRecentSession(sessionId);
    setServerSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    setSessionToDelete(null);
    // Best-effort server delete (no-op for guests)
    deleteGameSession(sessionId).catch(() => {});
  }

  function handleClearAll() {
    clearRecentSessions();
    setServerSessions([]);
    setShowClearAll(false);
    // Best-effort server delete-all (no-op for guests)
    deleteAllMyGameSessions().catch(() => {});
  }

  return (
    <motion.section variants={screenItem} className="mt-8 flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-ink-muted uppercase">
          <Clock className="size-4" />
          <span>Phiên gần đây ({recent.length})</span>
        </div>
        {recent.length > 1 ? (
          <button
            type="button"
            onClick={() => setShowClearAll(true)}
            className="text-xs font-semibold text-cat-couple-deep hover:underline"
          >
            Xoá tất cả
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5">
        {recent.map((entry) => (
          <motion.div
            key={entry.sessionId}
            className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_4px_12px_rgba(28,25,23,0.04)]"
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-extrabold tracking-wider text-ink">
                  {entry.sessionCode.slice(0, 4)} {entry.sessionCode.slice(4)}
                </span>
                <span className="text-xs text-ink-soft">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {entry.categories.map((cat) => {
                  const Icon = categoryIcon(cat);
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-md bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink-soft"
                    >
                      <Icon className="size-3" />
                      <span>{categoryLabel(cat)}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => router.push(`/session/${entry.sessionId}/play`)}
                className="rounded-xl font-bold"
              >
                <Play className="size-3.5 fill-current" />
                <span>Vào lại</span>
              </Button>
              <button
                type="button"
                aria-label="Xoá phiên khỏi danh sách"
                onClick={() => setSessionToDelete(entry.sessionId)}
                className="flex size-9 items-center justify-center rounded-xl text-ink-muted transition hover:bg-cat-couple/15 hover:text-cat-couple-deep active:scale-95"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Single Dialog */}
      <Dialog
        open={Boolean(sessionToDelete)}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <DialogContent showCloseButton={false} className="rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold">
              Xoá phiên này khỏi danh sách?
            </DialogTitle>
            <DialogDescription className="text-base text-ink-soft">
              Phiên sẽ không còn xuất hiện trong danh sách gần đây trên máy này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end border-0 bg-transparent">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSessionToDelete(null)}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={() => sessionToDelete && handleDelete(sessionToDelete)}
              className="bg-cat-couple-deep text-white hover:bg-cat-couple-deep/90"
            >
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Dialog */}
      <Dialog open={showClearAll} onOpenChange={setShowClearAll}>
        <DialogContent showCloseButton={false} className="rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold">
              Xoá toàn bộ phiên gần đây?
            </DialogTitle>
            <DialogDescription className="text-base text-ink-soft">
              Tất cả các phiên đã lưu trên máy này sẽ bị xoá khỏi danh sách.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end border-0 bg-transparent">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearAll(false)}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={handleClearAll}
              className="bg-cat-couple-deep text-white hover:bg-cat-couple-deep/90"
            >
              Xoá tất cả
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}

export type SessionHomeProps = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    displayName?: string | null;
  } | null;
  unauthorized?: boolean;
  stats?: OverviewStats;
  googleSignInAvailable?: boolean;
};

export function SessionHome({
  user,
  unauthorized,
  stats,
  googleSignInAvailable = true,
}: SessionHomeProps = {}) {
  const router = useRouter();
  const localRecent = useSyncExternalStore(
    subscribeRecentSessions,
    getRecentSessionsSnapshot,
    getRecentSessionsServerSnapshot,
  );
  const [serverSessions, setServerSessions] = useState<typeof localRecent>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchMyGameSessions().then(setServerSessions).catch(() => {});
  }, []);

  // Merge for badge count on the 'Quản lý phiên' card
  const seenHome = new Set<string>();
  const recent = [...serverSessions, ...localRecent].filter((entry) => {
    if (seenHome.has(entry.sessionId)) return false;
    seenHome.add(entry.sessionId);
    return true;
  });

  async function submitCode(value: string) {
    const nextCode = value.replace(/\D/g, "").slice(0, SESSION_CODE_LENGTH);
    setCode(nextCode);
    setError(null);

    if (nextCode.length !== SESSION_CODE_LENGTH) {
      return;
    }

    setIsJoining(true);
    const result = await joinSessionByCode(nextCode, getOrCreateDeviceId());
    if (!result.ok) {
      setError(result.error);
      setIsJoining(false);
      return;
    }

    saveRecentSession({
      sessionId: result.sessionId,
      sessionCode: result.sessionCode,
      categories: result.categories,
    });

    router.push(`/session/${result.sessionId}/play`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      <main className="flex flex-1 flex-col px-6 py-8 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <motion.div
          variants={screenContainer}
          initial="hidden"
          animate="show"
          className="mx-auto flex w-full max-w-md flex-1 flex-col"
        >
          <motion.header
            variants={screenItem}
            className="flex items-start justify-between gap-4"
          >
            <div>
              <Link
                href="/"
                className="text-sm font-medium tracking-[0.22em] text-ink-muted uppercase transition hover:text-ink"
              >
                GroupTalk · Bắt đầu
              </Link>
              <h1 className="mt-2 font-display text-4xl leading-none font-extrabold text-ink">
                Chọn cách vào phiên
              </h1>
            </div>
            <motion.a
              whileTap={{ scale: TAP_SCALE }}
              href="/contribute"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-[0_2px_8px_rgba(28,25,23,0.06)] transition hover:bg-ink/5"
            >
              <PlusCircle className="size-4 text-cat-friends-deep" />
              <span>Đóng góp</span>
            </motion.a>
          </motion.header>

          <motion.div variants={screenItem} className="mt-5">
            <UserAccountBar
              user={user}
              googleSignInAvailable={googleSignInAvailable}
            />
          </motion.div>

          {unauthorized ? (
            <motion.div
              variants={screenItem}
              className="mt-6 flex items-start gap-3 rounded-2xl border border-cat-couple-deep/20 bg-cat-couple-light/40 p-4 text-ink"
            >
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-cat-couple-deep" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-ink">
                  Bạn không phải chủ phiên này
                </p>
                <p className="text-xs leading-relaxed text-ink-soft">
                  Vì mỗi phiên gắn với một thiết bị, hãy nhập mã 8 chữ số bên dưới để sao chép phiên sang máy của bạn.
                </p>
              </div>
            </motion.div>
          ) : null}

          {stats && (stats.questionCount > 0 || stats.playerCount > 0) ? (
            <StatsOverviewCard
              questionCount={stats.questionCount}
              playerCount={stats.playerCount}
              className="mt-6"
            />
          ) : null}

          <div className="mt-6 flex flex-col gap-4">
            <motion.a
              variants={screenItem}
              whileTap={{ scale: TAP_SCALE }}
              href="/session/new/categories"
              className="flex min-h-28 flex-col justify-center rounded-3xl bg-ink px-6 py-5 text-canvas shadow-[0_12px_28px_rgba(28,25,23,0.16)] transition hover:bg-ink/90"
            >
              <span className="text-2xl font-extrabold">Tạo phiên mới</span>
              <span className="mt-1 text-sm text-canvas/70">
                Chọn thể loại, nhập tên, rồi quay.
              </span>
            </motion.a>

            <motion.section
              variants={screenItem}
              className="rounded-3xl border border-ink/10 bg-white px-6 py-5 shadow-[0_4px_16px_rgba(28,25,23,0.04)]"
            >
              <h2 className="text-xl font-extrabold text-ink">
                Nhập mã để tiếp tục phiên
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Máy kia đọc 8 số. Máy này gõ vào.
              </p>
              <label className="sr-only" htmlFor="session-code">
                Mã phiên 8 số
              </label>
              <motion.input
                id="session-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={SESSION_CODE_LENGTH}
                value={code}
                animate={
                  isJoining
                    ? { scale: 1.02, opacity: 0.75 }
                    : error
                      ? { x: [0, -8, 8, -5, 0], scale: 1, opacity: 1 }
                      : { scale: 1, opacity: 1 }
                }
                transition={{
                  duration: error ? 0.34 : 0.22,
                  ease: [...PHASE_EASE],
                }}
                onChange={(event) => submitCode(event.target.value)}
                placeholder="00000000"
                className="mt-4 w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-4 text-center font-display text-3xl tracking-[0.28em] text-ink outline-none transition focus:border-cat-friends-deep"
              />
              <AnimatePresence>
                {error ? (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: [...PHASE_EASE] }}
                    className="mt-3 text-sm text-cat-couple-deep"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                ) : null}
                {isJoining ? (
                  <motion.p
                    key="joining"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: [...PHASE_EASE] }}
                    className="mt-3 text-sm text-ink-muted"
                  >
                    Đang mở phiên…
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.section>

            <motion.a
              variants={screenItem}
              whileTap={{ scale: TAP_SCALE }}
              href="/session/manage"
              className="flex min-h-20 items-center justify-between rounded-3xl border border-ink/10 bg-white px-6 py-4 shadow-[0_4px_16px_rgba(28,25,23,0.04)] transition hover:border-ink/20"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-ink">
                  <FolderKanban className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="block text-lg font-extrabold text-ink">
                      Quản lý phiên
                    </span>
                    {recent.length > 0 ? (
                      <span className="rounded-full bg-ink/8 px-2 py-0.5 text-xs font-bold text-ink">
                        {recent.length}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-ink-muted">
                    Xem lại phòng đã chơi, xem mã và lịch sử
                  </span>
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-ink-muted" />
            </motion.a>

            <RecentSessions />

            <SiteFooter className="pt-2 pb-2" />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
