# Public conformance matrix

`matrix.json` records Material 3 specification and Jetpack Compose Material 3 comparisons for the measured properties. Chromium and WebKit measure every row. Both measurements must agree with a reference for that reference's status to be `match`. When the measurements differ, Chromium supplies the primary value and the row includes both results.

    bun install --frozen-lockfile
    bunx playwright install chromium webkit
    bun run build
    bun run conformance --matrix
    bun run conformance --matrix --check

The check runs the same fixtures as generation and compares the result byte for byte. It reports a diff on failure. Both commands read the built distribution. The stable row IDs and probe mappings are in [matrix-bindings.ts](../scripts/conformance/matrix-bindings.ts). There is one entry per measured component. The [bottom app bar route](https://md3.io/components/bottom-app-bar/) redirects to the toolbar page. The app bar entry retains the published `top-app-bar/` row IDs. Measurements use CSS pixels. CSS lengths and bounding boxes are recorded to 0.01 px. The pointer-exit timer is recorded to 25 ms. A colour row names a theme role when one role uniquely matches the CSS colour measured in both engines in baseline light, baseline dark and a light theme generated with `material/theme` from seed `#006C4C`. A row's `resolved` records the colour in each theme for Material and for each reference that names a role. If engine readings differ, `resolvedEngines` carries both sets. Fully transparent paint across all three themes compares as the literal `transparent`. A measured colour without a unique role or a transparency match is shown as its baseline light hex and drifts from any stated reference. Opacity is compared in separate rows. Focus ring evidence retains the measured width, style and offset and uses the same three-theme check for its colour.

Measurements use left-to-right direction (`dir="ltr"`).

Theme-dependent measurements name colour, type-scale, corner and elevation roles. Their `resolved` fields carry the measured details, including typography size, weight, line height and tracking, corner radius, and elevation. Typography, corners and elevation are checked in both engines and all three themes, and at density −2. The corner check also changes the shape tokens to verify which role the measured corner follows. Fixed component values remain numeric, with distinct density rows where applicable. The original source token remains available in `compose.file` and `compose.symbol`.

[reference.json](reference.json) records the source coordinates, release pin and source JAR checksums. The generator fetches the required Kotlin token files from the pinned AndroidX mirror and checks each file against its SHA-256 from the published JAR. To work offline, set `COMPOSE_TOKENS_DIR` to the extracted token directory from that JAR.

[overrides.json](overrides.json) holds the website values and reviewed runtime comparisons for cases where generated tokens give a different value or have no runtime use. A null reference value yields `no-value`. Issues remain null until public issues are assigned. [spec-values.json](spec-values.json) records additional values from the published specification pages with their section and read date. These entries fill gaps in the website reference. They leave Compose comparisons and Material measurements unchanged. Website typography retains the token table's design points, compared numerically with CSS pixels at the default scale. The table's 0 dp elevation compares with a flat surface.

Before tagging a release, set the measurement date and Material input commit in `reference.json`, build that source and regenerate the matrix. The source commit identifies the measured implementation, so it precedes the commit recording the matrix. Keep published row IDs stable. Schema 1 changes are additive. The public repository and release tags carry the matrix outside the npm package.

## Coverage

[coverage.json](coverage.json) reports how many pinned Compose Material 3 component tokens the matrix measures. Coverage is measured ÷ (measured + unmeasured), rounded to two decimal places. The matrix's match, drift and no-value statuses describe comparisons with each reference.

Coverage follows the component token in the fixture's row binding when a Compose override supplies a different runtime reference. Rows without a component token binding use the token named in the published matrix. Where several rows measure the same token, the report links to the first published row unless [coverage-map.json](coverage-map.json) chooses another of those rows.

Component summaries list shared files. Overall totals count each file and token pair once. A pair counts as measured overall when any of its components measures it, and as not applicable only when every mapped component excludes it. Reviewed exclusions carry a reason and are outside the denominator. Unimplemented web features stay in `unmeasured`. The optional `unmeasuredNotes` map preserves a one-line note for any entry in that list. Carousel and side sheet have a null percentage because this pin has no component token files for them. The inventory excludes foundation files and runtime values that have no component token declaration.

Run this command after a matrix, binding or mapping change.

    bun run scripts/conformance/coverage.ts

The CI check reads the committed sources offline. To reproduce the [token snapshot](compose-tokens-1.5.0.json), extract the flat token directory from the pinned source JAR in [reference.json](reference.json) and pass it to `bun run scripts/conformance/coverage.ts --snapshot <token directory>`. The command checks the file hashes before reading the tokens. When a row starts measuring a previously unmeasured token, remove that token and its note from the coverage map.
