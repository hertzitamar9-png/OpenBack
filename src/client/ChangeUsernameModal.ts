import { html, TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { UserMeResponse } from "../core/ApiSchemas";
import "./components/UsernamePanel";
import { ProfileMenuModal } from "./ProfileMenuModal";
import { translateText } from "./Utils";

/**
 * Standalone account-username management opened from the nav profile menu.
 * This transient overlay keeps the parent page URL unchanged.
 */
@customElement("change-username-modal")
export class ChangeUsernameModal extends ProfileMenuModal {
  protected titleKey = "change_username_modal.title";

  protected renderSignedIn(userMe: UserMeResponse): TemplateResult {
    const player = userMe.player;
    // Older backends don't return the username fields; the panel renders
    // nothing for them, so say why instead of showing an empty modal.
    if (player.usernameStatus === undefined) {
      return html`
        <div class="p-6">
          <div
            class="bg-white/5 rounded-xl border border-white/10 p-8 text-center"
          >
            <p class="text-white/60 text-sm">
              ${translateText("change_username_modal.unavailable")}
            </p>
          </div>
        </div>
      `;
    }
    return html`
      <div class="custom-scrollbar mr-1">
        <div class="p-6">
          <username-panel .player=${player}></username-panel>
        </div>
      </div>
    `;
  }
}
