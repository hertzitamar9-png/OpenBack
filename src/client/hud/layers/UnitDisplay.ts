import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { assetUrl } from "../../../core/AssetUrls";
import { EventBus } from "../../../core/EventBus";
import {
  BuildableUnit,
  BuildMenus,
  Gold,
  PlayerBuildableUnitType,
  UnitType,
} from "../../../core/game/Game";
import { UserSettings } from "../../../core/game/UserSettings";
import { Controller } from "../../Controller";
import { ToggleStructureEvent } from "../../InputHandler";
import { UIState } from "../../UIState";
import { renderNumber, translateText } from "../../Utils";
import { GameView } from "../../view";
const warshipIcon = assetUrl("images/BattleshipIconWhite.svg");
const cityIcon = assetUrl("images/CityIconWhite.svg");
const factoryIcon = assetUrl("images/FactoryIconWhite.svg");
const goldCoinIcon = assetUrl("images/GoldCoinIcon.svg");
const mirvIcon = assetUrl("images/MIRVIcon.svg");
const missileSiloIcon = assetUrl("images/MissileSiloIconWhite.svg");
const hydrogenBombIcon = assetUrl("images/MushroomCloudIconWhite.svg");
const atomBombIcon = assetUrl("images/NukeIconWhite.svg");
const portIcon = assetUrl("images/PortIcon.svg");
const samLauncherIcon = assetUrl("images/SamLauncherIconWhite.svg");
const defensePostIcon = assetUrl("images/ShieldIconWhite.svg");
const planeIcon = assetUrl("images/PlaneIconWhite.svg");
const manpadIcon = assetUrl("images/ManpadIconWhite.svg");
const runwayIcon = assetUrl("images/RunwayIconWhite.svg");
const militaryBaseIcon = assetUrl("images/MilitaryBaseIconWhite.svg");
const tankIcon = assetUrl("images/TankIconWhite.svg");
const tankMineIcon = assetUrl("images/TankMineIconWhite.svg");

