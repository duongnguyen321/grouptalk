"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Layers, Users } from "lucide-react";
import { screenItem, TAP_SCALE } from "@/lib/motion";

export type StatsOverviewCardProps = {
  questionCount: number;
  playerCount: number;
  className?: string;
};

export function StatsOverviewCard({
  questionCount,
  playerCount,
  className = "",
}: StatsOverviewCardProps) {
  const formattedQuestions = questionCount.toLocaleString("vi-VN");
  const formattedPlayers = playerCount.toLocaleString("vi-VN");

  return (
    <motion.div variants={screenItem} className={className}>
      <Link
        href="/questions"
        className="block outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded-3xl"
      >
        <motion.div
          whileTap={{ scale: TAP_SCALE }}
          className="group flex flex-col gap-3 rounded-3xl border border-ink/10 bg-white p-4 shadow-[0_4px_16px_rgba(28,25,23,0.04)] transition hover:border-ink/20 hover:shadow-[0_6px_20px_rgba(28,25,23,0.08)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-muted uppercase">
              <Layers className="size-3.5 text-cat-friends-deep" />
              <span>Tổng quan trò chơi</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-cat-friends-deep transition group-hover:translate-x-0.5">
              <span>Xem chi tiết</span>
              <ChevronRight className="size-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-3 rounded-2xl bg-canvas/80 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cat-friends/20 text-cat-friends-deep">
                <Layers className="size-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display text-xl font-extrabold leading-tight text-ink truncate">
                  {formattedQuestions}
                </span>
                <span className="text-xs font-semibold text-ink-muted truncate">
                  Câu hỏi
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-canvas/80 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cat-couple/20 text-cat-couple-deep">
                <Users className="size-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display text-xl font-extrabold leading-tight text-ink truncate">
                  {formattedPlayers}
                </span>
                <span className="text-xs font-semibold text-ink-muted truncate">
                  Người chơi
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
