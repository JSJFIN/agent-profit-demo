# Architecture

The project is deliberately separate from the Profit Ledger server and depends only on public HTTP contracts.

```text
CLI
 ├─ scenario + local JSON EventStore
 ├─ PublicContracts ── GET /openapi.json
 ├─ guarded x402 buyer ── POST paid public endpoint
 ├─ signature verifier ── GET /api/v1/signing-keys
 └─ HTML renderer ── offline artifact
```

The local ledger preserves decimal strings and validates structure. `ProfitApiClient` discovers OpenAPI at runtime and validates the request before payment and the response after settlement. `paidPost` first records the real 402 challenge, approves exactly one allowed requirement, delegates authorization construction to the official SDK, blocks cross-origin redirects, and extracts settlement evidence. The renderer formats server results but contains no P&L formulas.

Trust boundaries are explicit: event provenance is caller-supplied; payment settlement is x402 evidence; calculation correctness is the service's deterministic contract; signature integrity is independently checked by this client.
