"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Layers, X } from "lucide-react";
import { setTopicFilterAction } from "@/app/session/[sessionId]/play/actions";
import { Button } from "@/components/ui/button";
import { getOrCreateDeviceId } from "@/lib/device";
import { MENU_DURATION_S, PHASE_EASE, TAP_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";

type TopicFilterSheetProps = {
  open: boolean;
  sessionId: string;
  allTopics: { id: string; name: string }[];
  activeTopicIds: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: (topicIds: string[]) => void;
};

export function TopicFilterSheet({
  open,
  sessionId,
  allTopics,
  activeTopicIds,
  onOpenChange,
  onSaved,
}: TopicFilterSheetProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="topic-filter-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MENU_DURATION_S }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60"
          onClick={() => onOpenChange(false)}
        >
          <TopicFilterContent
            key={activeTopicIds.join(",")}
            sessionId={sessionId}
            allTopics={allTopics}
            activeTopicIds={activeTopicIds}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TopicFilterContent({
  sessionId,
  allTopics,
  activeTopicIds,
  onOpenChange,
  onSaved,
}: Omit<TopicFilterSheetProps, "open">) {
  const [draftIds, setDraftIds] = useState<string[]>(activeTopicIds);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCount = draftIds.length === 0 ? allTopics.length : draftIds.length;
  const hasError = allTopics.length > 0 && activeCount === 0;

  function isTopicActive(topicId: string) {
    if (draftIds.length === 0) {
      return true;
    }
    return draftIds.includes(topicId);
  }

  function handleToggle(topicId: string) {
    setError(null);
    if (draftIds.length === 0) {
      const remaining = allTopics
        .filter((t) => t.id !== topicId)
        .map((t) => t.id);
      setDraftIds(remaining);
      return;
    }

    if (draftIds.includes(topicId)) {
      const next = draftIds.filter((id) => id !== topicId);
      setDraftIds(next);
    } else {
      const next = [...draftIds, topicId];
      if (next.length === allTopics.length) {
        setDraftIds([]);
      } else {
        setDraftIds(next);
      }
    }
  }

  function handleSelectAll() {
    setError(null);
    setDraftIds([]);
  }

  async function handleSave() {
    if (hasError || isSaving) return;

    setIsSaving(true);
    setError(null);

    const result = await setTopicFilterAction(sessionId, draftIds, {
      deviceId: getOrCreateDeviceId(),
    });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSaved(draftIds);
    onOpenChange(false);
  }

  return (
    <motion.div
      key="topic-filter-content"
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
          <Layers className="size-5 text-ink-muted" />
          <h2 className="font-display text-xl font-extrabold">
            Chủ đề câu hỏi
          </h2>
        </div>
        <motion.button
          type="button"
          aria-label="Đóng bảng chủ đề"
          whileTap={{ scale: TAP_SCALE }}
          onClick={() => onOpenChange(false)}
          className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-xs hover:bg-white/80"
        >
          <X className="size-5" />
        </motion.button>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Đang bật {activeCount}/{allTopics.length} chủ đề
        </p>
        {draftIds.length > 0 ? (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs font-bold text-cat-friends-deep underline underline-offset-2 hover:opacity-80"
          >
            Chọn tất cả
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2 pb-4">
          {allTopics.map((t) => {
            const active = isTopicActive(t.id);
            return (
              <motion.button
                key={t.id}
                type="button"
                whileTap={{ scale: TAP_SCALE }}
                onClick={() => handleToggle(t.id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition",
                  active
                    ? "bg-cat-friends text-ink shadow-xs"
                    : "border border-ink/10 bg-white text-ink-muted hover:border-ink/20",
                )}
              >
                {active ? <Check className="size-3.5 stroke-[3]" /> : null}
                <span>{t.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {hasError ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 text-xs font-semibold text-cat-couple-deep"
          >
            Vui lòng chọn ít nhất 1 chủ đề để tiếp tục.
          </motion.p>
        ) : error ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 text-xs font-semibold text-cat-couple-deep"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div className="pt-2">
        <Button
          type="button"
          disabled={hasError || isSaving}
          onClick={handleSave}
          className="h-13 w-full rounded-2xl text-base font-extrabold"
        >
          {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </div>
    </motion.div>
  );
}
