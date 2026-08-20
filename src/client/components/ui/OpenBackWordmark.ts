import { html, type TemplateResult } from "lit";
import { assetUrl } from "../../../core/AssetUrls";
import { closeMobileSidebar } from "../../Navigation";

type WordmarkOptions = {
  imageClass: string;
  wrapperClass?: string;
};

const WORDMARK_START = "20.8%";

/**
 * Render the combined OpenBack artwork while making only its text interactive.
 * The SVG mark occupies x=8..136 and the word begins at x=158 in a 760-wide
 * viewBox, so the transparent Home control starts at 158/760 = 20.8%.
 */
export function openBackHomeWordmark({
  imageClass,
  wrapperClass = "",
}: WordmarkOptions): TemplateResult {
  const goHome = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    closeMobileSidebar();
    window.showPage?.("page-play");
  };

  return html`<span class="relative inline-block ${wrapperClass}">
    <img
      class=${imageClass}
      src=${assetUrl("images/OpenBackLogo.svg")}
      alt="OpenBack"
    />
    <button
      type="button"
      data-openback-wordmark-home
      data-wordmark-start=${WORDMARK_START}
      aria-label="OpenBack home"
      data-i18n-aria-label="main.play"
      class="absolute inset-y-0 right-0 border-0 bg-transparent p-0 cursor-pointer rounded-sm focus-visible:outline-white"
      style="left:${WORDMARK_START}"
      @click=${goHome}
    ></button>
  </span>`;
}
