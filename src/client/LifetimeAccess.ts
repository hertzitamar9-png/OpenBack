import type { UserMeResponse } from "../core/ApiSchemas";

export function hasLifetimeAccess(
  _userMe: UserMeResponse | false | null | undefined,
): boolean {
  return true;
}

export async function requireLifetimeAccess(
  _source: "multiplayer" | "ranked" | "frootz",
): Promise<boolean> {
  return true;
}
