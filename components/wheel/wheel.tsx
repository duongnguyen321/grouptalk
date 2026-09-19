"use client";

import { motion } from "framer-motion";
import { WHEEL_SPIN_EASING } from "@/lib/constants";
import {
  categoryTone,
  primaryCategory,
  wheelSliceFill,
  wheelSliceGradientId,
} from "@/lib/game/category-tone";
import type { PlayPlayer } from "@/lib/game/play-types";
import { Category } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type WheelProps = {
  players: PlayPlayer[];
  categories: Category[];
  rotation: number;
  durationMs: number;
  spinning: boolean;
  onSpinComplete: () => void;
  onClick?: () => void;
  disabled?: boolean;
};

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 148;

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)] as const;
}

function slicePath(startAngle: number, endAngle: number) {
  const [startX, startY] = polar(startAngle, RADIUS);
  const [endX, endY] = polar(endAngle, RADIUS);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${CENTER} ${CENTER}`,
    `L ${startX} ${startY}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${endX} ${endY}`,
    "Z",
  ].join(" ");
}

export function Wheel({
  players,
  categories,
  rotation,
  durationMs,
  spinning,
  onSpinComplete,
  onClick,
  disabled = false,
}: WheelProps) {
  const count = Math.max(players.length, 1);
  const slice = 360 / count;
  const category = primaryCategory(categories);
  const tone = categoryTone(category);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Quay bánh xe"
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "relative mx-auto size-[min(86vw,20.5rem)] select-none",
        !disabled && onClick && "cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]",
        disabled && "cursor-default",
      )}
    >
      <div className="absolute top-[-6px] left-1/2 z-10 -translate-x-1/2 pointer-events-none">
        <div className="h-0 w-0 border-x-[10px] border-t-[18px] border-x-transparent border-t-ink" />
      </div>
      <motion.div
        className="size-full"
        animate={{ rotate: rotation }}
        transition={{
          duration: spinning ? durationMs / 1000 : 0,
          ease: [...WHEEL_SPIN_EASING],
        }}
        onAnimationComplete={() => {
          if (spinning) {
            onSpinComplete();
          }
        }}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-full overflow-visible drop-shadow-[0_16px_28px_rgba(28,25,23,0.18)]"
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 4}
            fill="white"
          />
          <defs>
            <linearGradient
              id={wheelSliceGradientId(category, 0)}
              x1="0"
              y1="0"
              x2={SIZE}
              y2={SIZE}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" style={{ stopColor: tone.light }} />
              <stop offset="100%" style={{ stopColor: tone.deep }} />
            </linearGradient>
            <linearGradient
              id={wheelSliceGradientId(category, 1)}
              x1="0"
              y1="0"
              x2={SIZE}
              y2={SIZE}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" style={{ stopColor: tone.deep }} />
              <stop offset="100%" style={{ stopColor: tone.light }} />
            </linearGradient>
          </defs>
          {players.map((player, index) => {
            const start = index * slice;
            const end = start + slice;
            const mid = start + slice / 2;
            const [labelX, labelY] = polar(mid, RADIUS * 0.62);

            return (
              <g key={player.id}>
                <path
                  d={slicePath(start, end)}
                  fill={wheelSliceFill(category, index)}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="2"
                />
                <text
                  x={labelX}
                  y={labelY}
                  fill="white"
                  fontSize="15"
                  fontWeight="800"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid}, ${labelX}, ${labelY})`}
                >
                  {player.displayName.slice(0, 12)}
                </text>
              </g>
            );
          })}
          <circle cx={CENTER} cy={CENTER} r="28" fill="white" />
        </svg>
      </motion.div>
      <div className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-white/80" />
    </div>
  );
}
