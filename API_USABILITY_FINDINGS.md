# Public API usability findings

The POC used the service strictly through public endpoints and found:

1. The original OpenAPI schema described return-on-spend, profit margin, net cash flow, and net operating profit with a non-negative decimal pattern. A legitimate unprofitable experiment returned `-53.703704`, so the independently validating client rejected an otherwise successful paid response. The service contract was corrected to publish signed decimal strings for metrics that can be negative.
2. `source.name` is required by the public economic-event schema even though abbreviated examples commonly emphasize `source.type`; runtime discovery made this clear and the POC supplies both.
3. Analysis reported both experiments as “spending without revenue” while the calculation's return-on-spend values necessarily incorporate attributed revenue. That finding should be reconciled with experiment-attribution logic.
4. The calculation response publishes experiment spend and return on spend, but not experiment revenue, refunds, or net contribution. External report generators therefore cannot display those values without reconstructing server calculations, which this POC intentionally refuses to do. Adding a complete `profitByExperiment` breakdown is recommended.
5. The test deployment health field reports `environment: production` because `NODE_ENV` describes the optimized runtime, while the network is Base Sepolia. A separate explicit `paymentMode: testnet` field would reduce ambiguity for external agents.

The public OpenAPI discovery, structured response schemas, x402 challenge, signing-key endpoint, and event-count semantics otherwise supported black-box implementation successfully.
