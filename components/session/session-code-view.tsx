"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BackHeader } from "@/components/ui/back-header";
import { Button } from "@/components/ui/button";
import { HIDE_TOAST_MS } from "@/lib/constants";
import {
  DIGIT_STAGGER_S,
  PHASE_EASE,
  screenContainer,
  screenItem,
  TAP_SCALE,
} from "@/lib/motion";

type SessionCodeViewProps = {
  sessionId: string;
  sessionCode: string;
};

export function SessionCodeView({
  sessionId,
  sessionCode,
}: SessionCodeViewProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), HIDE_TOAST_MS);
  }

  const firstGroup = sessionCode.slice(0, 4);
  const secondGroup = sessionCode.slice(4);

  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas">
      <BackHeader backHref={`/session/${sessionId}/play`} title="Mã phiên" />
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
          Mã phiên
        </motion.p>
        <motion.h1
          variants={screenItem}
          className="mt-3 font-display text-4xl leading-none font-extrabold text-ink"
        >
          Đọc to 8 số này
        </motion.h1>
        <motion.p variants={screenItem} className="mt-3 text-base text-ink-soft">
          Máy kia gõ mã để copy phiên. Máy này vẫn chơi bình thường.
        </motion.p>

        <div className="mt-12 flex items-center justify-center gap-4">
          <div className="flex justify-center gap-1">
            {firstGroup.split("").map((digit, index) => (
              <motion.span
                key={`g1-${digit}-${index}`}
                initial={{ opacity: 0, y: 18, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: index * DIGIT_STAGGER_S,
                  duration: 0.32,
                  ease: [...PHASE_EASE],
                }}
                className="font-display text-[clamp(2.5rem,10vw,4rem)] leading-none font-extrabold text-ink"
              >
                {digit}
              </motion.span>
            ))}
          </div>

          <span className="text-2xl font-black text-ink-muted/50 select-none">
            ·
          </span>

          <div className="flex justify-center gap-1">
            {secondGroup.split("").map((digit, index) => (
              <motion.span
                key={`g2-${digit}-${index}`}
                initial={{ opacity: 0, y: 18, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: (index + 4) * DIGIT_STAGGER_S,
                  duration: 0.32,
                  ease: [...PHASE_EASE],
                }}
                className="font-display text-[clamp(2.5rem,10vw,4rem)] leading-none font-extrabold text-ink"
              >
                {digit}
              </motion.span>
            ))}
          </div>
        </div>

        <motion.div
          variants={screenItem}
          style={{ perspective: 800 }}
          className="mt-10"
        >
          <motion.div
            whileTap={{ scale: TAP_SCALE }}
            animate={copied ? { rotateX: [0, -12, 0] } : { rotateX: 0 }}
            transition={{ duration: 0.36, ease: [...PHASE_EASE] }}
          >
            <Button
              type="button"
              onClick={copyCode}
              className="h-14 w-full rounded-2xl text-lg font-extrabold"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? "copied" : "copy"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                >
                  {copied ? "Đã copy" : "Copy mã"}
                </motion.span>
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}
