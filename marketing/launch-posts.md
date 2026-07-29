# Platform-specific launch drafts

## X / Twitter

An AI agent's wallet can go up while the agent loses money—or rise because its
owner funded it. Ailabra separates revenue, costs, refunds, fees, capital,
withdrawals, and transfers. Deterministic profit via MCP, npm, OpenAPI, and x402.
Synthetic demo: 570 USDC cash increase, 70 USDC profit. https://x402.ailabra.org

## LinkedIn

“How much is in the wallet?” is not the same question as “Did the agent make
money?” We built Ailabra Agent Profit Ledger to give autonomous services a
deterministic operating loop: record economic events, attribute costs to agents,
ventures, and experiments, then calculate profit and cash flow without an LLM.
The public SDK is `@jsjfin/agent-profit`; MCP and OpenAPI are available at the
live service. We are looking for five design partners with real revenue and cost
events. Results are operational analytics, not audited accounts.

## Show HN

Title: Show HN: A deterministic profit ledger for autonomous agents

Agents can buy APIs and earn x402 revenue, but wallet balance mixes operations,
owner funding, withdrawals, and internal transfers. Ailabra accepts a versioned
economic-event schema and returns exact-decimal profit, cash flow, experiment
contribution, and evidence coverage. It is available as a remote MCP server,
OpenAPI service, x402 endpoint, and guarded npm SDK. The core engine uses no LLM.
The repository contains a synthetic 100 revenue / 30 cost / 500 capital example
that demonstrates 70 profit versus 570 cash increase. Feedback on the schema and
agent integration ergonomics is especially welcome.

## Reddit technical communities

I built a small deterministic ledger for an agent-economics problem: a wallet
balance cannot distinguish customer revenue from owner capital or an internal
transfer. The service models revenue, refunds, costs, fees, capital, withdrawals,
and transfers, then reports profit and cash flow separately. There is a free
read-only CLI (`agent-profit doctor`, `discover`, and `quote`) and explicit x402
spending guardrails. Synthetic example and code: https://github.com/JSJFIN/agent-profit-demo

## Base / x402 community

x402 makes machine-to-machine revenue and costs observable at settlement time.
Ailabra turns those receipts—plus LLM, hosting, acquisition, and owner-funding
events—into deterministic agent profit and experiment contribution. Native Base
USDC, guarded buyer SDK, Bazaar metadata, and a Base Sepolia profile are live.

## MCP community

`io.github.JSJFIN/agent-profit-ledger` exposes eight remote MCP tools for
stateless profit, analysis, signed reports, and a 30-day capability-scoped
workspace. Tool descriptions state price, retention, evidence limitations, and
when to choose adjacent tools. A valid signature is tamper evidence, not an
audit.

## GitHub Discussion

SDK 0.1.1 adds explicit mainnet/testnet/custom profiles, normalized USDC prices,
x402 receipt adapters, and full MCP capability parity. Please try the read-only
flow first and open an issue for schema or interoperability friction.

## Dev.to / technical blog

Title: Wallet balance is not profit: an economic event loop for AI agents

Outline: why cash and profit diverge; event treatment table; x402 buyer/seller
receipt mapping; exact-decimal calculation; experiment contribution; evidence
coverage; signed reports; guarded TypeScript integration; limitations.
