import { getLastUserMe } from "../Api";
import { appRouter } from "../AppRouter";

/**
 * Open the signed-in player's own profile.
 *
 * The profile route needs a publicId, so it cannot be reached through the
 * plain `data-page` navigation every other nav item uses -- which is why there
 * was no way to see your own profile from the desktop nav at all, and why the
 * avatar could only open the account menu.
 *
 * Returns false when nobody is signed in or the session predates publicIds, so
 * a caller can fall back to whatever it did before rather than navigating to a
 * profile that does not exist.
 */
export function openOwnProfile(): boolean {
  const me = getLastUserMe();
  const publicID = me === false ? undefined : me.player?.publicId;
  if (!publicID) return false;
  void appRouter.navigate({ pageId: "page-profile", publicID, tab: "stats" });
  return true;
}
