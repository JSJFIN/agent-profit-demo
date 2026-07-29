# Black-box verification record

Verified on 2026-07-29 against `https://test-x402.ailabra.org` using Base Sepolia (`eip155:84532`) native USDC. No private key, payment authorization header, or capability token is recorded here.

## Paid operations

| Operation |     Price | Settlement                                                                                                                                                                 |
| --------- | --------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calculate | 0.01 USDC | [`0x42bce20b0cb24265e573f86c6c9b08fd4519a0a726f87b6c26281c06b9b06120`](https://sepolia.basescan.org/tx/0x42bce20b0cb24265e573f86c6c9b08fd4519a0a726f87b6c26281c06b9b06120) |
| Analyze   | 0.05 USDC | [`0x6d9261fb38033c6d5654ab064cbaa207cf772ec29ea1f05b65cd2fee43831b25`](https://sepolia.basescan.org/tx/0x6d9261fb38033c6d5654ab064cbaa207cf772ec29ea1f05b65cd2fee43831b25) |
| Attest    | 0.25 USDC | [`0xeb68450d8b5182b0f740ef40417f4cb5e7350c300e81b443ae55b26a67d94406`](https://sepolia.basescan.org/tx/0xeb68450d8b5182b0f740ef40417f4cb5e7350c300e81b443ae55b26a67d94406) |

The final calculation accepted all 15 events: 11 affected profit and 4 were excluded (two matched transfer legs, owner capital, and owner withdrawal). No events were rejected or duplicated. Gross revenue was 58 USDC, refunds 4 USDC, net revenue 54 USDC, total costs 45.6 USDC, operating profit 8.4 USDC, margin 15.555556%, and net cash flow 100.4 USDC.

Schema-2 report `rpt_6c063992-c0d0-491d-82da-881b09489be0` was independently verified with key `ailabra-profit-report-2026-01`. Its recomputed SHA-256 result hash was `7b02ddb7715ae2ab236e950ec300068487e3568c528486b2a49e0d8c686c8e8c`. A modified signed calculation failed verification in the automated tamper test.

No Base-mainnet funds were spent.
