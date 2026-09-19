import {
  WHEEL_EXTRA_TURNS_MAX,
  WHEEL_EXTRA_TURNS_MIN,
  WHEEL_SPIN_MAX_MS,
  WHEEL_SPIN_MIN_MS,
} from "@/lib/constants";

export function winnerTargetDegrees(winnerIndex: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  const slice = 360 / count;
  const center = winnerIndex * slice + slice / 2;
  return (360 - center) % 360;
}

export function nextWheelRotation(
  current: number,
  winnerIndex: number,
  count: number,
  extraTurns: number,
) {
  const targetMod = winnerTargetDegrees(winnerIndex, count);
  const currentMod = ((current % 360) + 360) % 360;
  const delta = (targetMod - currentMod + 360) % 360;
  return current + extraTurns * 360 + delta;
}

export function randomSpinDurationMs() {
  return (
    WHEEL_SPIN_MIN_MS +
    Math.floor(Math.random() * (WHEEL_SPIN_MAX_MS - WHEEL_SPIN_MIN_MS + 1))
  );
}

export function randomExtraTurns() {
  return (
    WHEEL_EXTRA_TURNS_MIN +
    Math.floor(
      Math.random() * (WHEEL_EXTRA_TURNS_MAX - WHEEL_EXTRA_TURNS_MIN + 1),
    )
  );
}
