import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../core/game/Game";
import { generateID } from "../../core/Util";
import { appRouter } from "../AppRouter";
import { getPlayerCosmetics } from "../Cosmetics";
import { markTutorialMatch } from "../hud/layers/TutorialGuide";
import type { UsernameInput } from "../UsernameInput";

/**
 * Start the guided tutorial: one fixed match, played for real.
 *
 * Every setting is pinned rather than read from the solo screen, because the
 * script talks about what is on the board -- "build a port", "cross the water"
 * -- and that only means something if the board is the same every time.
 *
 * Classic 2D only. The tutorial teaches the game, not the camera, and offering
 * a choice before a player knows what either view is asks them to decide
 * something they have no way to answer.
 */
export async function startTutorialMatch(): Promise<void> {
  const clientID = generateID();
  const gameID = generateID();

  const usernameInput = document.querySelector(
    "username-input",
  ) as UsernameInput | null;
  await usernameInput?.whenSeeded();

  markTutorialMatch();

  // Leave whatever page is open before joining. The solo screen closes itself
  // first for the same reason: the renderer starts inside the join handler,
  // and an open subpage sits over the map it is drawing -- the match never
  // becomes visible and the HUD never mounts.
  await appRouter.navigatePage("page-play");

  const joinEvent = new CustomEvent("join-lobby", {
    detail: {
      gameID,
      gameStartInfo: {
        gameID,
        players: [
          {
            clientID,
            username: usernameInput?.getUsername() ?? "Recruit",
            clanTag: usernameInput?.getClanTag() ?? null,
            cosmetics: await getPlayerCosmetics(),
          },
        ],
        config: {
          experienceMode: "2d" as const,
          gameMap: GameMapType.World,
          gameMapSize: GameMapSize.Normal,
          gameType: GameType.Singleplayer,
          gameMode: GameMode.FFA,
          // Easy, few opponents, generous gold: the steps ask the player to
          // build one of nearly everything, and a tutorial that cannot afford
          // its own instructions teaches nothing. Nations are left in so the
          // world still looks like a match rather than an empty map.
          difficulty: Difficulty.Easy,
          bots: 40,
          // A plain number, not a bigint: the wire schema types this as a
          // uint, and a bigint here fails validation and the match never
          // starts -- silently, because the join has already been accepted.
          startingGold: 5_000_000,
          goldMultiplier: 3,
          // Required by the config schema. "default" keeps the world full of
          // nations, so the map looks like a real match to learn on.
          nations: "default",
          infiniteGold: false,
          infiniteTroops: false,
          instantBuild: false,
          disabledUnits: [],
          donateGold: false,
          donateTroops: false,
          randomSpawn: false,
          worldMechanics: {
            encirclement: false,
            warExhaustion: false,
            logisticsCargo: true,
            strategicObjectives: false,
            naturalDisasters: false,
            fogOfWar: false,
            livingWorld: false,
            sharedControlSize: 1,
          },
        },
        lobbyCreatedAt: Date.now(),
      },
      source: "singleplayer",
    },
    bubbles: true,
    composed: true,
  });

  document.dispatchEvent(joinEvent);
}
