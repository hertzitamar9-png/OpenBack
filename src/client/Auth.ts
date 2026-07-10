import { decodeJwt } from "jose";
import { UserSettings } from "src/core/game/UserSettings";
import { z } from "zod";
import { TokenPayload, TokenPayloadSchema } from "../core/ApiSchemas";
import { base64urlToUuid } from "../core/Base64";
import { getApiBase, getAudience } from "./Api";
import { crazyGamesSDK } from "./CrazyGamesSDK";
import { generateCryptoRandomUUID } from "./Utils";

export type UserAuth = { jwt: string; claims: TokenPayload } | false;

const PERSISTENT_ID_KEY = "player_persistent_id";

let __jwt: string | null = null;
let __refreshPromise: Promise<void> | null = null;
let __expiresAt: number = 0;

export function googleLogin() {
  const redirectUri = encodeURIComponent(window.location.href);
  window.location.href = `${getApiBase()}/auth/google?state=${redirectUri}`;
}

// Email sign-in: request a 6-digit code, then verify it to obtain a session.
export async function requestLoginCode(
  email: string,
): Promise<{ ok: boolean; devCode?: string }> {
  try {
    const response = await fetch(`${getApiBase()}/auth/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    if (!response.ok) return { ok: false };
    const json = await response.json();
    return { ok: true, devCode: json.devCode };
  } catch (e) {
    console.error("requestLoginCode failed", e);
    return { ok: false };
  }
}

export async function verifyLoginCode(
  email: string,
  code: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, code }),
    });
    if (!response.ok) return false;
    const json = await response.json();
    const { jwt, expiresIn } = json;
    __expiresAt = Date.now() + expiresIn * 1000;
    __jwt = jwt;
    return true;
  } catch (e) {
    console.error("verifyLoginCode failed", e);
    return false;
  }
}

export async function tempTokenLogin(token: string): Promise<string | null> {
  const response = await fetch(
    `${getApiBase()}/auth/login/token?login-token=${token}`,
    {
      credentials: "include",
    },
  );
  if (response.status !== 200) {
    console.error("Token login failed", response);
    return null;
  }
  const json = await response.json();
  const { email } = json;
  return email;
}

export async function getAuthHeader(): Promise<string> {
  const userAuthResult = await userAuth();
  if (!userAuthResult) return "";
  const { jwt } = userAuthResult;
  return `Bearer ${jwt}`;
}

export async function logOut(allSessions: boolean = false): Promise<boolean> {
  try {
    const response = await fetch(
      getApiBase() + (allSessions ? "/auth/revoke" : "/auth/logout"),
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (response.ok === false) {
      console.error("Logout failed", response);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Logout failed", e);
    return false;
  } finally {
    __jwt = null;
    localStorage.removeItem(PERSISTENT_ID_KEY);
    new UserSettings().clearFlag();
    new UserSettings().setSelectedPatternName(undefined);
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const userAuthResult = await userAuth();
  return userAuthResult !== false;
}

export async function userAuth(
  shouldRefresh: boolean = true,
): Promise<UserAuth> {
  try {
    const jwt = __jwt;
    if (!jwt) {
      if (!shouldRefresh) {
        console.warn("No JWT found and shouldRefresh is false");
        return false;
      }
      console.log("No JWT found");
      await refreshJwt();
      return userAuth(false);
    }

    // Verify the JWT (requires browser support)
    // const jwks = createRemoteJWKSet(
    //   new URL(getApiBase() + "/.well-known/jwks.json"),
    // );
    // const { payload, protectedHeader } = await jwtVerify(token, jwks, {
    //   issuer: getApiBase(),
    //   audience: getAudience(),
    // });

    const payload = decodeJwt(jwt);
    const { iss, aud } = payload;

    // OpenBack is self-contained: the game server is the token issuer and the
    // SPA shares its origin, so iss/aud should equal the auth origin. If they
    // drift (e.g. behind a proxy) we only warn instead of forcing a logout,
    // since the server still validates tokens on every game join.
    const expected = getApiBase();
    if (iss && iss !== expected) {
      console.warn(`JWT iss "${iss}" != expected "${expected}"`);
    }
    const myAud = getAudience();
    if (myAud && myAud !== "localhost" && aud && aud !== myAud) {
      console.warn(`JWT aud "${aud}" != expected "${myAud}"`);
    }
    if (Date.now() >= __expiresAt - 3 * 60 * 1000) {
      console.log("jwt expired or about to expire");
      if (!shouldRefresh) {
        console.error("jwt expired and shouldRefresh is false");
        return false;
      }
      await refreshJwt();

      // Try to get login info again after refreshing
      return userAuth(false);
    }

    const result = TokenPayloadSchema.safeParse(payload);
    if (!result.success) {
      const error = z.prettifyError(result.error);
      console.error("Invalid payload", error);
      return false;
    }

    const claims = result.data;
    return { jwt, claims };
  } catch (e) {
    console.error("isLoggedIn failed", e);
    return false;
  }
}

async function refreshJwt(): Promise<void> {
  if (__refreshPromise) {
    return __refreshPromise;
  }
  __refreshPromise = doRefreshJwt();
  try {
    await __refreshPromise;
  } finally {
    __refreshPromise = null;
  }
}

async function doRefreshJwt(): Promise<void> {
  if (crazyGamesSDK.isOnCrazyGames()) {
    const token = await crazyGamesSDK.getUserToken();
    if (token) {
      // Signed-in CrazyGames account: exchange their token for our session.
      // No CrazyGames account / not signed in falls through to the guest flow
      // below.
      return doCrazyGamesLogin(token);
    }
  }
  try {
    console.log("Refreshing jwt");
    const response = await fetch(getApiBase() + "/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (response.status !== 200) {
      console.error("Refresh failed", response);
      logOut();
      return;
    }
    const json = await response.json();
    const { jwt, expiresIn } = json;
    __expiresAt = Date.now() + expiresIn * 1000;
    console.log("Refresh succeeded");
    __jwt = jwt;
  } catch (e) {
    console.error("Refresh failed", e);
    // if server unreachable, just clear jwt
    __jwt = null;
    return;
  }
}

// Exchange a CrazyGames user token for our session. On CrazyGames the refresh
// cookie isn't usable (SameSite=Lax, cross-site iframe), so we re-exchange on
// expiry instead of hitting /auth/refresh.
async function doCrazyGamesLogin(token: string): Promise<void> {
  try {
    console.log("Logging in with CrazyGames");
    const response = await fetch(getApiBase() + "/auth/crazygames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (response.status !== 200) {
      console.error("CrazyGames login failed", response);
      __jwt = null;
      return;
    }
    const json = await response.json();
    const { jwt, expiresIn } = json;
    __expiresAt = Date.now() + expiresIn * 1000;
    console.log("CrazyGames login succeeded");
    __jwt = jwt;
  } catch (e) {
    console.error("CrazyGames login failed", e);
    __jwt = null;
  }
}

// Called when the CrazyGames auth state changes mid-session (e.g. the player
// signs in): drop the cached session so userAuth() re-exchanges the new token.
// Single-flight: Main's auth listener and the account modal's sign-in handler
// can both react to the same sign-in; sharing one exchange keeps them from
// racing on __jwt. Any refresh already in flight is allowed to settle first so
// its stale result can't satisfy the reauth.
let __reauthPromise: Promise<UserAuth> | null = null;
export async function reauthAfterCrazyGamesChange(): Promise<UserAuth> {
  __reauthPromise ??= (async () => {
    try {
      if (__refreshPromise) {
        await __refreshPromise.catch(() => {});
      }
      __jwt = null;
      __expiresAt = 0;
      return await userAuth();
    } finally {
      __reauthPromise = null;
    }
  })();
  return __reauthPromise;
}

export async function sendMagicLink(email: string): Promise<boolean> {
  try {
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}/auth/magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        redirectDomain: window.location.origin,
        email: email,
      }),
    });

    if (response.ok) {
      return true;
    } else {
      console.error(
        "Failed to send recovery email:",
        response.status,
        response.statusText,
      );
      return false;
    }
  } catch (error) {
    console.error("Error sending recovery email:", error);
    return false;
  }
}

// WARNING: DO NOT EXPOSE THIS ID
export async function getPlayToken(): Promise<string> {
  const result = await userAuth();
  if (result !== false) return result.jwt;
  return getPersistentIDFromLocalStorage();
}

// WARNING: DO NOT EXPOSE THIS ID
export function getPersistentID(): string {
  const jwt = __jwt;
  if (!jwt) return getPersistentIDFromLocalStorage();
  const payload = decodeJwt(jwt);
  const sub = payload.sub;
  if (!sub) return getPersistentIDFromLocalStorage();
  return base64urlToUuid(sub);
}

// WARNING: DO NOT EXPOSE THIS ID
function getPersistentIDFromLocalStorage(): string {
  // Try to get existing localStorage
  const value = localStorage.getItem(PERSISTENT_ID_KEY);
  if (value) return value;

  // If no localStorage exists, create new ID and set localStorage
  const newID = generateCryptoRandomUUID();
  localStorage.setItem(PERSISTENT_ID_KEY, newID);

  return newID;
}
