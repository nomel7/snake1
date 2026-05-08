/**
 * Toggle the browser's fullscreen mode for a given element.
 *
 * If no element is currently in fullscreen, requests fullscreen on `target`
 * (defaulting to the document's root element). If something is already in
 * fullscreen, exits fullscreen instead.
 *
 * Returns a Promise that resolves once the underlying request settles. Any
 * rejection from the Fullscreen API is swallowed and logged — failing to
 * enter fullscreen (e.g. because the user denied the request) should not
 * crash the app.
 */
export function toggleFullscreen(
  target: Element | null = typeof document !== "undefined"
    ? document.documentElement
    : null,
): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  if (document.fullscreenElement) {
    return document.exitFullscreen().catch((err) => {
      console.warn("exitFullscreen failed:", err);
    });
  }

  if (!target || typeof target.requestFullscreen !== "function") {
    return Promise.resolve();
  }

  return target.requestFullscreen().catch((err) => {
    console.warn("requestFullscreen failed:", err);
  });
}

/** True when the document is currently in fullscreen mode. */
export function isFullscreen(): boolean {
  return typeof document !== "undefined" && document.fullscreenElement !== null;
}
