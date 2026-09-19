"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Category } from "@/generated/prisma/enums";
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
  const toggleCategory = useSessionDraftStore((state) => state.toggleCategory);
  const setCrush = useSessionDraftStore((state) => state.setCrush);
  const hasFriends = categories.includes(Category.FRIENDS);
  const canContinue = categories.length > 0;

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
            Chọn một hoặc nhiều. Câu hỏi sẽ theo đúng nhóm này.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CATEGORY_OPTIONS.map((option) => {
            const isSelected = categories.includes(option.value);
            const Icon = option.icon;

            return (
              <motion.button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                whileTap={{ scale: TAP_SCALE }}
                onClick={() => toggleCategory(option.value)}
                className={cn(
                  "relative flex min-h-36 flex-col items-start justify-between rounded-[1.75rem] border-2 px-4 py-4 text-left transition",
                  isSelected
                    ? `${option.selectedClass} border-white/80`
                    : "border-ink/10 bg-white text-ink",
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-black/5">
                  <Icon className="size-6" />
                </div>
                <span className="font-display text-xl font-extrabold">
                  {option.label}
                </span>
                {isSelected ? (
                  <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-white/90 text-sm font-extrabold text-ink">
                    <Check className="size-4 stroke-[3]" />
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>

        {hasFriends ? (
          <label className="mt-5 flex min-h-20 cursor-pointer items-center gap-4 rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_4px_12px_rgba(28,25,23,0.04)]">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cat-friends/15 text-cat-friends-deep">
              <Sparkles className="size-5" />
            </div>
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
