# Security

## Secret handling

- Use a separate low-value buyer wallet.
- Store its private key only in ignored local environment configuration.
- Never supply a seed phrase, seller key, capability token, or facilitator credential.
- Generated payment authorization headers are neither logged nor persisted.
- Private signed-report artifacts remain ignored by Git.

## Payment controls

The client rejects malformed challenges, unsupported versions/schemes, unexpected networks or assets, amounts over `X402_MAX_PAYMENT`, unexpected recipients when configured, resource URLs on another origin, and redirects. The SDK is allowed to select only requirements that pass the same policy.

The configured maximum is per request. Operators must separately budget the combined cost of calculate, analyze, and attest.

## Report safety

All event fields and source references are HTML-escaped. Embedded JSON escapes `<` to prevent script termination. The report uses no external resources. Addresses are masked except for public transaction hashes and explorer links. A green signature state appears only after local SHA-256 and Ed25519 verification.

Report vulnerabilities privately through [GitHub security advisories](https://github.com/JSJFIN/agent-profit-demo/security/advisories/new). Do not include private keys or recovery phrases.
