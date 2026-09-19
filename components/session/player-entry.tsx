"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { startGameSession } from "@/app/session/new/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackHeader } from "@/components/ui/back-header";
import { MIN_SESSION_PLAYERS, PLAYER_NAME_MAX_LENGTH } from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import { saveRecentSession } from "@/lib/recent-sessions";
import { useSessionDraftStore } from "@/lib/store/session-draft";

export function PlayerEntry() {
  const router = useRouter();
  const categories = useSessionDraftStore((state) => state.categories);
  const crushQuestionEnabled = useSessionDraftStore(
    (state) => state.crushQuestionEnabled,
  );
  const players = useSessionDraftStore((state) => state.players);
  const addPlayer = useSessionDraftStore((state) => state.addPlayer);
  const removePlayer = useSessionDraftStore((state) => state.removePlayer);
  const reset = useSessionDraftStore((state) => state.reset);
  const hasHydrated = useSessionDraftStore((state) => state.hasHydrated);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const canStart =
    categories.length > 0 &&
    players.length >= MIN_SESSION_PLAYERS &&
    !isStarting;

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (categories.length === 0) {
      router.replace("/session/new/categories");
    }
  }, [categories.length, hasHydrated, router]);

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addPlayer(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setError(null);
  }

  async function startSession() {
    if (!canStart) {
      return;
    }

    setIsStarting(true);
    setError(null);

    const result = await startGameSession({
      categories,
      crushQuestionEnabled,
      players,
      deviceId: getOrCreateDeviceId(),
    });

    if (!result.ok) {
      setError(result.error);
      setIsStarting(false);
      return;
    }

    saveRecentSession({
      sessionId: result.sessionId,
      sessionCode: result.sessionCode,
      categories,
    });

    reset();
    router.push(`/session/${result.sessionId}/play`);
  }

  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas">
      <BackHeader backHref="/session/new/categories" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10">
        <header>
          <p className="text-sm font-medium tracking-[0.22em] text-ink-muted uppercase">
            Bước 2 / 2
          </p>
          <h1 className="mt-3 font-display text-4xl leading-none font-extrabold text-ink">
            Ai đang cầm máy?
          </h1>
          <p className="mt-3 text-base text-ink-soft">
            Gõ tên, bấm Enter. Xoá chip nếu gõ nhầm.
          </p>
        </header>

        <form onSubmit={submitName} className="mt-8">
          <label className="sr-only" htmlFor="player-name">
            Tên người chơi
          </label>
          <Input
            id="player-name"
            value={name}
            maxLength={PLAYER_NAME_MAX_LENGTH}
            enterKeyHint="done"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="Nhập tên rồi Enter"
            className="h-14 rounded-2xl border-ink/10 bg-white px-4 text-lg"
            autoComplete="off"
            autoCapitalize="words"
          />
        </form>

        <p className="mt-4 text-sm font-medium text-ink-muted">
          {players.length} người chơi
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {players.map((player) => (
            <Badge
              key={player}
              variant="secondary"
              className="h-9 gap-2 rounded-full bg-white px-3 text-sm font-semibold text-ink"
            >
              {player}
              <button
                type="button"
                onClick={() => removePlayer(player)}
                className="relative grid size-6 place-items-center rounded-full text-ink-muted hover:text-ink before:absolute before:-inset-2 before:content-['']"
                aria-label={`Xoá ${player}`}
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-cat-couple-deep" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-auto pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            disabled={!canStart}
            onClick={startSession}
            className="h-14 w-full rounded-2xl text-lg font-extrabold"
          >
            {isStarting ? "Đang mở phiên…" : "Bắt đầu chơi"}
          </Button>
        </div>
      </div>
    </main>
  );
}
