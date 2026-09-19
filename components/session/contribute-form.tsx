"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Category, QuestionType } from "@/generated/prisma/enums";
import {
  loadContributeContext,
  submitQuestion,
} from "@/app/contribute/actions";
import { BackHeader } from "@/components/ui/back-header";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { CONTRIBUTE_THANKS_TOAST, HIDE_TOAST_MS } from "@/lib/constants";
import {
  isFriendsAutoTagged,
  toggleContributeCategory,
  type ContributeCategoryState,
} from "@/lib/game/contribute-form";
import { QUESTION_TYPE_OPTIONS } from "@/lib/game/question-notes";
import { getOrCreateDeviceId } from "@/lib/device";
import { PHASE_EASE, screenContainer, screenItem, TAP_SCALE } from "@/lib/motion";
import { cn } from "@/lib/utils";

type TopicOption = {
  id: string;
  name: string;
};

type ContributeFormProps = {
  backSessionId: string | null;
  topics: TopicOption[];
};

const EMPTY_CATEGORIES: ContributeCategoryState = {
  categories: [],
  autoTagged: [],
};

export function ContributeForm({ backSessionId, topics }: ContributeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryState, setCategoryState] =
    useState<ContributeCategoryState>(EMPTY_CATEGORIES);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [type, setType] = useState<QuestionType>(
    QUESTION_TYPE_OPTIONS[2].value,
  );
  const [nickname, setNickname] = useState("");
  const [needsNickname, setNeedsNickname] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { categories, autoTagged } = categoryState;

  const backHref = backSessionId ? `/session/${backSessionId}/play` : "/session";

  useEffect(() => {
    void loadContributeContext(getOrCreateDeviceId()).then((context) => {
      setNeedsNickname(context.needsNickname);
    });
  }, []);

  const canSubmit = useMemo(
    () => title.trim().length >= 4 && categories.length > 0 && Boolean(topicId),
    [title, categories, topicId],
  );

  function toggleCategory(category: Category, checked: boolean) {
    setCategoryState((current) =>
      toggleContributeCategory(current, category, checked),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await submitQuestion({
      title,
      categories,
      topicId,
      type,
      nickname: needsNickname ? nickname : undefined,
      deviceId: getOrCreateDeviceId(),
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setToast(CONTRIBUTE_THANKS_TOAST);
    window.setTimeout(() => {
      router.push(backHref);
    }, HIDE_TOAST_MS);
  }

  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas">
      <BackHeader backHref={backHref} title="Đóng góp câu hỏi" />
      <form
        onSubmit={onSubmit}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10"
      >
        <motion.div variants={screenContainer} initial="hidden" animate="show">
          <motion.p
            variants={screenItem}
            className="text-sm font-medium tracking-[0.22em] text-ink-muted uppercase"
          >
            Đóng góp câu hỏi
          </motion.p>
          <motion.h1
            variants={screenItem}
            className="mt-3 font-display text-4xl leading-none font-extrabold text-ink"
          >
            Thêm câu cho nhóm
          </motion.h1>

          <motion.label
            variants={screenItem}
            className="mt-8 block text-sm font-bold text-ink"
          >
            Câu hỏi
            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              rows={4}
              required
              placeholder="Nhập nội dung câu hỏi..."
              className="mt-2 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-cat-friends-deep"
            />
          </motion.label>

          <motion.fieldset variants={screenItem} className="mt-6">
            <legend className="text-sm font-bold text-ink">Thể loại</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const selected = categories.includes(option.value);
                const auto = isFriendsAutoTagged(autoTagged, option.value);
                const Icon = option.icon;

                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    whileTap={{ scale: TAP_SCALE }}
                    animate={{ scale: selected ? 1.02 : 1 }}
                    transition={{ duration: 0.2, ease: [...PHASE_EASE] }}
                    onClick={() => toggleCategory(option.value, !selected)}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border-2 px-3 py-3 text-left transition",
                      selected
                        ? `${option.selectedClass} border-white/80`
                        : "border-ink/10 bg-white text-ink",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="size-5" />
                      <span className="block text-base font-extrabold">
                        {option.label}
                      </span>
                    </div>
                    <AnimatePresence initial={false}>
                      {auto ? (
                        <motion.span
                          key="auto"
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.9 }}
                          transition={{ duration: 0.2, ease: [...PHASE_EASE] }}
                          className="mt-1.5 inline-block rounded-full bg-white/85 px-2 py-0.5 text-[0.7rem] font-bold text-ink"
                        >
                          tự động
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.fieldset>

          <motion.div variants={screenItem} className="mt-6">
            <p className="text-sm font-bold text-ink">Chủ đề</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {topics.map((topic) => {
                const selected = topicId === topic.id;
                return (
                  <motion.button
                    key={topic.id}
                    type="button"
                    whileTap={{ scale: TAP_SCALE }}
                    onClick={() => setTopicId(topic.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-center text-sm font-bold transition",
                      selected
                        ? "border-cat-friends-deep bg-cat-friends-deep text-white shadow-sm"
                        : "border-ink/10 bg-white text-ink hover:border-ink/20",
                    )}
                  >
                    {topic.name}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <motion.fieldset variants={screenItem} className="mt-6">
            <legend className="text-sm font-bold text-ink">Loại câu hỏi</legend>
            <div className="mt-3 flex flex-col gap-2">
              {QUESTION_TYPE_OPTIONS.map((option) => {
                const selected = type === option.value;

                return (
                  <motion.label
                    key={option.value}
                    whileTap={{ scale: TAP_SCALE }}
                    animate={{ scale: selected ? 1.01 : 1 }}
                    transition={{ duration: 0.18, ease: [...PHASE_EASE] }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-2xl border-2 px-4 py-3 transition",
                      selected
                        ? "border-cat-friends-deep bg-white shadow-sm"
                        : "border-transparent bg-white hover:border-ink/10",
                    )}
                  >
                    <input
                      type="radio"
                      name="question-type"
                      value={option.value}
                      checked={selected}
                      onChange={() => setType(option.value)}
                      className="sr-only"
                    />
                    <span className="font-bold text-ink">{option.label}</span>
                    {selected ? (
                      <span className="grid size-6 place-items-center rounded-full bg-cat-friends-deep text-white">
                        <Check className="size-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="size-6 rounded-full border-2 border-ink/20" />
                    )}
                  </motion.label>
                );
              })}
            </div>
          </motion.fieldset>

          <AnimatePresence initial={false}>
            {needsNickname ? (
              <motion.label
                key="nickname"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: [...PHASE_EASE] }}
                className="block overflow-hidden text-sm font-bold text-ink"
              >
                <span className="mt-6 block">
                  Tên hiển thị của bạn
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="Để trống = Ẩn danh"
                    className="mt-2 h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 text-base text-ink transition focus:border-cat-friends-deep"
                  />
                </span>
              </motion.label>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [...PHASE_EASE] }}
              className="mt-4 text-sm text-cat-couple-deep"
              role="alert"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.28, ease: [...PHASE_EASE] }}
          whileTap={{ scale: TAP_SCALE }}
          className="mt-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <Button
            type="submit"
            disabled={!canSubmit || busy}
            className="h-14 w-full rounded-2xl text-lg font-extrabold"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={busy ? "sending" : "idle"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                {busy ? "Đang gửi…" : "Gửi đóng góp"}
              </motion.span>
            </AnimatePresence>
          </Button>

          {!canSubmit && (
            <p className="mt-2 text-center text-xs text-ink-muted">
              {!title.trim() || title.trim().length < 4
                ? "Nhập câu hỏi ít nhất 4 ký tự"
                : categories.length === 0
                ? "Chọn ít nhất 1 thể loại"
                : !topicId
                ? "Chọn chủ đề"
                : ""}
            </p>
          )}
        </motion.div>
      </form>

      <AnimatePresence>
        {toast ? (
          <motion.p
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [...PHASE_EASE] }}
            className="fixed inset-x-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 rounded-full bg-ink px-4 py-3 text-center text-sm font-bold text-white shadow-lg"
          >
            {toast}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
