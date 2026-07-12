import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { assetUrl } from "../../../core/AssetUrls";
import { EventBus } from "../../../core/EventBus";
import { PlayerActions } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { Controller } from "../../Controller";
import { TransformHandler } from "../../TransformHandler";
import { UIState } from "../../UIState";
import { GameView, PlayerView } from "../../view";
import { BuildMenu } from "./BuildMenu";
import { ChatIntegration } from "./ChatIntegration";
import { EmojiTable } from "./EmojiTable";
import { PlayerActionHandler } from "./PlayerActionHandler";
import { PlayerPanel } from "./PlayerPanel";
import { RadialMenu, RadialMenuConfig } from "./RadialMenu";
import {
  centerButtonElement,
  COLORS,
  MenuElementParams,
  rootMenuElement,
} from "./RadialMenuElements";
const donateTroopIcon = assetUrl("images/DonateTroopIconWhite.svg");
const swordIcon = assetUrl("images/SwordIconWhite.svg");

import { ContextMenuEvent } from "../../InputHandler";

@customElement("main-radial-menu")
export class MainRadialMenu extends LitElement implements Controller {
  private radialMenu: RadialMenu;

  private playerActionHandler: PlayerActionHandler;
  private chatIntegration: ChatIntegration;

  private clickedTile: TileRef | null = null;
  private actionQueryInFlight = false;
  private refreshRequested = false;
  private pendingScreenPosition: { x: number; y: number } | null = null;
  private queryGeneration = 0;

  getTickIntervalMs() {
    return 500;
  }

  constructor(
    private eventBus: EventBus,
    private game: GameView,
    private transformHandler: TransformHandler,
    private emojiTable: EmojiTable,
    private buildMenu: BuildMenu,
    private uiState: UIState,
    private playerPanel: PlayerPanel,
  ) {
    super();

    const menuConfig: RadialMenuConfig = {
      centerButtonIcon: swordIcon,
      tooltipStyle: `
        .radial-tooltip .cost {
          margin-top: 4px;
          color: ${COLORS.tooltip.cost};
        }
        .radial-tooltip .count {
          color: ${COLORS.tooltip.count};
        }
      `,
    };

    this.radialMenu = new RadialMenu(
      this.eventBus,
      rootMenuElement,
      centerButtonElement,
      menuConfig,
    );

    this.playerActionHandler = new PlayerActionHandler(
      this.eventBus,
      this.uiState,
    );

    this.chatIntegration = new ChatIntegration(this.game, this.eventBus);
  }

  init() {
    this.radialMenu.init();
    this.eventBus.on(ContextMenuEvent, (event) => {
      const worldCoords = this.transformHandler.screenToWorldCoordinates(
        event.x,
        event.y,
      );
      if (!this.game.isValidCoord(worldCoords.x, worldCoords.y)) {
        return;
      }
      if (this.game.myPlayer() === null) {
        return;
      }
      this.clickedTile = this.game.ref(worldCoords.x, worldCoords.y);
      this.queryGeneration++;
      this.requestActions(this.clickedTile, event.x, event.y);
    });
  }

  private async updatePlayerActions(
    myPlayer: PlayerView,
    actions: PlayerActions,
    tile: TileRef,
    screenX: number | null = null,
    screenY: number | null = null,
  ) {
    this.buildMenu.playerBuildables = actions.buildableUnits;

    const tileOwner = this.game.owner(tile);
    const recipient = tileOwner.isPlayer() ? (tileOwner as PlayerView) : null;

    if (myPlayer && recipient) {
      this.chatIntegration.setupChatModal(myPlayer, recipient);
    }

    const params: MenuElementParams = {
      myPlayer,
      selected: recipient,
      tile,
      playerActions: actions,
      game: this.game,
      buildMenu: this.buildMenu,
      emojiTable: this.emojiTable,
      playerActionHandler: this.playerActionHandler,
      playerPanel: this.playerPanel,
      chatIntegration: this.chatIntegration,
      uiState: this.uiState,
      closeMenu: () => this.closeMenu(),
      eventBus: this.eventBus,
    };

    const isFriendlyTarget =
      recipient !== null &&
      recipient.isFriendly(myPlayer) &&
      !recipient.isDisconnected();

    this.radialMenu.setCenterButtonAppearance(
      isFriendlyTarget ? donateTroopIcon : swordIcon,
      isFriendlyTarget ? "#22d3ee" : "#0f2744",
      isFriendlyTarget
        ? this.radialMenu.getDefaultCenterIconSize() * 0.75
        : this.radialMenu.getDefaultCenterIconSize(),
    );

    this.radialMenu.setParams(params);
    if (screenX !== null && screenY !== null) {
      this.radialMenu.showRadialMenu(screenX, screenY);
    } else {
      this.radialMenu.refresh();
    }
  }

  async tick() {
    if (!this.radialMenu.isMenuVisible() || this.clickedTile === null) return;
    this.requestActions(this.clickedTile);
  }

  private requestActions(
    tile: TileRef,
    screenX: number | null = null,
    screenY: number | null = null,
  ): void {
    if (this.actionQueryInFlight) {
      this.refreshRequested = true;
      if (screenX !== null && screenY !== null) {
        this.pendingScreenPosition = { x: screenX, y: screenY };
      }
      return;
    }
    const player = this.game.myPlayer();
    if (!player) return;
    const generation = this.queryGeneration;
    this.actionQueryInFlight = true;
    player
      .actions(tile)
      .then((actions) => {
        if (generation !== this.queryGeneration || this.clickedTile !== tile) {
          return;
        }
        return this.updatePlayerActions(
          player,
          actions,
          tile,
          screenX,
          screenY,
        );
      })
      .catch((error) => console.error("Failed to open action menu", error))
      .finally(() => {
        this.actionQueryInFlight = false;
        if (this.refreshRequested && this.clickedTile !== null) {
          this.refreshRequested = false;
          const position = this.pendingScreenPosition;
          this.pendingScreenPosition = null;
          this.requestActions(
            this.clickedTile,
            position?.x ?? null,
            position?.y ?? null,
          );
        }
      });
  }

  closeMenu() {
    this.queryGeneration++;
    this.refreshRequested = false;
    this.pendingScreenPosition = null;
    if (this.radialMenu.isMenuVisible()) {
      this.radialMenu.hideRadialMenu();
    }

    if (this.buildMenu.isVisible) {
      this.buildMenu.hideMenu();
    }

    if (this.emojiTable.isVisible) {
      this.emojiTable.hideTable();
    }

    if (this.playerPanel.isVisible) {
      this.playerPanel.hide();
    }
  }
}
