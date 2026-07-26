import type { UserMeResponse } from "../core/ApiSchemas";
import { getLastUserMe, getUserMe } from "./Api";

export interface PurchaseModalElement extends HTMLElement {
  open: (args?: Record<string, unknown>) => void;
}

export function hasLifetimeAccess(
  userMe: UserMeResponse | false | null | undefined,
): boolean {
  return userMe !== false && userMe?.player.lifetimeAccess === true;
}

export async function requireLifetimeAccess(
  source: "multiplayer" | "ranked" | "frootz",
): Promise<boolean> {
  let userMe = getLastUserMe();
  if (!hasLifetimeAccess(userMe)) userMe = await getUserMe();
  if (hasLifetimeAccess(userMe)) return true;
  (
    document.querySelector("purchase-modal") as PurchaseModalElement | null
  )?.open({ source });
  return false;
}
