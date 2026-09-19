"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import type { PlayPlayer } from "@/lib/game/play-types";
import { PHASE_EASE, TAP_SCALE } from "@/lib/motion";

type PlayerChipRowProps = {
  players: PlayPlayer[];
};

export function PlayerChipRow({ players }: PlayerChipRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <motion.button
        type="button"
        whileTap={{ scale: TAP_SCALE }}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/15"
      >
        <Users className="size-3.5" />
        <span>{players.length} người chơi</span>
        {expanded ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </motion.button>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [...PHASE_EASE] }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 flex max-w-xs flex-wrap justify-center gap-1.5 px-2">
              {players.map((player) => (
                <span
                  key={player.id}
                  className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white shadow-sm"
                >
                  {player.displayName}
                </span>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
