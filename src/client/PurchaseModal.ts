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
  @state() private loading = true;
  @state() private error = "";
  @query("#paypal-buttons") private paypalContainer?: HTMLElement;
  private paypalRendered = false;

  protected modalConfig() {
    return { maxWidth: "620px" };
  }

  protected renderHeaderSlot() {
    return modalHeader({
      title: "OpenBack Lifetime Access",
      onBack: () => this.close(),
      ariaLabel: "Back",
    });
  }

  protected onOpen(): void {
    this.error = "";
    this.config = null;
    this.userMe = false;
    this.loading = true;
    this.paypalRendered = false;
    void this.load();
  }

  private async load() {
    try {
      const userMe = await getUserMe();
      this.userMe = userMe && userMe.user.email ? userMe : false;
      if (!this.userMe) return;
      if (this.userMe.player.lifetimeAccess) {
        this.close();
        this.showUnlockedMessage();
        return;
      }

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
    } catch {
      this.error = "Could not connect to the payment service.";
    } finally {
      this.loading = false;
      await this.updateComplete;
      if (this.userMe && !this.error) await this.renderPayPal();
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

  private openAccount() {
    this.close();
    (
      document.querySelector("account-modal") as {
        open: (args?: Record<string, unknown>) => void;
      } | null
    )?.open();
  }

  protected renderBody() {
    return html`<div class="p-6 sm:p-8 space-y-6">
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
      ${this.loading
        ? html`<p class="text-center text-white/50">Checking your account…</p>`
        : !this.userMe
          ? html`<div
              class="space-y-4 rounded-2xl border border-malibu-blue/30 bg-malibu-blue/10 p-5 text-center"
            >
              <h3 class="text-lg font-black uppercase tracking-wide">
                Sign in before purchasing
              </h3>
              <p class="text-sm text-white/60">
                Your purchase is saved to your OpenBack email account, so it
                automatically works when you sign in on another device.
              </p>
              <button
                @click=${this.openAccount}
                class="w-full rounded-xl bg-malibu-blue px-5 py-4 font-black uppercase tracking-wider text-white"
              >
                Sign In / Sign Up
              </button>
            </div>`
          : html`
              <div class="text-center">
                <p class="text-sm text-white/50">Purchasing for</p>
                <p class="font-bold text-white">${this.userMe.user.email}</p>
              </div>
              ${this.config?.amount
                ? html`<div class="text-center text-2xl font-black">
                    ${this.config.amount} ${this.config.currency}
                    <span class="block text-xs font-normal text-white/40"
                      >one-time payment</span
                    >
                  </div>`
                : null}
              <div id="paypal-buttons"></div>
            `}
      ${this.error
        ? html`<p class="text-center text-sm font-bold text-red-400">
            ${this.error}
          </p>`
        : null}
      <button
        @click=${this.openAccount}
        class="w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/5"
      >
        Already purchased? Sign in with the purchase email
      </button>
    </div>`;
  }
}
