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
let launchInFlight: Promise<boolean> | null = null;

export function startTutorialMatch(): Promise<boolean> {
  if (launchInFlight) return launchInFlight;
  launchInFlight = launch().finally(() => {
    launchInFlight = null;
  });
  return launchInFlight;
}

async function launch(): Promise<boolean> {
  const clientID = generateID();
  const gameID = generateID();

  const usernameInput = document.querySelector(
    "username-input",
  ) as UsernameInput | null;
  await usernameInput?.whenSeeded();

  const cosmetics = await getPlayerCosmetics();

  // Leave whatever page is open before joining. The solo screen closes itself
  // first for the same reason: the renderer starts inside the join handler,
  // and an open subpage sits over the map it is drawing -- the match never
  // becomes visible and the HUD never mounts.
  if (!(await appRouter.navigatePage("page-play", true))) return false;
  markTutorialMatch();

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
            cosmetics,
          },
        ],
        config: {
          experienceMode: "2d" as const,
          tutorialMission: "first-command-v1" as const,
          gameMap: GameMapType.World,
          gameMapSize: GameMapSize.Normal,
          gameType: GameType.Singleplayer,
          gameMode: GameMode.FFA,
          // The mission director owns all actors. Never add general bot AI.
          difficulty: Difficulty.Easy,
          bots: 0,
          // A plain number, not a bigint: the wire schema types this as a
          // uint, and a bigint here fails validation and the match never
          // starts -- silently, because the join has already been accepted.
          startingGold: 5_000_000,
          goldMultiplier: 3,
          // Ordinary map nations are replaced by the mission's fixed actors.
          nations: "disabled",
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
  return true;
}
