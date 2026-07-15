import { html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { BaseModal } from "./components/BaseModal";
import { modalHeader } from "./components/ui/ModalHeader";

type ContentSection = { title: string; text: string; tips?: string[] };
type ContentPage = {
  path: string;
  type: "Tutorial" | "Blog";
  title: string;
  description: string;
  sections: ContentSection[];
};

type ContentResponse = {
  tutorials: ContentPage[];
  blogs: ContentPage[];
};

@customElement("openback-content-modal")
export class OpenBackContentModal extends BaseModal {
  @property({ type: String, attribute: "content-kind" })
  contentKind: "guides" | "blog" = "guides";

  @state() private pages: ContentPage[] = [];
  @state() private selectedPath: string | null = null;
  @state() private loading = false;
  @state() private loadFailed = false;

  protected modalConfig() {
    return { alwaysMaximized: true, maxWidth: "72rem" };
  }

  protected renderHeaderSlot() {
    const selected = this.selectedPage;
    return modalHeader({
      title:
        selected?.title ??
        (this.contentKind === "guides" ? "Tutorials" : "Blog"),
      onBack: () => {
        if (this.selectedPath) {
          this.selectedPath = null;
        } else {
          this.close();
        }
      },
      ariaLabel: this.selectedPath ? "Back to all articles" : "Back",
    });
  }

  protected onOpen(): void {
    if (!this.loading && this.pages.length === 0) void this.loadContent();
  }

  protected onClose(): void {
    this.selectedPath = null;
  }

  private get selectedPage(): ContentPage | undefined {
    return this.pages.find((page) => page.path === this.selectedPath);
  }

  private async loadContent(): Promise<void> {
    this.loading = true;
    this.loadFailed = false;
    try {
      const response = await fetch("/api/openback/content");
      if (!response.ok)
        throw new Error(`Content request failed: ${response.status}`);
      const data = (await response.json()) as ContentResponse;
      this.pages = this.contentKind === "guides" ? data.tutorials : data.blogs;
    } catch (error) {
      console.error("Failed to load OpenBack content", error);
      this.loadFailed = true;
    } finally {
      this.loading = false;
    }
  }

  private openPage(path: string): void {
    this.selectedPath = path;
    this.scrollTo({ top: 0, behavior: "smooth" });
  }

  private renderCard(page: ContentPage): TemplateResult {
    return html`<button
      type="button"
      class="group flex h-full min-h-56 flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/95 to-slate-950/95 p-6 text-left transition-all hover:-translate-y-1 hover:border-malibu-blue/60 hover:shadow-[var(--shadow-malibu-blue-soft)]"
      @click=${() => this.openPage(page.path)}
    >
      <span
        class="text-[11px] font-black uppercase tracking-[0.18em] text-malibu-blue"
        >${page.type}</span
      >
      <h2 class="mt-3 text-xl font-black leading-tight text-white">
        ${page.title}
      </h2>
      <p class="mt-3 grow text-sm leading-6 text-slate-300">
        ${page.description}
      </p>
      <span class="mt-5 font-bold text-malibu-blue group-hover:text-white"
        >Read more &rarr;</span
      >
    </button>`;
  }

  private renderHub(): TemplateResult {
    const isGuide = this.contentKind === "guides";
    return html`<div class="mx-auto w-full max-w-6xl px-6 py-8 lg:py-12">
      <div class="mb-9 max-w-3xl">
        <span
          class="text-xs font-black uppercase tracking-[0.2em] text-malibu-blue"
          >${isGuide ? "Learn the game" : "Behind the game"}</span
        >
        <h1 class="mt-2 text-3xl font-black text-white lg:text-5xl">
          ${isGuide
            ? "OpenBack Tutorials and Strategy Guides"
            : "OpenBack Development Blog"}
        </h1>
        <p class="mt-4 text-base leading-7 text-slate-300 lg:text-lg">
          ${isGuide
            ? "Learn the maps, economy, units, multiplayer, ranked play, diplomacy, and advanced strategy without leaving the game."
            : "Read about OpenBack systems, updates, multiplayer design, and the ideas behind the battlefield."}
        </p>
      </div>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        ${this.pages.map((page) => this.renderCard(page))}
      </div>
    </div>`;
  }

  private renderArticle(page: ContentPage): TemplateResult {
    return html`<article class="mx-auto w-full max-w-4xl px-6 py-8 lg:py-12">
      <span
        class="text-xs font-black uppercase tracking-[0.2em] text-malibu-blue"
        >${page.type}</span
      >
      <h1 class="mt-2 text-3xl font-black leading-tight text-white lg:text-5xl">
        ${page.title}
      </h1>
      <p class="mt-5 text-lg leading-8 text-slate-300">${page.description}</p>
      <div class="mt-9">
        ${page.sections.map(
          (section) =>
            html`<section class="border-t border-white/10 py-7">
              <h2 class="text-2xl font-black text-blue-100">
                ${section.title}
              </h2>
              <p class="mt-3 text-base leading-7 text-slate-300">
                ${section.text}
              </p>
              ${section.tips
                ? html`<ul class="mt-4 list-disc space-y-2 pl-6 text-slate-300">
                    ${section.tips.map((tip) => html`<li>${tip}</li>`)}
                  </ul>`
                : null}
            </section>`,
        )}
      </div>
    </article>`;
  }

  protected renderBody(): TemplateResult {
    if (this.loading) {
      return html`<div
        class="flex h-full items-center justify-center p-12 text-white/60"
      >
        Loading...
      </div>`;
    }
    if (this.loadFailed) {
      return html`<div
        class="flex h-full flex-col items-center justify-center gap-4 p-12 text-center"
      >
        <p class="text-red-300">The content could not be loaded.</p>
        <button
          class="rounded-xl bg-malibu-blue px-5 py-3 font-bold text-slate-950"
          @click=${() => void this.loadContent()}
        >
          Try again
        </button>
      </div>`;
    }
    return this.selectedPage
      ? this.renderArticle(this.selectedPage)
      : this.renderHub();
  }
}
