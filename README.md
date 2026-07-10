# OpenBack

OpenBack is a renamed, locally runnable build of the real OpenFront territorial RTS. It uses the upstream deterministic simulation and renderer rather than approximating the game from screenshots, so the maps, spawn phase, organic borders, economy, bots and nations, alliances, structures, railroads, ships, nukes, SAM defense, match setup, replays, and multiplayer protocol are the actual game systems.

This tree is based on [OpenFrontIO v0.32.8](https://github.com/openfrontio/OpenFrontIO/releases/tag/v0.32.8), upstream commit `3687eee03bec116b7d19f470bffdd62648180372`, with the product-facing name and open-licensed logo changed to OpenBack.

## Run it

Requirements: Node.js and npm. The upstream project currently expects npm 10.9.2 or newer.

```powershell
npm run inst
npm run dev
```

Then open `http://localhost:9000`. `npm run dev` also starts the local game server used for lobbies and WebSocket turns.

Useful checks:

```powershell
npm run build-dev
npm test
npm run lint
```

Use **Play → Solo** for the fastest fully local match. Public services such as official accounts, store purchases, global leaderboards, and OpenFront-hosted matchmaking are not part of this renamed local fork.

## Multiplayer

OpenBack includes the real authoritative WebSocket multiplayer server and deterministic turn relay from OpenFront. To host a match for other computers on your local network, run:

```powershell
npm run multiplayer
```

`npm run multiplayer` detects this computer's LAN address and uses it in invite links. One player chooses **Host Multiplayer** and clicks **Copy invite link**; friends open a URL ending in `/game/LOBBY_ID` and join that lobby automatically. The same lobby ID also works in **Join Multiplayer**.

For a temporary public website that works over the internet while this computer is running, use `npm run public`. It prints a secure `trycloudflare.com` address. Open that address before hosting so every copied lobby link uses the public website URL.

## Licensing and attribution

- Code is licensed under the [GNU Affero General Public License v3.0](LICENSE), including the upstream section 7 attribution requirements.
- Assets under `resources/` are covered by [CC BY-SA 4.0 terms](LICENSE-ASSETS) and require OpenFront attribution.
- The required visible notices, including `© OpenFront and Contributors`, are intentionally preserved.
- The upstream `proprietary/` directory and external/CDN-only assets are intentionally excluded because their license does not permit reuse in a renamed project.
- If OpenBack is offered over a network, the AGPL requires that users can obtain the complete corresponding source for the version they are using.

See [LICENSING.md](LICENSING.md) and [CREDITS.md](CREDITS.md) for the upstream history and contributors.

## Workspace note

The earlier clean-room Canvas prototype was preserved under `legacy-prototype/`. It is not used by the current game.
