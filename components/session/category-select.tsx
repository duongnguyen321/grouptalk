"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Heart, Sparkles } from "lucide-react";
import { Category } from "@/generated/prisma/enums";
import { getTopicsForCategories } from "@/app/session/new/actions";
import { BackHeader } from "@/components/ui/back-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { TAP_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useSessionDraftStore } from "@/lib/store/session-draft";

export function CategorySelect() {
  const router = useRouter();
  const categories = useSessionDraftStore((state) => state.categories);
  const crushQuestionEnabled = useSessionDraftStore(
    (state) => state.crushQuestionEnabled,
  );
  const selectedTopicIds = useSessionDraftStore(
    (state) => state.selectedTopicIds,
  );
  const selectCategory = useSessionDraftStore((state) => state.selectCategory);
  const setCrush = useSessionDraftStore((state) => state.setCrush);
  const setSelectedTopicIds = useSessionDraftStore(
    (state) => state.setSelectedTopicIds,
  );

  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);

  const displayedTopics = categories.length === 0 ? [] : topics;
  const hasFriends = categories.includes(Category.FRIENDS);
  const activeTopicCount =
    selectedTopicIds.length === 0 ? displayedTopics.length : selectedTopicIds.length;
  const hasTopicError = displayedTopics.length > 0 && activeTopicCount === 0;
  const canContinue = categories.length === 1 && !hasTopicError;

  useEffect(() => {
    let active = true;
    getTopicsForCategories(categories)
      .then((loaded) => {
        if (active) {
          setTopics(loaded);
        }
      })
      .catch(() => {
        if (active) {
          setTopics([]);
        }
      });

    return () => {
      active = false;
    };
  }, [categories]);

  function isTopicActive(topicId: string) {
    if (selectedTopicIds.length === 0) {
      return true;
    }
    return selectedTopicIds.includes(topicId);
  }

  function handleToggleTopic(topicId: string) {
    if (selectedTopicIds.length === 0) {
      // Currently all are selected; deselect this one
      const remaining = displayedTopics
        .filter((t) => t.id !== topicId)
        .map((t) => t.id);
      setSelectedTopicIds(remaining);
      return;
    }

    if (selectedTopicIds.includes(topicId)) {
      const next = selectedTopicIds.filter((id) => id !== topicId);
      setSelectedTopicIds(next);
    } else {
      const next = [...selectedTopicIds, topicId];
      if (next.length === displayedTopics.length) {
        setSelectedTopicIds([]);
      } else {
        setSelectedTopicIds(next);
      }
    }
  }

  function handleSelectAllTopics() {
    setSelectedTopicIds([]);
  }

  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas">
      <BackHeader backHref="/session" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10">
        <header>
          <p className="text-sm font-medium tracking-[0.22em] text-ink-muted uppercase">
            Bước 1 / 2
          </p>
          <h1 className="mt-3 font-display text-4xl leading-none font-extrabold text-ink">
            Chơi với nhóm nào?
          </h1>
          <p className="mt-3 text-base text-ink-soft">
            Chọn nhóm bạn đang chơi cùng. Câu hỏi sẽ theo đúng nhóm này.
          </p>
        </header>

        <div
          role="radiogroup"
          aria-label="Chọn nhóm chơi"
          className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {CATEGORY_OPTIONS.map((option) => {
            const isSelected = categories[0] === option.value;
            const Icon = option.icon;

            return (
              <motion.button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                whileTap={{ scale: TAP_SCALE }}
                onClick={() => selectCategory(option.value)}
                className={cn(
                  "relative flex min-h-36 flex-col items-start justify-between rounded-[1.75rem] border-2 px-4 py-4 text-left transition",
                  isSelected
                    ? `${option.selectedClass} border-white/80 shadow-md`
                    : "border-ink/10 bg-white text-ink hover:border-ink/20",
                )}
              >
                <Icon className="size-8" />
                <span className="font-display text-xl font-extrabold">
                  {option.label}
                </span>
                {isSelected ? (
                  <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-white/90 text-sm font-extrabold text-ink">
                    ✓
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>

        {hasFriends ? (
          <label className="mt-5 flex min-h-20 cursor-pointer items-center gap-4 rounded-[1.5rem] bg-white px-4 py-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-cat-couple/15 text-cat-couple-deep">
              <Heart className="size-5 fill-current" />
            </span>
            <span className="flex-1 text-lg leading-snug font-extrabold text-ink">
              Trong nhóm có ai đang &lsquo;thích thầm&rsquo; không?
            </span>
            <Checkbox
              checked={crushQuestionEnabled}
              onCheckedChange={(checked) => setCrush(checked === true)}
              className="size-7 rounded-md"
              aria-label="Bật câu hỏi thích thầm"
            />
          </label>
        ) : null}

        {categories.length > 0 && displayedTopics.length > 0 ? (
          <div className="mt-6 rounded-[1.5rem] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-cat-friends-deep" />
                <span className="text-sm font-extrabold text-ink">
                  Chủ đề câu hỏi ({activeTopicCount}/{displayedTopics.length})
                </span>
              </div>
              {selectedTopicIds.length > 0 ? (
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
              Chạm để bật/tắt chủ đề muốn chơi trong phiên này.
            </p>

            <div className="mt-3.5 flex flex-wrap gap-2">
              {displayedTopics.map((t) => {
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

            <AnimatePresence>
              {hasTopicError ? (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 text-xs font-semibold text-cat-couple-deep"
                >
                  Vui lòng chọn ít nhất 1 chủ đề để tiếp tục.
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        <div className="mt-auto pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            disabled={!canContinue}
            onClick={() => router.push("/session/new/players")}
            className="h-14 w-full rounded-2xl text-lg font-extrabold"
          >
            Tiếp tục
          </Button>
        </div>
      </div>
    </main>
  );
}

