import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import type { UserMeResponse } from "../core/ApiSchemas";
import { getApiBase, invalidateUserMe, setLastUserMe } from "./Api";
import { acceptServerAuth, userAuth } from "./Auth";
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
  @state() private loading = true;
  @state() private error = "";
  @state() private purchaseId = "";
  @state() private emailHint = "";
  @state() private code = "";
  @state() private verifying = false;
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
    this.purchaseId = "";
    this.code = "";
    this.loading = true;
    this.paypalRendered = false;
    void this.load();
  }

  private async load() {
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
          if (!response.ok || !body.orderId)
            throw new Error(body.error ?? "payment_failed");
          return body.orderId;
        },
        onApprove: async (data: { orderID: string }) => {
          const response = await this.authedPost("/purchase/paypal/capture", {
            orderId: data.orderID,
          });
          const body = await response.json();
          if (!response.ok) {
            this.error = "The payment could not be verified.";
            return;
          }
          this.purchaseId = body.purchaseId;
          this.emailHint = body.emailHint;
          this.code = body.devCode ?? "";
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

  private onCodeInput(event: InputEvent) {
    this.code = (event.target as HTMLInputElement).value
      .replace(/\D/g, "")
      .slice(0, 6);
  }

  private async verify() {
    if (this.code.length !== 6 || this.verifying) return;
    this.verifying = true;
    this.error = "";
    try {
      const response = await this.authedPost("/purchase/verify", {
        orderId: this.purchaseId,
        code: this.code,
      });
      const body = await response.json();
      if (!response.ok) {
        this.error =
          body.error === "code_expired"
            ? "That code expired. Request a new one."
            : "That verification code is not correct.";
        return;
      }
      acceptServerAuth(body.jwt, body.expiresIn);
      invalidateUserMe();
      const userMe = body.userMe as UserMeResponse;
      setLastUserMe(userMe);
      document.dispatchEvent(
        new CustomEvent("userMeResponse", { detail: userMe }),
      );
      this.close();
      window.dispatchEvent(
        new CustomEvent("show-message", {
          detail: {
            message: "OpenBack Lifetime Access unlocked.",
            color: "green",
            duration: 4000,
          },
        }),
      );
    } finally {
      this.verifying = false;
    }
  }

  private async resend() {
    const response = await this.authedPost("/purchase/resend-code", {
      orderId: this.purchaseId,
    });
    const body = await response.json();
    if (response.ok) {
      this.code = body.devCode ?? "";
      this.error = "";
    } else {
      this.error = "A new code could not be sent.";
    }
  }

  private restore() {
    this.close();
    (
      document.querySelector("account-modal") as {
        open: (args?: Record<string, unknown>) => void;
      } | null
    )?.open();
  }

  protected renderBody() {
    if (this.purchaseId) {
      return html`<div class="p-6 sm:p-8 space-y-5 text-center">
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-malibu-blue/20 text-2xl"
        >
          ✓
        </div>
        <h2 class="text-2xl font-black uppercase tracking-wide">
          Verify your purchase
        </h2>
        <p class="text-white/60">
          We sent a one-time code to
          <b class="text-white">${this.emailHint}</b>. This code expires and
          cannot be reused as a game key.
        </p>
        <input
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          .value=${this.code}
          @input=${this.onCodeInput}
          class="mx-auto block w-64 rounded-xl border border-white/20 bg-black/40 px-5 py-4 text-center text-3xl font-black tracking-[0.5em] text-white outline-none focus:border-malibu-blue"
          aria-label="Six digit verification code"
        />
        ${this.error
          ? html`<p class="text-sm font-bold text-red-400">${this.error}</p>`
          : null}
        <button
          @click=${this.verify}
          ?disabled=${this.code.length !== 6 || this.verifying}
          class="w-full rounded-xl bg-malibu-blue px-5 py-4 font-black uppercase tracking-wider text-white disabled:opacity-40"
        >
          ${this.verifying ? "Verifying…" : "Unlock OpenBack"}
        </button>
        <button @click=${this.resend} class="text-sm text-aquarius">
          Send a new code
        </button>
      </div>`;
    }
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
        <p class="mt-2 text-white/60">One payment. No subscription.</p>
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
      ${this.config?.amount
        ? html`<div class="text-center text-2xl font-black">
            ${this.config.amount} ${this.config.currency}
            <span class="block text-xs font-normal text-white/40"
              >one-time payment</span
            >
          </div>`
        : null}
      ${this.loading
        ? html`<p class="text-center text-white/50">
            Loading secure checkout…
          </p>`
        : html`<div id="paypal-buttons"></div>`}
      ${this.error
        ? html`<p class="text-center text-sm font-bold text-red-400">
            ${this.error}
          </p>`
        : null}
      <button
        @click=${this.restore}
        class="w-full rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:bg-white/5"
      >
        Already purchased? Restore with email
      </button>
    </div>`;
  }
}
