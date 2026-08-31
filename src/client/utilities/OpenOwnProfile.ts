import { appRouter } from "../AppRouter";

/**
 * Open the signed-in player's own account page.
 *
 * This is the page with the account, stats, games and friends tabs -- what a
 * player means by "my profile". It is distinct from the public profile route,
 * which is the read-only view of somebody else and needs their publicId.
 *
 * The account pill used to open neither: it only toggled the dropdown, so
 * there was no way to reach this from the desktop bar at all.
 */
export function openAccountSettings(): void {
  void appRouter.navigate({ pageId: "page-account" });
}
