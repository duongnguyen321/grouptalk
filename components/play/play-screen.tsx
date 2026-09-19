"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import {
  loadTeaserCardsAction,
  revealCardAction,
  spinAction,
  voteHideAction,
} from "@/app/session/[sessionId]/play/actions";
import { CardSelection } from "@/components/cards/card-selection";
import { QuestionCard } from "@/components/cards/question-card";
import { VoteHideDialog } from "@/components/cards/vote-hide-dialog";
import { Wheel } from "@/components/wheel/wheel";
import { WinnerReveal } from "@/components/wheel/winner-reveal";
import { Button } from "@/components/ui/button";
import { Category } from "@/generated/prisma/enums";
import {
  HIDE_TOAST_MS,
  SPIN_BUSY_ERROR,
} from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import {
  categoryIcon,
  categoryLabel,
  primaryCategory,
} from "@/lib/game/category-tone";
import {
  MENU_DURATION_S,
  PHASE_EASE,
  phaseCenter,
  phaseEnter,
  phaseExit,
  phaseTransition,
} from "@/lib/motion";
import type { PlayPlayer, RevealedCard, TeaserCard } from "@/lib/game/play-types";
import {
  nextWheelRotation,
  randomExtraTurns,
  randomSpinDurationMs,
} from "@/lib/game/wheel-math";

type PlayPhase = "idle" | "spinning" | "winner" | "cards" | "revealed";

type PlayScreenProps = {
  sessionId: string;
  sessionCode: string;
  categories: Category[];
  players: PlayPlayer[];
};

