import { beforeAll, describe, expect, it } from "vitest";
import { PublicContracts } from "../src/profit/public-contracts.js";
import { autonomousBusinessScenario } from "../src/scenarios/autonomous-business.js";
import { readFile } from "node:fs/promises";
import { parsePaymentRequired } from "../src/x402/challenge.js";
const base = process.env.PROFIT_API_BASE_URL ?? "https://x402.ailabra.org";
describe("public black-box contracts", () => {
  const contracts = new PublicContracts(base);
  beforeAll(() => contracts.discover(), 30000);
  it("validates OpenAPI 3.1 and the synthetic request", () => {
    expect(contracts.document.openapi).toBe("3.1.0");
    expect(contracts.validateEvents(autonomousBusinessScenario())).toBe(true);
    expect(
      contracts.validateRequest("/api/v1/x402/profit/calculate", {
        events: autonomousBusinessScenario(),
        currentCashBalance: "100.40",
      }),
    ).toBe(true);
  });
  it("exposes concrete paid response schemas", () => {
    for (const p of [
      "/api/v1/x402/profit/calculate",
      "/api/v1/x402/profit/analyze",
      "/api/v1/x402/profit/attest",
    ])
      expect(contracts.schemaFor(p)).toBeTruthy();
  });
  it("observes a real unpaid x402 v2 challenge without paying", async () => {
    const response = await fetch(`${base}/api/v1/x402/profit/calculate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: autonomousBusinessScenario() }),
      redirect: "error",
    });
    expect(response.status).toBe(402);
    const challenge = parsePaymentRequired(response.headers);
    expect(challenge.x402Version).toBe(2);
    expect(challenge.accepts.some((requirement) => requirement.scheme === "exact")).toBe(true);
  });
  it("validates the captured paid calculation and analysis responses", async () => {
    const calculation = JSON.parse(await readFile("artifacts/calculation-response.json", "utf8"));
    const analysis = JSON.parse(await readFile("artifacts/analysis-response.json", "utf8"));
    expect(contracts.validateResponse("/api/v1/x402/profit/calculate", calculation)).toBe(true);
    expect(contracts.validateResponse("/api/v1/x402/profit/analyze", analysis)).toBe(true);
  });
});
