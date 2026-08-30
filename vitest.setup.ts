import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * Unmount between tests.
 *
 * Testing Library registers this itself, but only when Vitest runs with
 * `globals: true`. This project does not, so without an explicit hook every
 * render stacks up in the same document and the second test in a file starts
 * finding two of everything.
 */
afterEach(cleanup);

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
