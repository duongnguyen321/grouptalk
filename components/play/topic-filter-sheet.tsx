"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, HelpCircle, Layers, SlidersHorizontal, X } from "lucide-react";
import { QuestionType } from "@/generated/prisma/enums";
import { setQuestionFiltersAction } from "@/app/session/[sessionId]/play/actions";
import { Button } from "@/components/ui/button";
import { getOrCreateDeviceId } from "@/lib/device";
import { QUESTION_TYPE_OPTIONS } from "@/lib/game/question-notes";
import { MENU_DURATION_S, PHASE_EASE, TAP_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";

type TopicFilterSheetProps = {
  open: boolean;
  sessionId: string;
  allTopics: { id: string; name: string }[];
  activeTopicIds: string[];
  activeQuestionTypes?: QuestionType[];
  onOpenChange: (open: boolean) => void;
  onSaved: (filters: {
    topicIds: string[];
    questionTypes: QuestionType[];
  }) => void;
};

export function TopicFilterSheet({
  open,
  sessionId,
  allTopics,
  activeTopicIds,
  activeQuestionTypes = [],
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
            key={`${activeTopicIds.join(",")}_${activeQuestionTypes.join(",")}`}
            sessionId={sessionId}
            allTopics={allTopics}
            activeTopicIds={activeTopicIds}
            activeQuestionTypes={activeQuestionTypes}
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
  activeQuestionTypes,
  onOpenChange,
  onSaved,
}: Omit<TopicFilterSheetProps, "open">) {
  const [draftIds, setDraftIds] = useState<string[]>(activeTopicIds);
  const [draftTypes, setDraftTypes] = useState<QuestionType[]>(
    activeQuestionTypes ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTopicCount =
    draftIds.length === 0 ? allTopics.length : draftIds.length;
  const hasTopicError = allTopics.length > 0 && activeTopicCount === 0;

  const allTypes = QUESTION_TYPE_OPTIONS.map((o) => o.value);
  const currentActiveTypes =
    draftTypes.length === 0 ? allTypes : draftTypes;
  const activeTypeCount = currentActiveTypes.length;

  function isTopicActive(topicId: string) {
    if (draftIds.length === 0) {
      return true;
    }
    return draftIds.includes(topicId);
  }

  function handleToggleTopic(topicId: string) {
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

  function handleSelectAllTopics() {
    setError(null);
    setDraftIds([]);
  }

  function isTypeActive(type: QuestionType) {
    if (draftTypes.length === 0) {
      return true;
    }
    return draftTypes.includes(type);
  }

  function handleToggleType(type: QuestionType) {
    setError(null);
    if (currentActiveTypes.includes(type)) {
      if (currentActiveTypes.length === 1) {
        return;
      }
      const next = currentActiveTypes.filter((t) => t !== type);
      setDraftTypes(next);
    } else {
      const next = [...currentActiveTypes, type];
      if (next.length === allTypes.length) {
        setDraftTypes([]);
      } else {
        setDraftTypes(next);
      }
    }
  }

  function handleSelectAllTypes() {
    setError(null);
    setDraftTypes([]);
  }

  async function handleSave() {
    if (hasTopicError || isSaving) return;

    setIsSaving(true);
    setError(null);

    const result = await setQuestionFiltersAction(
      sessionId,
      {
        topicIds: draftIds,
        questionTypes: draftTypes,
      },
      {
        deviceId: getOrCreateDeviceId(),
      },
    );

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSaved({
      topicIds: draftIds,
      questionTypes: draftTypes,
    });
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
          <SlidersHorizontal className="size-5 text-ink-muted" />
          <h2 className="font-display text-xl font-extrabold">
            Bộ lọc câu hỏi
          </h2>
        </div>
        <motion.button
          type="button"
          aria-label="Đóng bộ lọc"
          whileTap={{ scale: TAP_SCALE }}
          onClick={() => onOpenChange(false)}
          className="flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-xs hover:bg-white/80"
        >
          <X className="size-5" />
        </motion.button>
      </div>

      <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1 pb-4">
        {/* Dạng câu hỏi Section */}
        <div className="rounded-2xl border border-ink/5 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-cat-friends-deep" />
              <h3 className="text-sm font-extrabold text-ink">
                Dạng câu hỏi ({activeTypeCount}/{allTypes.length})
              </h3>
            </div>
            {draftTypes.length > 0 ? (
              <button
                type="button"
                onClick={handleSelectAllTypes}
                className="text-xs font-bold text-cat-friends-deep underline underline-offset-2 hover:opacity-80"
              >
                Chọn tất cả
              </button>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-ink-muted">
            Chọn dạng câu hỏi xuất hiện khi quay vòng.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUESTION_TYPE_OPTIONS.map((option) => {
              const active = isTypeActive(option.value);
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  whileTap={{ scale: TAP_SCALE }}
                  onClick={() => handleToggleType(option.value)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                    active
                      ? "bg-cat-friends text-ink shadow-xs"
                      : "border border-ink/10 bg-canvas text-ink-muted hover:border-ink/20",
                  )}
                >
                  {active ? <Check className="size-3 stroke-[3]" /> : null}
                  <span>{option.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Chủ đề Section */}
        {allTopics.length > 0 ? (
          <div className="rounded-2xl border border-ink/5 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-cat-friends-deep" />
                <h3 className="text-sm font-extrabold text-ink">
                  Chủ đề câu hỏi ({activeTopicCount}/{allTopics.length})
                </h3>
              </div>
              {draftIds.length > 0 ? (
                <button
                  type="button"
                  onClick={handleSelectAllTopics}
                  className="text-xs font-bold text-cat-friends-deep underline underline-offset-2 hover:opacity-80"
                >
                  Chọn tất cả
                </button>
              ) : null}
            </div>

            <p className="mt-1 text-xs text-ink-muted">
              Chọn chủ đề mong muốn trong phiên chơi.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {allTopics.map((t) => {
                const active = isTopicActive(t.id);
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    whileTap={{ scale: TAP_SCALE }}
                    onClick={() => handleToggleTopic(t.id)}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                      active
                        ? "bg-cat-friends text-ink shadow-xs"
                        : "border border-ink/10 bg-canvas text-ink-muted hover:border-ink/20",
                    )}
                  >
                    {active ? <Check className="size-3 stroke-[3]" /> : null}
                    <span>{t.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {hasTopicError ? (
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
          disabled={hasTopicError || isSaving}
          onClick={handleSave}
          className="h-13 w-full rounded-2xl text-base font-extrabold"
        >
          {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </div>
    </motion.div>
  );
}
