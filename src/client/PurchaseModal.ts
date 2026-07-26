import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { UserMeResponse, UserMeResponseSchema } from "../core/ApiSchemas";
import { getApiBase, getUserMe, invalidateUserMe, setLastUserMe } from "./Api";
import { userAuth } from "./Auth";
import { BaseModal } from "./components/BaseModal";
import { modalHeader } from "./components/ui/ModalHeader";

interface PurchaseConfig {
  enabled: boolean;
  clientId?: string;
  amount?: string;
  currency?: string;
}

type PurchaseStep = "intro" | "email" | "checkout";

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: Record<string, unknown>) => {
        render: (target: HTMLElement) => Promise<void>;
      };
    };
  }
}

@customElement("purchase-modal")
export class PurchaseModal extends BaseModal {
  @state() private config: PurchaseConfig | null = null;
  @state() private userMe: UserMeResponse | false = false;
  @state() private step: PurchaseStep = "intro";
  @state() private email = "";
  @state() private loading = true;
  @state() private error = "";
  @state() private source: "multiplayer" | "ranked" | "frootz" = "multiplayer";
  @query("#paypal-buttons") private paypalContainer?: HTMLElement;
  private paypalRendered = false;

  constructor() {
    super();
    document.addEventListener("openPurchaseCheckout", (event: Event) => {
      const email = (event as CustomEvent<{ email?: string }>).detail?.email;
      if (!email) return;
      this.open({ step: "checkout", email });
    });
  }

  protected modalConfig() {
    return { maxWidth: "620px" };
  }

  protected renderHeaderSlot() {
    return modalHeader({
      title: "OpenBack Lifetime Access",
      onBack: () => this.goBack(),
      ariaLabel: "Back",
    });
  }

  protected onOpen(args?: Record<string, unknown>): void {
    this.error = "";
    this.config = null;
    this.loading = true;
    this.paypalRendered = false;
    this.source =
      args?.source === "ranked" || args?.source === "frootz"
        ? args.source
        : "multiplayer";
    const requestedStep = args?.step;
    this.step =
      requestedStep === "checkout" || requestedStep === "email"
        ? requestedStep
        : "intro";
    this.email = typeof args?.email === "string" ? args.email.trim() : "";
    void this.loadAccount();
  }

  private async loadAccount() {
    try {
      const userMe = await getUserMe();
      this.userMe = userMe && userMe.user.email ? userMe : false;
      if (this.userMe) {
        this.email ||= this.userMe.user.email ?? "";
        if (this.userMe.player.lifetimeAccess) {
          this.close();
          this.showUnlockedMessage();
          return;
        }
      }
    } catch {
      this.error = "Could not check your OpenBack account.";
    } finally {
      this.loading = false;
    }
    if (this.step === "checkout") await this.prepareCheckout();
  }

  private featureName() {
    if (this.source === "ranked") return "Ranked";
    if (this.source === "frootz") return "Frootz maps";
    return "Multiplayer";
  }

  private beginPurchase() {
    this.error = "";
    this.step = "email";
    this.email = this.userMe ? (this.userMe.user.email ?? "") : "";
  }

  private handleEmailInput(event: Event) {
    this.email = (event.target as HTMLInputElement).value;
    this.error = "";
  }

