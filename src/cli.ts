#!/usr/bin/env node
import { Command } from "commander";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadConfig } from "./config.js";
import { AgentProfitClient } from "./client.js";
import { EventStore, assertUniqueExternalIds } from "./ledger/event-store.js";
import { ProfitApiClient, verifyReconciliation } from "./profit/api-client.js";
import { autonomousBusinessScenario } from "./scenarios/autonomous-business.js";
import { fetchSigningKeys, verifySignedReport } from "./reports/signature-verifier.js";
import { renderHtml } from "./reports/html-renderer.js";
import { assertPaymentBudget, operationsToPay, type PlannedOperation } from "./x402/budget.js";
import type { CalculationResult, EconomicEvent, PaymentReceipt, SignedReport } from "./types.js";

const VERSION = "0.1.0";
const program = new Command()
  .name("agent-profit")
  .description("Typed SDK and guarded x402 CLI for Ailabra Agent Profit Ledger")
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

const safeClient = () => {
  const config = loadConfig();
  return { config, client: new AgentProfitClient({ baseUrl: config.baseUrl }) };
};

program
  .command("doctor")
  .description("Check public service contracts without authorizing payment")
  .option("--json")
  .action(async ({ json }) => {
    const { config, client } = safeClient();
    const [discovery, keys, mcpResponse] = await Promise.all([
      client.discover(),
      fetchSigningKeys(config.baseUrl),
      fetch(`${config.baseUrl}/.well-known/mcp.json`, { redirect: "error" }),
    ]);
    if (!mcpResponse.ok) throw new Error(`MCP metadata failed: ${mcpResponse.status}`);
    const info = discovery.paymentInfo as Record<string, unknown>;
    const result = {
      ok: true,
      paymentAuthorized: false,
      serviceUrl: config.baseUrl,
      serviceVersion: info.serviceVersion,
      network: info.network,
      paymentMode: info.paymentMode,
      asset: info.asset,
      assetSymbol: info.assetSymbol,
      assetDecimals: info.assetDecimals,
      eip712Name: info.eip712Name,
      eip712Version: info.eip712Version,
      signingKeyCount: keys.length,
      openapi: "ok",
      mcp: "ok",
    };
    console.log(
      json
        ? JSON.stringify(result)
        : Object.entries(result)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n"),
    );
  });

program
  .command("discover")
  .description("Print public capabilities and pricing without authorizing payment")
  .option("--json")
  .action(async ({ json }) => {
    const { client } = safeClient();
    const result = await client.discover();
    const concise = {
      capabilities: result.capabilities,
      pricing: result.pricing,
      paymentInfo: result.paymentInfo,
    };
    console.log(JSON.stringify(json ? result : concise, null, 2));
  });

const quote = program
  .command("quote")
  .description("Decode an x402 quote without signing or paying");
for (const operation of ["calculate", "analyze", "attest"] as const) {
  quote
    .command(`${operation} [eventsFile]`)
    .option("--json")
    .action(async (eventsFile: string | undefined, { json }) => {
      const events = eventsFile
        ? (JSON.parse(await readFile(eventsFile, "utf8")) as EconomicEvent[])
        : autonomousBusinessScenario().slice(0, 3);
      const { client } = safeClient();
      const challenge = await client.getPaymentQuote(operation, { events });
      const result = {
        paymentAuthorized: false,
        message: "Payment will not be authorized.",
        challenge,
      };
      console.log(
        json ? JSON.stringify(result) : `${result.message}\n${JSON.stringify(challenge, null, 2)}`,
      );
    });
}

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

async function singlePaid(
  operation: "calculate" | "analyze" | "attest",
  eventsFile: string,
  options: { pay?: boolean; maxPayment?: string; maxTotalSpend?: string; maxAttempts?: string },
) {
  if (!options.pay)
    throw new Error("Payment disabled. Re-run with --pay after reviewing the quote.");
  if (!options.maxPayment || !options.maxTotalSpend || !options.maxAttempts)
    throw new Error("--max-payment, --max-total-spend, and --max-attempts are required");
  const { config } = context();
  config.maxPayment = options.maxPayment;
  config.maxTotalSpend = options.maxTotalSpend;
  config.maxAttempts = Number(options.maxAttempts);
  if (!Number.isInteger(config.maxAttempts) || config.maxAttempts < 1)
    throw new Error("--max-attempts must be a positive integer");
  if (!config.expectedPayTo) throw new Error("X402_EXPECTED_PAY_TO is required for payment");
  const events = JSON.parse(await readFile(eventsFile, "utf8")) as EconomicEvent[];
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
for (const operation of ["calculate", "analyze", "attest"] as const) {
  program
    .command(operation)
    .argument("<eventsFile>")
    .option("--pay", "Explicitly authorize payment", false)
    .requiredOption("--max-payment <USDC>")
    .requiredOption("--max-total-spend <USDC>")
    .requiredOption("--max-attempts <count>")
    .action((eventsFile, options) => singlePaid(operation, eventsFile, options));
}

program
  .command("report-verify")
  .argument("<reportFile>")
  .option("--json")
  .action(async (reportFile, { json }) => {
    const report = JSON.parse(await readFile(reportFile, "utf8")) as SignedReport;
    const { client } = safeClient();
    const result = await client.verifyReport(report);
    if (!result.valid) process.exitCode = 1;
    console.log(json ? JSON.stringify(result) : `Signature valid: ${result.valid}`);
  });

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
