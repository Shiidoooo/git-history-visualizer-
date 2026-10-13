import { describe, expect, it } from "vitest";
import { pickTickIndexes, tickAnchor } from "./axis";
import { roundedTopBarPath } from "./bar-path";

describe("pickTickIndexes", () => {
  it("returns nothing for empty or impossible input", () => {
    expect(pickTickIndexes(0, 5)).toEqual([]);
    expect(pickTickIndexes(10, 0)).toEqual([]);
  });

  it("returns every index when they all fit", () => {
    expect(pickTickIndexes(4, 6)).toEqual([0, 1, 2, 3]);
  });

  it("thins out evenly and never exceeds the maximum", () => {
    const indexes = pickTickIndexes(100, 6);
    expect(indexes.length).toBeLessThanOrEqual(6);
    expect(indexes[0]).toBe(0);
    const gaps = indexes.slice(1).map((value, position) => value - indexes[position]);
    expect(new Set(gaps).size).toBe(1);
  });
});

describe("tickAnchor", () => {
  it("keeps edge labels inside the plot", () => {
    expect(tickAnchor(5, 400)).toBe("start");
    expect(tickAnchor(200, 400)).toBe("middle");
    expect(tickAnchor(395, 400)).toBe("end");
  });
});

describe("roundedTopBarPath", () => {
  it("rounds only the top corners", () => {
    expect(roundedTopBarPath(10, 20, 8, 30, 4)).toBe("M10,50V24Q10,20 14,20H14Q18,20 18,24V50Z");
  });

  it("shrinks the radius for thin or short bars so the path stays valid", () => {
    expect(roundedTopBarPath(0, 0, 2, 10, 4)).toBe("M0,10V1Q0,0 1,0H1Q2,0 2,1V10Z");
    expect(roundedTopBarPath(0, 0, 10, 2, 4)).toBe("M0,2V2Q0,0 2,0H8Q10,0 10,2V2Z");
  });

  it("falls back to a plain rectangle when there is no room to round", () => {
    expect(roundedTopBarPath(0, 5, 6, 0, 4)).toBe("M0,5H6V5H0Z");
  });
});
