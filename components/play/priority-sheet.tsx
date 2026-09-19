"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { setPriorityAction } from "@/app/session/[sessionId]/play/actions";
import { PRIORITY_DOT_COUNT, PRIORITY_WEIGHT_STEPS } from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import type { PlayPlayer } from "@/lib/game/play-types";
import { MENU_DURATION_S, PHASE_EASE, TAP_SCALE } from "@/lib/motion";

type PrioritySheetProps = {
  open: boolean;
  players: PlayPlayer[];
  sessionId: string;
  weights: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onWeightsChange: (weights: Record<string, number>) => void;
};

export function PrioritySheet({
  open,
  players,
  sessionId,
  weights,
  onOpenChange,
  onWeightsChange,
}: PrioritySheetProps) {
  const handleClose = useCallback(async () => {
    onOpenChange(false);
    await setPriorityAction(sessionId, weights, {
      deviceId: getOrCreateDeviceId(),
    });
  }, [onOpenChange, sessionId, weights]);


  function handleDotClick(playerId: string, dotIndex: number) {
    const currentWeight = weights[playerId] ?? PRIORITY_WEIGHT_STEPS[0];
    const targetWeight = PRIORITY_WEIGHT_STEPS[dotIndex + 1];

    let newWeight: number;
    if (currentWeight === targetWeight) {
      newWeight = PRIORITY_WEIGHT_STEPS[0];
    } else {
      newWeight = targetWeight;
    }

    const updated = { ...weights };
    if (newWeight > 1) {
      updated[playerId] = newWeight;
    } else {
      delete updated[playerId];
    }

    onWeightsChange(updated);
  }

  function getActiveDotCount(weight: number) {
    if (weight >= 5) return 3;
    if (weight >= 3) return 2;
    if (weight >= 2) return 1;
    return 0;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="priority-sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MENU_DURATION_S }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60"
          onClick={handleClose}
        >
          <motion.div
            key="priority-sheet-content"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: MENU_DURATION_S, ease: [...PHASE_EASE] }}
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-canvas px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Drawer handle indicator */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/15" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-5 text-ink-muted" />
                <h2 className="font-display text-xl font-extrabold">
                  Ưu tiên người chơi
                </h2>
              </div>
              <motion.button
                type="button"
                aria-label="Đóng bảng ưu tiên"
                whileTap={{ scale: TAP_SCALE }}
                onClick={handleClose}
                className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-sm hover:bg-white/80"
              >
                <X className="size-5" />
              </motion.button>
            </div>

            <p className="mt-1 text-sm text-ink-muted">
              Chạm vào chấm để tăng tỉ lệ quay trúng (1x, 2x, 3x, 5x).
            </p>

            <div className="mt-4 flex-1 divide-y divide-ink/10 overflow-y-auto">
              {players.map((player) => {
                const weight = weights[player.id] ?? 1;
                const activeDots = getActiveDotCount(weight);

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between py-3"
                  >
                    <span className="font-bold text-ink">
                      {player.displayName}
                    </span>

                    <div className="flex items-center gap-1">
                      <span className="mr-2 w-7 text-right font-display text-xs font-extrabold text-ink-muted">
                        {weight}x
                      </span>

                      {Array.from({ length: PRIORITY_DOT_COUNT }).map(
                        (_, index) => {
                          const isActive = index < activeDots;
                          return (
                            <motion.button
                              key={index}
                              type="button"
                              aria-label={`Mức ${PRIORITY_WEIGHT_STEPS[index + 1]}x cho ${player.displayName}`}
                              whileTap={{ scale: TAP_SCALE }}
                              onClick={() => handleDotClick(player.id, index)}
                              className="flex size-11 items-center justify-center rounded-full"
                            >
                              <span
                                className={`size-3.5 rounded-full transition-colors ${
                                  isActive
                                    ? "bg-cat-friends shadow-sm"
                                    : "border-2 border-ink/25 bg-transparent"
                                }`}
                              />
                            </motion.button>
                          );
                        },
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-2">
              <motion.button
                type="button"
                whileTap={{ scale: TAP_SCALE }}
                onClick={handleClose}
                className="h-12 w-full rounded-2xl bg-ink font-bold text-white hover:bg-ink/90 flex items-center justify-center"
              >
                Xong
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
