"use client";

import { motion } from "framer-motion";
import { BackHeader } from "@/components/ui/back-header";
import { HISTORY_DELETED_LABEL } from "@/lib/constants";
import {
  LIST_STAGGER_S,
  PHASE_EASE,
  screenContainer,
  screenItem,
  TAP_SCALE,
} from "@/lib/motion";

type HistoryRow = {
  id: string;
  playerName: string;
  title: string;
  isDeleted: boolean;
};

type SessionHistoryProps = {
  sessionId: string;
  rows: HistoryRow[];
};

export function SessionHistory({ sessionId, rows }: SessionHistoryProps) {
  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas">
      <BackHeader
        backHref={`/session/${sessionId}/play`}
        title="Lịch sử phiên"
      />
      <motion.div
        variants={screenContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10"
      >
        <motion.p
          variants={screenItem}
          className="text-sm font-medium tracking-[0.22em] text-ink-muted uppercase"
        >
          Lịch sử phiên
        </motion.p>
        <motion.h1
          variants={screenItem}
          className="mt-3 font-display text-4xl leading-none font-extrabold text-ink"
        >
          Ai đã trả lời gì
        </motion.h1>

        {rows.length === 0 ? (
          <motion.p
            variants={screenItem}
            className="mt-10 text-base text-ink-soft"
          >
            Chưa có câu nào được lật trong phiên này.
          </motion.p>
        ) : (
          <ol className="mt-8 flex flex-col gap-3">
            {rows.map((row, index) => (
              <motion.li
                key={row.id}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: TAP_SCALE }}
                transition={{
                  delay: index * LIST_STAGGER_S,
                  duration: 0.3,
                  ease: [...PHASE_EASE],
                }}
                className="rounded-[1.4rem] bg-white px-4 py-4 shadow-[0_6px_16px_rgba(28,25,23,0.06)]"
              >
                <p className="text-xs font-bold tracking-[0.16em] text-ink-muted uppercase">
                  {index + 1}. {row.playerName}
                </p>
                <p className="mt-2 font-display text-xl leading-snug font-extrabold text-ink">
                  {row.title}
                </p>
                {row.isDeleted ? (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * LIST_STAGGER_S + 0.14,
                      duration: 0.24,
                      ease: [...PHASE_EASE],
                    }}
                    className="mt-2 text-sm text-cat-couple-deep"
                  >
                    {HISTORY_DELETED_LABEL}
                  </motion.p>
                ) : null}
              </motion.li>
            ))}
          </ol>
        )}
      </motion.div>
    </main>
  );
}
