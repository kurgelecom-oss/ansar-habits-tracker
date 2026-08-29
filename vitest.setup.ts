import "@testing-library/jest-dom/vitest";

/**
 * jsdom does not implement matchMedia, and the dashboard's reduced-motion and
 * width queries call it during render. A no-op that always reports "no match"
 * keeps components on their default, unreduced path without any test having to
 * stub it individually.
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
