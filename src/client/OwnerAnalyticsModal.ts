import { html, nothing, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { z } from "zod";
import type {
  OwnerAnalyticsBreakdownSchema,
  OwnerAnalyticsResponse,
} from "../core/ApiSchemas";
import { fetchOwnerAnalytics } from "./Api";
import { BaseModal } from "./components/BaseModal";
import { modalHeader } from "./components/ui/ModalHeader";
import { formatLastOnline } from "./utilities/LastOnline";
import { translateText } from "./Utils";

type Breakdown = z.infer<typeof OwnerAnalyticsBreakdownSchema>;

@customElement("owner-analytics-modal")
export class OwnerAnalyticsModal extends BaseModal {
  protected routerName = "analytics";

  @state() private analytics: OwnerAnalyticsResponse | null = null;
  @state() private loading = true;
  @state() private failed = false;
  @state() private search = "";
  @state() private refreshing = false;
  @state() private expandedPlayerId: string | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private requestGeneration = 0;

  protected modalConfig() {
    return { maxWidth: "1180px", alwaysMaximized: true };
  }

  protected renderHeaderSlot() {
    return modalHeader({
      title: translateText("analytics.title"),
      onBack: () => this.close(),
      ariaLabel: translateText("common.back"),
      rightContent: html`
        <div
          class="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300"
        >
          <span
            class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.9)]"
          ></span>
          ${translateText("analytics.live")}
        </div>
      `,
    });
  }

  protected onOpen(): void {
    this.loading = this.analytics === null;
    this.failed = false;
    void this.refresh();
    this.stopTimer();
    this.refreshTimer = setInterval(() => {
      if (!document.hidden) void this.refresh();
    }, 5_000);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  protected onClose(): void {
    this.stopTimer();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private readonly onVisibilityChange = () => {
    if (!document.hidden) void this.refresh();
  };

  private stopTimer(): void {
    if (this.refreshTimer !== null) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return;
    const generation = ++this.requestGeneration;
    this.refreshing = true;
    const next = await fetchOwnerAnalytics();
    if (generation !== this.requestGeneration) return;
    this.refreshing = false;
    this.loading = false;
    if (next === false) {
      this.failed = this.analytics === null;
      return;
    }
    this.analytics = next;
    this.failed = false;
  }

  private togglePlayer(publicId: string): void {
    this.expandedPlayerId =
      this.expandedPlayerId === publicId ? null : publicId;
  }

  protected renderBody(): TemplateResult {
    if (this.loading) {
      return html`<div class="flex min-h-[24rem] items-center justify-center">
        <div
          class="h-11 w-11 animate-spin rounded-full border-4 border-malibu-blue/20 border-t-malibu-blue"
        ></div>
      </div>`;
    }
    if (this.failed || this.analytics === null) {
      return html`<div
        class="m-6 flex min-h-[22rem] flex-col items-center justify-center gap-4 rounded-2xl border border-red-400/20 bg-red-400/5 text-center"
      >
        <p class="text-sm text-red-200">${translateText("analytics.failed")}</p>
        <button
          class="rounded-xl border border-malibu-blue/35 bg-malibu-blue/15 px-5 py-2 text-xs font-bold uppercase tracking-wider text-malibu-blue hover:bg-malibu-blue/25"
          @click=${() => void this.refresh()}
        >
          ${translateText("leaderboard_modal.try_again")}
        </button>
      </div>`;
    }

    const data = this.analytics;
    const players = data.players.filter((player) => {
      const needle = this.search.trim().toLowerCase();
      return (
        !needle ||
        player.username.toLowerCase().includes(needle) ||
        player.publicId.toLowerCase().includes(needle)
      );
    });
    const averageSeconds = data.totals.playerGameSessions
      ? Math.round(
          data.totals.totalPlaySeconds / data.totals.playerGameSessions,
        )
      : 0;

    return html`
      <div class="custom-scrollbar h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div class="mx-auto max-w-[1120px] space-y-6">
          <div
            class="relative overflow-hidden rounded-3xl border border-malibu-blue/25 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,.22),transparent_42%),linear-gradient(135deg,rgba(9,22,39,.98),rgba(4,10,20,.98))] p-5 sm:p-7"
          >
            <div
              class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-malibu-blue/10 blur-3xl"
            ></div>
            <div
              class="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
              <div>
                <div
                  class="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-malibu-blue"
                >
                  ${translateText("analytics.owner_only")}
                </div>
                <h2
                  class="text-2xl font-black tracking-tight text-white sm:text-3xl"
                >
                  ${translateText("analytics.heading")}
                </h2>
                <p class="mt-2 max-w-2xl text-sm text-white/55">
                  ${translateText("analytics.description")}
                </p>
              </div>
              <div class="text-xs text-white/35 tabular-nums">
                ${translateText("analytics.updated", {
                  time: new Date(data.measuredAt).toLocaleTimeString(),
                })}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            ${this.metricCard(
              translateText("analytics.online"),
              data.totals.onlinePlayers.toLocaleString(),
              translateText("analytics.right_now"),
              "emerald",
            )}
            ${this.metricCard(
              translateText("analytics.registered"),
              data.totals.registeredPlayers.toLocaleString(),
              translateText("analytics.owner_excluded"),
              "blue",
            )}
            ${this.metricCard(
              translateText("analytics.completed_games"),
              data.totals.completedMatches.toLocaleString(),
              translateText("analytics.authoritative_records"),
              "violet",
            )}
            ${this.metricCard(
              translateText("analytics.total_playtime"),
              this.formatDuration(data.totals.totalPlaySeconds),
              translateText("analytics.player_time"),
              "amber",
            )}
          </div>

          <div class="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <section
              class="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <h3
                class="mb-4 text-sm font-black uppercase tracking-[0.14em] text-white/80"
              >
                ${translateText("analytics.engagement")}
              </h3>
              <div class="grid grid-cols-3 gap-3">
                ${this.smallStat(
                  translateText("analytics.active_24h"),
                  data.activePlayers.day,
                )}
                ${this.smallStat(
                  translateText("analytics.active_7d"),
                  data.activePlayers.week,
                )}
                ${this.smallStat(
                  translateText("analytics.active_30d"),
                  data.activePlayers.month,
                )}
              </div>
              <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                ${this.compactStat(
                  translateText("analytics.players_with_games"),
                  data.totals.playersWithGames,
                )}
                ${this.compactStat(
                  translateText("analytics.returning"),
                  data.totals.returningPlayers,
                )}
                ${this.compactStat(
                  translateText("analytics.player_sessions"),
                  data.totals.playerGameSessions,
                )}
                ${this.compactStat(
                  translateText("analytics.average_session"),
                  this.formatDuration(averageSeconds),
                )}
              </div>
            </section>
            <section
              class="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <h3
                class="mb-4 text-sm font-black uppercase tracking-[0.14em] text-white/80"
              >
                ${translateText("analytics.new_players")}
              </h3>
              <div class="space-y-3">
                ${this.registrationRow(
                  translateText("analytics.last_24h"),
                  data.registrations.day,
                  data.totals.registeredPlayers,
                )}
                ${this.registrationRow(
                  translateText("analytics.last_7d"),
                  data.registrations.week,
                  data.totals.registeredPlayers,
                )}
                ${this.registrationRow(
                  translateText("analytics.last_30d"),
                  data.registrations.month,
                  data.totals.registeredPlayers,
                )}
              </div>
            </section>
          </div>

          <div class="grid gap-4 lg:grid-cols-3">
            ${this.breakdownCard(
              translateText("analytics.game_modes"),
              data.gameModes,
            )}
            ${this.breakdownCard(
              translateText("analytics.game_types"),
              data.gameTypes,
            )}
            ${this.breakdownCard(
              translateText("analytics.experiences"),
              data.experiences,
            )}
          </div>

          <section
            class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"
          >
            <div
              class="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3
                  class="text-sm font-black uppercase tracking-[0.14em] text-white/80"
                >
                  ${translateText("analytics.players")}
                </h3>
                <p class="mt-1 text-xs text-white/35">
                  ${translateText("analytics.players_help")}
                </p>
              </div>
              <input
                class="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-malibu-blue/50 sm:w-72"
                type="search"
                .value=${this.search}
                @input=${(event: Event) =>
                  (this.search = (event.target as HTMLInputElement).value)}
                placeholder=${translateText("analytics.search_players")}
              />
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[960px] text-left text-sm">
                <thead
                  class="bg-black/20 text-[10px] uppercase tracking-wider text-white/35"
                >
                  <tr>
                    <th class="px-4 py-3">
                      ${translateText("analytics.player")}
                    </th>
                    <th class="px-4 py-3">
                      ${translateText("analytics.last_online")}
                    </th>
                    <th class="px-4 py-3 text-right">
                      ${translateText("analytics.games")}
                    </th>
                    <th class="px-4 py-3 text-right">
                      ${translateText("analytics.playtime")}
                    </th>
                    <th class="px-4 py-3 text-right">
                      ${translateText("analytics.wins")}
                    </th>
                    <th class="px-4 py-3">
                      ${translateText("analytics.favorite_mode")}
                    </th>
                    <th class="px-4 py-3">
                      ${translateText("analytics.selected_flag")}
                    </th>
                    <th class="px-4 py-3">
                      ${translateText("analytics.approximate_country")}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/[0.06]">
                  ${players.map(
                    (player) => html`
                      <tr
                        data-analytics-player=${player.publicId}
                        class="cursor-pointer hover:bg-white/[0.055]"
                        tabindex="0"
                        @click=${() => this.togglePlayer(player.publicId)}
                        @keydown=${(event: KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            this.togglePlayer(player.publicId);
                          }
                        }}
                      >
                        <td class="px-4 py-3">
                          <div class="font-bold text-white">
                            ${player.username}
                          </div>
                          <div class="text-[10px] text-white/30">
                            ${player.publicId}
                          </div>
                        </td>
                        <td
                          class="px-4 py-3 ${player.online
                            ? "text-emerald-300"
                            : "text-white/55"}"
                        >
                          ${formatLastOnline(player.lastSeenAt, player.online)}
                        </td>
                        <td
                          class="px-4 py-3 text-right tabular-nums text-white/75"
                        >
                          ${player.gamesPlayed.toLocaleString()}
                        </td>
                        <td
                          class="px-4 py-3 text-right tabular-nums text-white/75"
                        >
                          ${this.formatDuration(player.playSeconds)}
                        </td>
                        <td
                          class="px-4 py-3 text-right tabular-nums text-white/75"
                        >
                          ${player.wins.toLocaleString()}
                        </td>
                        <td class="px-4 py-3 text-white/55">
                          ${player.favoriteMode ?? "—"}
                        </td>
                        <td
                          class="max-w-36 truncate px-4 py-3 text-white/55"
                          title=${player.selectedFlag ?? ""}
                        >
                          ${player.selectedFlag ?? "—"}
                        </td>
                        <td class="px-4 py-3 font-bold text-white/70">
                          ${player.approximateCountry ?? "Unknown"}
                        </td>
                      </tr>
                      ${this.expandedPlayerId === player.publicId
                        ? html`<tr>
                            <td colspan="8" class="bg-black/20 p-0">
                              ${this.renderPlayerDetail(player)}
                            </td>
                          </tr>`
                        : nothing}
                    `,
                  )}
                </tbody>
              </table>
              ${players.length === 0
                ? html`<div class="p-10 text-center text-sm text-white/35">
                    ${translateText("analytics.no_players")}
                  </div>`
                : nothing}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  private metricCard(
    label: string,
    value: string,
    detail: string,
    color: "emerald" | "blue" | "violet" | "amber",
  ): TemplateResult {
    const colors = {
      emerald: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300",
      blue: "border-malibu-blue/20 bg-malibu-blue/[0.06] text-malibu-blue",
      violet: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300",
      amber: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
    };
    return html`<div class="rounded-2xl border p-4 sm:p-5 ${colors[color]}">
      <div
        class="text-[10px] font-black uppercase tracking-[0.16em] opacity-70"
      >
        ${label}
      </div>
      <div class="mt-2 text-2xl font-black tabular-nums sm:text-3xl">
        ${value}
      </div>
      <div class="mt-1 text-[10px] text-white/35">${detail}</div>
    </div>`;
  }

  private renderPlayerDetail(
    player: OwnerAnalyticsResponse["players"][number],
  ): TemplateResult {
    const value = (label: string, content: string) => html`
      <div class="rounded-xl border border-white/10 bg-white/[0.035] p-3">
        <div
          class="text-[9px] font-bold uppercase tracking-wider text-white/30"
        >
          ${label}
        </div>
        <div class="mt-1 break-words text-xs font-semibold text-white/75">
          ${content}
        </div>
      </div>
    `;
    return html`
      <div
        data-analytics-detail=${player.publicId}
        class="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]"
      >
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            ${value(
              translateText("analytics.account_email"),
              player.email ?? "—",
            )}
            ${value(translateText("analytics.player_id"), player.publicId)}
            ${value(
              translateText("analytics.created"),
              new Date(player.createdAt).toLocaleString(),
            )}
            ${value(
              translateText("analytics.selected_flag"),
              player.selectedFlag ?? "—",
            )}
            ${value(
              translateText("analytics.approximate_country"),
              player.approximateCountry ?? "Unknown",
            )}
            ${value(
              translateText("analytics.cosmetic"),
              player.selectedCosmetic ?? "—",
            )}
            ${value(
              translateText("analytics.clans"),
              player.clans.length
                ? player.clans
                    .map((clan) => `[${clan.tag}] ${clan.name}`)
                    .join(", ")
                : "—",
            )}
            ${value(
              translateText("analytics.profile_picture"),
              player.hasProfilePicture
                ? translateText("common.yes")
                : translateText("common.no"),
            )}
            ${value(
              translateText("analytics.results"),
              `${player.wins}W · ${player.losses}L · ${player.incompleteGames} incomplete`,
            )}
            ${value(
              translateText("analytics.average_game"),
              this.formatDuration(player.averageGameSeconds),
            )}
            ${value(
              translateText("analytics.first_game"),
              player.firstGameAt
                ? new Date(player.firstGameAt).toLocaleString()
                : "—",
            )}
            ${value(
              translateText("analytics.last_game"),
              player.lastGameAt
                ? new Date(player.lastGameAt).toLocaleString()
                : "—",
            )}
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          ${this.detailBreakdown(
            translateText("analytics.game_modes"),
            player.modeBreakdown,
          )}
          ${this.detailBreakdown(
            translateText("analytics.game_types"),
            player.typeBreakdown,
          )}
          ${this.detailBreakdown(
            translateText("analytics.experiences"),
            player.experienceBreakdown,
          )}
          ${this.detailBreakdown(
            translateText("analytics.maps"),
            player.mapBreakdown,
          )}
        </div>
      </div>
    `;
  }

  private detailBreakdown(title: string, entries: Breakdown[]): TemplateResult {
    return html`
      <section class="rounded-xl border border-white/10 bg-black/15 p-3">
        <h4
          class="text-[10px] font-black uppercase tracking-wider text-malibu-blue"
        >
          ${title}
        </h4>
        <div class="mt-2 space-y-1.5">
          ${entries.length
            ? entries.slice(0, 8).map(
                (entry) =>
                  html`<div
                    class="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span class="truncate text-white/55">${entry.key}</span>
                    <span class="shrink-0 tabular-nums text-white/75">
                      ${entry.games} · ${this.formatDuration(entry.playSeconds)}
                    </span>
                  </div>`,
              )
            : html`<div class="text-[11px] text-white/25">—</div>`}
        </div>
      </section>
    `;
  }

  private smallStat(label: string, value: number): TemplateResult {
    return html`<div
      class="rounded-xl border border-white/10 bg-black/15 p-3 text-center"
    >
      <div class="text-xl font-black tabular-nums text-white">${value}</div>
      <div
        class="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/35"
      >
        ${label}
      </div>
    </div>`;
  }

  private compactStat(label: string, value: string | number): TemplateResult {
    return html`<div class="rounded-xl bg-white/[0.035] p-3">
      <div class="text-base font-black tabular-nums text-white/85">
        ${value}
      </div>
      <div class="mt-1 text-[9px] uppercase tracking-wider text-white/30">
        ${label}
      </div>
    </div>`;
  }

  private registrationRow(
    label: string,
    value: number,
    total: number,
  ): TemplateResult {
    const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0;
    return html`<div>
      <div class="mb-1.5 flex items-center justify-between text-xs">
        <span class="text-white/50">${label}</span>
        <span class="font-bold tabular-nums text-white">${value}</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          class="h-full rounded-full bg-gradient-to-r from-malibu-blue to-cyan-300"
          style="width:${percentage}%"
        ></div>
      </div>
    </div>`;
  }

  private breakdownCard(title: string, entries: Breakdown[]): TemplateResult {
    const maximum = Math.max(1, ...entries.map((entry) => entry.games));
    return html`<section
      class="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
    >
      <h3
        class="mb-4 text-sm font-black uppercase tracking-[0.14em] text-white/80"
      >
        ${title}
      </h3>
      <div class="space-y-3">
        ${entries.length === 0
          ? html`<p class="py-6 text-center text-xs text-white/30">—</p>`
          : entries.slice(0, 8).map(
              (entry) =>
                html`<div>
                  <div
                    class="mb-1 flex items-center justify-between gap-2 text-xs"
                  >
                    <span class="truncate text-white/60">${entry.key}</span>
                    <span class="shrink-0 font-bold tabular-nums text-white/80">
                      ${entry.games}
                    </span>
                  </div>
                  <div class="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-malibu-blue/70 to-cyan-300"
                      style="width:${Math.max(
                        3,
                        (entry.games / maximum) * 100,
                      )}%"
                    ></div>
                  </div>
                  <div class="mt-1 text-[9px] text-white/25">
                    ${entry.players} ${translateText("analytics.players_lower")}
                    · ${this.formatDuration(entry.playSeconds)}
                  </div>
                </div>`,
            )}
      </div>
    </section>`;
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (hours > 0) return `${hours}h ${remaining}m`;
    return `${minutes}m`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "owner-analytics-modal": OwnerAnalyticsModal;
  }
}
