#!/usr/bin/env node
import { Command } from "commander";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadConfig } from "./config.js";
import { EventStore, assertUniqueExternalIds } from "./ledger/event-store.js";
import { ProfitApiClient, verifyReconciliation } from "./profit/api-client.js";
import { autonomousBusinessScenario } from "./scenarios/autonomous-business.js";
import { fetchSigningKeys, verifySignedReport } from "./reports/signature-verifier.js";
import { renderHtml } from "./reports/html-renderer.js";
import { assertPaymentBudget, operationsToPay, type PlannedOperation } from "./x402/budget.js";
import type { CalculationResult, EconomicEvent, PaymentReceipt, SignedReport } from "./types.js";

const VERSION = "0.1.0";
const program = new Command()
  .name("agent-profit-demo")
  .description("Independent Ailabra x402 profit client")
  .version(VERSION);
const writeJson = async (path: string, value: unknown) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
};
const readJson = async <T>(path: string): Promise<T | undefined> => {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};
const context = () => {
  const config = loadConfig();
  return { config, store: new EventStore(config.ledgerPath) };
};
const requestHash = (events: EconomicEvent[], baseUrl: string) =>
  createHash("sha256")
    .update(JSON.stringify({ baseUrl, events, currentCashBalances: { USDC: "100.40" } }))
    .digest("hex");
const operationPath = {
  calculate: "/api/v1/x402/profit/calculate",
  analyze: "/api/v1/x402/profit/analyze",
  attest: "/api/v1/x402/profit/attest",
} as const;

program
  .command("scenario")
  .command("create")
  .action(async () => {
    const { store } = context();
    const events = autonomousBusinessScenario();
    await store.write(events);
    console.log(`Created synthetic scenario with ${events.length} events: ${store.path}`);
  });
const ledger = program.command("ledger");
ledger
  .command("list")
  .action(async () => console.log(JSON.stringify(await context().store.read(), null, 2)));
ledger.command("validate").action(async () => {
  const { config, store } = context();
  const events = await store.read();
  assertUniqueExternalIds(events);
  const api = new ProfitApiClient(config);
  await api.discover();
  api.contracts.validateEvents(events);
  console.log(`${events.length} events valid; 0 duplicates`);
});

async function singlePaid(operation: "calculate" | "analyze" | "attest") {
  const { config, store } = context();
  const events = await store.read();
  assertUniqueExternalIds(events);
  const api = new ProfitApiClient(config);
  await api.discover();
  api.contracts.validateEvents(events);
  const response = await api[operation](events);
  const receipts = (await readJson<PaymentReceipt[]>("artifacts/payment-receipts.json")) ?? [];
  receipts.push(response.receipt);
  await Promise.all([
    writeJson(`artifacts/${operation}-response.json`, response.body),
    writeJson("artifacts/payment-receipts.json", receipts),
  ]);
  console.log(
    JSON.stringify({ operation, receipt: response.receipt, result: response.body }, null, 2),
  );
}
program.command("calculate").action(() => singlePaid("calculate"));
program.command("analyze").action(() => singlePaid("analyze"));
program.command("attest").action(() => singlePaid("attest"));

async function generateReport() {
  const { config, store } = context();
  const [events, calculation, receipts, analysisResponse, attestationResponse] = await Promise.all([
    store.read(),
    readJson<CalculationResult>("artifacts/calculation-response.json"),
    readJson<PaymentReceipt[]>("artifacts/payment-receipts.json"),
    readJson<Record<string, unknown>>("artifacts/analysis-response.json"),
    readJson<{ report: SignedReport }>("artifacts/signed-report.json"),
  ]);
  if (!calculation) throw new Error("artifacts/calculation-response.json is required");
  let verification: Record<string, unknown> | undefined;
  if (attestationResponse)
    verification = verifySignedReport(
      attestationResponse.report,
      await fetchSigningKeys(config.baseUrl),
    );
  const html = renderHtml({
    events,
    calculation,
    receipts: receipts ?? [],
    baseUrl: config.baseUrl,
    ...(analysisResponse ? { analysis: analysisResponse } : {}),
    ...(attestationResponse ? { signedReport: attestationResponse.report } : {}),
    ...(verification ? { verification } : {}),
  });
  await mkdir(dirname(config.reportPath), { recursive: true });
  await writeFile(config.reportPath, html, { mode: 0o600 });
  return { path: config.reportPath, verification };
}
program.command("report").action(async () => console.log((await generateReport()).path));

