# Profile Pictures and Persistent Death Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent account profile pictures with an OB-logo fallback and make the first account death show the tutorial once before all later deaths show the battle artwork.

**Architecture:** A dedicated same-origin profile-image API stores validated 256 by 256 WebP bytes separately from the auth snapshot, while schemas carry revisioned URLs to identity surfaces. A shared avatar component supplies one fallback implementation. Death tutorial state is an idempotent account flag, with page-memory fallback for guests.

**Tech Stack:** TypeScript, Express, PostgreSQL `bytea`, Zod, Lit, Canvas image preprocessing, Vitest, Playwright-compatible DOM tests.

## Global Constraints

- Preserve deterministic simulation, replay data, and multiplayer turn hashes.
- Custom uploads accept PNG, JPEG, or WebP only and must be converted to 256 by 256 WebP at no more than 128 KiB.
- Missing or failed images use `resources/images/OpenBackMark512.png`.
- Guest first-death state lasts only for the current page lifetime.
- Every user-facing change adds an OpenBack release entry credited to **frootz jhklphy**.
- Preserve AGPL, corresponding-source, asset-license, copyright, and contributor notices.

## File Structure

- `src/server/auth/ProfileImageStore.ts`: validated profile-image persistence and revision URLs.
- `src/client/ProfileImage.ts`: browser crop/resize/encode helper.
- `src/client/components/PlayerAvatar.ts`: shared circular avatar with OB fallback.
- `src/server/auth/AuthServer.ts`: account fields, image routes, death-tutorial endpoint, response propagation.
- `src/core/ApiSchemas.ts` and `src/core/ClanApiSchemas.ts`: public profile/avatar/death-state contracts.
- `src/core/Schemas.ts`: lobby and game-start avatar URL fields only, excluded from simulation checksums.
- `src/client/AccountModal.ts`, identity list components, profile/clan/ranked views, and `src/client/hud/layers/Leaderboard.ts`: avatar presentation.
- `src/client/hud/layers/WinModal.ts`: account-aware tutorial/image selection.

---

### Task 1: Profile Image Validation and Storage

**Files:**

- Create: `src/server/auth/ProfileImageStore.ts`
- Create: `tests/server/ProfileImageStore.test.ts`
- Modify: `src/server/auth/AuthServer.ts`

**Interfaces:**

- Produces: `validateProfileImageDataUrl(value: string): { mimeType: "image/webp"; bytes: Buffer }`
- Produces: `ProfileImageStore.get(publicId: string)`, `.put(publicId, image)`, `.delete(publicId)`, and `.url(publicId, revision)`.

- [ ] **Step 1: Write failing validation and persistence tests**

```ts
it("rejects profile images larger than 128 KiB", () => {
  const value = `data:image/webp;base64,${Buffer.alloc(128 * 1024 + 1).toString("base64")}`;
  expect(() => validateProfileImageDataUrl(value)).toThrow(
    "profile_image_too_large",
  );
});

it("increments the revision when an image is replaced", async () => {
  const store = createMemoryProfileImageStore();
  expect((await store.put("p1", WEBP_A)).revision).toBe(1);
  expect((await store.put("p1", WEBP_B)).revision).toBe(2);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npx vitest run tests/server/ProfileImageStore.test.ts`

Expected: failure because the module and validation functions do not exist.

- [ ] **Step 3: Implement byte validation and memory/PostgreSQL stores**

```ts
export const MAX_PROFILE_IMAGE_BYTES = 128 * 1024;

export function validateProfileImageDataUrl(value: string): ProfileImage {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new ProfileImageError("invalid_profile_image");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length === 0 || bytes.length > MAX_PROFILE_IMAGE_BYTES) {
    throw new ProfileImageError("profile_image_too_large");
  }
  if (!bytes.subarray(0, 12).equals(expectedWebpHeader(bytes))) {
    throw new ProfileImageError("invalid_profile_image");
  }
  return { mimeType: "image/webp", bytes };
}
```

