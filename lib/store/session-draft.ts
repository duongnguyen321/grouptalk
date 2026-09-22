"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Category, QuestionType } from "@/generated/prisma/enums";
import {
  PLAYER_NAME_MAX_LENGTH,
  SESSION_DRAFT_STORAGE_KEY,
} from "@/lib/constants";
import { isSamePlayerName, normalizePlayerName } from "@/lib/player-name";

export type SessionDraftSnapshot = {
  categories: Category[];
  crushQuestionEnabled: boolean;
  selectedTopicIds: string[];
  selectedQuestionTypes: QuestionType[];
  players: string[];
};

type SessionDraftState = SessionDraftSnapshot & {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  selectCategory: (category: Category) => void;
  toggleCategory: (category: Category) => void;
  setCrush: (value: boolean) => void;
  setSelectedTopicIds: (ids: string[]) => void;
  toggleTopicId: (id: string) => void;
  setSelectedQuestionTypes: (types: QuestionType[]) => void;
  toggleQuestionType: (type: QuestionType) => void;
  addPlayer: (name: string) => { ok: true } | { ok: false; error: string };
  removePlayer: (name: string) => void;
  reset: () => void;
};

const emptyDraft: SessionDraftSnapshot = {
  categories: [],
  crushQuestionEnabled: false,
  selectedTopicIds: [],
  selectedQuestionTypes: [],
  players: [],
};

export const useSessionDraftStore = create<SessionDraftState>()(
  persist(
    (set, get) => ({
      ...emptyDraft,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      selectCategory: (category) => {
        const prevCategories = get().categories;
        const isSame = prevCategories.length === 1 && prevCategories[0] === category;
        set({
          categories: [category],
          crushQuestionEnabled:
            category === Category.FRIENDS ? get().crushQuestionEnabled : false,
          selectedTopicIds: isSame ? get().selectedTopicIds : [],
        });
      },
      toggleCategory: (category) => {
        const { categories } = get();
        const isSelected = categories.includes(category);
        const nextCategories = isSelected
          ? categories.filter((item) => item !== category)
          : [...categories, category];
        const keepsFriends = nextCategories.includes(Category.FRIENDS);

        set({
          categories: nextCategories,
          crushQuestionEnabled: keepsFriends
            ? get().crushQuestionEnabled
            : false,
        });
      },
      setCrush: (value) => {
        if (!get().categories.includes(Category.FRIENDS)) {
          set({ crushQuestionEnabled: false });
          return;
        }

        set({ crushQuestionEnabled: value });
      },
      setSelectedTopicIds: (ids) => set({ selectedTopicIds: ids }),
      toggleTopicId: (id) => {
        const { selectedTopicIds } = get();
        const next = selectedTopicIds.includes(id)
          ? selectedTopicIds.filter((item) => item !== id)
          : [...selectedTopicIds, id];
        set({ selectedTopicIds: next });
      },
      setSelectedQuestionTypes: (types) => set({ selectedQuestionTypes: types }),
      toggleQuestionType: (type) => {
        const { selectedQuestionTypes } = get();
        const allTypes = [
          QuestionType.YESNO,
          QuestionType.CHALLENGE,
          QuestionType.OPEN_ENDED,
        ];
        if (selectedQuestionTypes.length === 0) {
          const next = allTypes.filter((t) => t !== type);
          set({ selectedQuestionTypes: next });
          return;
        }
        if (selectedQuestionTypes.includes(type)) {
          const next = selectedQuestionTypes.filter((t) => t !== type);
          set({ selectedQuestionTypes: next });
        } else {
          const next = [...selectedQuestionTypes, type];
          if (next.length === allTypes.length) {
            set({ selectedQuestionTypes: [] });
          } else {
            set({ selectedQuestionTypes: next });
          }
        }
      },
      addPlayer: (name) => {
        const normalized = normalizePlayerName(name);
        if (!normalized) {
          return { ok: false, error: "Nhập tên rồi mới thêm." };
        }

        if (normalized.length > PLAYER_NAME_MAX_LENGTH) {
          return {
            ok: false,
            error: `Tên tối đa ${PLAYER_NAME_MAX_LENGTH} ký tự.`,
          };
        }

        const { players } = get();
        if (players.some((player) => isSamePlayerName(player, normalized))) {
          return { ok: false, error: "Tên này đã có rồi." };
        }

        set({ players: [...players, normalized] });
        return { ok: true };
      },
      removePlayer: (name) => {
        set({
          players: get().players.filter(
            (player) => !isSamePlayerName(player, name),
          ),
        });
      },
      reset: () => set(emptyDraft),
    }),
    {
      name: SESSION_DRAFT_STORAGE_KEY,
      partialize: (state) => ({
        categories: state.categories,
        crushQuestionEnabled: state.crushQuestionEnabled,
        selectedTopicIds: state.selectedTopicIds,
        selectedQuestionTypes: state.selectedQuestionTypes,
        players: state.players,
      }),
      onRehydrateStorage: () => () => {
        useSessionDraftStore.getState().setHasHydrated(true);
      },
    },
  ),
);

if (typeof window !== "undefined") {
  useSessionDraftStore.persist.onFinishHydration(() => {
    useSessionDraftStore.getState().setHasHydrated(true);
  });

  if (useSessionDraftStore.persist.hasHydrated()) {
    useSessionDraftStore.getState().setHasHydrated(true);
  }
}