program
  .command("run-demo")
  .option("--json")
  .option("--skip-analysis")
  .option("--skip-attestation")
  .option("--dry-run")
  .option("--force-pay")
  .action(async (options) => {
    const { config, store } = context();
    const events = autonomousBusinessScenario();
    assertUniqueExternalIds(events);
    await store.write(events);
    const api = new ProfitApiClient(config);
    await api.discover();
    api.contracts.validateEvents(events);
    const pricingResponse = await fetch(`${config.baseUrl}/api/v1/pricing`, { redirect: "error" });
    if (!pricingResponse.ok) throw new Error(`Pricing discovery failed: ${pricingResponse.status}`);
    const pricing = (await pricingResponse.json()) as {
      network: string;
      assetSymbol: string;
      operations: Record<string, { price: string }>;
    };
    if (pricing.network !== config.expectedNetwork)
      throw new Error("Pricing network is not permitted");
    const selected: Array<"calculate" | "analyze" | "attest"> = ["calculate"];
    if (!options.skipAnalysis) selected.push("analyze");
    if (!options.skipAttestation) selected.push("attest");
    const hash = requestHash(events, config.baseUrl);
    const priorManifest = await readJson<{ requestHash: string }>("artifacts/run-manifest.json");
    const canReuse = !options.forcePay && priorManifest?.requestHash === hash;
    const reusable = new Set<string>();
    if (canReuse) {
      for (const operation of selected) {
        const artifact = await readJson(
          `artifacts/${operation === "attest" ? "signed-report" : `${operation}-response`}.json`,
        );
        if (artifact) reusable.add(operation);
      }
    }
    const operationsRequiringPayment = operationsToPay(
      selected,
      reusable as Set<(typeof selected)[number]>,
      canReuse,
      Boolean(options.forcePay),
    );
    const plan: PlannedOperation[] = operationsRequiringPayment.map((operation) => ({
      operation,
      endpoint: operationPath[operation],
      price: pricing.operations[operation]!.price.split(" ")[0]!,
    }));
    const total = assertPaymentBudget(plan, config.maxPayment, config.maxTotalSpend);
    const planOutput = {
      network: pricing.network,
      asset: pricing.assetSymbol,
      operations: selected.map((operation) => ({
        operation,
        endpoint: operationPath[operation],
        price: pricing.operations[operation]!.price,
        action: reusable.has(operation) ? "reuse" : "pay",
      })),
      total: `${total.toFixed()} USDC`,
      maximum: `${config.maxTotalSpend} USDC`,
      permitted: true,
      buyerBalance: "not queried",
    };
    if (options.dryRun) {
      console.log(
        options.json
          ? JSON.stringify(planOutput, null, 2)
          : `Planned x402 run\n${JSON.stringify(planOutput, null, 2)}`,
      );
      return;
    }
    const receipts = canReuse
      ? ((await readJson<PaymentReceipt[]>("artifacts/payment-receipts.json")) ?? [])
      : [];
    let calculation = await readJson<CalculationResult>("artifacts/calculation-response.json");
    let analysis = await readJson<Record<string, unknown>>("artifacts/analysis-response.json");
    let attestation = await readJson<{ report: SignedReport }>("artifacts/signed-report.json");
    for (const operation of selected) {
      if (reusable.has(operation)) continue;
      const response = await api[operation](events);
      receipts.push(response.receipt);
      if (operation === "calculate") calculation = response.body as CalculationResult;
      else if (operation === "analyze") analysis = response.body as Record<string, unknown>;
      else attestation = response.body as { report: SignedReport };
    }
    if (!calculation) throw new Error("Calculation result unavailable");
    const reconciliation = verifyReconciliation(calculation);
    if (!reconciliation.input || !reconciliation.accepted)
      throw new Error("Server event counts do not reconcile");
    let verification: Record<string, unknown> | undefined;
    if (attestation) {
      verification = verifySignedReport(attestation.report, await fetchSigningKeys(config.baseUrl));
      if (!verification.valid) throw new Error("Independent signature verification failed");
    }
    await Promise.all([
      writeJson("artifacts/calculation-request.json", {
        events,
        currentCashBalances: { USDC: "100.40" },
      }),
      writeJson("artifacts/calculation-response.json", calculation),
      writeJson("artifacts/payment-receipts.json", receipts),
      writeJson("artifacts/run-manifest.json", { requestHash: hash, service: config.baseUrl }),
      ...(analysis ? [writeJson("artifacts/analysis-response.json", analysis)] : []),
      ...(attestation ? [writeJson("artifacts/signed-report.json", attestation)] : []),
    ]);
    const report = await generateReport();
    const unit = calculation.totals.USDC ?? {};
    const summary = {
      scenario: "Autonomous Research Brief Service",
      events: events.length,
      network: receipts[0]?.network,
      transactions: receipts.map((receipt) => receipt.transactionHash),
      netRevenue: unit.netRevenue,
      totalCosts: unit.totalCosts,
      netOperatingProfit: unit.netOperatingProfit,
      profitMargin: (unit.profitMargin as unknown as { value?: string })?.value,
      signatureVerified: report.verification?.valid ?? false,
      report: report.path,
    };
    console.log(
      options.json
        ? JSON.stringify(summary, null, 2)
        : `Scenario: ${summary.scenario}\nEvents: ${events.length} valid, 0 rejected, 0 duplicates\n\nTransactions: ${summary.transactions.join(", ")}\nNet revenue: ${summary.netRevenue} USDC\nTotal costs: ${summary.totalCosts} USDC\nOperating profit: ${summary.netOperatingProfit} USDC\nProfit margin: ${summary.profitMargin}%\nSigned attestation: ${summary.signatureVerified ? "verified" : "skipped"}\nHTML report: ${summary.report}`,
    );
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : "Command failed");
  process.exitCode = 1;
});
