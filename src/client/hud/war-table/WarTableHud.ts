export type WarTableHudSurface =
  | "build"
  | "resources"
  | "leaderboard"
  | "units";
export type WarTableHudState =
  | "default"
  | "selected"
  | "unavailable"
  | "building"
  | "affordable"
  | "warning"
  | "ally"
  | "enemy"
  | "local";

export function warTableHudClass(
  surface: WarTableHudSurface,
  state: WarTableHudState = "default",
): string {
  return `ob-command ob-command--${surface} ob-command--${state}`;
}
