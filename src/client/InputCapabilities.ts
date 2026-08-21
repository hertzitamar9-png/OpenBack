export interface InputCapabilities {
  touchPrimary: boolean;
  hover: boolean;
  keyboardLikely: boolean;
}

type MatchMedia = (query: string) => Pick<MediaQueryList, "matches">;

export function detectInputCapabilities(
  matchMedia: MatchMedia = globalThis.matchMedia?.bind(globalThis),
): InputCapabilities {
  if (typeof matchMedia !== "function") {
    return { touchPrimary: false, hover: true, keyboardLikely: true };
  }
  const touchPrimary = matchMedia("(pointer: coarse)").matches;
  const hover = matchMedia("(hover: hover)").matches;
  const finePrimary = matchMedia("(pointer: fine)").matches;
  const anyFine = matchMedia("(any-pointer: fine)").matches;
  return {
    touchPrimary,
    hover,
    keyboardLikely: !touchPrimary || hover || finePrimary || anyFine,
  };
}
