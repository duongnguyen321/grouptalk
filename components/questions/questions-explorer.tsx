"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Filter,
  HelpCircle,
  Layers,
  Loader2,
  User,
  Users,
} from "lucide-react";
import type {
  OverviewStats,
  QuestionItem,
  TopicWithCount,
} from "@/app/questions/actions";
import { fetchQuestionsBatch } from "@/app/questions/actions";
import { QuestionType } from "@/generated/prisma/enums";
import { categoryIcon, categoryLabel } from "@/lib/game/category-tone";
import {
  PHASE_EASE,
  screenContainer,
  screenItem,
  TAP_SCALE,
} from "@/lib/motion";

type QuestionsExplorerProps = {
  initialItems: QuestionItem[];
  initialTotalCount: number;
  initialHasMore: boolean;
  topics: TopicWithCount[];
  stats: OverviewStats;
};

function getQuestionTypeBadge(type: QuestionType) {
  switch (type) {
    case QuestionType.YESNO:
      return {
        label: "Có / Không",
        className: "bg-cat-girls/15 text-cat-girls-deep border-cat-girls/30",
      };
    case QuestionType.CHALLENGE:
      return {
        label: "Thử thách",
        className: "bg-cat-couple/15 text-cat-couple-deep border-cat-couple/30",
      };
    case QuestionType.OPEN_ENDED:
    default:
      return {
        label: "Câu hỏi mở",
        className: "bg-cat-friends/15 text-cat-friends-deep border-cat-friends/30",
      };
  }
}

