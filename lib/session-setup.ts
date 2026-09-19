import { Category } from "@/generated/prisma/enums";
import { isCategory } from "@/lib/categories";
import { MIN_SESSION_PLAYERS, PLAYER_NAME_MAX_LENGTH } from "@/lib/constants";
import { isSamePlayerName, normalizePlayerName } from "@/lib/player-name";

export function parseSessionCategories(values: string[]): Category[] | null {
  const unique: Category[] = [];

  for (const value of values) {
    if (!isCategory(value)) {
      return null;
    }

    if (!unique.includes(value)) {
      unique.push(value);
    }
  }

  if (unique.length === 0) {
    return null;
  }

  return unique;
}

export function parseSessionPlayers(values: string[]): string[] | null {
  const players: string[] = [];

  for (const value of values) {
    const name = normalizePlayerName(value);
    if (!name || name.length > PLAYER_NAME_MAX_LENGTH) {
      return null;
    }

    if (players.some((player) => isSamePlayerName(player, name))) {
      return null;
    }

    players.push(name);
  }

  if (players.length < MIN_SESSION_PLAYERS) {
    return null;
  }

  return players;
}
