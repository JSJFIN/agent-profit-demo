#!/usr/bin/env node
import { Command } from "commander";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Decimal } from "decimal.js";
import { loadConfig } from "./config.js";
import { EventStore, assertUniqueExternalIds } from "./ledger/event-store.js";
import { ProfitApiClient, verifyReconciliation } from "./profit/api-client.js";
import { autonomousBusinessScenario } from "./scenarios/autonomous-business.js";
import { fetchSigningKeys, verifySignedReport } from "./reports/signature-verifier.js";
import { renderHtml } from "./reports/html-renderer.js";
import type { PaymentReceipt, SignedReport } from "./types.js";
const program = new Command()
  .name("agent-profit-demo")
  .description("Independent Ailabra x402 profit client")
  .version("1.0.0");
const output = async (path: string, value: unknown) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
};
const ctx = () => {
  const config = loadConfig();
  return { config, store: new EventStore(config.ledgerPath) };
};
program
  .command("scenario")
  .command("create")
  .action(async () => {
    const { store } = ctx();
    const events = autonomousBusinessScenario();
    await store.write(events);
    console.log(`Created synthetic scenario with ${events.length} events: ${store.path}`);
  });
const ledger = program.command("ledger");
ledger
  .command("list")
  .action(async () => console.log(JSON.stringify(await ctx().store.read(), null, 2)));
