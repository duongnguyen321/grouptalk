"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPE_NOTES } from "@/lib/game/question-notes";
import { categoryTone } from "@/lib/game/category-tone";
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
    <div className="flex min-h-full flex-1 flex-col px-5 pb-6">
      <article className="relative mx-auto mt-4 flex min-h-[28rem] w-full max-w-md flex-1 flex-col rounded-[2rem] bg-white p-6 shadow-[0_18px_40px_rgba(28,25,23,0.12)]">
        <button
          type="button"
          onClick={onHide}
          aria-label="Ẩn câu hỏi này"
          className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-muted"
        >
          <Ban className="size-4" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <span
            className="flex size-11 items-center justify-center rounded-full text-lg font-extrabold text-white"
            style={{ backgroundColor: tone.solid }}
          >
            {initial}
          </span>
          <p className="font-display text-[1.4rem] leading-tight font-extrabold text-ink">
            {card.playerName}
          </p>
        </div>

        <p className="mt-8 flex flex-1 items-center justify-center text-center font-display text-[clamp(1.35rem,4.6vw,2.15rem)] leading-tight font-extrabold text-ink">
          {card.title}
        </p>

        <p className="mt-6 text-[0.85rem] leading-snug text-ink-muted">
          💬 {QUESTION_TYPE_NOTES[card.type]}
        </p>
      </article>

      <Button
        type="button"
        onClick={onNext}
        className="mx-auto mt-5 h-14 w-full max-w-md rounded-full bg-cat-friends-deep text-base font-extrabold text-white hover:bg-cat-friends-deep/90"
      >
        Quay tiếp
      </Button>
    </div>
  );
}
