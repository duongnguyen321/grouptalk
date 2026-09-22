"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, GitBranch, Layers, LogOut, Menu, PlusCircle, Share2, UserPlus, X } from "lucide-react";
import {
  discardCardAction,
  loadTeaserCardsAction,
  revealCardAction,
  spinAction,
  tagPlayerAction,
  voteHideAction,
} from "@/app/session/[sessionId]/play/actions";
import { CardSelection } from "@/components/cards/card-selection";
import { QuestionCard } from "@/components/cards/question-card";
import { VoteHideDialog } from "@/components/cards/vote-hide-dialog";
import { AddPlayerSheet } from "@/components/play/add-player-sheet";
import { ExitSessionDialog } from "@/components/play/exit-session-dialog";
import { PlayerChipRow } from "@/components/play/player-chip-row";
import { PrioritySheet } from "@/components/play/priority-sheet";
import { TopicFilterSheet } from "@/components/play/topic-filter-sheet";
import { Wheel } from "@/components/wheel/wheel";
import { WinnerReveal } from "@/components/wheel/winner-reveal";
import { Button } from "@/components/ui/button";
import { Category, QuestionType } from "@/generated/prisma/enums";
import {
  HIDE_TOAST_MS,
  PRIORITY_LONG_PRESS_MS,
  SPIN_BUSY_ERROR,
} from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import {
  categoryIcon,
  categoryLabel,
  primaryCategory,
} from "@/lib/game/category-tone";
import { useLongPress } from "@/lib/hooks/use-long-press";
import {
  MENU_DURATION_S,
  PHASE_EASE,
  phaseCenter,
  phaseEnter,
  phaseExit,
  phaseTransition,
} from "@/lib/motion";
import type {
  PlayPlayer,
  RevealedCard,
  TeaserCard,
} from "@/lib/game/play-types";
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
  initialWeights: Record<string, number>;
  allTopics?: { id: string; name: string }[];
  initialSelectedTopicIds?: string[];
  initialSelectedQuestionTypes?: QuestionType[];
};

