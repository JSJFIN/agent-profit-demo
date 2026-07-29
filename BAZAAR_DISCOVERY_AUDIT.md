# Bazaar discovery audit

Checked: 2026-07-29

The production and Base Sepolia HTTP 402 requirements include x402 v2 `exact`
requirements and Bazaar discovery extensions. Paid HTTP routes and paid MCP
tools publish price, network, asset, retention, input schema, output description,
and evidence limitations from the service's shared metadata.

| Operation          | Price     | Schema                   | Retention                                  | Status                                        |
| ------------------ | --------- | ------------------------ | ------------------------------------------ | --------------------------------------------- |
| `profit_calculate` | 0.01 USDC | input and output present | raw stateless events are not stored        | previously confirmed searchable in CDP Bazaar |
| `profit_analyze`   | 0.05 USDC | input and output present | raw stateless events are not stored        | metadata verified; indexing not claimed       |
| `profit_attest`    | 0.25 USDC | input and output present | signed report retained under report policy | metadata verified; indexing not claimed       |
| `workspace_create` | 0.25 USDC | input and output present | 30-day workspace                           | metadata verified; indexing not claimed       |
| `workspace_extend` | 0.10 USDC | route metadata present   | adds 30 days and 1,000 events              | quote verified                                |

Production uses `eip155:8453` and native Base USDC. Test uses
`eip155:84532` and Base Sepolia USDC. Prices were not changed.

Verification:

```bash
curl -i -X POST https://x402.ailabra.org/api/v1/x402/profit/calculate \
  -H 'content-type: application/json' --data '{"events":[]}'
curl https://x402.ailabra.org/api/v1/pricing
curl https://x402.ailabra.org/.well-known/mcp.json
```

Useful semantic searches include `agent profit`, `agent economics`, `wallet
balance is not profit`, `x402 costs`, `experiment profitability`, and `signed
profit report`. No discovery ranking or indexing beyond the confirmed calculate
result is claimed.
