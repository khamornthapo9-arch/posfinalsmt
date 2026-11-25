import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { usesRestaurantMode } from "./retail-mode";

describe("retail-only workflow", () => {
  it("legacy restaurant stores cannot enter restaurant mode", () => {
    assert.equal(usesRestaurantMode("RESTAURANT"), false);
  });
});