  private async verifyPurchaseEmail() {
    const email = this.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      this.error = "Enter a valid email address.";
      return;
    }
    this.loading = true;
    this.error = "";
    try {
      const response = await fetch(`${getApiBase()}/purchase/account-status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as {
        exists?: boolean;
        error?: string;
      };
      if (!response.ok || typeof body.exists !== "boolean") {
        throw new Error(body.error ?? "account_check_failed");
      }

      const signedInEmail = this.userMe
        ? this.userMe.user.email?.toLowerCase()
        : undefined;
      if (signedInEmail === email) {
        this.step = "checkout";
        await this.prepareCheckout();
        return;
      }

      this.close();
      (
        document.querySelector("account-modal") as {
          open: (args?: Record<string, unknown>) => void;
        } | null
      )?.open({
        authMode: body.exists ? "login" : "signup",
        email,
        returnToPurchase: true,
      });
    } catch {
      this.error = "Could not verify that email. Please try again.";
    } finally {
      this.loading = false;
    }
  }

  private async prepareCheckout() {
    if (!this.userMe) {
      this.step = "email";
      return;
    }
    if (
      this.userMe.user.email?.toLowerCase() !== this.email.trim().toLowerCase()
    ) {
      this.step = "email";
      this.error = "Verify the email account that will own this purchase.";
      return;
    }
    this.loading = true;
    this.error = "";
    try {
      const response = await fetch(`${getApiBase()}/purchase/config`);
      this.config = (await response.json()) as PurchaseConfig;
      if (!this.config.enabled || !this.config.clientId) {
        this.error = "Purchases are temporarily unavailable.";
        return;
      }
      await this.loadPayPal(
        this.config.clientId,
        this.config.currency ?? "USD",
      );
      await this.updateComplete;
      await this.renderPayPal();
    } catch {
      this.error = "Could not connect to the payment service.";
    } finally {
      this.loading = false;
      await this.updateComplete;
      if (!this.error) await this.renderPayPal();
    }
  }

  private loadPayPal(clientId: string, currency: string): Promise<void> {
    if (window.paypal) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[data-openback-paypal]",
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.dataset.openbackPaypal = "true";
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.append(script);
    });
  }

  private async authedPost(path: string, body: unknown): Promise<Response> {
    const auth = await userAuth();
    if (!auth) throw new Error("auth_unavailable");
    return fetch(`${getApiBase()}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.jwt}`,
      },
      body: JSON.stringify(body),
    });
  }

  private async renderPayPal() {
    if (this.paypalRendered || !this.paypalContainer || !window.paypal) return;
    this.paypalRendered = true;
    await window.paypal
      .Buttons({
        style: { layout: "vertical", shape: "rect", label: "paypal" },
        createOrder: async () => {
          const response = await this.authedPost("/purchase/paypal/order", {});
          const body = await response.json();
          if (!response.ok || !body.orderId) {
            throw new Error(body.error ?? "payment_failed");
          }
          return body.orderId;
        },
        onApprove: async (data: { orderID: string }) => {
          const response = await this.authedPost("/purchase/paypal/capture", {
            orderId: data.orderID,
          });
          const body = await response.json();
          const parsed = UserMeResponseSchema.safeParse(body.userMe);
          if (!response.ok || !parsed.success) {
            this.error = "The payment could not be verified.";
            return;
          }
          invalidateUserMe();
          this.userMe = parsed.data;
          setLastUserMe(parsed.data);
          document.dispatchEvent(
            new CustomEvent("userMeResponse", { detail: parsed.data }),
          );
          this.close();
          this.showUnlockedMessage();
        },
        onError: () => {
          this.error = "PayPal could not complete the purchase.";
        },
        onCancel: () => {
          this.error = "Payment cancelled. You were not charged.";
        },
      })
      .render(this.paypalContainer);
  }

  private showUnlockedMessage() {
    window.dispatchEvent(
      new CustomEvent("show-message", {
        detail: {
          message: "OpenBack Lifetime Access unlocked for your email account.",
          color: "green",
          duration: 4000,
        },
      }),
    );
  }

  private goBack() {
    if (this.step === "intro") {
      this.close();
      return;
    }
    this.error = "";
    this.step = this.step === "checkout" ? "email" : "intro";
  }

  private renderIntro() {
    return html`
      <div
        class="space-y-5 rounded-2xl border border-malibu-blue/30 bg-malibu-blue/10 p-5 text-center"
      >
        <h3 class="text-lg font-black uppercase tracking-wide">
          ${this.featureName()} requires Lifetime Access
        </h3>
        <p class="text-sm leading-6 text-white/65">
          Pay once to unlock Multiplayer, Ranked, parties, invite links, and
          every Frootz map forever. Solo stays free.
        </p>
        <button
          @click=${this.beginPurchase}
          class="w-full rounded-xl bg-malibu-blue px-5 py-4 font-black uppercase tracking-wider text-white"
        >
          ${this.userMe ? "Buy Lifetime Access" : "Sign Up / Log In"}
        </button>
        <button
          @click=${() => this.close()}
          class="w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    `;
  }

  private renderEmailStep() {
    return html`
      <div class="space-y-4">
        <div>
          <label
            for="purchase-email"
            class="mb-2 block text-xs font-black uppercase tracking-wider text-white/55"
            >Email for this purchase</label
          >
          <input
            id="purchase-email"
            type="email"
            autocomplete="email"
            .value=${this.email}
            ?readonly=${Boolean(this.userMe)}
            @input=${this.handleEmailInput}
            class="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-malibu-blue focus:ring-2 focus:ring-malibu-blue/30"
            placeholder="you@example.com"
          />
        </div>
        <p class="text-sm leading-6 text-white/55">
          This email becomes the owner of Lifetime Access. Existing accounts log
          in; new accounts are created securely with an emailed code.
        </p>
        <button
          @click=${this.verifyPurchaseEmail}
          ?disabled=${this.loading}
          class="w-full rounded-xl bg-malibu-blue px-5 py-4 font-black uppercase tracking-wider text-white disabled:opacity-50"
        >
          ${this.loading ? "Checking..." : "Verify Email"}
        </button>
        <button
          @click=${() => this.close()}
          class="w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    `;
  }

  private renderCheckout() {
    return html`
      <div class="space-y-5 text-center">
        <div>
          <p class="text-sm text-white/50">Lifetime Access for</p>
          <p class="font-bold text-white">${this.email}</p>
        </div>
        ${this.config?.amount
          ? html`<div class="text-2xl font-black">
              ${this.config.amount} ${this.config.currency}
              <span class="block text-xs font-normal text-white/40"
                >one-time payment</span
              >
            </div>`
          : null}
        ${this.loading
          ? html`<p class="text-white/50">Loading secure PayPal checkout...</p>`
          : null}
        <div id="paypal-buttons"></div>
        <button
          @click=${() => this.close()}
          class="w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    `;
  }

  protected renderBody() {
    return html`<div class="space-y-6 p-6 sm:p-8">
      <div class="text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-malibu-blue/50 bg-malibu-blue/10 text-xl font-black text-aquarius"
        >
          OB
        </div>
        <h2 class="text-3xl font-black uppercase tracking-wide">
          Unlock OpenBack Forever
        </h2>
        <p class="mt-2 text-white/60">
          One payment. No subscription. Access stays with your email account.
        </p>
      </div>
      <div class="grid grid-cols-3 gap-3 text-center">
        ${["Multiplayer", "Ranked", "Frootz Maps"].map(
          (feature) =>
            html`<div
              class="rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-bold"
            >
              ${feature}
            </div>`,
        )}
      </div>
      ${this.loading && this.step === "intro"
        ? html`<p class="text-center text-white/50">
            Checking your account...
          </p>`
        : this.step === "intro"
          ? this.renderIntro()
          : this.step === "email"
            ? this.renderEmailStep()
            : this.renderCheckout()}
      ${this.error
        ? html`<p class="text-center text-sm font-bold text-red-400">
            ${this.error}
          </p>`
        : null}
    </div>`;
  }
}
