# Verified product facts

Checked: 2026-07-29

- Product: Ailabra Agent Profit Ledger
- Promise: Find out whether your AI agent is actually making money.
- Production: https://x402.ailabra.org (`eip155:8453`, native USDC)
- Test: https://test-x402.ailabra.org (`eip155:84532`, test USDC)
- MCP: https://x402.ailabra.org/mcp
- MCP Registry: `io.github.JSJFIN/agent-profit-ledger`
- OpenAPI: https://x402.ailabra.org/openapi.json
- npm: `@jsjfin/agent-profit`
- Public examples: https://github.com/JSJFIN/agent-profit-demo
- Current deployed server: 1.0.6
- SDK source/release candidate: 0.1.1; npm remains 0.1.0 until the owner
  completes the required npm authenticator challenge.
- Prices: calculate 0.01 USDC; analyze 0.05 USDC; attest 0.25 USDC;
  workspace 0.25 USDC; extension 0.10 USDC.
- MCP tools: profit_calculate, profit_analyze, profit_attest,
  workspace_create, workspace_record_events, workspace_get_profit,
  workspace_get_data_quality, report_verify.
- Stateless raw event batches are not retained. Workspaces default to 30-day
  retention. Signed-report storage follows report visibility/access policy.
- Capability tokens are returned once and stored as hashes by the service.
- Evidence levels are explicit. Self-reported data is not independently
  verified merely because it is signed.
- Ed25519 signatures make report content tamper-evident and identify the service
  signing key; they do not audit underlying events.
- Verified examples are synthetic and labelled. Prior Base mainnet and Base
  Sepolia settlement hashes may be cited only from the repository verification
  record, never as customer usage.

Never claim: audited, tax compliant, guaranteed accurate, independently verified
revenue, fraud proof, investment grade, or financial advice.
