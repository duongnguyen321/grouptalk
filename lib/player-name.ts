export function normalizePlayerName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function isSamePlayerName(left: string, right: string) {
  return left.toLocaleLowerCase("vi") === right.toLocaleLowerCase("vi");
}
