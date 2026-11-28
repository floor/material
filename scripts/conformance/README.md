# Material property measurements

Run `bun run conformance --list` to list the 37 fixtures. Each fixture returns JSON with measured values from a headless browser. Use an exact-head `dist/` artifact or build the checkout for package measurements. The harness can also bundle the local source and includes `source: "src"` in those results.

## Browser measurements

```sh
bun install --frozen-lockfile
bunx playwright install chromium webkit
bun run conformance tabs
bun run conformance radio --webkit --case=unselected/focus
mkdir -p analysis
bun run conformance all > analysis/conformance-chromium.jsonl
```

Chromium is the default. Add `--webkit` for a WebKit run. `--case` selects case IDs containing the supplied text. Some fixtures also run a separate behavior probe. `all` runs the fixtures sequentially in one engine and writes a JSON object per component, one per line. The command fails if a fixture fails.

The tooltip has a `--behavior` probe, progress has `--waves`, and the loading indicator has `--frames`. Use `--reduced-motion` with `loading-indicator --frames` to sample the reduced-motion envelope. `--viewport-width=<px>` and `--reduced-motion` also work with the shared field fixture.

## Compose tokens

Use the public AndroidX pin [`08ec699d5ada44a374a61c892f3701e941916a0f`](https://github.com/androidx/androidx/tree/08ec699d5ada44a374a61c892f3701e941916a0f/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens), whose `ShapeTokens.kt` is stamped `41.1.19`.

```sh
androidx_tokens=compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens
androidx_pin=08ec699d5ada44a374a61c892f3701e941916a0f
androidx_checkout=analysis/conformance-androidx
git clone --filter=blob:none --no-checkout --depth=1 --branch androidx-main \
  https://github.com/androidx/androidx.git "$androidx_checkout"
git -C "$androidx_checkout" sparse-checkout set "$androidx_tokens"
git -C "$androidx_checkout" fetch --depth=1 origin "$androidx_pin"
git -C "$androidx_checkout" checkout --detach FETCH_HEAD
export COMPOSE_TOKENS_DIR="$androidx_checkout/$androidx_tokens"
bun run conformance tokens slider --json
bun run conformance tokens --only=LinearProgressIndicatorTokens,CircularProgressIndicatorTokens --json
```

An existing copy of the pinned Kotlin directory works as `COMPOSE_TOKENS_DIR`. The extractor returns the raw token, resolved value and source line. Use `--files` to find matching token files or `--only` when the AndroidX component name differs. Keep measurement output, upstream checkouts, and the audit tables outside tracked files.

The [public conformance matrix](../../conformance/README.md) reuses selected fixture cases in Chromium and WebKit. Generate it with `bun run conformance --matrix`.