Create `openback_profile_images(public_id text primary key, mime_type text not null, image_bytes bytea not null, revision integer not null, updated_at timestamptz not null)` lazily beside the existing auth tables. The development implementation keeps bytes in a map restored through a separate optional profile-image snapshot field.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/server/ProfileImageStore.test.ts`

Expected: all profile-image store tests pass.

- [ ] **Step 5: Commit the storage boundary**

```powershell
git add src/server/auth/ProfileImageStore.ts src/server/auth/AuthServer.ts tests/server/ProfileImageStore.test.ts
git commit -m "Add persistent profile image storage"
```

### Task 2: Account and Public API Contracts

**Files:**

- Modify: `src/core/ApiSchemas.ts`
- Modify: `src/core/ClanApiSchemas.ts`
- Modify: `src/server/auth/AuthServer.ts`
- Modify: `src/client/Api.ts`
- Test: `tests/ApiSchemas.test.ts`
- Test: `tests/server/AuthAccountFlow.test.ts`

**Interfaces:**

- Produces: optional `profilePictureUrl` on user, public profile, friend, clan, and ranked identity responses.
- Produces: `deathTutorialSeen: boolean` on `/users/@me`.
- Produces: `uploadMyProfilePicture(dataUrl)`, `deleteMyProfilePicture()`, and `markDeathTutorialSeen()`.

- [ ] **Step 1: Write failing schema and route tests**

```ts
expect(UserMeResponseSchema.parse(response).user).toMatchObject({
  profilePictureUrl: "/profile-images/p1?v=2",
  deathTutorialSeen: true,
});

await request(app)
  .post("/users/@me/death-tutorial-seen")
  .set(authHeader)
  .expect(200, { deathTutorialSeen: true });
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/ApiSchemas.test.ts tests/server/AuthAccountFlow.test.ts`

Expected: schema strips or rejects the new fields and the endpoint returns 404.

- [ ] **Step 3: Add account state and endpoints**

Add `profilePictureRevision?: number` and `deathTutorialSeen?: boolean` to `StoredUser`. Return `profilePictureUrl` only when a custom image exists; UI fallback remains client-owned. Add authenticated `PUT /users/@me/profile-picture`, `DELETE /users/@me/profile-picture`, and idempotent `POST /users/@me/death-tutorial-seen`. Add public `GET /profile-images/:publicId` with `Content-Type: image/webp`, `X-Content-Type-Options: nosniff`, revision-aware immutable caching, and 404 for absent images.

- [ ] **Step 4: Propagate URLs to public identity responses**

Extend friend entries, clan members/requests/bans, public player profiles, and ranked leaderboard entries from the same `profilePictureUrlFor(user)` helper. Do not expose email addresses.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/ApiSchemas.test.ts tests/server/AuthAccountFlow.test.ts tests/server/ProfileImageStore.test.ts`

Expected: routes, schemas, caching, and authorization tests pass.

- [ ] **Step 6: Commit API contracts**

```powershell
git add src/core/ApiSchemas.ts src/core/ClanApiSchemas.ts src/server/auth/AuthServer.ts src/client/Api.ts tests/ApiSchemas.test.ts tests/server/AuthAccountFlow.test.ts
git commit -m "Expose account profile pictures and death tutorial state"
```

### Task 3: Browser Image Processing and Profile Editor

**Files:**

- Create: `src/client/ProfileImage.ts`
- Modify: `src/client/AccountModal.ts`
- Modify: `resources/lang/en.json`
- Test: `tests/client/ProfileImage.test.ts`
- Test: `tests/client/AccountModal.test.ts`

**Interfaces:**

- Produces: `prepareProfileImage(file: File): Promise<string>` returning a 256 by 256 WebP data URL no larger than 128 KiB.

- [ ] **Step 1: Write failing processing tests**

```ts
it("center-crops a wide image into a 256px square WebP", async () => {
  const result = await prepareProfileImage(widePngFixture);
  expect(result).toMatch(/^data:image\/webp;base64,/);
  expect(await decodedDimensions(result)).toEqual({ width: 256, height: 256 });
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `npx vitest run tests/client/ProfileImage.test.ts tests/client/AccountModal.test.ts`

Expected: missing processing helper and missing profile-picture control.

- [ ] **Step 3: Implement deterministic center crop and bounded encoding**

Decode with `createImageBitmap`, draw the centered square source rectangle into an `OffscreenCanvas` or normal canvas, and reduce WebP quality from `0.9` to `0.65` in fixed steps until under the byte cap. Reject unsupported MIME types before decoding and always close the bitmap.

- [ ] **Step 4: Add the profile-picture editor**

Place the circular preview below the banner content and above text fields. Bind Select/Replace to a hidden file input, Remove to the delete endpoint, and Save Profile to upload a pending processed picture before dispatching `openback-profile-updated` with the returned URL.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/ProfileImage.test.ts tests/client/AccountModal.test.ts`

Expected: conversion, error messages, save, replace, and remove tests pass.

- [ ] **Step 6: Commit the editor**

```powershell
git add src/client/ProfileImage.ts src/client/AccountModal.ts resources/lang/en.json tests/client/ProfileImage.test.ts tests/client/AccountModal.test.ts
git commit -m "Add optional profile picture editor"
```

### Task 4: Shared Avatar and Header Spinner Removal

**Files:**

