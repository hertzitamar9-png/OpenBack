# First Command implementation plan

> Execute inline using the executing-plans workflow. The user has authorized the
> implementation; no additional design approval is required.

**Goal:** Ship a polished scripted tutorial and fix the release review findings.
**Architecture:** Versioned single-player mission, core director, worker snapshots,
responsive Lit presentation. Existing simulation remains the source of truth.
**Tech Stack:** TypeScript, Lit, WebGL, Vitest, browser QA.
**Spec:** ../specs/2026-09-14-first-command-design.md

## Global constraints

- At least 300 active seconds for an unskipped mission at normal speed.
- Skip and Exit always available; Cancel must preserve a running match.
- Scripted actors never run general bot AI; no multiplayer tutorial commands.
- Respect mobile safe areas and reduced motion; support English and Hebrew.
- Preserve unrelated edits, licenses and attribution; update OpenBack changelog.

## Tasks

- [x] Launch safety regression: test a rejected navigation result, then return
      before setting the tutorial marker or dispatching join-lobby.
- [x] Terrain and director: deterministic archipelago and named actors; assert
      usable spawn/coasts and exact scheduled raid/convoy event ticks.
- [x] Worker integration: tutorial-only commands and snapshots; gate normal
      win checks, archive submission and speed changes for this mission.
- [x] Mission presentation: cinematic briefing, objectives, camera focus, world
      markers, chapter motion, collapsible mobile coaching, localization and recovery.
- [x] Runtime verification: complete real actions, verify all chapter transitions,
      safe skip/cancel, mobile bounds and ordinary match behavior.
- [x] Dependencies and release checks: resolve production advisories, run relevant
      auth tests and build/lint; add credited release notes and review final diff.

## Verification receipt — 2026-09-14

- Completed all 14 chapters in Chrome using the normal game UI, without Skip,
  in 7:08 active mission time. Built the city, factory, port, defense post,
  warship and silo; captured enemy territory; landed a transport; fired a bomb
  and observed its impact before the completion screen.
- Cancelling a second tutorial launch preserved the current mission. Skip
  responded while paused, and exiting removed the briefing, equipment locks,
  old game HUD and pause notice from home.
- Responsive bounds inspected at 390×844, 320×568 and 844×390. Briefing content
  scrolls while action/exit controls remain reachable. These are browser viewport
  checks, not physical iPhone/Android notch or GPU testing.
- Full tests: 4,609 passed plus 594 in the separate server run; two existing
  tests skipped. After the final phone-framing adjustment, the focused tutorial
  suite passed all 22 tests and the production build was rerun.
- Independent code review found a defeat-recovery economy defect. A regression
  reproduced it; the fix keeps one dormant human economy execution in training
  only, with one-time death cleanup, and resumes it when territory is restored.
- At 320×568, Show objective placed the spawn marker at y354 below the briefing
  ending at y310; tapping that marker successfully started the mission.
- Ordinary two-player multiplayer smoke: both clients received 100 binary turns,
  zero reported errors and no turn gaps over 200 ms.
- Production build and typecheck passed. Production dependency audit: zero
  advisories. Development-only advisories are not included in that result.
- ESLint passed excluding the unrelated untracked `.agents` tooling. Oxlint
  passed. Prettier passed with platform line endings accepted (`--end-of-line auto`).
- This is a Classic 2D guided operation; it does not add a separate 3D mission.
  Browser used reduced motion; normal camera interpolation is covered by a
  timer-driven test. Physical-device animation smoothness still merits release QA.
- No push or deployment is represented by these local checks.
