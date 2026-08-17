# Keeping OpenBack separate from upstream

OpenBack is a fork of OpenFrontIO and still merges upstream changes. Every line
of OpenBack code that sits **inside** an upstream file becomes a merge conflict
the next time upstream touches that file. The goal of this document is simple:

> Upstream files stay byte-identical to upstream. OpenBack code lives in
> OpenBack files.

Where that is achieved, upstream updates merge with no conflict at all.

## Why it matters

Measured at the 2026-08-03 fork point, before any separation work:

|                                                                |     |
| -------------------------------------------------------------- | --- |
| Files added by OpenBack (no merge risk)                        | 415 |
| Files **modified** from upstream (every one a future conflict) | 396 |
| Files deleted from upstream                                    | 40  |

A later attempt to merge 84 upstream commits produced conflicts in 63 files, and
**62 of those 63 were files OpenBack had modified**. Only one was a clean
upstream-only file. That is the cost of editing upstream files in place.

## The pattern

Three techniques, in order of preference.

### 1. Append, don't edit (best)

Put OpenBack code in its own file and load it after upstream's. Nothing of ours
appears in their file, so their file merges cleanly forever.

**Done: CSS.** `src/client/styles.css` is upstream's sheet.
`src/client/styles/openback.css` holds every OpenBack rule and is imported
straight after it in `Main.ts`. Because it loads later, the cascade lets our
rules win without touching a single upstream line.

Divergence in `styles.css` went from ~500 lines to exactly one (a font-family
rename that has to stay inside upstream's `@theme` block).

**Done: English translations.** `resources/lang/en.json` is upstream's file,
byte-identical. OpenBack's 313 added strings, 25 changed values and 60 dropped
keys live in `resources/lang/en.openback.json` and are merged over it by
`src/client/openback/Translations.ts`. The overlay supports a `$remove` list so
strings for features OpenBack does not ship can be dropped without editing
upstream's file.

The merge is exported as `applyTranslationOverlay`, and the tests use that same
function, so a test can never validate different strings from the ones the game
renders.

### 2. Override, don't rewrite

When OpenBack changes an upstream rule, re-declare it in the OpenBack file
rather than editing upstream's declaration. The error-modal restyle in
`openback.css` is the worked example: upstream keeps its own plain declarations,
and ours override them later.

### 3. Hook, don't inline

When OpenBack needs to run inside an upstream module, add a single import or
call in the upstream file and put the real work in an OpenBack module. One line
of divergence instead of hundreds.

## Verifying a separation did not change anything

Extraction is only safe if the result renders identically. Do not eyeball it:

1. Capture a computed-style fingerprint of representative elements.
2. Park the extracted file and restore the original upstream file.
3. Reload and capture the same fingerprint.
4. Compare. Every value must match.

This caught a real bug during the CSS extraction: two declarations that lived
inside upstream's `body` rule were copied out without their selector, producing
invalid CSS that silently changed the page background and text colour. The
fingerprint diff made it obvious; a visual check would not have.

## What can and cannot be separated

Separation works when OpenBack **adds** to upstream. It fails when OpenBack
**removes** upstream code, because no external file can un-load a script tag or
un-import a module. Those deletions have to stay in upstream's file, so the file
can never go pristine.

Rank candidates by conflict risk, not by lines changed. `changelog.md` is
+1130/-493 but upstream has never touched it since the fork and it does not
appear in the conflict set at all; separating it would be pure churn.

| File                         | Shape                                                    | Verdict                                          |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| `src/client/styles.css`      | additive + overridable                                   | **Done.** 2 lines from upstream                  |
| `resources/lang/en.json`     | additive + overridable                                   | **Done.** Byte-identical                         |
| `resources/changelog.md`     | large but never conflicts                                | Leave alone                                      |
| `index.html`                 | +176/-123, removes CrazyGames SDK, Turnstile, ad scripts | Not separable; the removals are the point        |
| `src/client/Main.ts`         | +213/-238, removes 16 upstream imports                   | Not separable for the same reason                |
| `src/client/render/**`       | 110 commits changing upstream behaviour                  | Needs extension points upstream does not provide |
| `src/client/AccountModal.ts` | +976/-474                                                | Probably a genuine fork                          |

The renderer is the only remaining case with real upside, and it is not a
file-moving exercise: it needs hooks designed into the render passes so OpenBack
can alter behaviour without editing them. That is a design job, not a refactor.

## Rule of thumb

Before editing an upstream file, ask whether the change can live in an OpenBack
file instead. If it can, put it there. Each avoided edit is a conflict that
never happens.