export function QuestionsExplorer({
  initialItems,
  initialTotalCount,
  initialHasMore,
  topics,
  stats,
}: QuestionsExplorerProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [items, setItems] = useState<QuestionItem[]>(initialItems);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPendingFilter, startTransition] = useTransition();

  const observerTarget = useRef<HTMLDivElement>(null);

  // Handle switching topic
  function handleSelectTopic(topicId: string | null) {
    if (selectedTopicId === topicId) return;

    setSelectedTopicId(topicId);
    setPage(0);

    startTransition(async () => {
      const res = await fetchQuestionsBatch({
        topicId,
        page: 0,
      });
      setItems(res.items);
      setTotalCount(res.totalCount);
      setHasMore(res.hasMore);
    });
  }

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoadingMore && !isPendingFilter) {
          setIsLoadingMore(true);
          const nextPage = page + 1;

          fetchQuestionsBatch({
            topicId: selectedTopicId,
            page: nextPage,
          })
            .then((res) => {
              setItems((prev) => [...prev, ...res.items]);
              setPage(nextPage);
              setHasMore(res.hasMore);
            })
            .catch((err) => {
              console.error("Lỗi nạp thêm câu hỏi:", err);
            })
            .finally(() => {
              setIsLoadingMore(false);
            });
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, isPendingFilter, page, selectedTopicId]);

  return (
    <motion.div
      variants={screenContainer}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-12"
    >
      {/* Overview Stat Banner */}
      <motion.section
        variants={screenItem}
        className="mt-4 rounded-3xl border border-ink/10 bg-white p-4 shadow-[0_4px_16px_rgba(28,25,23,0.04)]"
      >
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-ink-muted uppercase">
          <Layers className="size-3.5 text-cat-friends-deep" />
          <span>Thống kê thư viện</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-3 rounded-2xl bg-canvas/90 p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cat-friends/20 text-cat-friends-deep">
              <HelpCircle className="size-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display text-xl font-extrabold leading-tight text-ink truncate">
                {stats.questionCount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-semibold text-ink-muted truncate">
                Tổng câu hỏi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-canvas/90 p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cat-couple/20 text-cat-couple-deep">
              <Users className="size-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display text-xl font-extrabold leading-tight text-ink truncate">
                {stats.playerCount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-semibold text-ink-muted truncate">
                Lượt người chơi
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Topics Horizontal Filter */}
      <motion.section variants={screenItem} className="mt-6 flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-muted uppercase">
            <Filter className="size-3.5 text-ink-soft" />
            <span>Chủ đề ({topics.length})</span>
          </div>
          <span className="text-xs font-semibold text-ink-soft">
            {totalCount.toLocaleString("vi-VN")} câu
          </span>
        </div>

        {/* Scrollable Chip Row */}
        <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar -mx-4 px-4">
          <motion.button
            type="button"
            whileTap={{ scale: TAP_SCALE }}
            onClick={() => handleSelectTopic(null)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              selectedTopicId === null
                ? "bg-ink text-canvas shadow-[0_4px_12px_rgba(28,25,23,0.18)]"
                : "border border-ink/10 bg-white text-ink-soft hover:bg-ink/5"
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                selectedTopicId === null
                  ? "bg-canvas/20 text-canvas"
                  : "bg-ink/5 text-ink-muted"
              }`}
            >
              {stats.questionCount.toLocaleString("vi-VN")}
            </span>
          </motion.button>

          {topics.map((t) => {
            const isSelected = selectedTopicId === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                whileTap={{ scale: TAP_SCALE }}
                onClick={() => handleSelectTopic(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                  isSelected
                    ? "bg-ink text-canvas shadow-[0_4px_12px_rgba(28,25,23,0.18)]"
                    : "border border-ink/10 bg-white text-ink-soft hover:bg-ink/5"
                }`}
              >
                <span>{t.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isSelected
                      ? "bg-canvas/20 text-canvas"
                      : "bg-ink/5 text-ink-muted"
                  }`}
                >
                  {t.count.toLocaleString("vi-VN")}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* Questions List */}
      <motion.section variants={screenItem} className="mt-4 flex flex-col gap-3">
        {isPendingFilter ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 py-12 text-ink-muted">
            <Loader2 className="size-6 animate-spin text-cat-friends-deep" />
            <p className="text-sm font-semibold">Đang lọc câu hỏi…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-ink/15 bg-white/50 p-8 text-center text-ink-soft">
            <HelpCircle className="size-8 text-ink-muted" />
            <p className="font-display text-base font-bold text-ink">
              Chưa có câu hỏi nào
            </p>
            <p className="text-xs text-ink-muted">
              Hiện chưa có câu hỏi nào trong chủ đề này.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => {
              const typeBadge = getQuestionTypeBadge(item.type);

              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(index * 0.03, 0.3),
                    ease: [...PHASE_EASE],
                  }}
                  className="flex flex-col gap-3 rounded-3xl border border-ink/10 bg-white p-4 shadow-[0_4px_16px_rgba(28,25,23,0.03)] transition hover:border-ink/20"
                >
                  {/* Badges Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-bold text-ink">
                      <span>{item.topic.name}</span>
                    </span>

                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${typeBadge.className}`}
                    >
                      {typeBadge.label}
                    </span>
                  </div>

                  {/* Question Content */}
                  <h2 className="font-display text-base font-bold leading-relaxed text-ink">
                    {item.title}
                  </h2>

                  {/* Categories & Contributor Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-ink/5">
                    <div className="flex flex-wrap items-center gap-1">
                      {item.categories.map((cat) => {
                        const Icon = categoryIcon(cat);
                        return (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-soft"
                          >
                            <Icon className="size-3" />
                            <span>{categoryLabel(cat)}</span>
                          </span>
                        );
                      })}
                    </div>

                    {item.contributorName ? (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-ink-muted">
                        <User className="size-3" />
                        <span>Đóng góp: {item.contributorName}</span>
                      </div>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* Sentinel element for infinite scroll */}
        <div ref={observerTarget} className="h-4 w-full" />

        {/* Loading Indicator or End of List */}
        <AnimatePresence>
          {isLoadingMore ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-ink-muted"
            >
              <Loader2 className="size-4 animate-spin text-cat-friends-deep" />
              <span>Đang tải thêm câu hỏi…</span>
            </motion.div>
          ) : null}

          {!hasMore && items.length > 0 && !isPendingFilter ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-1.5 py-6 text-xs font-semibold text-ink-muted"
            >
              <CheckCircle2 className="size-3.5 text-cat-friends-deep" />
              <span>Đã hiển thị toàn bộ {totalCount} câu hỏi</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>
    </motion.div>
  );
}
