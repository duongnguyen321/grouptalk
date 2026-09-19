"use client";

import { Ban } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPE_NOTES } from "@/lib/game/question-notes";
import { categoryTone } from "@/lib/game/category-tone";
import { PHASE_EASE } from "@/lib/motion";
import type { RevealedCard } from "@/lib/game/play-types";

type QuestionCardProps = {
  card: RevealedCard;
  onHide: () => void;
  onNext: () => void;
};

export function QuestionCard({ card, onHide, onNext }: QuestionCardProps) {
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
        <button
          type="button"
          onClick={onHide}
          aria-label="Ẩn câu hỏi này"
          className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-muted"
        >
          <Ban className="size-4" />
        </button>

        <div className="flex items-center gap-3 pr-12">
          <span
            className="flex size-11 items-center justify-center rounded-full text-lg font-extrabold text-white"
            style={{ backgroundImage: tone.gradient }}
          >
            {initial}
          </span>
          <p className="text-name leading-tight font-bold text-ink">
            {card.playerName}
          </p>
        </div>

        <p className="mt-8 flex flex-1 items-center justify-center text-center text-question font-extrabold text-ink">
          {card.title}
        </p>

        <p className="mt-6 text-note leading-snug font-medium text-ink-muted">
          💬 {QUESTION_TYPE_NOTES[card.type]}
        </p>
      </motion.article>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.28, ease: [...PHASE_EASE] }}
      >
        <Button
          type="button"
          onClick={onNext}
          className="mx-auto mt-5 h-14 w-full max-w-md rounded-full bg-cat-friends-deep text-base font-extrabold text-white hover:bg-cat-friends-deep/90"
        >
          Quay tiếp
        </Button>
      </motion.div>
    </div>
  );
}
