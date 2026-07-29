import { Decimal } from "decimal.js";
import type { CalculationResult, EconomicEvent, PaymentReceipt, SignedReport } from "../types.js";

export const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
const amount = (value: unknown, currency: string) =>
  `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))} ${escapeHtml(currency)}`;
const percent = (value: string | null) =>
  value === null
    ? "unavailable"
    : `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}%`;
const moneyRows = (currencies: Record<string, Record<string, string>> | undefined) =>
  Object.entries(currencies ?? {})
    .flatMap(([currency, values]) =>
      Object.entries(values).map(
        ([name, value]) =>
          `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(currency)}</td><td class="num">${amount(value, currency)}</td></tr>`,
      ),
    )
    .join("") || '<tr><td colspan="3">No data</td></tr>';

export function renderHtml(input: {
  events: EconomicEvent[];
  calculation: CalculationResult;
  analysis?: Record<string, unknown>;
  receipts: PaymentReceipt[];
  signedReport?: SignedReport;
  verification?: Record<string, unknown>;
  baseUrl: string;
}) {
  const { events, calculation: result, receipts } = input;
  const currency = Object.keys(result.totals)[0] ?? "USDC";
  const totals = result.totals[currency] ?? {};
  const excluded = new Map(
    ((result.profitExcludedEvents as Array<{ externalId: string; reason: string }>) ?? []).map(
      (item) => [item.externalId, item.reason],
    ),
  );
  const rejected = new Map(
    ((result.rejectedEvents as Array<{ externalId: string; reason: string }>) ?? []).map((item) => [
      item.externalId,
      item.reason,
    ]),
  );
  const experiments = result.breakdowns.experimentEconomics;
  const experimentRows = Object.entries(experiments)
    .flatMap(([unit, values]) =>
      Object.entries(values).map(([name, economy]) => {
        const status =
          economy.returnOnSpend.status !== "available"
            ? "return unavailable"
            : new Decimal(economy.netContribution).gte(0)
              ? "profitable"
              : "unprofitable";
        return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(unit)}</td><td>${amount(economy.grossRevenue, unit)}</td><td>${amount(economy.refunds, unit)}</td><td>${amount(economy.netRevenue, unit)}</td><td>${amount(economy.attributedCosts, unit)}</td><td>${amount(economy.netContribution, unit)}</td><td title="Exact: ${escapeHtml(economy.returnOnSpend.value)}">${percent(economy.returnOnSpend.value)}</td><td>${escapeHtml(status)}</td></tr>`;
      }),
    )
    .join("");
  const customerRows = Object.entries(result.breakdowns.customerEconomics)
    .flatMap(([unit, values]) =>
      Object.entries(values).map(
        ([name, economy]) =>
          `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(unit)}</td><td>${amount(economy.grossRevenue, unit)}</td><td>${amount(economy.refunds, unit)}</td><td>${amount(economy.netRevenue, unit)}</td></tr>`,
      ),
    )
    .join("");
  const receiptRows = receipts
    .map(
      (receipt) =>
        `<tr><td>${escapeHtml(receipt.operation)}</td><td>${escapeHtml(receipt.advertisedPrice)}</td><td>${escapeHtml(receipt.network)}</td><td>${escapeHtml(receipt.maskedSeller)} / ${escapeHtml(receipt.maskedPayer ?? "unavailable")}</td><td><a href="${escapeHtml(receipt.explorerUrl)}">${escapeHtml(receipt.transactionHash)}</a></td><td>${escapeHtml(receipt.settlementStatus)}</td></tr>`,
    )
    .join("");
  const totalSpend = receipts.reduce(
    (sum, receipt) => sum.plus(receipt.advertisedPrice.split(" ")[0] ?? 0),
    new Decimal(0),
  );
  const findings = ((input.analysis?.findings as Array<Record<string, unknown>>) ?? [])
    .map(
      (finding) =>
        `<li><strong>${escapeHtml(finding.code)}</strong> — ${escapeHtml(finding.message)} <code>${escapeHtml(JSON.stringify(finding.metrics))}</code></li>`,
    )
    .join("");
  const eventRows = events
    .map((event) => {
      const treatment =
        rejected.get(event.externalId) ?? excluded.get(event.externalId) ?? "profit-affecting";
      return `<tr><td>${escapeHtml(event.occurredAt.slice(0, 10))}</td><td>${escapeHtml(event.kind)}</td><td>${escapeHtml(event.direction)}</td><td>${amount(event.amount, event.currency)}</td><td>${escapeHtml(event.category)}</td><td>${escapeHtml(event.agentId)}</td><td>${escapeHtml(event.ventureId)}</td><td>${escapeHtml(event.experimentId)}</td><td>${escapeHtml(event.source.verification)}</td><td>${escapeHtml(treatment)}</td><td>${escapeHtml(event.source.reference)}</td></tr>`;
    })
    .join("");
  const embedded = JSON.stringify(result).replace(/</g, "\\u003c");
  const consistent =
    result.inputEventCount ===
      result.acceptedEventCount + result.rejectedEventCount + result.duplicateEventCount &&
    result.acceptedEventCount ===
      result.profitAffectingEventCount + result.profitExcludedEventCount;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Autonomous Agent Profit Report</title><style>:root{--bg:#07110f;--panel:#0d1d19;--line:#29443d;--text:#edf7f3;--muted:#9db5ad;--green:#4ce0ae;--red:#ff7c82;--amber:#ffd166}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px system-ui,sans-serif}.wrap{max-width:1240px;margin:auto;padding:40px 22px}.warning{padding:12px;background:#3a2c0c;border:1px solid var(--amber)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}.card,section{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}.card strong{font-size:24px;display:block;color:var(--green)}section{margin-top:18px}.scroll{overflow:auto}table{border-collapse:collapse;width:100%}th,td{padding:9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.num{text-align:right}.good{color:var(--green)}.bad{color:var(--red)}a{color:var(--green)}code{color:var(--muted)}</style></head><body><div class="wrap"><header><p class="warning"><strong>SYNTHETIC DEMONSTRATION DATA.</strong> No revenue shown here is actual business income.</p><h1>Ailabra · Autonomous Research Brief Service</h1><p>Generated ${escapeHtml(new Date().toISOString())} · ${escapeHtml(input.baseUrl)} · ${escapeHtml(receipts[0]?.network ?? "unavailable")} · Engine ${escapeHtml(result.calculationEngineVersion)} · calculation schema ${escapeHtml(result.schemaVersion)} · signed-report schema ${escapeHtml(input.signedReport?.schemaVersion ?? "not purchased")}</p></header>
<h2>Executive summary</h2><div class="grid"><div class="card">Net revenue<strong>${amount(totals.netRevenue, currency)}</strong></div><div class="card">Total costs<strong>${amount(totals.totalCosts, currency)}</strong></div><div class="card">Operating profit<strong>${amount(totals.netOperatingProfit, currency)}</strong></div><div class="card">Profit margin<strong>${percent((totals.profitMargin as unknown as { value: string | null })?.value ?? null)}</strong></div><div class="card">Net cash flow<strong>${amount(totals.netCashFlow, currency)}</strong></div><div class="card">Caller-reported current cash balance<strong>${amount(result.currentCashBalances[currency] ?? 0, currency)}</strong></div></div>
<section><h2>Wallet balance ≠ profit</h2><p>Owner capital and internal transfers change wallet balances without becoming revenue; withdrawals change cash without reducing operating profit. A caller-reported balance is not inferred from net cash flow.</p></section>
<section><h2>Experiment economics</h2><div class="scroll"><table><thead><tr><th>Experiment</th><th>Currency</th><th>Gross revenue</th><th>Refunds</th><th>Net revenue</th><th>Attributed costs</th><th>Net contribution</th><th>Return on spend</th><th>Status</th></tr></thead><tbody>${experimentRows}</tbody></table></div><h3>Unattributed shared costs</h3><table>${Object.entries(
    result.breakdowns.unattributedCosts,
  )
    .map(([unit, value]) => `<tr><td>${escapeHtml(unit)}</td><td>${amount(value, unit)}</td></tr>`)
    .join("")}</table></section>
<section><h2>Customer economics</h2><table><thead><tr><th>Customer</th><th>Currency</th><th>Gross revenue</th><th>Refunds</th><th>Net revenue</th></tr></thead><tbody>${customerRows}</tbody></table></section>
<section><h2>Complete costs by category</h2><table><thead><tr><th>Category</th><th>Currency</th><th>Spend</th></tr></thead><tbody>${moneyRows(result.breakdowns.spendByCategory)}</tbody></table></section>
<section><h2>Deterministic findings</h2><ul>${findings || "<li>No findings</li>"}</ul><details><summary>Machine-readable analysis</summary><pre>${escapeHtml(JSON.stringify(input.analysis ?? {}, null, 2))}</pre></details></section>
<section><h2>Data coverage and trust</h2><p>Coverage is reported independently per currency; nominal values from different currencies are never combined.</p><details open><summary>Evidence coverage and warnings</summary><pre>${escapeHtml(JSON.stringify(result.dataCoverage, null, 2))}</pre></details><p>Warnings: ${escapeHtml(result.warnings.join("; ") || "none")}</p></section>
<section><h2>Event accounting</h2><p class="${consistent ? "good" : "bad"}">Counts ${consistent ? "reconcile" : "DO NOT RECONCILE"}: input ${result.inputEventCount}, accepted ${result.acceptedEventCount}, rejected ${result.rejectedEventCount}, duplicate ${result.duplicateEventCount}, profit-affecting ${result.profitAffectingEventCount}, profit-excluded ${result.profitExcludedEventCount}.</p><div class="scroll"><table><thead><tr><th>Date</th><th>Kind</th><th>Direction</th><th>Amount</th><th>Category</th><th>Agent</th><th>Venture</th><th>Experiment</th><th>Evidence</th><th>Profit treatment</th><th>Reference</th></tr></thead><tbody>${eventRows}</tbody></table></div></section>
<section><h2>x402 purchase evidence</h2><table><thead><tr><th>Operation</th><th>Price</th><th>Network</th><th>Seller / buyer</th><th>Transaction</th><th>Status</th></tr></thead><tbody>${receiptRows}</tbody></table><p><strong>Total demonstration service spend: ${totalSpend.toFixed()} USDC</strong></p><p>This purchase total is not part of the synthetic business ledger unless recorded as a separate event.</p></section>
<section><h2>Signature verification</h2><p class="${input.verification?.valid ? "good" : "bad"}">${input.verification?.valid ? "Independently verified" : "Unavailable or verification failed"}</p><p>Key ID: ${escapeHtml(input.verification?.keyId ?? "n/a")} · Algorithm: ${escapeHtml(input.verification?.algorithm ?? "n/a")} · Result hash: ${escapeHtml(input.verification?.resultHash ?? "n/a")} · Verified: ${escapeHtml(input.verification?.verifiedAt ?? "n/a")}</p></section>
<p>This is operational analytics, not an audited financial statement, tax account, financial advice, or independent verification of self-reported evidence.</p><script type="application/json" id="profit-result">${embedded}</script></div></body></html>`;
}