ledger.command("validate").action(async () => {
  const { config, store } = ctx();
  const events = await store.read();
  assertUniqueExternalIds(events);
  const api = new ProfitApiClient(config);
  await api.discover();
  api.contracts.validateEvents(events);
  console.log(`${events.length} events valid; 0 duplicates`);
});
async function paid(kind: "calculate" | "analyze" | "attest") {
  const { config, store } = ctx();
  const events = await store.read();
  assertUniqueExternalIds(events);
  const api = new ProfitApiClient(config);
  await api.discover();
  api.contracts.validateEvents(events);
  const result = await api[kind](events);
  await output(`artifacts/${kind}-request.json`, {
    events,
    currentCashBalance: "100.40",
    ...(kind === "attest" ? { public: false } : {}),
  });
  await output(`artifacts/${kind}-response.json`, result.body);
  await output(`artifacts/${kind}-payment-receipt.json`, result.receipt);
  if (kind === "calculate") {
    await output("artifacts/calculation-request.json", {
      events,
      currentCashBalance: "100.40",
    });
    await output("artifacts/calculation-response.json", result.body);
    await output("artifacts/payment-receipt.json", result.receipt);
  }
  if (kind === "attest") {
    await output("artifacts/signed-report.json", result.body);
    await output("artifacts/attestation-payment-receipt.json", result.receipt);
  }
  if (kind === "analyze") {
    await output("artifacts/analysis-response.json", result.body);
    await output("artifacts/analysis-payment-receipt.json", result.receipt);
  }
  console.log(JSON.stringify({ kind, receipt: result.receipt, result: result.body }, null, 2));
}
program.command("calculate").action(() => paid("calculate"));
program.command("analyze").action(() => paid("analyze"));
program.command("attest").action(() => paid("attest"));
program.command("report").action(async () => {
  const { config, store } = ctx();
  const [events, calculation, receipt] = await Promise.all([
    store.read(),
    readFile("artifacts/calculation-response.json", "utf8").then(JSON.parse),
    readFile("artifacts/payment-receipt.json", "utf8").then(JSON.parse),
  ]);
  let signedReport: SignedReport | undefined,
    verification: Record<string, unknown> | undefined,
    analysis: any;
  try {
    analysis = JSON.parse(await readFile("artifacts/analysis-response.json", "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    signedReport = (
      JSON.parse(await readFile("artifacts/signed-report.json", "utf8")) as { report: SignedReport }
    ).report;
    verification = verifySignedReport(signedReport, await fetchSigningKeys(config.baseUrl));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const html = renderHtml({
    events,
    calculation,
    receipt,
    baseUrl: config.baseUrl,
    ...(analysis ? { analysis } : {}),
    ...(signedReport ? { signedReport } : {}),
    ...(verification ? { verification } : {}),
  });
  await mkdir(dirname(config.reportPath), { recursive: true });
  await writeFile(config.reportPath, html, { mode: 0o600 });
  console.log(config.reportPath);
});
program
  .command("run-demo")
  .option("--json")
  .option("--skip-analysis")
  .option("--skip-attestation")
  .action(async (opts) => {
    const { config, store } = ctx();
    const events = autonomousBusinessScenario();
    assertUniqueExternalIds(events);
    await store.write(events);
    const api = new ProfitApiClient(config);
    await api.discover();
    api.contracts.validateEvents(events);
    const calculation = await api.calculate(events);
    const reconciliation = verifyReconciliation(calculation.body);
    if (!reconciliation.input || !reconciliation.accepted)
      throw new Error("Server event counts do not reconcile");
    let analysis: any,
      attestation: { body: { report: SignedReport }; receipt: PaymentReceipt } | undefined,
      verification: Record<string, unknown> | undefined;
    if (!opts.skipAnalysis && new Decimal(config.maxPayment).gte("0.05"))
      analysis = await api.analyze(events);
    if (!opts.skipAttestation && new Decimal(config.maxPayment).gte("0.25")) {
      attestation = await api.attest(events);
      verification = verifySignedReport(
        attestation.body.report,
        await fetchSigningKeys(config.baseUrl),
      );
      if (!verification.valid) throw new Error("Independent signature verification failed");
    }
    await output("artifacts/calculation-request.json", { events, currentCashBalance: "100.40" });
    await output("artifacts/calculation-response.json", calculation.body);
    await output("artifacts/payment-receipt.json", calculation.receipt);
    if (analysis) {
      await output("artifacts/analysis-response.json", analysis.body);
      await output("artifacts/analysis-payment-receipt.json", analysis.receipt);
    }
    if (attestation) {
      await output("artifacts/signed-report.json", attestation.body);
      await output("artifacts/attestation-payment-receipt.json", attestation.receipt);
    }
    const html = renderHtml({
      events,
      calculation: calculation.body,
      receipt: calculation.receipt,
      baseUrl: config.baseUrl,
      ...(analysis ? { analysis: analysis.body } : {}),
      ...(attestation ? { signedReport: attestation.body.report } : {}),
      ...(verification ? { verification } : {}),
    });
    await mkdir(dirname(config.reportPath), { recursive: true });
    await writeFile(config.reportPath, html, { mode: 0o600 });
    const t = (calculation.body.totals as any).USDC;
    const summary = {
      scenario: "Autonomous Research Brief Service",
      events: events.length,
      network: calculation.receipt.network,
      transaction: calculation.receipt.transaction,
      netRevenue: t?.netRevenue,
      totalCosts: t?.totalCosts,
      netOperatingProfit: t?.netOperatingProfit,
      profitMargin: t?.profitMargin?.value,
      signatureVerified: verification?.valid ?? false,
      report: config.reportPath,
    };
    if (opts.json) console.log(JSON.stringify(summary, null, 2));
    else
      console.log(
        `Scenario: ${summary.scenario}\nEvents: ${events.length} valid, 0 rejected, 0 duplicates\n\nPayment settled: ${summary.transaction}\nNet revenue: ${summary.netRevenue} USDC\nTotal costs: ${summary.totalCosts} USDC\nOperating profit: ${summary.netOperatingProfit} USDC\nProfit margin: ${summary.profitMargin}%\nSigned attestation: ${summary.signatureVerified ? "verified" : "skipped"}\nHTML report: ${summary.report}`,
      );
  });
program.parseAsync().catch((e) => {
  console.error(e instanceof Error ? e.message : "Command failed");
  process.exitCode = 1;
});
