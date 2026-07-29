# npm publication checklist

The public package is `@jsjfin/agent-profit`. The owner authorized publication on
2026-07-29. Every publication runs the permanent `prepublishOnly` package-content
audit.

The package allowlist contains compiled client JavaScript, type declarations, the
public example, README, license, and package metadata only. TypeScript source,
source maps, declaration maps, native debug symbols, server implementation,
deployment files, private reports, and payment artifacts are rejected by
`npm run package:audit`.

## Owner prerequisites

Completed for the initial direct publication: the `jsjfin` account controls the
scope, publishing 2FA is enabled, and version `0.1.0` passed the package audit.

For future trusted publications, on npmjs.com create a GitHub trusted publisher for:

- Owner: `JSJFIN`
- Repository: `agent-profit-demo`
- Workflow: `publish.yml`
- Environment: `npm`
- Allowed action: `npm publish`
  Then add required reviewers to the GitHub `npm` environment.

## Publication procedure

```sh
cd /path/to/agent-profit-demo
npm view @jsjfin/agent-profit version
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run secret-scan
npm run package:audit
npm pack --dry-run
npm pack
git add package.json package-lock.json
git commit -m "release: publish public client"
git push origin main
```

Then manually dispatch `.github/workflows/publish.yml` from GitHub Actions. The workflow uses a GitHub-hosted Node 24 runner, npm 11.5.1 or newer, `id-token: write`, an approval-protected environment, and npm trusted publishing. No long-lived npm token is required.

Afterward, verify independently:

```sh
npm view @jsjfin/agent-profit name version dist.integrity dist.tarball
npm install --global @jsjfin/agent-profit@0.1.0
agentprofit --version
```