- Create: `src/client/components/PlayerAvatar.ts`
- Modify: `src/client/components/DesktopNavBar.ts`
- Modify: `src/client/Main.ts`
- Modify: `src/client/NavAccountButton.ts`
- Test: `tests/client/components/PlayerAvatar.test.ts`
- Test: `tests/client/NavAccountButton.test.ts`

**Interfaces:**

- Produces: `<player-avatar .src .name size="xs|sm|md|lg">`.

- [ ] **Step 1: Write failing fallback and header tests**

```ts
it("falls back to the OB logo when the custom image fails", async () => {
  avatar.src = "/profile-images/broken?v=1";
  document.body.append(avatar);
  avatar.querySelector("img")!.dispatchEvent(new Event("error"));
  expect(avatar.querySelector("img")!.src).toContain("OpenBackMark512");
});

it("renders the profile avatar without a loading spinner after auth", () => {
  updateAccountNavButton(userMeWithPicture);
  expect(document.querySelector("#nav-account-loading-spinner")).toBeNull();
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/components/PlayerAvatar.test.ts tests/client/NavAccountButton.test.ts`

Expected: missing component and persistent spinner markup.

- [ ] **Step 3: Implement the shared avatar and replace header markup**

The component renders one circular `<img>`, swaps to `assetUrl("images/OpenBackMark512.png")` once on error, and uses fixed size classes. Remove `nav-account-loading-spinner` from `DesktopNavBar`; authentication resolution updates the avatar source and two-line profile label directly.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/components/PlayerAvatar.test.ts tests/client/NavAccountButton.test.ts`

Expected: fallback and resolved header behavior pass with no spinner.

- [ ] **Step 5: Commit shared avatar behavior**

```powershell
git add src/client/components/PlayerAvatar.ts src/client/components/DesktopNavBar.ts src/client/Main.ts src/client/NavAccountButton.ts tests/client/components/PlayerAvatar.test.ts tests/client/NavAccountButton.test.ts
git commit -m "Show profile pictures in the account header"
```

### Task 5: Identity Surface Coverage

**Files:**

- Modify: `src/client/PlayerProfileModal.ts`
- Modify: `src/client/components/FriendsList.ts`
- Modify: `src/client/components/clan/ClanMembersView.ts`
- Modify: `src/client/components/baseComponents/ranking/PlayerRow.ts`
- Modify: other clan request/ban rows that display player names.
- Test: `tests/client/ProfileAvatarCoverage.test.ts`

**Interfaces:**

- Consumes: `profilePictureUrl?: string` and `<player-avatar>`.

- [ ] **Step 1: Write a failing coverage test using real rendered components**

```ts
expect(profileModal.querySelector("player-avatar")).not.toBeNull();
expect(friendsList.querySelector("player-avatar")).not.toBeNull();
expect(clanMembers.querySelector("player-avatar")).not.toBeNull();
expect(rankedRow.querySelector("player-avatar")).not.toBeNull();
```

- [ ] **Step 2: Run the coverage test and confirm RED**

Run: `npx vitest run tests/client/ProfileAvatarCoverage.test.ts`

Expected: current identity surfaces render names/flags without shared avatars.

- [ ] **Step 3: Add avatars beside names without removing existing flags/status**

Use `xs` for dense clan and ranked rows, `sm` for friends, and `lg` in profile headers. Keep winner, eliminated, verified, clan-role, and online indicators positioned relative to their existing containers.

- [ ] **Step 4: Run the coverage test and confirm GREEN**

Run: `npx vitest run tests/client/ProfileAvatarCoverage.test.ts`

Expected: every named account surface renders the same avatar component.

- [ ] **Step 5: Commit identity coverage**

```powershell
git add src/client/PlayerProfileModal.ts src/client/components/FriendsList.ts src/client/components/clan src/client/components/baseComponents/ranking/PlayerRow.ts tests/client/ProfileAvatarCoverage.test.ts
git commit -m "Show profile pictures across player identity views"
```

### Task 6: In-Game Leaderboard Avatar Propagation

**Files:**

- Modify: `src/core/Schemas.ts`
- Modify: `src/server/GameServer.ts`
- Modify: `src/client/view/GameView.ts`
- Modify: `src/client/hud/layers/Leaderboard.ts`
- Test: `tests/Schemas.test.ts`
- Test: `tests/client/Leaderboard.test.ts`

**Interfaces:**

- Produces: `profilePictureUrl?: string` on `ClientInfo` and `PlayerSchema` presentation data.
- Produces: `GameView.profilePictureUrlForPlayer(player): string | null`.

- [ ] **Step 1: Write failing wire and leaderboard tests**

```ts
expect(GameStartInfoSchema.parse(start).players[0].profilePictureUrl).toBe(
  "/profile-images/p1?v=3",
);
expect(renderedLeaderboard.querySelector("player-avatar")).not.toBeNull();
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/Schemas.test.ts tests/client/Leaderboard.test.ts`

Expected: wire schema removes the URL and leaderboard row has no avatar.

- [ ] **Step 3: Stamp presentation URLs server-side and render them**

Resolve the account URL during lobby authentication, copy it through game-start presentation fields, index it by client ID in `GameView`, and render it next to the leaderboard name. Exclude it from deterministic player state serialization and checksum inputs.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/Schemas.test.ts tests/client/Leaderboard.test.ts tests/client/view/GameView.test.ts`

