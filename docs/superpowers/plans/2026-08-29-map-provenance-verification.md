# Complete Map Provenance Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the origin and licence evidence for every shipped OpenBack map and fail closed for reference-derived maps that cannot be cleared.

**Architecture:** Build one machine-readable provenance manifest keyed by map id, generated from repository and upstream evidence but committed for review. Enforce one-to-one coverage, required evidence fields, file hashes, and exclusion of unverified maps through Vitest.

**Tech Stack:** TypeScript, Vitest, Node.js, Git history, Wikimedia/source APIs, Google reverse-image search

**Spec:** `docs/superpowers/specs/2026-08-29-map-provenance-verification-design.md`

## Global Constraints

- Do not claim legal clearance without source and licence evidence.
- Preserve AGPL, OpenFront attribution, corresponding-source availability, and third-party asset notices.
- Do not delete historical map sources merely because they are removed from playable registration.
- Every user-facing change must update the top of `resources/changelog.md` and credit **frootz jhklphy**.
- Do not modify unrelated untracked `.agents`, `.codex`, attachment, or `nul` paths.

---

### Task 1: Inventory every shipped map

**Files:**

- Create: `scripts/audit-map-provenance.mjs`
- Create: `resources/maps/provenance.json`
- Test: `tests/MapProvenance.test.ts`

**Interfaces:**

- Produces: `Record<string, MapProvenance>` keyed by `resources/maps/<id>` directory name.

- [ ] Write a failing test that compares the provenance keys with every map directory.
- [ ] Run `npx vitest run tests/MapProvenance.test.ts` and confirm the missing manifest failure.
- [ ] Implement repository/upstream classification and SHA-256 collection.
- [ ] Generate `resources/maps/provenance.json` and rerun the focused test.
- [ ] Commit the inventory and test.

### Task 2: Reverse-search the reference-derived maps

**Files:**

- Modify: `resources/maps/provenance.json`
- Create: `docs/map-provenance-audit.md`

**Interfaces:**

- Consumes: the fifteen temporary-image identifiers preserved in the July 15 Codex transcript.
- Produces: a source URL, creator, licence, and match evidence for each verified reference, or the explicit `unverified-reference` class.

- [ ] Extract each original image from the preserved session without substituting the derived terrain thumbnail.
- [ ] Reverse-search every image through Google and inspect candidate source pages.
- [ ] Confirm the visual match and licence from the original/authoritative page.
- [ ] Record the result and evidence URL for all fifteen maps.
- [ ] Commit the evidence report and manifest updates.

### Task 3: Replace maps without permission evidence

**Files:**

- Modify: `map-generator/tools/create_openback_fictional_maps.py`
- Modify: `map-generator/assets/maps/<id>/image.png` and `info.json` for each unresolved map
- Modify: `src/core/game/Maps.gen.ts` through `npm run gen-maps`
- Modify: `resources/maps/**` through `npm run gen-maps`
- Test: `tests/MapProvenance.test.ts`

**Interfaces:**

- Consumes: provenance classes from `resources/maps/provenance.json`.
- Produces: fifteen deterministic OpenBack-original maps containing no reference-derived silhouette.

- [ ] Add a failing assertion that every generated playable map is verified.
- [ ] Replace the reference-reading generator with deterministic terrain generation keyed only by map id and committed configuration.
- [ ] Preserve dimensions, metadata, nation names, and nation counts while recalculating valid spawn coordinates.
- [ ] Run `npm run gen-maps` and inspect the exact generated diff.
- [ ] Run focused map consistency and provenance tests.
- [ ] Commit the fail-closed registry change.

### Task 4: Publish accurate credits and enforcement

**Files:**

- Modify: `CREDITS.md`
- Modify: `LICENSE-ASSETS`
- Modify: `LICENSING.md`
- Modify: `resources/changelog.md`
- Modify: `tests/MapProvenance.test.ts`

**Interfaces:**

- Consumes: final verified and excluded map sets.
- Produces: player-readable attribution and CI enforcement.

- [ ] Update credits with exact verified groups, per-source licences, modifications, and unresolved exclusions.
- [ ] Add an OpenBack release entry crediting **frootz jhklphy**.
- [ ] Verify the focused provenance and credits tests.
- [ ] Run Prettier and `git diff --check`.
- [ ] Commit the documentation and enforcement.

### Task 5: Release verification

**Files:**

- Verify only; no expected source changes.

**Interfaces:**

- Produces: local and GitHub evidence that the provenance gate, generated maps, tests, lint, and production build pass.

- [ ] Run `npm test`.
- [ ] Run repository-scoped oxlint and ESLint.
- [ ] Run `npm run build-prod`.
- [ ] Run formatting checks and the provenance audit script.
- [ ] Push `main`, wait for all GitHub CI jobs, and report verified and excluded map totals without overstating legal certainty.
