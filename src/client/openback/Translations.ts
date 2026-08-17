import upstreamEn from "../../../resources/lang/en.json" with { type: "json" };
import overlay from "../../../resources/lang/en.openback.json" with { type: "json" };

type TranslationTree = { [key: string]: string | TranslationTree };

/**
 * English strings for OpenBack, built from upstream's file plus an overlay.
 *
 * `resources/lang/en.json` is left exactly as upstream ships it. Every OpenBack
 * string lives in `en.openback.json` and is merged over it here, so upstream
 * translation updates land in their file and never conflict with ours.
 *
 * The overlay may also drop upstream keys through `$remove`, for strings that
 * belong to features OpenBack does not ship.
 */
function deepMerge(
  base: TranslationTree,
  over: TranslationTree,
): TranslationTree {
  const out: TranslationTree = { ...base };
  for (const [key, value] of Object.entries(over)) {
    if (key.startsWith("$")) continue; // directives, not translations
    const existing = out[key];
    out[key] =
      typeof value === "object" &&
      value !== null &&
      typeof existing === "object" &&
      existing !== null
        ? deepMerge(existing, value)
        : value;
  }
  return out;
}

function removePath(tree: TranslationTree, path: string): void {
  const parts = path.split(".");
  let node: TranslationTree | undefined = tree;
  for (const part of parts.slice(0, -1)) {
    const next: string | TranslationTree | undefined = node?.[part];
    if (typeof next !== "object" || next === null) return;
    node = next;
  }
  if (node) delete node[parts[parts.length - 1]];
}

/**
 * Apply an OpenBack overlay to an upstream translation tree. Exported so tests
 * check the same strings the game shows, using this exact logic rather than a
 * second copy of the merge rules that could drift from it.
 */
export function applyTranslationOverlay(
  base: TranslationTree,
  over: TranslationTree,
): TranslationTree {
  const merged = deepMerge(base, over);
  const drops = (over as { $remove?: unknown }).$remove;
  if (Array.isArray(drops)) {
    for (const path of drops) {
      if (typeof path === "string") removePath(merged, path);
    }
  }
  return merged;
}

export const englishTranslations: TranslationTree = applyTranslationOverlay(
  upstreamEn as TranslationTree,
  overlay as unknown as TranslationTree,
);
