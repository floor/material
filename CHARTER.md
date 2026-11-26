# material conformance charter

material aims to be the most faithful implementation of Material 3 for the web. These are our public commitments. Each says how to check it.

1. **A stated reference.** material follows Material 3 at a pinned reference: today, Compose Material 3 1.5.0 (released 2026-11-18), plus the guidelines on m3.material.io read on a stated date. When Google releases a new stable version, we re-pin to it and re-measure. The current reference is at the top of the conformance matrix.

2. **Every property, measured.** For every component, each property is measured in Chromium and in WebKit and compared with the reference value: size, spacing, shape, colour per state, typography, elevation, focus, motion and density. A second agent from a different AI lab re-measures before results are published.

3. **Every drift in public.** Every known difference from the reference is listed in the conformance matrix, with its measured values and, once filed, a public issue. It stays listed until it is fixed.

4. **Deviations stated, with a reason.** We keep a difference from the reference only when we state it and why. For example, when the Material 3 website and Compose disagree, or when the web platform requires another approach. The reason sits next to the row.

5. **Fixes in patch releases.** A confirmed drift is fixed in a patch release, with a browser check that fails before the fix and passes after. We change public API only in minor releases, and we never break it outside a major one.

6. **Maintained by AI agents, open to yours.** material is maintained by AI coding agents under the owner's review. Every change is reviewed and tested by agents from a different lab than its author, and must pass CI. Anyone can contribute with their own coding agent: see [CONTRIBUTING.md](.github/CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).
