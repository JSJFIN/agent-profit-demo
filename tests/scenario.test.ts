import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { autonomousBusinessScenario } from "../src/scenarios/autonomous-business.js";
import { EventStore, assertUniqueExternalIds } from "../src/ledger/event-store.js";

describe("synthetic ledger", () => {
  it("is reproducible, diverse, decimal-safe, and unique", () => {
    const a = autonomousBusinessScenario();
    expect(a).toEqual(autonomousBusinessScenario());
    expect(a).toHaveLength(15);
    expect(a.every((e) => typeof e.amount === "string" && /^\d+\.\d+$/.test(e.amount))).toBe(true);
    expect(new Set(a.map((e) => e.kind)).size).toBeGreaterThanOrEqual(7);
    expect(new Set(a.map((e) => e.experimentId).filter(Boolean)).size).toBe(2);
    expect(new Set(a.map((e) => e.customerId).filter(Boolean)).size).toBeGreaterThanOrEqual(2);
    expect(() => assertUniqueExternalIds(a)).not.toThrow();
  });
  it("rejects duplicate external IDs", () => {
    const e = autonomousBusinessScenario();
    expect(() => assertUniqueExternalIds([...e, e[0]!])).toThrow(/Duplicate/);
  });
  it("round trips through a transparent JSON ledger", async () => {
    const path = join(await mkdtemp(join(tmpdir(), "profit-ledger-")), "ledger.json");
    const store = new EventStore(path),
      events = autonomousBusinessScenario();
    await store.write(events);
    expect(await store.read()).toEqual(events);
    expect(await readFile(path, "utf8")).toContain('"amount": "100.00"');
  });
});
