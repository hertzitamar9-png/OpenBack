# Twin World Stage 3: Cosmetics and Loadouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give 2D and 3D distinct cosmetic catalogs, previews, routes, and equipped loadouts while retaining one wallet and one ownership record.

**Architecture:** Catalog entries declare compatible experiences. Ownership remains keyed by cosmetic identity, while selected loadouts are keyed by account plus experience. Store/Inventory filter by experience and only load 3D preview assets when a visible 3D item requires them.

**Tech Stack:** TypeScript 6, Zod 4, Lit 3, WebGL2 preview scene, PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-twin-world-experiences-design.md`

## Global Constraints

- One purchase grants one shared ownership record.
- Existing patterns/flat skins/effects default to 2D.
- Compatible flags and crowns default to both experiences.
- Separate equip operations never overwrite the other experience.
- Unsupported cosmetics are filtered, not shown disabled.
- 2D Store/Inventory paths do not load 3D models or shaders.
- Public UI stays feature-gated until Stage 4.

---

### Task 1: Add cosmetic compatibility metadata

**Files:**

- Modify: `src/core/CosmeticSchemas.ts`
- Modify: `resources/cosmetics.json`
- Modify: cosmetic resolution helpers in `src/client/Cosmetics.ts`
- Create: `tests/core/CosmeticExperienceCompatibility.test.ts`

**Interfaces:**

- Produces: `CosmeticExperienceSchema`, `experiencesForCosmetic`, and `supportsExperience(cosmetic, experience)`.

- [ ] **Step 1: Write failing schema/migration tests**

```ts
expect(experiencesForCosmetic(legacyPattern)).toEqual(["2d"]);
expect(experiencesForCosmetic(legacyFlag)).toEqual(["2d", "3d"]);
expect(supportsExperience(threeDWrap, "3d")).toBe(true);
expect(supportsExperience(threeDWrap, "2d")).toBe(false);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/core/CosmeticExperienceCompatibility.test.ts`

Expected: catalog entries have no compatibility dimension.

- [ ] **Step 3: Implement explicit metadata and legacy defaults**

```ts
const CosmeticExperienceSchema = z.enum(["2d", "3d"]);
const ExperiencesSchema = CosmeticExperienceSchema.array().min(1);
```

Add `experiences` to every catalog item. Parser fallback exists only for legacy fixture compatibility; the production catalog must pass an audit asserting every item is explicit.

- [ ] **Step 4: Verify GREEN and catalog audit**

Run `npx vitest run tests/core/CosmeticExperienceCompatibility.test.ts tests/CosmeticSchemas.test.ts`.

- [ ] **Step 5: Commit**

```powershell
git add src/core/CosmeticSchemas.ts src/client/Cosmetics.ts resources/cosmetics.json tests/core/CosmeticExperienceCompatibility.test.ts
git commit -m "Classify cosmetics by experience"
```

---

### Task 2: Store separate account-scoped loadouts

**Files:**

- Modify: `src/core/game/UserSettings.ts`
- Modify: account/profile schema in `src/core/ApiSchemas.ts`
- Modify: persistence/profile handlers in `src/server/auth/AuthServer.ts`
- Create: `tests/core/ExperienceLoadout.test.ts`
- Create: `tests/server/ExperienceLoadoutPersistence.test.ts`

**Interfaces:**

- Produces: `ExperienceLoadout`, `getExperienceLoadout(experience)`, `setExperienceSelection(experience, slot, value)`, and persisted `loadoutsByExperience`.

- [ ] **Step 1: Write failing isolation tests**

```ts
settings.setExperienceSelection("2d", "territory", "pattern:solar");
settings.setExperienceSelection("3d", "wrap", "wrap:camo");
expect(settings.getExperienceLoadout("2d").territory).toBe("pattern:solar");
expect(settings.getExperienceLoadout("3d").wrap).toBe("wrap:camo");
```

Add same-email/new-device persistence and legacy-selection migration cases.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/core/ExperienceLoadout.test.ts tests/server/ExperienceLoadoutPersistence.test.ts`

Expected: current flat storage keys overwrite one another.

- [ ] **Step 3: Implement scoped loadouts**

```ts
interface ExperienceLoadout {
  territory?: string;
  flag?: string;
  crown?: string;
  wrap?: string;
  modelSkin?: string;
  effects: Partial<Record<EffectSlot, string>>;
  skyTheme?: string;
  structureStyle?: string;
}
```

Migrate existing selected pattern/skin/effects into `2d`; copy compatible flag/crown selection into both. Keep local guest loadouts namespaced by experience and signed-in loadouts account-scoped.

- [ ] **Step 4: Verify GREEN**

Run `npx vitest run tests/core/ExperienceLoadout.test.ts tests/server/ExperienceLoadoutPersistence.test.ts tests/UserSettings.test.ts tests/server/AuthPersistence.test.ts`.

- [ ] **Step 5: Commit**

```powershell
git add src/core/game/UserSettings.ts src/core/ApiSchemas.ts src/server/auth/AuthServer.ts tests/core/ExperienceLoadout.test.ts tests/server/ExperienceLoadoutPersistence.test.ts
git commit -m "Persist separate Twin World loadouts"
```

