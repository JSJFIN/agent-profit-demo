# npm publication checklist

The provisional public package is `@jsjfin/agent-profit`. Publication is blocked by
both `private: true` and `prepublishOnly` in `package.json` until owner
authorization.

The package allowlist contains compiled client JavaScript, type declarations, the
public example, README, license, and package metadata only. TypeScript source,
source maps, declaration maps, native debug symbols, server implementation,
deployment files, private reports, and payment artifacts are rejected by
`npm run package:audit`.

## Owner prerequisites

1. Confirm that the `@jsjfin` npm scope is controlled by the publishing account and that the package name is available.
2. Confirm version `0.1.0` and inspect the generated tarball.
3. On npmjs.com, create a GitHub trusted publisher for:
   - Owner: `JSJFIN`
   - Repository: `agent-profit-demo`
   - Workflow: `publish.yml`
   - Environment: `npm`
   - Allowed action: `npm publish`
4. Add required reviewers to the GitHub `npm` environment.

## Authorization commit

Only after explicit owner authorization:

```sh
cd /path/to/agent-profit-demo
npm view @jsjfin/agent-profit version
# Edit package.json: remove "private": true and remove the prepublishOnly script.
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
git commit -m "release: authorize public client publication"
git push origin main
```

Then manually dispatch `.github/workflows/publish.yml` from GitHub Actions. The workflow uses a GitHub-hosted Node 24 runner, npm 11.5.1 or newer, `id-token: write`, an approval-protected environment, and npm trusted publishing. No long-lived npm token is required.

Afterward, verify independently:

```sh
npm view @jsjfin/agent-profit name version dist.integrity dist.tarball
npm install --global @jsjfin/agent-profit@0.1.0
agentprofit --version
```

Do not remove the safeguards merely to make a dry run pass; `npm pack` works while the package remains private.
