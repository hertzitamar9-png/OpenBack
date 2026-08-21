import { closeMobileSidebar } from "./Navigation";
import { Platform } from "./Platform";

export function initLayout() {
  // The hamburger now lives in the persistent mobile top bar rather than in
  // play-page, so wait for that component instead.
  customElements.whenDefined("mobile-top-bar").then(() => {
    const sidebar = document.getElementById("sidebar-menu");
    const backdrop = document.getElementById("mobile-menu-backdrop");

    // Force sidebar visibility style to ensure it's not hidden by other CSS
    if (sidebar && Platform.isMobileWidth) {
      sidebar.style.display = "flex";
    }

    if (!sidebar) {
      console.error("Sidebar menu not found");
      return;
    }
    if (!backdrop) {
      console.error("Mobile menu backdrop not found");
      return;
    }

    backdrop.addEventListener("click", closeMobileSidebar);

    // Close menu when clicking a menu link or button (Mobile only)
    sidebar.addEventListener("click", (e) => {
      // On desktop, we want the menu to stay open unless explicitly toggled
      if (!Platform.isMobileWidth) return;

      // If the click happened on or inside an anchor/button/menu item, close the menu
      const clickedElement = (e.target as Element).closest
        ? (e.target as Element).closest(
            'a, button, [role="menuitem"], .nav-menu-item',
          )
        : null;

      if (clickedElement) {
        closeMobileSidebar();
      }
    });

    // Close on Escape (Mobile only)
    document.addEventListener("keydown", (e) => {
      if (!Platform.isMobileWidth) return;
      if (e.key === "Escape" && sidebar.classList.contains("open")) {
        closeMobileSidebar();
      }
    });
  });
}
