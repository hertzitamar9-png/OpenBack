import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  FriendEntry,
  SocialChatMessage,
  SocialConversation,
} from "../../core/ApiSchemas";
import {
  createGroupConversation,
  fetchClanMessages,
  fetchConversationMessages,
  fetchConversations,
  openDirectConversation,
  sendClanMessage,
  sendConversationMessage,
} from "../ChatApi";
import { showToast, translateText } from "../Utils";

@customElement("social-chat")
export class SocialChat extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) friends: FriendEntry[] = [];
  @property({ type: String }) clanTag = "";
  @property({ type: String }) myPublicId = "";

  @state() private conversations: SocialConversation[] = [];
  @state() private selectedId = "";
  @state() private messages: SocialChatMessage[] = [];
  @state() private messageText = "";
  @state() private groupName = "";
  @state() private groupMembers = new Set<string>();
  @state() private showGroupCreator = false;
  @state() private busy = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private readonly openChatListener = (event: Event) => {
    const publicId = (event as CustomEvent<{ publicId?: string }>).detail
      ?.publicId;
    if (publicId) void this.openDirect(publicId);
  };

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("open-friend-chat", this.openChatListener);
    void this.loadConversations();
    this.pollTimer = setInterval(() => void this.refreshMessages(), 4000);
  }

  disconnectedCallback(): void {
    document.removeEventListener("open-friend-chat", this.openChatListener);
    if (this.pollTimer) clearInterval(this.pollTimer);
    super.disconnectedCallback();
  }

  private async loadConversations(): Promise<void> {
    this.conversations = await fetchConversations();
  }

  private async openDirect(publicId: string): Promise<void> {
    const conversation = await openDirectConversation(publicId);
    if (!conversation) {
      showToast(translateText("social_chat.open_failed"), "red");
      return;
    }
    if (!this.conversations.some((item) => item.id === conversation.id)) {
      this.conversations = [conversation, ...this.conversations];
    }
    this.selectedId = conversation.id;
    await this.refreshMessages();
  }

  private async selectConversation(id: string): Promise<void> {
    this.selectedId = id;
    await this.refreshMessages();
  }

  private async refreshMessages(): Promise<void> {
    if (!this.selectedId || this.busy) return;
    this.messages = this.selectedId.startsWith("clan:")
      ? await fetchClanMessages(this.selectedId.slice(5))
      : await fetchConversationMessages(this.selectedId);
  }

  private async sendMessage(): Promise<void> {
    const text = this.messageText.trim();
    if (!text || !this.selectedId || this.busy) return;
    this.busy = true;
    try {
      const message = this.selectedId.startsWith("clan:")
        ? await sendClanMessage(this.selectedId.slice(5), text)
        : await sendConversationMessage(this.selectedId, text);
      if (!message) {
        showToast(translateText("social_chat.send_failed"), "red");
        return;
      }
      this.messageText = "";
      this.messages = [...this.messages, message];
      await this.loadConversations();
    } finally {
      this.busy = false;
    }
  }

  private toggleGroupMember(publicId: string): void {
    const next = new Set(this.groupMembers);
    if (next.has(publicId)) next.delete(publicId);
    else next.add(publicId);
    this.groupMembers = next;
  }

  private async createGroup(): Promise<void> {
    if (!this.groupName.trim() || this.groupMembers.size === 0 || this.busy)
      return;
    this.busy = true;
    try {
      const conversation = await createGroupConversation(
        this.groupName.trim(),
        [...this.groupMembers],
      );
      if (!conversation) {
        showToast(translateText("social_chat.group_failed"), "red");
        return;
      }
      this.groupName = "";
      this.groupMembers = new Set();
      this.showGroupCreator = false;
      this.conversations = [conversation, ...this.conversations];
      await this.selectConversation(conversation.id);
    } finally {
      this.busy = false;
    }
  }

  private channelName(conversation: SocialConversation): string {
    return conversation.kind === "group"
      ? `# ${conversation.name}`
      : conversation.name;
  }

  render(): TemplateResult {
    const selectedName = this.selectedId.startsWith("clan:")
      ? `[${this.clanTag}] ${translateText("social_chat.clan_chat")}`
      : this.conversations.find((item) => item.id === this.selectedId)?.name;
    return html`
      <div class="bg-white/5 rounded-xl border border-white/10 p-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h3 class="text-lg font-bold text-white">
            ${translateText("social_chat.title")}
          </h3>
          <button
            class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
            @click=${() => (this.showGroupCreator = !this.showGroupCreator)}
          >
            ${translateText("social_chat.new_group")}
          </button>
        </div>
        ${this.showGroupCreator ? this.renderGroupCreator() : ""}
        <div
          class="grid min-h-[360px] grid-cols-1 md:grid-cols-[190px_1fr] overflow-hidden rounded-xl border border-white/10 bg-[#09111e]"
        >
          <div
            class="border-b md:border-b-0 md:border-r border-white/10 p-2 space-y-1 max-h-44 md:max-h-[420px] overflow-y-auto"
          >
            ${this.clanTag
              ? this.renderChannel(
                  `clan:${this.clanTag}`,
                  `[${this.clanTag}] ${translateText("social_chat.clan_chat")}`,
                )
              : ""}
            ${this.conversations.map((conversation) =>
              this.renderChannel(
                conversation.id,
                this.channelName(conversation),
              ),
            )}
            ${!this.clanTag && this.conversations.length === 0
              ? html`<p class="p-3 text-xs text-white/35">
                  ${translateText("social_chat.no_chats")}
                </p>`
              : ""}
          </div>
          <div class="flex min-h-[360px] flex-col">
            ${this.selectedId
              ? html`
                  <div
                    class="border-b border-white/10 px-4 py-3 text-sm font-bold text-white"
                  >
                    ${selectedName}
                  </div>
                  <div
                    class="flex-1 space-y-3 overflow-y-auto p-4 max-h-[310px]"
                  >
                    ${this.messages.map((message) =>
                      this.renderMessage(message),
                    )}
                  </div>
                  <div class="flex gap-2 border-t border-white/10 p-3">
                    <input
                      class="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none"
                      maxlength="500"
                      .value=${this.messageText}
                      @input=${(event: Event) =>
                        (this.messageText = (
                          event.target as HTMLInputElement
                        ).value)}
                      @keydown=${(event: KeyboardEvent) => {
                        if (event.key === "Enter") void this.sendMessage();
                      }}
                      placeholder=${translateText(
                        "social_chat.message_placeholder",
                      )}
                    />
                    <button
                      class="rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40"
                      ?disabled=${this.busy || !this.messageText.trim()}
                      @click=${() => void this.sendMessage()}
                    >
                      ${translateText("social_chat.send")}
                    </button>
                  </div>
                `
              : html`<div
                  class="flex flex-1 items-center justify-center p-8 text-center text-sm text-white/35"
                >
                  ${translateText("social_chat.select_chat")}
                </div>`}
          </div>
        </div>
      </div>
    `;
  }

  private renderChannel(id: string, name: string): TemplateResult {
    return html`<button
      class="w-full truncate rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${this
        .selectedId === id
        ? "bg-blue-500/20 text-blue-300"
        : "text-white/60 hover:bg-white/5 hover:text-white"}"
      @click=${() => void this.selectConversation(id)}
    >
      ${name}
    </button>`;
  }

  private renderMessage(message: SocialChatMessage): TemplateResult {
    const mine = message.sender === this.myPublicId;
    return html`<div class="flex ${mine ? "justify-end" : "justify-start"}">
      <div
        class="max-w-[85%] rounded-xl border px-3 py-2 ${mine
          ? "border-blue-500/30 bg-blue-500/15"
          : "border-white/10 bg-white/5"}"
      >
        <div class="mb-1 text-[10px] font-bold text-white/45">
          ${message.senderName ?? message.sender}
        </div>
        <p class="whitespace-pre-wrap break-words text-sm text-white/90">
          ${message.text}
        </p>
      </div>
    </div>`;
  }

  private renderGroupCreator(): TemplateResult {
    return html`<div
      class="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"
    >
      <input
        class="mb-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
        maxlength="40"
        .value=${this.groupName}
        @input=${(event: Event) =>
          (this.groupName = (event.target as HTMLInputElement).value)}
        placeholder=${translateText("social_chat.group_name")}
      />
      <div
        class="mb-3 grid max-h-32 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2"
      >
        ${this.friends.map(
          (friend) =>
            html`<label
              class="flex cursor-pointer items-center gap-2 rounded-lg bg-white/5 p-2 text-xs text-white/70"
            >
              <input
                type="checkbox"
                .checked=${this.groupMembers.has(friend.publicId)}
                @change=${() => this.toggleGroupMember(friend.publicId)}
              />
              <span class="truncate"
                >${friend.displayName ?? friend.publicId}</span
              >
            </label>`,
        )}
      </div>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
        ?disabled=${this.busy ||
        !this.groupName.trim() ||
        this.groupMembers.size === 0}
        @click=${() => void this.createGroup()}
      >
        ${translateText("social_chat.create_group")}
      </button>
    </div>`;
  }
}
