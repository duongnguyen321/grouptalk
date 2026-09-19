"use client";

import { useRef } from "react";

export function useLongPress(
  callback: () => void,
  { delayMs = 700 }: { delayMs?: number } = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didTriggerRef = useRef(false);

  function clear() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    handlers: {
      onPointerDown: () => {
        didTriggerRef.current = false;
        timerRef.current = setTimeout(() => {
          didTriggerRef.current = true;
          callback();
        }, delayMs);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
    },
    didLongPress: () => didTriggerRef.current,
  };
}
