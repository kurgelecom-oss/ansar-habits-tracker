import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COPY, DEFAULT_LOOK, LOOKS } from "./looks";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");

function lum(hex: string): number {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** The token values a look ends up with: the default block, then its own. */
function tokens(look: string): Record<string, string> {
  const read = (block: string) => Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2]]));
  const base = read(css);
  if (look === DEFAULT_LOOK) {
    // First definition wins for the default: later blocks belong to other looks.
    const first: Record<string, string> = {};
    for (const m of css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) if (!(m[1] in first)) first[m[1]] = m[2];
    return first;
  }
  const own = new RegExp(`html\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  expect(own, `${look} must have a token block`).not.toBe("");
  const firstDefault: Record<string, string> = {};
  for (const m of css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) if (!(m[1] in firstDefault)) firstDefault[m[1]] = m[2];
  return { ...base, ...firstDefault, ...read(own) };
}

describe("the three looks", () => {
  it("has words for every look, with nothing left blank", () => {
    for (const look of LOOKS) {
      const c = COPY[look];
      for (const v of [c.clubName, c.clubLine, c.next, c.openSchool, c.openFootball, c.loading, c.weekFailed, c.load("8.9", 12)]) {
        expect(v.trim(), look).not.toBe("");
      }
    }
  });

  it("applies the saved look before paint, and only a known one", () => {
    for (const look of LOOKS) expect(layout).toContain(`"${look}"`);
    expect(layout).toContain(`data-look="${DEFAULT_LOOK}"`);
  });

  /** Readability is the rule a new look is most likely to break. */
  it.each(LOOKS)("%s keeps text and filled controls readable", look => {
    const t = tokens(look);
    expect(contrast(t["--ansar-text"], t["--ansar-panel"]), "text on panel").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["--ansar-subtext"], t["--ansar-rowflat"]), "quiet text on row").toBeGreaterThanOrEqual(4.5);
    // Fills carry var(--ansar-base) as their text.
    for (const fill of ["--accent", "--ansar-gold", "--school", "--football", "--ansar-success"]) {
      expect(contrast(t["--ansar-base"], t[fill]), `${look}: base text on ${fill}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(t["--ansar-danger"], t["--ansar-panel"]), "missed on panel").toBeGreaterThanOrEqual(4.5);
  });
});
