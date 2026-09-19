"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { WINNER_REVEAL_MS } from "@/lib/constants";

type WinnerRevealProps = {
  name: string;
  onDone: () => void;
};

export function WinnerReveal({ name, onDone }: WinnerRevealProps) {
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    void confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.2 },
      disableForReducedMotion: true,
    });

    const timer = window.setTimeout(() => {
      onDoneRef.current();
    }, WINNER_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [name]);

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-5">
      <p className="w-full max-w-md text-center font-display text-[clamp(2.4rem,10vw,4.5rem)] leading-none font-extrabold text-white">
        {name}
      </p>
    </section>
  );
}
