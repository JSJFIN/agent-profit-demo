# x402 payment flow

1. Fetch and validate `/openapi.json`, pricing, and public schemas. Build the complete operation plan and reject it before payment if any item exceeds `X402_MAX_PAYMENT` or the sum exceeds `X402_MAX_TOTAL_SPEND`.
2. POST the ordinary JSON business request without a payment header.
3. Require HTTP 402 and decode `PAYMENT-REQUIRED`.
4. Require protocol v2, the `exact` scheme, configured CAIP-2 network, official native-USDC contract, configured recipient, same-origin resource, and an amount within the ceiling.
5. Construct the EIP-3009 authorization with the official x402 EVM buyer SDK.
6. Retry the identical request while refusing redirects.
7. Require HTTP 200 and successful `PAYMENT-RESPONSE` settlement evidence.
8. Validate the application response against the public OpenAPI success schema.
9. Persist only safe receipt fields for every operation: endpoint, advertised and atomic amount, asset, network, masked participants, transaction hash, identifier if present, timestamp, and settlement status. Never persist payment authorization headers.

The test endpoint is Base Sepolia (`eip155:84532`). Production is Base mainnet (`eip155:8453`). No mainnet payment was performed for this demonstration.

Official references: [x402 buyer quickstart](https://docs.x402.org/getting-started/quickstart-for-buyers) and [Coinbase client/server flow](https://docs.cdp.coinbase.com/x402/core-concepts/client-server).
