"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CARD_FLIP_MS } from "@/lib/constants";
import { categoryTone } from "@/lib/game/category-tone";
import type { TeaserCard } from "@/lib/game/play-types";

type CardSelectionProps = {
  cards: TeaserCard[];
  disabled: boolean;
  onSelect: (questionId: string) => void;
};

export function CardSelection({
  cards,
  disabled,
  onSelect,
}: CardSelectionProps) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  function choose(cardId: string) {
    if (disabled || pickedId) {
      return;
    }

    setPickedId(cardId);
    window.setTimeout(() => {
      onSelect(cardId);
    }, CARD_FLIP_MS);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-3 pb-10">
      <p className="mb-6 text-center text-sm font-medium tracking-[0.18em] text-ink-muted uppercase">
        Chọn một thẻ
      </p>
      <div className="flex w-full max-w-lg flex-1 items-stretch justify-center gap-2.5">
        {cards.map((card) => {
          const isPicked = pickedId === card.id;
          const isOther = pickedId !== null && !isPicked;
          const tone = categoryTone(card.accent);

          return (
            <motion.button
              key={card.id}
              type="button"
              disabled={disabled || pickedId !== null}
              onClick={() => choose(card.id)}
              animate={
                isOther
                  ? { opacity: 0, scale: 0.92 }
                  : {
                      opacity: 1,
                      scale: isPicked ? 1.03 : 1,
                      rotateY: isPicked ? 90 : 0,
                    }
              }
              transition={{ duration: CARD_FLIP_MS / 1000 }}
              style={{
                backgroundColor: tone.solid,
                transformStyle: "preserve-3d",
              }}
              className="flex min-h-72 min-w-0 flex-1 touch-manipulation rounded-[1.4rem] border-2 border-white/30 px-3 py-5 text-white shadow-[0_16px_30px_rgba(28,25,23,0.22)]"
            >
              <span className="flex h-full w-full flex-col items-center justify-between">
                <span className="font-display text-5xl font-extrabold">?</span>
                <span className="text-center text-[0.75rem] leading-snug">
                  Đóng góp bởi: {card.contributedBy}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
