"use client";

import { Ban, MessageCircle, RefreshCw, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPE_NOTES } from "@/lib/game/question-notes";
import { categoryTone } from "@/lib/game/category-tone";
import { PHASE_EASE, TAP_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PlayPlayer, RevealedCard } from "@/lib/game/play-types";

type QuestionCardProps = {
  card: RevealedCard;
  onHide: () => void;
  onNext: () => void;
  onDiscard?: () => void;
  isDiscarding?: boolean;
  otherPlayers?: PlayPlayer[];
  hasOtherPlayersInSession?: boolean;
  onTagPlayer?: (player: PlayPlayer) => void;
  isTagging?: boolean;
};

export function QuestionCard({
  card,
  onHide,
  onNext,
  onDiscard,
  isDiscarding = false,
  otherPlayers,
  hasOtherPlayersInSession = false,
  onTagPlayer,
  isTagging = false,
}: QuestionCardProps) {
  const tone = categoryTone(card.accent);
  const initial = card.playerName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-6">
      <motion.article
        initial={{ opacity: 0, rotateY: -90, scale: 0.94 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [...PHASE_EASE] }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative mx-auto mt-4 flex min-h-[min(28rem,56vh)] w-full max-w-md flex-1 flex-col rounded-[2rem] bg-white p-6 shadow-[0_18px_40px_rgba(28,25,23,0.12)]"
      >
        <motion.button
          type="button"
          whileTap={{ scale: TAP_SCALE }}
          onClick={onHide}
          aria-label="Ẩn câu hỏi này"
          className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-muted"
        >
          <Ban className="size-4" />
        </motion.button>

        <div className="flex items-center gap-3 pr-12">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
            style={{ backgroundImage: tone.gradient }}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink-muted">Lượt trả lời</p>
            <p className="text-name leading-tight font-bold text-ink truncate">
              {card.playerName}
            </p>
          </div>
        </div>

        <p className="mt-6 flex flex-1 items-center justify-center text-center text-question font-extrabold text-ink">
          {card.title}
        </p>

        <div className="mt-4 flex items-center gap-2 text-note leading-snug font-medium text-ink-muted">
          <MessageCircle className="size-4 shrink-0 text-ink-muted" />
          <span>{QUESTION_TYPE_NOTES[card.type]}</span>
        </div>

        {hasOtherPlayersInSession ? (
          <div className="mt-5 border-t border-ink/10 pt-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
              <UserPlus className="size-3.5 text-cat-friends-deep" />
              <span>Mời người khác cùng trả lời:</span>
            </div>
            {otherPlayers && otherPlayers.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {otherPlayers.map((player) => (
                  <motion.button
                    key={player.id}
                    type="button"
                    disabled={isTagging}
                    whileTap={{ scale: TAP_SCALE }}
                    onClick={() => onTagPlayer?.(player)}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink/10 bg-canvas px-3 py-1 text-xs font-bold text-ink hover:border-cat-friends-deep hover:bg-cat-friends/20 transition disabled:opacity-50"
                  >
                    <span>{player.displayName}</span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs font-medium text-ink-muted italic">
                Tất cả người chơi đã trả lời câu này.
              </p>
            )}
          </div>
        ) : null}
      </motion.article>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.28, ease: [...PHASE_EASE] }}
        className="mx-auto mt-5 flex w-full max-w-md gap-3"
      >
        {onDiscard ? (
          <motion.div className="flex-1" whileTap={{ scale: TAP_SCALE }}>
            <Button
              type="button"
              variant="outline"
              disabled={isDiscarding}
              onClick={onDiscard}
              className="h-14 w-full rounded-full border-white/20 bg-white/10 text-base font-extrabold text-white backdrop-blur-xs hover:bg-white/20 hover:text-white"
            >
              <RefreshCw
                className={cn("mr-2 size-4", isDiscarding && "animate-spin")}
              />
              {isDiscarding ? "Đang đổi…" : "Câu khác"}
            </Button>
          </motion.div>
        ) : null}

        <motion.div className="flex-1" whileTap={{ scale: TAP_SCALE }}>
          <Button
            type="button"
            disabled={isDiscarding}
            onClick={onNext}
            className="h-14 w-full rounded-full bg-cat-friends-deep text-base font-extrabold text-white hover:bg-cat-friends-deep/90"
          >
            Quay tiếp
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