@customElement("unit-display")
export class UnitDisplay extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;
  public uiState: UIState;
  private playerBuildables: BuildableUnit[] | null = null;
  private keybinds: Record<string, { value: string; key: string }> = {};
  private _cities = 0;
  private _warships = 0;
  private _factories = 0;
  private _missileSilo = 0;
  private _port = 0;
  private _defensePost = 0;
  private _samLauncher = 0;
  private _runway = 0;
  private _manpad = 0;
  private _militaryBase = 0;
  private _tank = 0;
  private _tankMine = 0;
  private allDisabled = false;
  private _hoveredUnit: PlayerBuildableUnitType | null = null;

  createRenderRoot() {
    return this;
  }

  init() {
    const config = this.game.config();
    const userSettings = new UserSettings();

    this.keybinds = userSettings.parsedUserKeybinds();

    this.allDisabled = BuildMenus.types.every((u) => config.isUnitDisabled(u));
    this.requestUpdate();
  }

  private cost(item: UnitType): Gold {
    for (const bu of this.playerBuildables ?? []) {
      if (bu.type === item) {
        return bu.cost;
      }
    }
    return 0n;
  }

  private canBuild(item: UnitType): boolean {
    if (this.game?.config().isUnitDisabled(item)) return false;
    const player = this.game?.myPlayer();
    switch (item) {
      case UnitType.AtomBomb:
      case UnitType.HydrogenBomb:
      case UnitType.MIRV:
        return (
          this.cost(item) <= (player?.gold() ?? 0n) &&
          (player?.units(UnitType.MissileSilo).length ?? 0) > 0
        );
      case UnitType.Warship:
        return (
          this.cost(item) <= (player?.gold() ?? 0n) &&
          (player?.units(UnitType.Port).length ?? 0) > 0
        );
      case UnitType.Plane:
        return (
          (this.cost(item) <= (player?.gold() ?? 0n) ||
            (player
              ?.units(UnitType.Plane)
              .some(
                (plane) =>
                  plane.isActive() &&
                  !plane.isUnderConstruction() &&
                  plane.isLoaded() === true,
              ) ??
              false)) &&
          (player?.units(UnitType.Runway).length ?? 0) > 0
        );
      case UnitType.Tank:
        return (
          (this.cost(item) <= (player?.gold() ?? 0n) ||
            (player
              ?.units(UnitType.Tank)
              .some((tank) => tank.isActive() && tank.isLoaded() === true) ??
              false)) &&
          (player?.units(UnitType.MilitaryBase).length ?? 0) > 0
        );
      default:
        return this.cost(item) <= (player?.gold() ?? 0n);
    }
  }

  getTickIntervalMs() {
    return 500;
  }

  tick() {
    const player = this.game?.myPlayer();
    if (!player) return;
    player.buildables(undefined, BuildMenus.types).then((buildables) => {
      this.playerBuildables = buildables;
    });
    this._cities = player.totalUnitLevels(UnitType.City);
    this._missileSilo = player.totalUnitLevels(UnitType.MissileSilo);
    this._port = player.totalUnitLevels(UnitType.Port);
    this._defensePost = player.totalUnitLevels(UnitType.DefensePost);
    this._samLauncher = player.totalUnitLevels(UnitType.SAMLauncher);
    this._factories = player.totalUnitLevels(UnitType.Factory);
    this._warships = player.totalUnitLevels(UnitType.Warship);
    this._runway = player.totalUnitLevels(UnitType.Runway);
    this._manpad = player.totalUnitLevels(UnitType.MANPAD);
    this._militaryBase = player.totalUnitLevels(UnitType.MilitaryBase);
    this._tank = player.totalUnitLevels(UnitType.Tank);
    this._tankMine = player.totalUnitLevels(UnitType.TankMine);
    this.requestUpdate();
  }

  render() {
    const myPlayer = this.game?.myPlayer();
    if (
      !this.game ||
      !myPlayer ||
      this.game.inSpawnPhase() ||
      !myPlayer.isAlive()
    ) {
      return null;
    }
    if (this.allDisabled) {
      return null;
    }

    return html`
      <div class="border-t border-white/10 px-2 py-1 w-full bg-black/40">
        <div
          class="flex gap-1.5 w-full overflow-x-auto pb-1 snap-x snap-mandatory"
        >
          ${this.renderUnitItem(
            cityIcon,
            this._cities,
            UnitType.City,
            "city",
            this.keybinds["buildCity"]?.key ?? "1",
          )}
          ${this.renderUnitItem(
            factoryIcon,
            this._factories,
            UnitType.Factory,
            "factory",
            this.keybinds["buildFactory"]?.key ?? "2",
          )}
          ${this.renderUnitItem(
            portIcon,
            this._port,
            UnitType.Port,
            "port",
            this.keybinds["buildPort"]?.key ?? "3",
          )}
          ${this.renderUnitItem(
            defensePostIcon,
            this._defensePost,
            UnitType.DefensePost,
            "defense_post",
            this.keybinds["buildDefensePost"]?.key ?? "4",
          )}
          ${this.renderUnitItem(
            missileSiloIcon,
            this._missileSilo,
            UnitType.MissileSilo,
            "missile_silo",
            this.keybinds["buildMissileSilo"]?.key ?? "5",
          )}
          ${this.renderUnitItem(
            samLauncherIcon,
            this._samLauncher,
            UnitType.SAMLauncher,
            "sam_launcher",
            this.keybinds["buildSamLauncher"]?.key ?? "6",
          )}
          ${this.renderUnitItem(
            warshipIcon,
            this._warships,
            UnitType.Warship,
            "warship",
            this.keybinds["buildWarship"]?.key ?? "7",
          )}
          ${this.renderUnitItem(
            atomBombIcon,
            null,
            UnitType.AtomBomb,
            "atom_bomb",
            this.keybinds["buildAtomBomb"]?.key ?? "8",
          )}
          ${this.renderUnitItem(
            hydrogenBombIcon,
            null,
            UnitType.HydrogenBomb,
            "hydrogen_bomb",
            this.keybinds["buildHydrogenBomb"]?.key ?? "9",
          )}
          ${this.renderUnitItem(
            mirvIcon,
            null,
            UnitType.MIRV,
            "mirv",
            this.keybinds["buildMIRV"]?.key ?? "0",
          )}
          ${this.renderUnitItem(
            planeIcon,
            null,
            UnitType.Plane,
            "plane",
            this.keybinds["buildPlane"]?.key ?? "Shift+Digit1",
          )}
          ${this.renderUnitItem(
            manpadIcon,
            this._manpad,
            UnitType.MANPAD,
            "manpad",
            this.keybinds["buildManpad"]?.key ?? "Shift+Digit2",
          )}
          ${this.renderUnitItem(
            runwayIcon,
            this._runway,
            UnitType.Runway,
            "runway",
            this.keybinds["buildRunway"]?.key ?? "Shift+Digit3",
          )}
          ${this.renderUnitItem(
            militaryBaseIcon,
            this._militaryBase,
            UnitType.MilitaryBase,
            "military_base",
            "⇧4",
          )}
          ${this.renderUnitItem(
            tankIcon,
            this._tank,
            UnitType.Tank,
            "tank",
            "⇧5",
          )}
          ${this.renderUnitItem(
            tankMineIcon,
            this._tankMine,
            UnitType.TankMine,
            "tank_mine",
            "⇧6",
          )}
        </div>
      </div>
    `;
  }

  private renderUnitItem(
    icon: string,
    number: number | null,
    unitType: PlayerBuildableUnitType,
    structureKey: string,
    hotkey: string,
  ) {
    if (this.game.config().isUnitDisabled(unitType)) {
      return html``;
    }
    const selected = this.uiState.ghostStructure === unitType;
    const hovered = this._hoveredUnit === unitType;
    const displayHotkey = hotkey
      .replace("Shift+", "⇧")
      .replace("Digit", "")
      .replace("Key", "")
      .toUpperCase();

    return html`
      <div
        class="flex flex-col items-stretch relative shrink-0 snap-start"
        @mouseenter=${() => {
          this._hoveredUnit = unitType;
          this.requestUpdate();
        }}
        @mouseleave=${() => {
          this._hoveredUnit = null;
          this.requestUpdate();
        }}
      >
        ${hovered
          ? html`
              <div
                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-gray-200 text-center w-max text-xs bg-gray-800/90 backdrop-blur-xs rounded-sm p-1 z-[100] shadow-lg pointer-events-none"
              >
                <div class="font-bold text-sm mb-1">
                  ${translateText(
                    "unit_type." + structureKey,
                  )}${` [${displayHotkey}]`}
                </div>
                <div class="p-2">
                  ${translateText("build_menu.desc." + structureKey)}
                </div>
                ${unitType === UnitType.Warship
                  ? html`<div
                      class="mt-1 px-2 py-1 text-[10px] text-cyan-300 border-t border-white/10"
                    >
                      ⇧ ${translateText("build_menu.warship_shift_hint")}
                    </div>`
                  : null}
                <div class="flex items-center justify-center gap-1">
                  <img src=${goldCoinIcon} width="13" height="13" />
                  <span class="text-yellow-300"
                    >${renderNumber(this.cost(unitType))}</span
                  >
                </div>
              </div>
            `
          : null}
        <div
          title=${translateText("unit_type." + structureKey)}
          class="${this.canBuild(unitType)
            ? ""
            : "opacity-40"} w-14 h-16 shrink-0 snap-start border rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer overflow-hidden px-0.5
             ${selected
            ? "border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400"
            : "border-white/20 bg-slate-800/80 hover:bg-slate-700/80"}"
          @click=${() => {
            if (selected) {
              this.uiState.ghostStructure = null;
            } else if (this.canBuild(unitType)) {
              this.uiState.ghostStructure = unitType;
            }
            this.requestUpdate();
          }}
          @mouseenter=${() => {
            switch (unitType) {
              case UnitType.AtomBomb:
              case UnitType.HydrogenBomb:
                this.eventBus?.emit(
                  new ToggleStructureEvent([
                    UnitType.MissileSilo,
                    UnitType.SAMLauncher,
                  ]),
                );
                break;
              case UnitType.Warship:
                this.eventBus?.emit(new ToggleStructureEvent([UnitType.Port]));
                break;
              case UnitType.Plane:
                this.eventBus?.emit(
                  new ToggleStructureEvent([UnitType.Runway, UnitType.Plane]),
                );
                break;
              case UnitType.Tank:
                this.eventBus?.emit(
                  new ToggleStructureEvent([
                    UnitType.MilitaryBase,
                    UnitType.Tank,
                  ]),
                );
                break;
              default:
                this.eventBus?.emit(new ToggleStructureEvent([unitType]));
            }
          }}
          @mouseleave=${() =>
            this.eventBus?.emit(new ToggleStructureEvent(null))}
        >
          <div class="flex items-center justify-center gap-1">
            <span class="text-[9px] text-gray-400 leading-none"
              >${displayHotkey}</span
            >
            <img
              src=${icon}
              alt=${structureKey}
              class="size-6 object-contain"
            />
          </div>
          <div
            class="w-full text-center text-[9px] leading-tight font-semibold text-white/90 break-words"
          >
            ${translateText("unit_type." + structureKey)}
          </div>
          ${number !== null
            ? html`<div class="text-[9px] text-gray-300 leading-none">
                ${renderNumber(number)}
              </div>`
            : null}
        </div>
      </div>
    `;
  }
}
