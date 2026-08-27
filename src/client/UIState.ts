import { PlayerBuildableUnitType } from "../core/game/Game";

export interface UIState {
  attackRatio: number;
  ghostStructure: PlayerBuildableUnitType | null;
  activePlacementRevision?: number;
  rocketDirectionUp: boolean;
  upgradeMultiplier: number;
}
