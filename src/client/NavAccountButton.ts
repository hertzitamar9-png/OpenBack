import { UserMeResponse } from "../core/ApiSchemas";
import { assetUrl } from "../core/AssetUrls";
import { hasLinkedIdentity } from "./AccountIdentity";
import { getDiscordAvatarUrl, translateText } from "./Utils";

export function finishAccountNavLoading(): void {
  document
    .getElementById("nav-account-loading-spinner")
    ?.classList.add("hidden");
}

// Renders the persistent top-nav account button from the resolved /users/@me
// response: a linked identity shows its avatar/badge, everything else shows the
// signed-out prompt. Extracted from Main.ts so the identity precedence — which
// now includes Steam — is unit-testable in jsdom.
export function updateAccountNavButton(userMeResponse: UserMeResponse | false) {
  const button = document.getElementById("nav-account-button");
  const mobileButton = document.getElementById("mobile-nav-account-button");
  if (!button && !mobileButton) return;

  const avatarEl = document.getElementById("nav-account-avatar") as
    | (HTMLImageElement & { _navToken?: symbol })
    | null;
  const personIconEl = document.getElementById(
    "nav-account-person-icon",
  ) as SVGElement | null;
  const emailBadgeEl = document.getElementById(
    "nav-account-email-badge",
  ) as HTMLElement | null;
  const signInTextEl = document.getElementById(
    "nav-account-signin-text",
  ) as HTMLSpanElement | null;

  // Auth state is resolved, so the button no longer shows the loading spinner.
  finishAccountNavLoading();

  // Unique token for this update call
  const navToken = Symbol();
  if (avatarEl) avatarEl._navToken = navToken;

  const showAvatar = (src: string, alt?: string, displayName?: string) => {
    if (mobileButton) {
      mobileButton.removeAttribute("data-i18n");
      mobileButton.textContent = displayName
        ? `${translateText("main.profile")} - ${displayName}`
        : translateText("main.profile");
    }
    if (avatarEl) {
      avatarEl.alt = alt ?? translateText("main.discord_avatar_alt");
      // If the avatar fails to load (bad URL / CDN issue / offline), fall back
      // to the provider-neutral logged-in state rather than leaving a broken
      // image or a mismatched default (the button is used by Discord and Steam).
      avatarEl.onerror = () => {
        if (avatarEl._navToken !== navToken) return;
        avatarEl.onerror = null;
        avatarEl.src = assetUrl("images/OpenBackMark512.png");
      };
      avatarEl.onload = () => {
        // Only handle if this is the latest update
        if (avatarEl._navToken !== navToken) return;
        // Clear error handler after a successful load.
        avatarEl.onerror = null;
      };
      avatarEl.src = src;
      avatarEl.classList.remove("hidden");
    }
    personIconEl?.classList.add("hidden");
    emailBadgeEl?.classList.add("hidden");
    if (signInTextEl && displayName) {
      signInTextEl.className =
        "flex flex-col items-start leading-none text-xs font-bold tracking-widest";
      signInTextEl.removeAttribute("data-i18n");
      signInTextEl.replaceChildren();
      const label = document.createElement("span");
      label.className =
        "text-[10px] font-bold uppercase tracking-widest text-white/60";
      label.textContent = translateText("main.profile");
      const name = document.createElement("span");
      name.className = "max-w-[10rem] truncate text-xs font-bold tracking-wide";
      name.textContent = displayName;
      signInTextEl.append(label, name);
    } else {
      signInTextEl?.classList.add("hidden");
    }
    button?.classList.remove("border", "border-white/20");
  };

  const showOpenBackAvatar = () =>
    showAvatar(
      assetUrl("images/OpenBackMark512.png"),
      "OpenBack profile",
      userMeResponse !== false
        ? userMeResponse.user.displayName?.trim()
        : undefined,
    );

  const showSignIn = () => {
    if (mobileButton) {
      mobileButton.setAttribute("data-i18n", "main.sign_in");
      mobileButton.textContent = translateText("main.sign_in");
    }
    avatarEl?.classList.add("hidden");
    personIconEl?.classList.remove("hidden");
    emailBadgeEl?.classList.add("hidden");
    if (signInTextEl) {
      signInTextEl.className = "text-xs font-bold tracking-widest";
      signInTextEl.setAttribute("data-i18n", "main.sign_in");
      signInTextEl.textContent = translateText("main.sign_in");
    }
    // Restore border when showing signin state
    button?.classList.add("border", "border-white/20");
  };

  const profilePictureUrl =
    userMeResponse !== false
      ? userMeResponse.user.profilePictureUrl
      : undefined;
  if (profilePictureUrl) {
    showAvatar(
      profilePictureUrl,
      userMeResponse !== false
        ? (userMeResponse.user.displayName ?? "OpenBack profile")
        : "OpenBack profile",
      userMeResponse !== false
        ? userMeResponse.user.displayName?.trim()
        : undefined,
    );
    return;
  }

  const discord =
    userMeResponse !== false ? userMeResponse.user.discord : undefined;
  if (discord && avatarEl) {
    const avatarAlt = translateText("main.user_avatar_alt", {
      username: discord.username,
    });
    const url = getDiscordAvatarUrl(discord);
    if (url) {
      showAvatar(
        url,
        avatarAlt,
        userMeResponse !== false
          ? (userMeResponse.user.displayName?.trim() ?? discord.username)
          : discord.username,
      );
      return;
    }
  }

  // Steam is a first-class logged-in identity (parity with Discord). A cached
  // avatar renders like the Discord avatar; without one — the summaries fetch
  // failed or hasn't populated yet — fall back to the logged-in person icon,
  // never the signed-out prompt (the bug that made Steam desktop players look
  // like guests). Placed after Discord so a future linked account still
  // prefers the Discord avatar.
  const steam =
    userMeResponse !== false ? userMeResponse.user.steam : undefined;
  if (steam) {
    if (steam.avatarUrl && avatarEl) {
      const avatarAlt = translateText("main.user_avatar_alt", {
        username:
          steam.personaName ?? translateText("steam_user_header.default_name"),
      });
      showAvatar(
        steam.avatarUrl,
        avatarAlt,
        userMeResponse !== false
          ? (userMeResponse.user.displayName?.trim() ??
              steam.personaName ??
              undefined)
          : undefined,
      );
    } else {
      showOpenBackAvatar();
    }
    return;
  }

  const email =
    userMeResponse !== false ? userMeResponse.user.email : undefined;
  if (email) {
    showOpenBackAvatar();
    return;
  }

  // Google logins have no avatar; show the same person/email badge as magic-link.
  const google =
    userMeResponse !== false ? userMeResponse.user.google : undefined;
  if (google) {
    showOpenBackAvatar();
    return;
  }

  // A linked identity that reached here rendered nothing rich (e.g. a Discord
  // account whose avatar URL didn't resolve, or a missing avatar element): the
  // user is still authenticated, so show the logged-in person icon. Only a
  // session with no linked identity at all gets the sign-in prompt.
  if (userMeResponse !== false && hasLinkedIdentity(userMeResponse.user)) {
    showOpenBackAvatar();
    return;
  }

  showSignIn();
}
