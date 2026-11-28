# Working in material

Follow the [contributor guide](.github/CONTRIBUTING.md) for the local checks and release workflow. Run `bun run ts:check`, `bun run lint` and the tests for the change before pushing a branch.

## Size reports

CI compares each pull request and push to `main` with the latest `v*` release tag reachable from its base. The package job reports the base-release size, the measured size and the delta for every row. Its growth thresholds are 2,048 B for the compressed tarball and 1,024 B for a component's gzip measurement. Only the owner changes the thresholds in `scripts/budgets.ts`.

When a row grows by more than its threshold, include a line beginning `Size:` in the PR body that explains the growth. The delta is cumulative since the release, so explain when earlier merged changes account for the increase.

Keep the size tables in `README.md`, `npm-readme.md` and `SIZES.md` for release updates. Release CI generates them in the `package-sizes` artifact. The release report records the total packed size and its change since the previous release. Per-component stylesheet fixtures still record exact content and are updated with the source change that moves them. The four combined stylesheet pins are checked nightly and before publishing.
