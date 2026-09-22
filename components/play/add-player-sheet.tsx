"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { addPlayerAction } from "@/app/session/[sessionId]/play/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLAYER_NAME_MAX_LENGTH } from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import type { PlayPlayer } from "@/lib/game/play-types";
import { MENU_DURATION_S, PHASE_EASE, TAP_SCALE } from "@/lib/motion";
import { isSamePlayerName, normalizePlayerName } from "@/lib/player-name";

type AddPlayerSheetProps = {
  open: boolean;
  sessionId: string;
  existingNames: string[];
  onOpenChange: (open: boolean) => void;
  onPlayerAdded: (players: PlayPlayer[]) => void;
};

export function AddPlayerSheet({
  open,
  sessionId,
  existingNames,
  onOpenChange,
  onPlayerAdded,
}: AddPlayerSheetProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setName("");
    setError(null);
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const normalized = normalizePlayerName(name);
    if (!normalized) {
      setError("Nhập tên rồi mới thêm.");
      return;
    }

    if (normalized.length > PLAYER_NAME_MAX_LENGTH) {
      setError(`Tên tối đa ${PLAYER_NAME_MAX_LENGTH} ký tự.`);
      return;
    }

    if (existingNames.some((n) => isSamePlayerName(n, normalized))) {
      setError("Tên này đã có rồi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await addPlayerAction(sessionId, normalized, {
      deviceId: getOrCreateDeviceId(),
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onPlayerAdded(result.players);
    handleClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="add-player-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MENU_DURATION_S }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60"
          onClick={handleClose}
        >
          <motion.div
            key="add-player-content"
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
                <UserPlus className="size-5 text-ink-muted" />
                <h2 className="font-display text-xl font-extrabold">
                  Thêm người chơi
                </h2>
              </div>
              <motion.button
                type="button"
                aria-label="Đóng bảng thêm người chơi"
                whileTap={{ scale: TAP_SCALE }}
                onClick={handleClose}
                className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-xs hover:bg-white/80"
              >
                <X className="size-5" />
              </motion.button>
            </div>

            <p className="mt-1 text-sm text-ink-muted">
              Người chơi mới sẽ được thêm ngay vào vòng quay với mức ưu tiên 1x.
            </p>

            <form onSubmit={handleSubmit} className="mt-5">
              <label htmlFor="new-player-name" className="sr-only">
                Tên người chơi
              </label>
              <Input
                id="new-player-name"
                value={name}
                maxLength={PLAYER_NAME_MAX_LENGTH}
                enterKeyHint="done"
                autoFocus
                autoComplete="off"
                autoCapitalize="words"
                placeholder="Nhập tên người chơi mới…"
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                className="h-14 rounded-2xl border-ink/10 bg-white px-4 text-base font-semibold"
              />

              <AnimatePresence>
                {error ? (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 text-xs font-semibold text-cat-couple-deep"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <div className="mt-5">
                <Button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="h-13 w-full rounded-2xl text-base font-extrabold"
                >
                  {isSubmitting ? "Đang thêm…" : "Thêm vào vòng quay"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
