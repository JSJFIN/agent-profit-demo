import type { CalculationResult, EconomicEvent, PaymentReceipt, SignedReport } from "../types.js";
export const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const mask = (v?: string) => (v ? `${v.slice(0, 6)}…${v.slice(-4)}` : "unavailable");
const money = (v: unknown, c = "USDC") =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(Number(v ?? 0))} ${escapeHtml(c)}`;
const rows = (obj: Record<string, unknown> | undefined, c = "USDC") =>
  Object.entries(obj ?? {})
    .map(
      ([k, v]) =>
        `<tr><td>${escapeHtml(k)}</td><td class="num">${money(typeof v === "object" ? (v as any).value : v, c)}</td></tr>`,
    )
    .join("") || '<tr><td colspan="2">No data</td></tr>';
export function renderHtml(input: {
  events: EconomicEvent[];
  calculation: CalculationResult;
  analysis?: any;
  receipt: PaymentReceipt;
  attestationReceipt?: PaymentReceipt;
  signedReport?: SignedReport;
  verification?: Record<string, unknown>;
  baseUrl: string;
}) {
  const { events, calculation: r, receipt } = input;
  const currency = Object.keys(r.totals)[0] ?? "USDC";
  const t = (r.totals as any)[currency] ?? {};
  const excluded = new Map(
    ((r as any).profitExcludedEvents ?? []).map((x: any) => [x.externalId, x.reason]),
  );
  const rejected = new Map(
    ((r as any).rejectedEvents ?? []).map((x: any) => [x.externalId, x.reason]),
  );
  const embedded = JSON.stringify(r).replace(/</g, "\\u003c");
  const consistent =
    r.inputEventCount === r.acceptedEventCount + r.rejectedEventCount + r.duplicateEventCount &&
    r.acceptedEventCount === r.profitAffectingEventCount + r.profitExcludedEventCount;
  const eventRows = events
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.occurredAt.slice(0, 10))}</td><td>${escapeHtml(e.kind)}</td><td>${escapeHtml(e.direction)}</td><td class="num">${money(e.amount, e.currency)}</td><td>${escapeHtml(e.category)}</td><td>${escapeHtml(e.agentId)}</td><td>${escapeHtml(e.ventureId)}</td><td>${escapeHtml(e.experimentId)}</td><td>${escapeHtml(e.source.verification)}</td><td><span class="pill ${rejected.has(e.externalId) ? "bad" : excluded.has(e.externalId) ? "neutral" : "good"}">${escapeHtml(rejected.get(e.externalId) ?? excluded.get(e.externalId) ?? "profit-affecting")}</span></td><td>${escapeHtml(e.source.reference)}</td></tr>`,
    )
    .join("");
  const coverage = r.dataCoverage as any;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Autonomous Agent Profit Report</title><style>:root{--bg:#07110f;--panel:#0d1d19;--line:#29443d;--text:#edf7f3;--muted:#9db5ad;--green:#4ce0ae;--red:#ff7c82;--amber:#ffd166}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px system-ui,sans-serif}.wrap{max-width:1180px;margin:auto;padding:40px 22px}header{border-bottom:1px solid var(--line);padding-bottom:24px}.warning{padding:12px;background:#3a2c0c;border:1px solid var(--amber);color:#ffe7a5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}.card,section{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}.card strong{font-size:25px;display:block;color:var(--green)}section{margin-top:18px}table{border-collapse:collapse;width:100%}th,td{padding:9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.num{text-align:right}.pill{padding:3px 7px;border-radius:10px}.good{background:#123c31;color:var(--green)}.bad{background:#471b20;color:var(--red)}.neutral{background:#39351b;color:var(--amber)}.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.muted{color:var(--muted)}a{color:var(--green)}@media(max-width:760px){.two{grid-template-columns:1fr}.scroll{overflow:auto}}</style></head><body><div class="wrap"><header><p class="warning"><strong>SYNTHETIC DEMONSTRATION DATA.</strong> No revenue shown here is actual business income.</p><h1>Ailabra · Autonomous Research Brief Service</h1><p>Generated ${escapeHtml(new Date().toISOString())} · ${escapeHtml(input.baseUrl)} · ${escapeHtml(receipt.network)} · USDC · Engine ${escapeHtml(r.calculationEngineVersion)} · Report schema ${escapeHtml(input.signedReport?.schemaVersion ?? "not purchased")}</p></header>
 <h2>Executive summary</h2><div class="grid"><div class="card">Net revenue<strong>${money(t.netRevenue, currency)}</strong></div><div class="card">Total costs<strong>${money(t.totalCosts, currency)}</strong></div><div class="card">Operating profit<strong>${money(t.netOperatingProfit, currency)}</strong></div><div class="card">Profit margin<strong>${escapeHtml(t.profitMargin?.value ?? "n/a")}%</strong></div><div class="card">Net cash flow<strong>${money(t.netCashFlow, currency)}</strong></div><div class="card">Derived cash position<strong>${money("110.40", currency)}</strong></div></div>
 <section><h2>Wallet balance ≠ profit</h2><p>Owner capital and internal transfers change wallet balances without becoming revenue; withdrawals change cash without reducing operating profit.</p><table><tr><th>Owner capital</th><th>Revenue</th><th>Costs</th><th>Transfers</th><th>Withdrawals</th><th>Net cash flow</th><th>Operating profit</th></tr><tr><td>${money(t.ownerCapital, currency)}</td><td>${money(t.grossRevenue, currency)}</td><td>${money(t.totalCosts, currency)}</td><td>40 USDC internal</td><td>${money(t.ownerWithdrawals, currency)}</td><td>${money(t.netCashFlow, currency)}</td><td>${money(t.netOperatingProfit, currency)}</td></tr></table></section>
 <div class="two"><section><h2>Revenue by customer</h2><table>${rows((r.breakdowns as any).revenueByCustomer, currency)}</table><h3>Revenue by venture</h3><table>${rows((r.breakdowns as any).revenueByVenture, currency)}</table></section><section><h2>Costs and experiments</h2><h3>Spend by experiment</h3><table>${rows((r.breakdowns as any).spendByExperiment, currency)}</table><h3>Return on spend</h3><table>${rows((r.breakdowns as any).experimentReturnOnSpend, "%")}</table></section></div>
 <section><h2>Event accounting</h2><p>Counts ${consistent ? '<span class="pill good">reconcile</span>' : '<span class="pill bad">INCONSISTENT</span>'}: input ${r.inputEventCount}, accepted ${r.acceptedEventCount}, rejected ${r.rejectedEventCount}, duplicates ${r.duplicateEventCount}, profit-affecting ${r.profitAffectingEventCount}, profit-excluded ${r.profitExcludedEventCount}.</p><div class="scroll"><table><thead><tr><th>Date</th><th>Kind</th><th>Direction</th><th>Amount</th><th>Category</th><th>Agent</th><th>Venture</th><th>Experiment</th><th>Evidence</th><th>Profit treatment</th><th>Reference</th></tr></thead><tbody>${eventRows}</tbody></table></div></section>
 <section><h2>Data coverage and trust</h2><div class="two"><div><h3>Revenue evidence %</h3><table>${rows(coverage.revenueByEvidencePercent, "%")}</table></div><div><h3>Expense evidence %</h3><table>${rows(coverage.expensesByEvidencePercent, "%")}</table></div></div><p>Missing cost categories: ${escapeHtml((coverage.missingCostCategories ?? []).join(", ") || "none")}</p><p>Warnings: ${escapeHtml((r.warnings ?? []).map((x: any) => (typeof x === "string" ? x : x.message)).join("; ") || "none")}</p></section>
 <section><h2>x402 purchase evidence</h2><table><tr><th>Endpoint</th><td>${escapeHtml(receipt.endpoint)}</td></tr><tr><th>Price</th><td>${escapeHtml(receipt.price)}</td></tr><tr><th>Network / asset</th><td>${escapeHtml(receipt.network)} / ${escapeHtml(receipt.asset)}</td></tr><tr><th>Seller / buyer</th><td>${mask(receipt.payTo)} / ${mask(receipt.payer)}</td></tr><tr><th>Transaction</th><td><a href="${escapeHtml(receipt.explorerUrl)}">${escapeHtml(receipt.transaction)}</a></td></tr><tr><th>Payment identifier</th><td>${escapeHtml(receipt.paymentId ?? "not supplied")}</td></tr><tr><th>Status</th><td>${receipt.success ? "settled" : "failed"} · ${receipt.network === "eip155:84532" ? "testnet" : "mainnet"}</td></tr></table></section>
 <section><h2>Signature verification</h2>${input.verification?.valid ? '<p class="pill good">Independently verified</p>' : '<p class="pill neutral">Signed attestation unavailable or not verified</p>'}<p>Key ID: ${escapeHtml(input.verification?.keyId ?? "n/a")} · Algorithm: ${escapeHtml(input.verification?.algorithm ?? "n/a")} · Result hash: ${escapeHtml(input.verification?.resultHash ?? "n/a")} · Verified: ${escapeHtml(input.verification?.verifiedAt ?? "n/a")}</p></section>
 <section><h2>Deterministic findings</h2><pre>${escapeHtml(JSON.stringify(input.analysis?.findings ?? {}, null, 2))}</pre><p class="muted">This is an operational profitability calculation, not an audited financial statement, tax account, financial advice, or independent verification of self-reported evidence.</p></section><script type="application/json" id="profit-result">${embedded}</script></div></body></html>`;
}
