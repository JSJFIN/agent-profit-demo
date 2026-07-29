import { beforeAll, describe, expect, it } from "vitest";
import { PublicContracts } from "../src/profit/public-contracts.js";
import { autonomousBusinessScenario } from "../src/scenarios/autonomous-business.js";
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
        currentCashBalance: "110.40",
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
});
