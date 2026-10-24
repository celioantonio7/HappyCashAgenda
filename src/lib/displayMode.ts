const viewportBase = "width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content";

/** Installed apps restrict touch zoom; browser tabs keep normal web zoom. */
export function configureDisplayMode() {
  const standalone = window.matchMedia("(display-mode: standalone)");
  const fullscreen = window.matchMedia("(display-mode: fullscreen)");
  const update = () => {
    const installed = standalone.matches || fullscreen.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    document.documentElement.dataset.appDisplay = installed ? "standalone" : "browser";
    document.querySelector('meta[name="viewport"]')?.setAttribute("content",
      installed ? `${viewportBase}, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no` : viewportBase);
  };
  update();
  standalone.addEventListener("change", update);
  fullscreen.addEventListener("change", update);
  return () => {
    standalone.removeEventListener("change", update);
    fullscreen.removeEventListener("change", update);
  };
}
