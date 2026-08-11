# OpenBack In-Game Social Actions Design

## Objective

Make every real-player interaction in a live match consistent, immediate, and
available without obscuring the battlefield. Complete the existing friends and
cosmetics systems instead of creating parallel state or duplicating behavior in
each menu.

## Scope

This release adds a shared action surface for human players, a compact public
profile overlay, real-time friend-request decisions, server-enforced resend
cooldowns, persistent blocking, owned-item equip states, and a friend-request
action beside player-targeted emojis. It also profiles and fixes measured
performance problems in the touched social and UI paths without reducing visual
quality or gameplay behavior.

## Player Eligibility

- Account actions appear only for a different `PlayerType.Human` player whose
  public account ID is available.
- The local player, bots, and nations never show Friend Request or Block.
- Profile may be shown only when a public account ID is available. Missing or
  stale accounts produce an OpenBack toast and do not open an empty overlay.
- Signed-out senders are routed to the existing sign-in flow; gameplay remains
  visible and uninterrupted.

## Shared Player Actions

A single client coordinator owns Profile, Send Friend Request, and Block. The
following entry points call that coordinator rather than implementing their own
API and feedback logic:

1. Leaderboard row context menu.
2. The `!` player-information and trading panel.
3. The radial player/emoji flow.
4. The compact in-game profile overlay.

The leaderboard context menu contains Profile, Send Friend Request, and Block.
Existing row click, double-click, camera focus, and territory flash behavior
remain unchanged.

## Compact In-Game Profile

Profile opens in a centered, bounded DOM overlay with a dimmed but visible live
battlefield. It does not navigate away, cover the entire viewport, close when
the backdrop is clicked, or pass pointer/camera input through to the game. It
closes through an explicit back or close button.

The card displays only public identity and currently equipped presentation:

- profile picture, display name, verified badge, and country flag;
- banner color, description, and clan membership;
- equipped territory skin or pattern and crown;
- equipped boat trail, nuke trail, explosion, and other public effects that the
  profile schema supports.

It does not expose the player's unequipped inventory, email, authentication
state, private identifiers, or purchase history. The footer contains contextual
Friend Request and Block actions. Existing full profile statistics and history
remain available outside the live-match overlay and are not duplicated here.

Public profile responses are fetched only when opened, cached for a short
bounded period, and invalidated by identity/social real-time events. Superseded
requests cannot overwrite a newly selected profile.

## Friend-Request Lifecycle

Sending a request uses the existing authoritative social API. A reverse pending
request continues to auto-accept as friendship. Duplicate requests and existing
friendships produce contextual OpenBack feedback.

The recipient receives a non-browser, OpenBack-styled in-game popup containing
the requester's profile picture and display name plus Accept and Decline. The
popup does not pause or cover the battlefield. If it is ignored or the recipient
leaves the match, the request remains in the Friends tab and the existing pending
indicator continues to identify it.

Accept immediately creates the friendship for both players. Decline removes the
request and records a server-authoritative cooldown for the ordered sender and
recipient pair. That sender cannot request the same recipient again for exactly
10 seconds. Other targets remain requestable. The API returns the remaining
cooldown so every entry point can show a consistent message. Cooldowns survive
page refreshes and server restarts when persistent storage is configured.

## Blocking

Block remains persistent until the blocker explicitly unblocks the target in
Friends. Blocking removes friendship and pending requests in either direction,
prevents new requests and social invitations, and updates both clients
immediately. It is not the 10-second decline cooldown.

The Block action is available in all shared player-action surfaces. Existing
confirmation UI is reused. A blocked player cannot bypass the restriction by
refreshing or using a different entry point.

## Emoji and Player Menus

The radial/emoji flow gains a social action with a distinct friend-request icon
and accessible label. Selecting it sends through the shared social coordinator;
it is not represented as a deterministic simulation emoji or game turn. This
keeps replays, multiplayer checksums, and spectators unchanged.

The `!` player panel adds compact Profile, Friend Request, and Block actions in
the existing OpenBack action-button style. Trading, alliances, donations, chat,
moderation, and emojis retain their current behavior.

## Store Ownership and Equipping

Purchased cosmetics remain in Store grids. Relationship state controls the
primary action:

- unowned and purchasable: `Buy`;
- owned but not selected: `Equip`;
- owned and selected: `Equipped`, disabled as a completed state.

Equip updates local settings and the server identity preference through the
existing cosmetic-selection path, then refreshes the item and public profile
immediately. Store grids no longer filter out owned flags, skins, patterns,
crowns, or effects. Archived items remain visible only when owned, matching the
existing relationship rules. Packs and non-equippable products keep their
appropriate ownership state rather than receiving a false Equip action.

## Server and Schema Changes

- Extend stored friend requests or adjacent persistent social state with decline
  cooldown records keyed by sender and recipient.
- Reject resend attempts during the 10-second window with a structured status
  and retry timestamp or remaining milliseconds.
- Publish a targeted real-time request event with enough public requester data
  for the in-game popup; never include email or private account fields.
- Reuse existing public profile and cosmetic schemas, extending only the missing
  equipped public fields.
- Prune expired cooldown records during access and persistence maintenance so
  storage cannot grow without bound.

## Error Handling

All failures use OpenBack dialogs or toasts. There are no browser alerts or
confirms. Network failure leaves the local UI truthful: a request is not shown as
sent, a block is not shown as active, and an item is not shown as equipped until
the authoritative operation succeeds. Rapid repeated actions are deduplicated
per target while a request is in flight.

## Performance Constraints

- No new work runs on simulation ticks or render frames.
- Social updates are event-driven and deduplicated.
- Profile rendering uses DOM and bounded media sizes, never WebGL allocations.
- Popup queues have a fixed visible maximum and dispose listeners on disconnect.
- Store relationship resolution is computed once per refresh rather than once
  per animation frame.
- Optimization changes require profiler or trace evidence and may not reduce
  rendering quality, simulation fidelity, update frequency, or multiplayer
  correctness.

## Verification

Test-first coverage must include:

- shared action eligibility for humans, self, bots, nations, and missing IDs;
- all three in-match entry points exposing the same actions;
- profile overlay content, close behavior, playfield protection, and privacy;
- real-time incoming request popup, accept, ignore persistence, and decline;
- exact 10-second pair-specific decline cooldown and expiry;
- persistent blocks superseding requests and cooldowns;
- Store `Buy`, `Equip`, and `Equipped` transitions for every equippable type;
- non-equippable and archived product behavior;
- listener cleanup, request deduplication, and bounded popup queues;
- two signed-in browser sessions proving live delivery and state changes;
- desktop and mobile layouts while a match continues underneath;
- full build, lint, formatting, tests, generated-map check, and GitHub CI.

## Release Requirements

The implementation must add the next OpenBack release entry to
`resources/changelog.md`, credit **frootz jhklphy**, preserve required licensing
and attribution, commit only intended files, push `main`, and wait for GitHub CI.
