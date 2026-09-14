import { GameType, UnitType } from "../game/Game";

export const TUTORIAL_MISSION = "first-command-v1";
export const MIN_MISSION_TICKS = 3000;
export function isTutorialConfig(config: {
  gameType?: GameType;
  tutorialMission?: string;
}): boolean {
  return (
    config.gameType === GameType.Singleplayer &&
    config.tutorialMission === TUTORIAL_MISSION
  );
}
export type MissionCommand =
  | { phase: number; action: "ratio"; value: number }
  | { phase: number; action: "skip" | "recover" };
export type MissionPoint =
  | "home"
  | "expansion"
  | "border"
  | "redoubt"
  | "factory"
  | "silo"
  | "sea"
  | "harbor"
  | "landing"
  | "target";
export interface MissionStage {
  id: string;
  minimumTicks: number;
  point: MissionPoint;
  unit?: UnitType;
  selector?: string;
}
// One tick is 100 ms. These windows are construction, consolidation, defensive
// drills and sea operations, not a wall-clock timer that runs while paused.
export const MISSION_STAGES: readonly MissionStage[] = [
  { id: "spawn", minimumTicks: 0, point: "home" },
  { id: "expand", minimumTicks: 200, point: "expansion" },
  {
    id: "ratio",
    minimumTicks: 150,
    point: "expansion",
    selector: 'input[data-tutorial="troop-ratio"]',
  },
  { id: "city", minimumTicks: 200, point: "home", unit: UnitType.City },
  {
    id: "factory",
    minimumTicks: 200,
    point: "factory",
    unit: UnitType.Factory,
  },
  { id: "port", minimumTicks: 250, point: "harbor", unit: UnitType.Port },
  {
    id: "defense",
    minimumTicks: 300,
    point: "border",
    unit: UnitType.DefensePost,
  },
  { id: "hold", minimumTicks: 350, point: "border" },
  { id: "counter", minimumTicks: 250, point: "redoubt" },
  { id: "landing", minimumTicks: 350, point: "landing" },
  { id: "escort", minimumTicks: 250, point: "sea", unit: UnitType.Warship },
  { id: "silo", minimumTicks: 200, point: "silo", unit: UnitType.MissileSilo },
  { id: "strike", minimumTicks: 150, point: "target", unit: UnitType.AtomBomb },
  { id: "secure", minimumTicks: 150, point: "landing" },
];
export interface MissionSnapshot {
  phase: number;
  elapsedTicks: number;
  phaseTicks: number;
  objectiveMet: boolean;
  completed: boolean;
  skipped: boolean;
  recovered: number;
  cue:
    | "briefing"
    | "raid_one"
    | "raid_two"
    | "convoy"
    | "impact"
    | "resupplied";
}
