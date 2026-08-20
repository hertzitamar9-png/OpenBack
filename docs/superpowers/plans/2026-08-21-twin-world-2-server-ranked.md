# Twin World Stage 2: Server and Ranked Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate 2D and 3D lobbies, parties, matchmaking queues, ratings, leaderboards, statistics, and replays while retaining one account/social system.

**Architecture:** Every multiplayer message and persisted match record carries normalized `experienceMode`. Matchmaking indexes queues by experience plus ranked type. PostgreSQL/account persistence stores independent rating/stat buckets with an idempotent migration that maps legacy values to 2D.

**Tech Stack:** TypeScript 6, Express 5, WebSocket, Zod 4, PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-twin-world-experiences-design.md`

## Global Constraints

- 2D and 3D cannot enter the same lobby or ranked assignment.
- Friends, clans, parties, chats, wallet, and identity remain shared.
- Existing ratings migrate to 2D; 3D begins at the default rating.
- All ranked team sizes receive separate experience ladders.
- Rolling deployment accepts legacy clients as normalized legacy configs.
- The feature remains hidden from the public home until Stage 4.

---

### Task 1: Advertise experience on lobbies and invites

**Files:**

- Modify: `src/core/Schemas.ts`
- Modify: `src/server/MasterLobbyService.ts`
- Modify: `src/server/Worker.ts`
- Modify: `src/client/LobbySocket.ts`
- Modify: `src/client/JoinLobbyModal.ts`
- Modify: `src/client/HostLobbyModal.ts`
- Modify: `src/client/components/LobbyCard.ts`
- Create: `tests/server/ExperienceLobbyIsolation.test.ts`

**Interfaces:**

- Produces: `PublicGameInfo.experienceMode`, experience-preserving lobby creation/join responses, and `experience_mismatch` refusal.

- [ ] **Step 1: Write failing lobby propagation tests**

```ts
expect(advertise(game3d).experienceMode).toBe("3d");
expect(join(game3d, { requestedExperience: "2d" })).toEqual({
  error: "experience_mismatch",
});
expect(successor(game3d).experienceMode).toBe("3d");
```

Cover hosted, public, invite, party, successor, and replay lobby metadata.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/server/ExperienceLobbyIsolation.test.ts`

Expected: advertisements omit experience and mismatched joins are accepted.

- [ ] **Step 3: Implement authoritative propagation**

Add required normalized experience to server-internal lobby records and public payloads. Join requests include the expected experience when launched from setup/party UI. The server compares it before adding the socket and returns `experience_mismatch` without altering the lobby.

- [ ] **Step 4: Verify GREEN**

Run the focused test plus existing host/join/lobby suites.

- [ ] **Step 5: Commit**

```powershell
git add src tests/server/ExperienceLobbyIsolation.test.ts
git commit -m "Separate Twin World multiplayer lobbies"
```

---

### Task 2: Partition matchmaking and party requests

**Files:**

- Modify: `src/server/MatchmakingService.ts`
- Modify: `src/server/SocialService.ts`
- Modify: `src/client/Matchmaking.ts`
- Modify: `src/client/components/RankedModal.ts`
- Modify: `src/client/SocialClient.ts`
- Modify: `src/core/ApiSchemas.ts`
- Create: `tests/server/ExperienceMatchmaking.test.ts`
- Modify: `tests/server/MatchmakingService.test.ts`
- Modify: `tests/server/MatchmakingCancel.test.ts`
- Modify: `tests/client/Matchmaking.test.ts`
- Modify: `tests/client/RankedMatchmakingFlow.test.ts`
- Modify: `tests/matchmaking/contained.mjs`
- Modify: `tests/matchmaking/e2e.mjs`
- Modify: `tests/matchmaking/e2e-cancel.mjs`

**Interfaces:**

- Consumes: `ExperienceMode` from Stage 1.
- Produces: `RankedQueueKey`, queue requests/responses with `experienceMode`, and experience-preserving party acceptance.

- [ ] **Step 1: Write failing queue isolation tests**

```ts
service.enqueue(player("a", "2d", "1v1"));
service.enqueue(player("b", "3d", "1v1"));
expect(service.assignments()).toHaveLength(0);

service.enqueue(player("c", "2d", "1v1"));
expect(service.assignments()[0].players).toEqual(["a", "c"]);
expect(service.assignments()[0].experienceMode).toBe("2d");
```

Add 2v2/3v3/4v4 party cases and cancellation/retry cases.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/server/ExperienceMatchmaking.test.ts`

Expected: current queue combines compatible ratings regardless of experience.

- [ ] **Step 3: Implement composite queue keys**

```ts
export type RankedQueueKey = `${ExperienceMode}:${RankedType}`;