---

### Task 3: Keep purchase ownership shared

**Files:**

- Modify: `src/server/auth/AuthServer.ts`
- Modify: `src/client/Api.ts`
- Modify: `src/client/components/PurchaseButton.ts`
- Modify: `src/client/components/CosmeticCard.ts`
- Create: `tests/server/UniversalCosmeticOwnership.test.ts`

**Interfaces:**

- Consumes: compatibility metadata from Task 1.
- Produces: one ownership grant usable from all supported experiences, with unchanged wallet charging.

- [ ] **Step 1: Write failing universal purchase tests**

```ts
await purchase(user, universalFlag, "2d");
expect(owned(user, universalFlag, "2d")).toBe(true);
expect(owned(user, universalFlag, "3d")).toBe(true);
expect(await purchase(user, universalFlag, "3d")).toEqual({
  error: "already_owned",
});
expect(user.currency).toBe(balanceAfterOnePurchase);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/server/UniversalCosmeticOwnership.test.ts`

Expected: purchase requests cannot express or validate experience compatibility.

- [ ] **Step 3: Validate experience without duplicating ownership keys**

Purchase requests include browsing experience for compatibility checks, but ownership flare/key remains the canonical cosmetic key. Reject unsupported experience/item combinations before charging.

- [ ] **Step 4: Verify GREEN**

Run the focused test and existing purchase/currency suites.

- [ ] **Step 5: Commit**

```powershell
git add src/server/auth/AuthServer.ts src/client/Api.ts src/client/components tests/server/UniversalCosmeticOwnership.test.ts
git commit -m "Share cosmetic ownership across experiences"
```

---

### Task 4: Route and filter Store and Inventory

**Files:**

- Modify: `src/client/AppRoutes.ts`
- Modify: `src/client/Store.ts`
- Modify: `src/client/InventoryModal.ts`
- Modify: `src/client/components/InventoryLoadoutBar.ts`
- Modify: `src/client/components/CosmeticPreview.ts`
- Modify: related Store/Inventory tests.
- Create: `tests/client/ExperienceCosmeticNavigation.test.ts`

**Interfaces:**

- Consumes: compatibility and loadout APIs from Tasks 1-2.
- Produces: `/store/:experience/:tab`, `/inventory/:experience/:tab`, filtered products, and mode-scoped equip actions.

- [ ] **Step 1: Write failing route/filter tests**

```ts
expect(parseAppUrl(url("/store/3d/wraps"))).toMatchObject({
  target: { pageId: "page-item-store", experienceMode: "3d", tab: "wraps" },
});
expect(storeItems("3d")).toContain(threeDWrap);
expect(storeItems("3d")).not.toContain(twoDPattern);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/ExperienceCosmeticNavigation.test.ts`

Expected: routes and catalog views have no experience context.

- [ ] **Step 3: Implement experience-aware navigation and filtering**

Add `experienceMode?: ExperienceMode` to `AppRouteTarget`, require it for canonical Store/Inventory generation, and migrate old paths to `2d`. Store and Inventory receive the route context in `open(args)`, filter before grouping/search, and call mode-scoped equip methods.

- [ ] **Step 4: Verify GREEN**

Run the focused test plus all current Store/Inventory navigation and integration tests.

- [ ] **Step 5: Commit**

```powershell
git add src/client tests/client
git commit -m "Separate Twin World cosmetic browsing"
```

---

### Task 5: Add lazy 3D cosmetic preview scenes

**Files:**

- Create: `src/client/components/ThreeDCosmeticPreview.ts`
- Create: `src/client/render/gl/three-d/ThreeDPreviewScene.ts`
- Modify: `src/client/components/CosmeticPreview.ts`
- Modify: `src/client/components/CosmeticCard.ts`
- Create: `tests/client/ThreeDCosmeticPreview.test.ts`

**Interfaces:**

- Produces: `<three-d-cosmetic-preview>`, `ThreeDPreviewScene.mount(canvas, cosmetic)`, and deterministic `dispose()`.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
expect(twoDStoreRequests()).not.toContain(".glb");
await preview.show(threeDWrap);
expect(loader.load).toHaveBeenCalledOnce();
preview.remove();
expect(scene.dispose).toHaveBeenCalledOnce();
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/ThreeDCosmeticPreview.test.ts`

Expected: no isolated 3D preview lifecycle exists.

- [ ] **Step 3: Implement visibility-triggered previews**

Use IntersectionObserver to create the scene only when the card is visible. Reuse the established 3D asset loader/model registry, use one small canvas, pause animation off-screen, and dispose buffers/textures/listeners on disconnect. Render a styled fallback image if WebGL2 or the asset fails.

- [ ] **Step 4: Verify stage**

Run focused cosmetic tests, TypeScript, build, lint, and Prettier. Add a browser memory/console pass that opens and closes 3D Store cards repeatedly without increasing live preview contexts.

- [ ] **Step 5: Commit stage completion**

```powershell
git add src tests
git commit -m "Complete Twin World cosmetic experiences"
```
