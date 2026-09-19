"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Category } from "@/generated/prisma/enums";
import {
  PLAYER_NAME_MAX_LENGTH,
  SESSION_DRAFT_STORAGE_KEY,
} from "@/lib/constants";
import { isSamePlayerName, normalizePlayerName } from "@/lib/player-name";

export type SessionDraftSnapshot = {
  categories: Category[];
  crushQuestionEnabled: boolean;
  players: string[];
};

type SessionDraftState = SessionDraftSnapshot & {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  toggleCategory: (category: Category) => void;
  setCrush: (value: boolean) => void;
  addPlayer: (name: string) => { ok: true } | { ok: false; error: string };
  removePlayer: (name: string) => void;
  reset: () => void;
};

const emptyDraft: SessionDraftSnapshot = {
  categories: [],
  crushQuestionEnabled: false,
  players: [],
};

export const useSessionDraftStore = create<SessionDraftState>()(
  persist(
    (set, get) => ({
      ...emptyDraft,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
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
