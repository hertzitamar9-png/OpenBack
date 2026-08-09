# Profile Pictures and Persistent Death Media Design

**Date:** 2026-08-09

**Status:** Approved requirements

**Creator:** **frootz jhklphy**

## Objective

Give every OpenBack account a persistent optional profile picture and restore the instructional death media flow. A player's chosen picture follows their signed-in email account across devices. Players without a custom picture use the canonical circular OB logo. The picture appears beside the player's name anywhere identity is presented, including the account header, public profile, friends, clans, in-game leaderboard, match history, and ranked leaderboards.

On a signed-in account's first recorded death, the death modal shows the existing "Need Help?" tutorial video. The server permanently records that the account saw it. Every later death shows `OpenBackSocialPreview.png` in the same responsive 16:9 media frame. A guest sees the tutorial once per open browser session; closing and reopening OpenBack resets that guest state.

## Profile Picture Storage

- The account profile exposes an optional `profilePictureUrl`; absence always resolves visually to `images/OpenBackMark512.png`.
- The browser decodes, center-crops, and resizes an uploaded PNG, JPEG, or WebP to a 256 by 256 WebP before upload.
- The encoded upload is capped at 128 KiB after conversion. Animated images and SVG uploads are rejected.
- Production stores image bytes in a dedicated PostgreSQL table keyed by stable public player ID. This avoids rewriting or inflating the existing complete auth-state JSON document.
- Development without PostgreSQL stores the processed data URL in the existing local persistent auth snapshot.
- Public images are served by a same-origin endpoint with immutable revision URLs, strict image MIME types, nosniff, and cache headers.
- Replacing or deleting a picture changes the revision. Deleting restores the OB fallback without copying the logo into every account.

## Profile Editor

The account profile editor places a circular profile-picture control below the banner preview and alongside the existing name, biography, and banner settings. It provides Select image, Replace, and Remove actions, a local preview, validation errors, and a Save Profile flow consistent with existing OpenBack controls. The crop is automatic and centered; no separate crop dialog is introduced.

## Identity Rendering

A shared `player-avatar` component owns loading, circular clipping, fallback behavior, accessible text, and size variants. All identity surfaces use it instead of implementing image fallback independently. A broken or unavailable custom image immediately falls back to the bundled OB logo.

The in-game lobby/start payload carries a revisioned profile picture URL for human account players. This avoids one profile API request per leaderboard row and ensures every client sees the same identity image immediately. Bots and nations use the OB fallback unless an existing flag-specific UI deliberately remains the primary icon.

Profile pictures are cosmetic only. They never enter deterministic simulation state, turn hashes, replays, or gameplay decisions.

## Death Media State

- `deathTutorialSeen` is persisted on the server account and returned by `/users/@me`.
- An authenticated endpoint atomically marks it true when the first-death modal selects the tutorial. The operation is idempotent.
- The client selects media before opening the modal. Signed-in accounts use the server value; guests use a module/session-memory boolean that is never written to localStorage or sessionStorage.
- The media decision is independent of match type and device.
- Wins, cancelled matches, and spectating without having died do not consume the first-death tutorial.
- The video iframe exists only while visible and is cleared when the modal closes.
- The later-death image uses `OpenBackSocialPreview.png`, `object-fit: cover`, and the exact same 16:9 container as the video.
- If the account API is temporarily unavailable, the modal still opens: it uses the current session's guest-style decision and retries the persistent mark without blocking gameplay.

## Security and Privacy

- Validate decoded bytes, declared MIME type, dimensions, and maximum size server-side.
- Never fetch remote image URLs supplied by players.
- Serve only bytes uploaded through the validated endpoint.
- Profile pictures are public profile information and are covered by the account deletion path; deleting an account deletes its stored image.
- The privacy policy describes public profile pictures and deletion behavior.

## Tests and Acceptance

- Upload validation accepts processed PNG/JPEG/WebP input and rejects SVG, animation, malformed data, and oversized bytes.
- Replacing and deleting an image updates the revision and fallback.
- Account deletion removes production image bytes.
- The OB logo renders for missing and failed custom images.
- Every named identity surface renders the shared avatar component.
- Lobby and game-start payloads include profile picture URLs without adding them to deterministic state.
- First signed-in death shows the video and persists the flag; later deaths and other devices show the image.
- Guests see the video once per page lifetime and see the image on later deaths; a reload resets the guest decision.
- Video and image frames have identical 16:9 dimensions on desktop and mobile.
- The existing profile-spinner regression remains fixed and the spinner element is removed from the steady-state Profile button.