export function rankedQueueKey(
  experience: ExperienceMode,
  rankedType: RankedType,
): RankedQueueKey {
  return `${experience}:${rankedType}`;
}
```

Index groups, queue-size broadcasts, pending invitations, cancellation tokens, retry state, and assignments by this key. Reject parties whose request context differs from the leader's selected experience.

- [ ] **Step 4: Verify GREEN**

Run the focused suite and `npm run test:matchmaking`.

- [ ] **Step 5: Commit**

```powershell
git add src tests/server/ExperienceMatchmaking.test.ts tests/matchmaking
git commit -m "Partition ranked queues by experience"
```

---

### Task 3: Persist independent ratings and migrate legacy data

**Files:**

- Modify: `src/server/auth/AuthServer.ts`
- Modify: `src/server/auth/AuthPersistence.ts`
- Modify: `src/core/ApiSchemas.ts`
- Create: `tests/server/ExperienceRatingMigration.test.ts`
- Modify: `tests/server/AuthPersistence.test.ts`

**Interfaces:**

- Produces: `ExperienceRankings` keyed by experience and ranked type; `ratingFor(user, experience, rankedType)`; idempotent persistence migration.

- [ ] **Step 1: Write failing migration and rating tests**

```ts
const migrated = migrateUser({ elo: 812, peakElo: 900 });
expect(migrated.rankings["2d"][RankedType.OneVOne]).toEqual({
  elo: 812,
  peakElo: 900,
});
expect(migrated.rankings["3d"][RankedType.OneVOne].elo).toBe(DEFAULT_OB);

recordResult(user, "3d", RankedType.OneVOne, result);
expect(user.rankings["2d"][RankedType.OneVOne].elo).toBe(812);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/server/ExperienceRatingMigration.test.ts`

Expected: the current single `elo` field cannot represent both experiences.

- [ ] **Step 3: Implement additive persistence**

```ts
type ExperienceRankings = Record<
  ExperienceMode,
  Partial<Record<RankedType, { elo: number; peakElo: number }>>
>;
```

Read legacy fields into `rankings["2d"]` exactly once; do not delete them until every deployed reader uses the new structure. Rating updates select both experience and ranked type. Persist in PostgreSQL JSON/columns using the repository's existing atomic save transaction.

- [ ] **Step 4: Verify restart persistence**

Run `tests/server/ExperienceRatingMigration.test.ts` twice against the same fixture, then `tests/server/AuthPersistence.test.ts`. Expected: no duplicated migration and both ladders survive reload.

- [ ] **Step 5: Commit**

```powershell
git add src/server/auth src/core/ApiSchemas.ts tests/server
git commit -m "Persist independent Twin World ratings"
```

---

### Task 4: Separate leaderboards, statistics, history, and replay metadata

**Files:**

- Modify: `src/server/auth/AuthServer.ts`
- Modify: `src/core/ApiSchemas.ts`
- Modify: `src/client/Api.ts`
- Modify: `src/client/LeaderboardModal.ts`
- Modify: profile/stat components under `src/client/components/baseComponents/stats/`
- Modify: replay record schemas and writers under `src/core/` and `src/server/`
- Create: `tests/server/ExperienceLeaderboard.test.ts`
- Create: `tests/client/ExperienceStatsNavigation.test.ts`

**Interfaces:**

- Consumes: experience ratings from Task 3.
- Produces: experience-filtered leaderboard API, statistics tree, history filter, and replay metadata.

- [ ] **Step 1: Write failing API/UI tests**

```ts
expect(await leaderboard("2d", RankedType.OneVOne)).toContainEqual(
  expect.objectContaining({ publicId: "classic-player" }),
);
expect(await leaderboard("3d", RankedType.OneVOne)).not.toContainEqual(
  expect.objectContaining({ publicId: "classic-player" }),
);
expect(replay.experienceMode).toBe("3d");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/server/ExperienceLeaderboard.test.ts tests/client/ExperienceStatsNavigation.test.ts`

Expected: endpoints and UI expose one combined ladder.

- [ ] **Step 3: Implement experience filters**

Require an experience route/parameter for ranked leaderboard reads. Store `experienceMode` on completed games and replays. Add the experience selector above ladder tabs and preserve it in clean routes. Profile history and statistics use the same normalized filter.

- [ ] **Step 4: Verify stage**

Run focused suites, full server tests, TypeScript, build, lint, and formatting.

- [ ] **Step 5: Commit stage completion**

```powershell
git add src tests
git commit -m "Separate Twin World competitive records"
```