export function PlayScreen({
  sessionId,
  sessionCode,
  categories,
  players,
}: PlayScreenProps) {
  const [phase, setPhase] = useState<PlayPhase>("idle");
  const [rotation, setRotation] = useState(0);
  const [spinMs, setSpinMs] = useState(0);
  const [winner, setWinner] = useState<PlayPlayer | null>(null);
  const [cards, setCards] = useState<TeaserCard[]>([]);
  const [revealed, setRevealed] = useState<RevealedCard | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [hideBusy, setHideBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accent = primaryCategory(categories);
  const spinning = phase === "spinning";
  const spinningRef = useRef(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), HIDE_TOAST_MS);
  }, []);

  async function handleSpin() {
    if (phase !== "idle" || busy) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await spinAction(sessionId);

    if (!result.ok) {
      setBusy(false);
      if (result.error === SPIN_BUSY_ERROR) {
        showToast("Đang xử lý, vui lòng thử lại");
        return;
      }
      setError(result.error);
      return;
    }

    const winnerIndex = players.findIndex((player) => player.id === result.player.id);
    const index = winnerIndex >= 0 ? winnerIndex : 0;
    setWinner(result.player);
    setSpinMs(randomSpinDurationMs());
    spinningRef.current = true;
    setRotation((current) =>
      nextWheelRotation(current, index, players.length, randomExtraTurns()),
    );
    setPhase("spinning");
    setBusy(false);
  }

  function finishSpin() {
    if (!spinningRef.current) {
      return;
    }

    spinningRef.current = false;

    if ("vibrate" in navigator) {
      navigator.vibrate(18);
    }

    setPhase("winner");
  }

  const afterWinner = useCallback(async () => {
    if (!winner) {
      setPhase("idle");
      return;
    }

    const result = await loadTeaserCardsAction(sessionId, winner.id, {
      deviceId: getOrCreateDeviceId(),
    });

    if (!result.ok) {
      setError(result.error);
      setPhase("idle");
      return;
    }

    setCards(result.cards);
    setPhase("cards");
  }, [sessionId, winner]);

  async function reveal(questionId: string) {
    if (!winner) {
      return;
    }

    setBusy(true);
    const result = await revealCardAction(sessionId, winner.id, questionId);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      setPhase("idle");
      return;
    }

    setRevealed(result.card);
    setPhase("revealed");
  }

  async function confirmHide() {
    if (!revealed) {
      return;
    }

    setHideBusy(true);
    const result = await voteHideAction(sessionId, revealed.id, {
      deviceId: getOrCreateDeviceId(),
    });
    setHideBusy(false);
    setHideOpen(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    showToast("Đã ẩn câu hỏi này");
  }

  function resetRound() {
    setWinner(null);
    setCards([]);
    setRevealed(null);
    setError(null);
    setPhase("idle");
  }

  return (
    <main className="relative flex min-h-full flex-1 flex-col bg-play text-white">
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((category, index) => (
            <motion.span
              key={category}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.06,
                duration: 0.24,
                ease: [...PHASE_EASE],
              }}
              className="rounded-full bg-white/12 px-3 py-1 text-sm font-bold"
            >
              {categoryIcon(category)} {categoryLabel(category)}
            </motion.span>
          ))}
        </div>
        <button
          type="button"
          aria-label="Mở menu"
          onClick={() => setMenuOpen(true)}
          className="flex size-11 items-center justify-center rounded-full bg-white/10"
        >
          <Menu className="size-5" />
        </button>
      </header>

      <AnimatePresence mode="wait">
        {(phase === "idle" || phase === "spinning") && (
          <motion.section
            key="wheel"
            initial={phaseEnter}
            animate={phaseCenter}
            exit={phaseExit}
            transition={phaseTransition}
            className="flex flex-1 flex-col items-center justify-center px-4"
          >
            <Wheel
              players={players}
              categories={categories}
              rotation={rotation}
              durationMs={spinMs}
              spinning={spinning}
              onSpinComplete={finishSpin}
            />
            <motion.div
              animate={
                spinning
                  ? { scale: 0.92, opacity: 0.55 }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ duration: 0.22, ease: [...PHASE_EASE] }}
            >
              <Button
                type="button"
                disabled={phase !== "idle" || busy}
                onClick={handleSpin}
                className="mt-8 size-28 rounded-full bg-cat-friends text-2xl font-extrabold text-ink shadow-[0_12px_28px_rgba(225,112,85,0.45)] hover:bg-cat-friends/90 disabled:opacity-50"
              >
                QUAY
              </Button>
            </motion.div>
            {error ? (
              <p className="mt-4 text-center text-sm text-cat-couple">{error}</p>
            ) : null}
          </motion.section>
        )}

        {phase === "winner" && winner ? (
          <motion.div
            key="winner"
            initial={phaseEnter}
            animate={phaseCenter}
            exit={phaseExit}
            transition={phaseTransition}
            className="flex flex-1 flex-col"
          >
            <WinnerReveal name={winner.displayName} onDone={afterWinner} />
          </motion.div>
        ) : null}

        {phase === "cards" ? (
          <motion.div
            key="cards"
            initial={phaseEnter}
            animate={phaseCenter}
            exit={phaseExit}
            transition={phaseTransition}
            className="flex min-h-0 flex-1 flex-col"
          >
            <CardSelection cards={cards} disabled={busy} onSelect={reveal} />
          </motion.div>
        ) : null}

        {phase === "revealed" && revealed ? (
          <motion.div
            key="revealed"
            initial={phaseEnter}
            animate={phaseCenter}
            exit={phaseExit}
            transition={phaseTransition}
            className="flex min-h-0 flex-1 flex-col"
          >
            <QuestionCard
              card={revealed}
              onHide={() => setHideOpen(true)}
              onNext={resetRound}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {phase !== "winner" ? (
          <motion.footer
            key="footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm text-white/70"
          >
            <span>{players.length} người chơi</span>
            <Link
              href={`/session/${sessionId}/history`}
              className="underline underline-offset-4"
            >
              Xem lịch sử phiên
            </Link>
          </motion.footer>
        ) : null}
      </AnimatePresence>

      <VoteHideDialog
        open={hideOpen}
        busy={hideBusy}
        onOpenChange={setHideOpen}
        onConfirm={confirmHide}
      />

      <AnimatePresence>
        {toast ? (
          <motion.p
            key="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: [...PHASE_EASE] }}
            className="fixed inset-x-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 rounded-full bg-ink px-4 py-3 text-center text-sm font-bold text-white shadow-lg"
          >
            {toast}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MENU_DURATION_S }}
            className="fixed inset-0 z-50 bg-ink/55"
          >
            <motion.aside
              initial={{ x: 48 }}
              animate={{ x: 0 }}
              exit={{ x: 48 }}
              transition={{ duration: MENU_DURATION_S, ease: [...PHASE_EASE] }}
              className="ml-auto flex h-full w-[min(100%,20rem)] flex-col bg-canvas px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-2xl font-extrabold">Menu</p>
                <button
                  type="button"
                  aria-label="Đóng menu"
                  onClick={() => setMenuOpen(false)}
                  className="flex size-11 items-center justify-center rounded-full bg-white"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="mt-6 flex flex-col text-lg font-bold">
                <Link className="py-2.5" href={`/session/${sessionId}/history`}>
                  Xem lịch sử phiên
                </Link>
                <Link className="py-2.5" href={`/session/${sessionId}/contribute`}>
                  Đóng góp câu hỏi
                </Link>
                <Link className="py-2.5" href={`/session/${sessionId}/code`}>
                  Xem mã phiên
                </Link>
                <p className="py-2 text-sm font-medium text-ink-muted">
                  Mã: {sessionCode}
                </p>
                <Link className="py-2.5 text-cat-couple-deep" href="/session">
                  Thoát phiên
                </Link>
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <span className="sr-only">{categoryLabel(accent)}</span>
    </main>
  );
}
