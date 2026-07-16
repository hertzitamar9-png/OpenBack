import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { FriendEntry } from "../../core/ApiSchemas";
import { fetchFriends } from "../FriendsApi";
import { socialClient, type SocialInvite } from "../SocialClient";
import { showToast, translateText } from "../Utils";

@customElement("friend-invite-panel")
export class FriendInvitePanel extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) invite: SocialInvite | null = null;
  @property({ type: String }) title = "";
  @state() private friends: FriendEntry[] = [];
  @state() private loading = true;
  @state() private pending = new Set<string>();

  connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    const result = await fetchFriends(1, 100);
    this.friends = result ? result.results : [];
    this.loading = false;
  }

  private async inviteFriend(friend: FriendEntry): Promise<void> {
    if (!this.invite || this.pending.has(friend.publicId)) return;
    this.pending = new Set(this.pending).add(friend.publicId);
    const delivered = await socialClient.invite(friend.publicId, this.invite);
    const next = new Set(this.pending);
    next.delete(friend.publicId);
    this.pending = next;
    showToast(
      translateText(
        delivered ? "friends.invite_delivered" : "friends.invite_offline",
        { player: friend.displayName ?? friend.publicId },
      ),
      delivered ? "green" : "red",
    );
  }

  render() {
    if (!this.invite) return nothing;
    return html`
      <section class="rounded-xl border border-cyan-500/25 bg-slate-950/45 p-4">
        <h3
          class="mb-3 text-sm font-black uppercase tracking-widest text-cyan-300"
        >
          ${this.title || translateText("friends.invite_friends")}
        </h3>
        ${this.loading
          ? html`<p class="text-sm text-white/50">
              ${translateText("friends.loading")}
            </p>`
          : this.friends.length === 0
            ? html`<p class="text-sm text-white/50">
                ${translateText("friends.no_friends_to_invite")}
              </p>`
            : html`
                <div class="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                  ${this.friends.map(
                    (friend) => html`
                      <div
                        class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2"
                      >
                        <span
                          class="min-w-0 flex-1 truncate text-sm text-white"
                        >
                          ${friend.displayName ?? friend.publicId}
                        </span>
                        <button
                          class="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-cyan-600 disabled:opacity-40"
                          ?disabled=${this.pending.has(friend.publicId)}
                          @click=${() => void this.inviteFriend(friend)}
                        >
                          ${this.pending.has(friend.publicId)
                            ? translateText("friends.sending_invite")
                            : translateText("friends.invite")}
                        </button>
                      </div>
                    `,
                  )}
                </div>
              `}
      </section>
    `;
  }
}
