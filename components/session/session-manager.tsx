"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  FolderOpen,
  Play,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { BackHeader } from "@/components/ui/back-header";
import { fetchMyGameSessions } from "@/app/session/server-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoryIcon, categoryLabel } from "@/lib/game/category-tone";
import {
  clearRecentSessions,
  getRecentSessionsServerSnapshot,
  getRecentSessionsSnapshot,
  removeRecentSession,
  subscribeRecentSessions,
} from "@/lib/recent-sessions";
import { PHASE_EASE, screenContainer, screenItem, TAP_SCALE } from "@/lib/motion";

export function SessionManager() {
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function formatRelativeTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    } catch {
      return "";
    }
  }

  function handleDelete(sessionId: string) {
    removeRecentSession(sessionId);
    setSessionToDelete(null);
  }

  function handleClearAll() {
    clearRecentSessions();
    setShowClearAll(false);
  }

  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas">
      <BackHeader backHref="/session" title="Quản lý phiên" />
      <motion.div
        variants={screenContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10"
      >
        <motion.header variants={screenItem} className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium tracking-[0.22em] text-ink-muted uppercase">
              Danh sách phiên chơi
            </p>
            <h1 className="mt-3 font-display text-4xl leading-none font-extrabold text-ink">
              Quản lý phiên
            </h1>
          </div>
          {recent.length > 1 ? (
            <motion.button
              whileTap={{ scale: TAP_SCALE }}
              type="button"
              onClick={() => setShowClearAll(true)}
              className="mt-2 text-xs font-bold text-cat-couple-deep hover:underline"
            >
              Xoá tất cả
            </motion.button>
          ) : null}
        </motion.header>

        {recent.length === 0 ? (
          <motion.div
            variants={screenItem}
            className="my-auto flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="flex size-20 items-center justify-center rounded-3xl bg-ink/5 text-ink-muted">
              <FolderOpen className="size-10" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-extrabold text-ink">
              Chưa có phiên chơi nào
            </h2>
            <p className="mt-2 max-w-xs text-sm text-ink-muted">
              Các phiên bạn đã tạo hoặc nhập mã sẽ xuất hiện ở đây để bạn dễ dàng quản lý và vào lại.
            </p>
            <motion.div whileTap={{ scale: TAP_SCALE }} className="mt-8">
              <Button
                onClick={() => router.push("/session/new/categories")}
                className="h-12 gap-2 rounded-2xl px-6 text-base font-extrabold"
              >
                <Plus className="size-4" />
                <span>Tạo phiên mới ngay</span>
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div variants={screenItem} className="mt-8 flex flex-col gap-3">
            {recent.map((entry) => (
              <motion.div
                key={entry.sessionId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 rounded-3xl border border-ink/10 bg-white p-5 shadow-[0_4px_16px_rgba(28,25,23,0.04)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-display text-2xl font-extrabold tracking-widest text-ink">
                      {entry.sessionCode.slice(0, 4)} · {entry.sessionCode.slice(4)}
                    </span>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatRelativeTime(entry.createdAt)}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: TAP_SCALE }}
                    type="button"
                    aria-label="Xoá phiên"
                    onClick={() => setSessionToDelete(entry.sessionId)}
                    className="flex size-9 items-center justify-center rounded-xl text-ink-muted transition hover:bg-cat-couple/15 hover:text-cat-couple-deep"
                  >
                    <Trash2 className="size-4" />
                  </motion.button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {entry.categories.map((cat) => {
                    const Icon = categoryIcon(cat);
                    return (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 rounded-lg bg-ink/5 px-2.5 py-1 text-xs font-bold text-ink-soft"
                      >
                        <Icon className="size-3" />
                        <span>{categoryLabel(cat)}</span>
                      </span>
                    );
                  })}
                </div>

                <div className="mt-1 flex items-center gap-2 border-t border-ink/5 pt-3">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/session/${entry.sessionId}/play`)}
                    className="flex-1 rounded-xl font-bold"
                  >
                    <Play className="size-3.5 fill-current" />
                    <span>Vào chơi</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/session/${entry.sessionId}/code`)}
                    className="rounded-xl font-bold"
                  >
                    <Share2 className="size-3.5" />
                    <span>Mã</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/session/${entry.sessionId}/history`)}
                    className="rounded-xl font-bold"
                  >
                    <Clock className="size-3.5" />
                    <span>Lịch sử</span>
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

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
              Phiên sẽ không còn xuất hiện trong danh sách quản lý trên máy này.
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
              Xoá toàn bộ danh sách phiên?
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
    </main>
  );
}