Expected: all clients receive and render the URL while deterministic tests remain unchanged.

- [ ] **Step 5: Commit in-game propagation**

```powershell
git add src/core/Schemas.ts src/server/GameServer.ts src/client/view/GameView.ts src/client/hud/layers/Leaderboard.ts tests/Schemas.test.ts tests/client/Leaderboard.test.ts tests/client/view/GameView.test.ts
git commit -m "Show account avatars in live leaderboards"
```

### Task 7: Persistent First-Death Media

**Files:**

- Modify: `src/client/hud/layers/WinModal.ts`
- Modify: `resources/lang/en.json`
- Test: `tests/client/graphics/layers/WinModal.test.ts`
- Test: `tests/server/AuthAccountFlow.test.ts`

**Interfaces:**

- Consumes: `deathTutorialSeen` and `markDeathTutorialSeen()`.
- Produces: page-memory `guestDeathTutorialSeen` and media selection `"tutorial" | "battle"`.

- [ ] **Step 1: Write failing account and guest lifecycle tests**

```ts
it("shows the tutorial once for an account then the battle image", async () => {
  me.user.deathTutorialSeen = false;
  await modal.showDeath();
  expect(modal.querySelector("iframe")).not.toBeNull();
  modal.hide();
  await modal.showDeath();
  expect(
    modal.querySelector('img[src*="OpenBackSocialPreview"]'),
  ).not.toBeNull();
});

it("resets guest tutorial state only when the page module reloads", async () => {
  await firstGuestModal.showDeath();
  await secondGuestModal.showDeath();
  expect(firstGuestModal.media).toBe("tutorial");
  expect(secondGuestModal.media).toBe("battle");
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/graphics/layers/WinModal.test.ts tests/server/AuthAccountFlow.test.ts`

Expected: the current modal contains neither tutorial nor battle media and the server has no seen flag.

- [ ] **Step 3: Restore the shared 16:9 media frame**

Render the tutorial iframe only for `media === "tutorial"`. Render `assetUrl("images/OpenBackSocialPreview.png")` with `object-cover` for `media === "battle"`. Both use the same `aspect-video w-full overflow-hidden rounded-sm` container. Clear iframe `src` when hidden.

- [ ] **Step 4: Implement persistent and guest selection**

On a real death transition, signed-in players read `deathTutorialSeen`; when false, choose tutorial and fire the idempotent mark request. Guests use a module-scoped boolean. Wins and cancelled matches choose neither path and do not update the state.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/graphics/layers/WinModal.test.ts tests/server/AuthAccountFlow.test.ts`

Expected: account cross-device persistence, guest page lifetime, 16:9 parity, iframe teardown, and non-death cases pass.

- [ ] **Step 6: Commit death media**

```powershell
git add src/client/hud/layers/WinModal.ts resources/lang/en.json tests/client/graphics/layers/WinModal.test.ts tests/server/AuthAccountFlow.test.ts
git commit -m "Restore persistent first-death help media"
```

### Task 8: Privacy, Release Notes, and Full Verification

**Files:**

- Modify: `resources/changelog.md`
- Modify: `resources/privacy-policy.html` or the repository's active privacy source.
- Modify: tests covering privacy/source routes when applicable.

- [ ] **Step 1: Add player-facing release and privacy copy**

Add the next OpenBack version at the top of `resources/changelog.md`, describing optional profile pictures, OB fallback, identity placement, and first-death help behavior. Credit **frootz jhklphy**. State that profile pictures are public, stored with the account, and removed on account deletion.

- [ ] **Step 2: Run complete static and test gates**

Run:

```powershell
npm run format:check
npm run lint
npm run build-dev
npm test
git diff --check
```

Expected: every command exits zero; build output contains no new errors.

- [ ] **Step 3: Run desktop/mobile visual checks**

Verify account upload/replace/remove, header fallback, public profile, friends, clan members, live leaderboard, ranked leaderboard, first account death, second account death, guest first/second deaths, and responsive 16:9 media at desktop and mobile viewports.

- [ ] **Step 4: Commit release documentation**

```powershell
git add resources/changelog.md resources/privacy-policy.html
git commit -m "Release persistent OpenBack profile identity"
```
