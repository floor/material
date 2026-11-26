# Public conformance matrix

`matrix.json` records Material 3 specification and Jetpack Compose Material 3 comparisons for the measured properties. Chromium and WebKit measure every row. Both measurements must agree with a reference for that reference's status to be `match`. When the measurements differ, Chromium supplies the primary value and the row includes both results.

    bun install --frozen-lockfile
    bunx playwright install chromium webkit
    bun run build
    bun run conformance --matrix
    bun run conformance --matrix --check

The check runs the same fixtures as generation and compares the result byte for byte. It reports a diff on failure. Both commands read the built distribution. The stable row IDs and probe mappings are in [matrix-bindings.ts](../scripts/conformance/matrix-bindings.ts). There is one entry per measured component. The [bottom app bar route](https://md3.io/components/bottom-app-bar/) redirects to the toolbar page. The app bar entry retains the published `top-app-bar/` row IDs. Measurements use CSS pixels. CSS lengths and bounding boxes are recorded to 0.01 px. The pointer-exit timer is recorded to 25 ms. A colour row names a theme role when one role uniquely matches the CSS colour measured in both engines in baseline light, baseline dark and a light theme generated with `material/theme` from seed `#006C4C`. A row's `resolved` records the colour in each theme for Material and for each reference that names a role. If engine readings differ, `resolvedEngines` carries both sets. A measured colour without a unique role is shown as its baseline light hex and drifts from any stated reference. Opacity is compared in separate rows.

[reference.json](reference.json) records the source coordinates, release pin and source JAR checksums. The generator fetches the required Kotlin token files from the pinned AndroidX mirror and checks each file against its SHA-256 from the published JAR. To work offline, set `COMPOSE_TOKENS_DIR` to the extracted token directory from that JAR.

[overrides.json](overrides.json) holds the website values and reviewed runtime comparisons for cases where generated tokens give a different value or have no runtime use. A null reference value yields `no-value`. Issues remain null until public issues are assigned. [spec-values.json](spec-values.json) records additional values from the published specification pages with their section and read date. These entries fill gaps in the website reference. They leave Compose comparisons and Material measurements unchanged. Website typography retains the token table's design points, compared numerically with CSS pixels at the default scale. The table's 0 dp elevation compares with a flat surface.

Before tagging a release, set the measurement date and Material input commit in `reference.json`, build that source and regenerate the matrix. The source commit identifies the measured implementation, so it precedes the commit recording the matrix. Keep published row IDs stable. Schema 1 changes are additive. The public repository and release tags carry the matrix outside the npm package.
