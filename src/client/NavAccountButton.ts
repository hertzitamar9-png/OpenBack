import { UserMeResponse } from "../core/ApiSchemas";
import { assetUrl } from "../core/AssetUrls";
import { hasLinkedIdentity } from "./AccountIdentity";
import { getDiscordAvatarUrl, translateText } from "./Utils";

export function finishAccountNavLoading(): void {
  document
    .querySelectorAll("[data-account-spinner]")
    .forEach((el) => el.classList.add("hidden"));
}

// Renders the persistent top-nav account button from the resolved /users/@me
// response: a linked identity shows its avatar/badge, everything else shows the
// signed-out prompt. Extracted from Main.ts so the identity precedence — which
// now includes Steam — is unit-testable in jsdom.
//
// <nav-account-menu> renders one trigger in the desktop nav and one in the
// mobile top bar, so every element is looked up through the `data-account-*`
// hooks *within each trigger* rather than by id. Driving the ids alone left the
// mobile trigger spinning forever, because only the desktop pill carries them.
//
// The most recent /users/@me the nav button rendered. Consumers that need
// account state outside the render path read it through
// latestUserMeResponse() rather than refetching.
let lastUserMeResponse: UserMeResponse | false | null = null;

// The signed-in look: which image to show and the name to label it with.
// `null` means "show the signed-out prompt".
type AvatarState = {
  src: string;
  alt: string;
  displayName?: string;
};

const openBackAvatar = (displayName?: string): AvatarState => ({
  src: assetUrl("images/OpenBackMark512.png"),
  alt: "OpenBack profile",
  displayName,
});

// Identity precedence, resolved once per update and then applied to every
// trigger. Discord wins over Steam so a player who linked both keeps the
// richer avatar.
function resolveAvatar(
  userMeResponse: UserMeResponse | false,
): AvatarState | null {
  if (userMeResponse === false) return null;
  const user = userMeResponse.user;
  const displayName = user.displayName?.trim();

  if (user.profilePictureUrl) {
    return {
      src: user.profilePictureUrl,
      alt: user.displayName ?? "OpenBack profile",
      displayName,
    };
  }

  if (user.discord) {
    const url = getDiscordAvatarUrl(user.discord);
    if (url) {
      return {
        src: url,
        alt: translateText("main.user_avatar_alt", {
          username: user.discord.username,
        }),
        displayName: displayName ?? user.discord.username,
      };
    }
  }

  // Steam is a first-class logged-in identity (parity with Discord). Without a
  // cached avatar — the summaries fetch failed or has not populated yet — fall
  // back to the logged-in mark, never the signed-out prompt (the bug that made
  // Steam desktop players look like guests).
  if (user.steam) {
    if (user.steam.avatarUrl) {
      return {
        src: user.steam.avatarUrl,
        alt: translateText("main.user_avatar_alt", {
          username:
            user.steam.personaName ??
            translateText("steam_user_header.default_name"),
        }),
        displayName: displayName ?? user.steam.personaName ?? undefined,
      };
    }
    return openBackAvatar(displayName);
  }

  // Magic-link and Google logins have no avatar of their own, and any other
  // linked identity that produced nothing rich is still authenticated. Only a
  // session with no linked identity at all gets the sign-in prompt.
  if (user.email || user.google || hasLinkedIdentity(user)) {
    return openBackAvatar(displayName);
  }

  return null;
}

function applyToTrigger(
  trigger: HTMLElement,
  avatar: AvatarState | null,
): void {
  const avatarEl = trigger.querySelector<
    HTMLImageElement & { _navToken?: symbol }
  >("[data-account-avatar]");
  const personIconEl = trigger.querySelector("[data-account-person-icon]");
  const emailBadgeEl = trigger.querySelector("[data-account-email-badge]");
  const signInTextEl = trigger.querySelector<HTMLElement>(
    "[data-account-signin-text]",
  );
  // The mobile trigger keeps the element (so this updater has one uniform
  // shape) but there the icon alone is the affordance, so it never shows text.
  const showsText =
    signInTextEl !== null &&
    !signInTextEl.hasAttribute("data-account-signin-text-silent");
  const bordered = trigger.hasAttribute("data-account-border");

  // Unique token for this update call, per trigger.
  const navToken = Symbol();
  if (avatarEl) avatarEl._navToken = navToken;

  if (avatar === null || avatarEl === null) {
    avatarEl?.classList.add("hidden");
    personIconEl?.classList.remove("hidden");
    emailBadgeEl?.classList.add("hidden");
    if (signInTextEl) {
      if (showsText) {
        signInTextEl.className = "text-xs font-bold tracking-widest";
        signInTextEl.setAttribute("data-i18n", "main.sign_in");
        signInTextEl.textContent = translateText("main.sign_in");
      } else {
        signInTextEl.classList.add("hidden");
      }
    }
    // Restore the pill border when showing the signed-out state.
    if (bordered) trigger.classList.add("border", "border-white/20");
    return;
  }

  avatarEl.alt = avatar.alt;
  // If the avatar fails to load (bad URL / CDN issue / offline), fall back to
  // the provider-neutral logged-in mark rather than leaving a broken image or a
  // mismatched default (the button is used by Discord and Steam).
  avatarEl.onerror = () => {
    if (avatarEl._navToken !== navToken) return;
    avatarEl.onerror = null;
    avatarEl.src = assetUrl("images/OpenBackMark512.png");
  };
  avatarEl.onload = () => {
    if (avatarEl._navToken !== navToken) return;
    avatarEl.onerror = null;
  };
  avatarEl.src = avatar.src;
  avatarEl.classList.remove("hidden");
  personIconEl?.classList.add("hidden");
  emailBadgeEl?.classList.add("hidden");

  if (signInTextEl) {
    if (showsText && avatar.displayName) {
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
      name.textContent = avatar.displayName;
      signInTextEl.append(label, name);
    } else {
      signInTextEl.classList.add("hidden");
    }
  }
  if (bordered) trigger.classList.remove("border", "border-white/20");
}

export function updateAccountNavButton(userMeResponse: UserMeResponse | false) {
  lastUserMeResponse = userMeResponse;

  const triggers = Array.from(
    document.querySelectorAll<HTMLElement>("[data-account-trigger]"),
  );
  // The sidebar entry is a plain labelled row, not a trigger with icons.
  const sidebarButton = document.getElementById("mobile-nav-account-button");
  if (triggers.length === 0 && sidebarButton === null) return;

  // Auth state is resolved, so no trigger shows the loading spinner any more.
  finishAccountNavLoading();

  const avatar = resolveAvatar(userMeResponse);

  if (sidebarButton) {
    if (avatar === null) {
      sidebarButton.setAttribute("data-i18n", "main.sign_in");
      sidebarButton.textContent = translateText("main.sign_in");
    } else {
      sidebarButton.removeAttribute("data-i18n");
      sidebarButton.textContent = avatar.displayName
        ? `${translateText("main.profile")} - ${avatar.displayName}`
        : translateText("main.profile");
    }
  }

  triggers.forEach((trigger) => applyToTrigger(trigger, avatar));
}

export function latestUserMeResponse(): UserMeResponse | false | null {
  return lastUserMeResponse;
}