export function PlayScreen({
  sessionId,
  sessionCode,
  categories,
  players: initialPlayers,
  initialWeights,
  allTopics = [],
  initialSelectedTopicIds = [],
  initialSelectedQuestionTypes = [],
}: PlayScreenProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<PlayPhase>("idle");
  const [rotation, setRotation] = useState(0);
  const [spinMs, setSpinMs] = useState(0);
  const [winner, setWinner] = useState<PlayPlayer | null>(null);
  const [cards, setCards] = useState<TeaserCard[]>([]);
  const [revealed, setRevealed] = useState<RevealedCard | null>(null);
  const [answeredPlayerIds, setAnsweredPlayerIds] = useState<string[]>([]);
  const [players, setPlayers] = useState<PlayPlayer[]>(initialPlayers);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    initialSelectedTopicIds,
  );
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<
    QuestionType[]
  >(initialSelectedQuestionTypes);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [topicFilterOpen, setTopicFilterOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>(initialWeights);
  const [hideOpen, setHideOpen] = useState(false);
  const [hideBusy, setHideBusy] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isTagging, setIsTagging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accent = primaryCategory(categories);
  const spinning = phase === "spinning";
  const spinningRef = useRef(false);

  const { handlers: longPressHandlers, didLongPress } = useLongPress(
    () => setPriorityOpen(true),
    { delayMs: PRIORITY_LONG_PRESS_MS },
  );

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
    const result = await spinAction(sessionId, {
      deviceId: getOrCreateDeviceId(),
    });

    if (!result.ok) {
      setBusy(false);
      if (result.error === SPIN_BUSY_ERROR) {
        showToast("Đang xử lý, vui lòng thử lại");
        return;
      }
      setError(result.error);
      return;
    }

    const winnerIndex = players.findIndex(
      (player) => player.id === result.player.id,
    );
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
    const result = await revealCardAction(sessionId, winner.id, questionId, {
      deviceId: getOrCreateDeviceId(),
    });
    setBusy(false);


    if (!result.ok) {
      setError(result.error);
      setPhase("idle");
      return;
    }

    setRevealed(result.card);
    setAnsweredPlayerIds(result.answeredPlayerIds ?? [winner.id]);
    setPhase("revealed");
  }

  async function confirmHide() {
    if (!winner || !revealed || hideBusy) {
      return;
    }

    setHideBusy(true);
    const result = await voteHideAction(sessionId, revealed.id, {
      deviceId: getOrCreateDeviceId(),
    });

    if (!result.ok) {
      setHideBusy(false);
      setHideOpen(false);
      setError(result.error);
      return;
    }

    const discardResult = await discardCardAction(
      sessionId,
      winner.id,
      revealed.id,
      { deviceId: getOrCreateDeviceId() },
    );

    if (!discardResult.ok) {
      setHideBusy(false);
      setHideOpen(false);
      setError(discardResult.error);
      return;
    }

    const reloadResult = await loadTeaserCardsAction(sessionId, winner.id, {
      deviceId: getOrCreateDeviceId(),
    });

    setHideBusy(false);
    setHideOpen(false);

    if (!reloadResult.ok) {
      setError(reloadResult.error);
      setPhase("idle");
      return;
    }

    setCards(reloadResult.cards);
    setRevealed(null);
    setAnsweredPlayerIds([]);
    setPhase("cards");
    showToast("Đã ẩn câu hỏi và đổi 3 thẻ mới");
  }

  function resetRound() {
    setWinner(null);
    setAnsweredPlayerIds([]);
    setCards([]);
    setRevealed(null);
    setError(null);
    setPhase("idle");
  }

  async function handleTagPlayer(targetPlayer: PlayPlayer) {
    if (!revealed || isTagging) {
      return;
    }

    setIsTagging(true);
    const result = await tagPlayerAction(
      sessionId,
      targetPlayer.id,
      revealed.id,
      { deviceId: getOrCreateDeviceId() },
    );
    setIsTagging(false);

    if (!result.ok) {
      showToast(result.error);
      return;
    }

    setAnsweredPlayerIds(
      result.answeredPlayerIds ?? [...answeredPlayerIds, targetPlayer.id],
    );
    setRevealed((prev) =>
      prev ? { ...prev, playerName: targetPlayer.displayName } : null,
    );
    showToast(`Đã mời ${targetPlayer.displayName} cùng trả lời!`);
  }

  async function handleDiscard() {
    if (!winner || !revealed || isDiscarding) {
      return;
    }

    setIsDiscarding(true);
    const discardResult = await discardCardAction(
      sessionId,
      winner.id,
      revealed.id,
      { deviceId: getOrCreateDeviceId() },
    );

    if (!discardResult.ok) {
      setIsDiscarding(false);
      setError(discardResult.error);
      return;
    }

    const reloadResult = await loadTeaserCardsAction(sessionId, winner.id, {
      deviceId: getOrCreateDeviceId(),
    });

    setIsDiscarding(false);

    if (!reloadResult.ok) {
      setError(reloadResult.error);
      setPhase("idle");
      return;
    }

    setCards(reloadResult.cards);
    setRevealed(null);
    setAnsweredPlayerIds([]);
    setPhase("cards");
    showToast("Đã đổi 3 thẻ mới");
  }

  return (
    <main className="relative flex min-h-full flex-1 flex-col bg-play text-white">
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((category, index) => {
            const Icon = categoryIcon(category);
            return (
              <motion.span
                key={category}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.06,
                  duration: 0.24,
                  ease: [...PHASE_EASE],
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-sm font-bold"
              >
                <Icon className="size-3.5" />
                <span>{categoryLabel(category)}</span>
              </motion.span>
            );
          })}
        </div>
        <button
          type="button"
          {...longPressHandlers}
          onClick={() => {
            if (didLongPress()) return;
            router.push(`/session/${sessionId}/code`);
          }}
          className="ml-auto mr-2 rounded-full bg-white/10 px-3 py-1 font-display text-xs font-bold tracking-widest text-white/80 transition hover:bg-white/15 select-none"
        >
          {sessionCode}
        </button>
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
              onClick={handleSpin}
              disabled={phase !== "idle" || busy}
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
              <p className="mt-4 text-center text-sm text-cat-couple">
                {error}
              </p>
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
              onDiscard={handleDiscard}
              isDiscarding={isDiscarding}
              otherPlayers={players.filter(
                (p) => !answeredPlayerIds.includes(p.id),
              )}
              hasOtherPlayersInSession={players.length > 1}
              onTagPlayer={handleTagPlayer}
              isTagging={isTagging}
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
            <PlayerChipRow players={players} />
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/duongnguyen321/grouptalk"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
                className="flex size-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95"
              >
                <GitBranch className="size-4" />
              </a>
              <Link
                href={`/session/${sessionId}/history`}
                className="underline underline-offset-4 hover:text-white"
              >
                Xem lịch sử phiên
              </Link>
            </div>
          </motion.footer>
        ) : null}
      </AnimatePresence>

      <VoteHideDialog
        open={hideOpen}
        busy={hideBusy}
        onOpenChange={setHideOpen}
        onConfirm={confirmHide}
      />

      <ExitSessionDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        onConfirm={() => router.push("/session")}
      />

      <PrioritySheet
        open={priorityOpen}
        players={players}
        sessionId={sessionId}
        weights={weights}
        onOpenChange={setPriorityOpen}
        onWeightsChange={setWeights}
      />

      <TopicFilterSheet
        open={topicFilterOpen}
        sessionId={sessionId}
        allTopics={allTopics}
        activeTopicIds={selectedTopicIds}
        activeQuestionTypes={selectedQuestionTypes}
        onOpenChange={setTopicFilterOpen}
        onSaved={(filters) => {
          setSelectedTopicIds(filters.topicIds);
          setSelectedQuestionTypes(filters.questionTypes);
          showToast("Đã cập nhật bộ lọc câu hỏi");
        }}
      />

      <AddPlayerSheet
        open={addPlayerOpen}
        sessionId={sessionId}
        existingNames={players.map((p) => p.displayName)}
        onOpenChange={setAddPlayerOpen}
        onPlayerAdded={(updatedPlayers) => {
          setPlayers(updatedPlayers);
          showToast("Đã thêm người chơi mới");
        }}
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
                <Link
                  className="flex items-center gap-3 py-2.5 transition hover:opacity-80"
                  href={`/session/${sessionId}/history`}
                >
                  <Clock className="size-5 text-ink-muted" />
                  <span>Xem lịch sử phiên</span>
                </Link>
                <Link
                  className="flex items-center gap-3 py-2.5 transition hover:opacity-80"
                  href={`/contribute?back=${sessionId}`}
                >
                  <PlusCircle className="size-5 text-ink-muted" />
                  <span>Đóng góp câu hỏi</span>
                </Link>
                <Link
                  className="flex items-center gap-3 py-2.5 transition hover:opacity-80"
                  href={`/session/${sessionId}/code`}
                >
                  <Share2 className="size-5 text-ink-muted" />
                  <span>Xem mã phiên</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setTopicFilterOpen(true);
                  }}
                  className="flex items-center gap-3 py-2.5 text-left transition hover:opacity-80"
                >
                  <Layers className="size-5 text-ink-muted" />
                  <span>Chủ đề câu hỏi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setAddPlayerOpen(true);
                  }}
                  className="flex items-center gap-3 py-2.5 text-left transition hover:opacity-80"
                >
                  <UserPlus className="size-5 text-ink-muted" />
                  <span>Thêm người chơi</span>
                </button>
                <div className="my-2 h-px bg-ink/10" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setExitOpen(true);
                  }}
                  className="flex items-center gap-3 py-2.5 text-left text-cat-couple-deep transition hover:opacity-80"
                >
                  <LogOut className="size-5" />
                  <span>Thoát phiên</span>
                </button>
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <span className="sr-only">{categoryLabel(accent)}</span>
    </main>
  );
}
