"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CARD_FLIP_MS } from "@/lib/constants";
import { CARD_STAGGER_S, PHASE_EASE } from "@/lib/motion";
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
    <div className="flex min-h-0 flex-1 flex-col justify-center pb-6">
      <p className="mb-5 px-5 text-center text-sm font-medium tracking-[0.18em] text-white/70 uppercase">
        Chọn một thẻ
      </p>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card, index) => {
          const isPicked = pickedId === card.id;
          const isOther = pickedId !== null && !isPicked;
          const tone = categoryTone(card.accent);

          return (
            <motion.button
              key={card.id}
              type="button"
              disabled={disabled || pickedId !== null}
              onClick={() => choose(card.id)}
              initial={{ opacity: 0, x: 36 }}
              animate={
                isOther
                  ? { opacity: 0, scale: 0.92, x: 0 }
                  : {
                      opacity: 1,
                      x: 0,
                      scale: isPicked ? 1.04 : 1,
                      rotateY: isPicked ? 90 : 0,
                    }
              }
              transition={{
                duration: isPicked || isOther ? CARD_FLIP_MS / 1000 : 0.34,
                delay: pickedId ? 0 : index * CARD_STAGGER_S,
                ease: [...PHASE_EASE],
              }}
              style={{
                backgroundImage: tone.gradient,
                transformStyle: "preserve-3d",
              }}
              className="flex h-[min(60vh,26rem)] w-[min(84vw,19rem)] shrink-0 snap-center touch-manipulation rounded-[1.6rem] border-2 border-white/30 px-5 py-6 text-white shadow-[0_16px_30px_rgba(28,25,23,0.22)]"
            >
              <span className="flex h-full w-full flex-col items-center justify-between">
                <span className="font-display text-6xl font-extrabold">?</span>
                <span className="text-center text-credit leading-snug font-medium">
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
