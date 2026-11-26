# Public conformance matrix

`matrix.json` records Material 3 specification and Jetpack Compose Material 3 comparisons for the measured properties. Chromium and WebKit measure every row. Both measurements must agree with a reference for that reference's status to be `match`. When the measurements differ, Chromium supplies the primary value and the row includes both results.

    bun install --frozen-lockfile
    bunx playwright install chromium webkit
    bun run build
    bun run conformance --matrix
    bun run conformance --matrix --check

The check runs the same fixtures as generation and compares the result byte for byte. It reports a diff on failure. Both commands read the built distribution. The stable row IDs and probe mappings are in [matrix-bindings.ts](../scripts/conformance/matrix-bindings.ts). Component IDs follow the public component pages. The app bar and toolbar pages also carry rows with the published `top-app-bar/` and `bottom-app-bar/` prefixes. Measurements use CSS pixels. CSS lengths and bounding boxes are recorded to 0.01 px. The pointer-exit timer is recorded to 25 ms. Colour role labels use the matching light-theme reference colour. A shared resolved colour can correspond to more than one role.

[reference.json](reference.json) records the source coordinates, release pin and source JAR checksums. The generator fetches the required Kotlin token files from the pinned AndroidX mirror and checks each file against its SHA-256 from the published JAR. To work offline, set `COMPOSE_TOKENS_DIR` to the extracted token directory from that JAR.

[overrides.json](overrides.json) holds the website values and reviewed runtime comparisons for cases where generated tokens give a different value or have no runtime use. A null reference value yields `no-value`. Issues remain null until public issues are assigned.

Before tagging a release, set the measurement date and Material input commit in `reference.json`, build that source and regenerate the matrix. The source commit identifies the measured implementation, so it precedes the commit recording the matrix. Keep published row IDs stable. Schema 1 changes are additive. The public repository and release tags carry the matrix outside the npm package.
