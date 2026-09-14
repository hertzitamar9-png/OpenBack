# First Command tutorial

Dedicated single-player coastal mission using the real simulation, buildings,
combat and controls. The user has requested implementation as part of release
readiness fixes, including scripted opponents and at least five minutes of play.

## Experience

A hand-authored archipelago, fixed friendly and opposing actors, and a mission
director replace random nations. Chapters teach deployment, expansion, troop
commitment, economy, coastal infrastructure, defense, invasion and missiles.
Each chapter checks the relevant real action and its resulting simulation state.
Timed exercises include construction, defensive waves and sea operations. The
unskipped mission cannot complete in fewer than 300 active seconds at normal
speed; pausing does not advance it. Skip remains an explicit exception.

The visual direction is a naval operations briefing: deep ink panels, warm ivory
type, cyan navigation marks, amber objective accents, animated route marks and
short chapter transitions. Camera moves frame mission targets without fighting
manual movement. Reduced-motion users receive immediate transitions. Mobile
uses a compact objective ribbon and a collapsible briefing above the build bar.

## Architecture

Core tutorial modules own terrain, mission definitions, scripted actors and
progress. A local worker command channel carries skip, recovery and observed
control interactions. Worker updates carry the authoritative mission snapshot.
No tutorial commands enter multiplayer transport. Tutorial matches are not
archived or submitted for progression. Runtime hooks require both the versioned
tutorial marker and Singleplayer game type.

The director gates destructive or premature actions, gives bounded resource
support, and provides recovery for essential infrastructure. Opponents never
receive ordinary NationExecution or TribeExecution. They act once per named
mission cue; a stalled player does not trigger an unbounded attack stream.

## Release fixes

Respect cancelled navigation before launching any tutorial. Keep mobile sidebar
bounds inside safe insets. Eliminate tutorial/leaderboard/spawn-prompt overlap.
Require actual troop-slider interaction. Translate mission copy into English
and Hebrew with normal fallback for other locales. Assess and update the four
production dependency advisories, then verify relevant authentication tests.

## Verification

Test mission gating, scripted repeatability, action-specific objectives,
minimum duration, pause, skip, recovery and multiplayer exclusion. Test cancelled
launch and narrow viewport layout. Run real browser gameplay through the complete
mission plus the ordinary-game smoke path. Run build, typecheck, lint and focused
regressions; report physical-phone and production checks separately.
