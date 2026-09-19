"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { joinSessionByCode } from "@/app/session/actions";
import { SESSION_CODE_LENGTH } from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import { PHASE_EASE, screenContainer, screenItem, TAP_SCALE } from "@/lib/motion";

export function SessionHome() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  async function submitCode(value: string) {
    const nextCode = value.replace(/\D/g, "").slice(0, SESSION_CODE_LENGTH);
    setCode(nextCode);
    setError(null);

    if (nextCode.length !== SESSION_CODE_LENGTH) {
      return;
    }

    setIsJoining(true);
    const result = await joinSessionByCode(nextCode, getOrCreateDeviceId());
    if (!result.ok) {
      setError(result.error);
      setIsJoining(false);
      return;
    }

    router.push(`/session/${result.sessionId}/play`);
  }

  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas px-6 py-10">
      <motion.div
        variants={screenContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-md flex-1 flex-col"
      >
        <motion.header variants={screenItem}>
          <p className="text-sm font-medium tracking-[0.22em] text-ink-muted uppercase">
            Bắt đầu buổi chơi
          </p>
          <h1 className="mt-3 font-display text-4xl leading-none font-extrabold text-ink">
            Chọn cách vào phiên
          </h1>
        </motion.header>

        <div className="mt-10 flex flex-col gap-4">
          <motion.a
            variants={screenItem}
            whileTap={{ scale: TAP_SCALE }}
            href="/session/new/categories"
            className="flex min-h-28 flex-col justify-center rounded-3xl bg-ink px-6 py-5 text-canvas shadow-[0_12px_28px_rgba(28,25,23,0.16)]"
          >
            <span className="text-2xl font-extrabold">Tạo phiên mới</span>
            <span className="mt-1 text-sm text-canvas/70">
              Chọn thể loại, nhập tên, rồi quay.
            </span>
          </motion.a>

          <motion.section
            variants={screenItem}
            className="rounded-3xl border border-ink/10 bg-white px-6 py-5"
          >
            <h2 className="text-xl font-extrabold text-ink">
              Nhập mã để tiếp tục phiên
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Máy kia đọc 8 số. Máy này gõ vào.
            </p>
            <label className="sr-only" htmlFor="session-code">
              Mã phiên 8 số
            </label>
            <motion.input
              id="session-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={SESSION_CODE_LENGTH}
              value={code}
              animate={
                isJoining
                  ? { scale: 1.02, opacity: 0.75 }
                  : error
                    ? { x: [0, -8, 8, -5, 0], scale: 1, opacity: 1 }
                    : { scale: 1, opacity: 1 }
              }
              transition={{ duration: error ? 0.34 : 0.22, ease: [...PHASE_EASE] }}
              onChange={(event) => submitCode(event.target.value)}
              placeholder="00000000"
              className="mt-4 w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-4 text-center font-display text-3xl tracking-[0.28em] text-ink outline-none transition focus:border-cat-friends-deep"
            />
            <AnimatePresence>
              {error ? (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [...PHASE_EASE] }}
                  className="mt-3 text-sm text-cat-couple-deep"
                  role="alert"
                >
                  {error}
                </motion.p>
              ) : null}
              {isJoining ? (
                <motion.p
                  key="joining"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [...PHASE_EASE] }}
                  className="mt-3 text-sm text-ink-muted"
                >
                  Đang mở phiên…
                </motion.p>
              ) : null}
            </AnimatePresence>
          </motion.section>
        </div>
      </motion.div>
    </main>
  );
}
