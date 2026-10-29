# Reviewing a change to material

material ships a packed distribution: people import `material` and read the CSS in `dist/styles`
inside their own builds and pages. A change can pass every check and still leave a consumer with a
broken page, so a review asks what a consumer will see, not only whether CI is green.

[CONTRIBUTING](.github/CONTRIBUTING.md) covers what to run and how tests are organised. This page is
about the failures the checks cannot see, and how a review is run here.

## What failure looks like in material

These are real defects from this repository's history. They are the shape of what to look for, not
a list of things that are still wrong.

### A token that does not reach its consumer

A custom property that is declared nowhere fails at computed-value time with no error: the
declaration is dropped and the property inherits.

When 3.0.0 split typography out of the base stylesheet, a page that loaded only base asked for the
title-large font size token and got an empty string; an element styled from it computed the
inherited 32px instead of 22px. Nothing threw.

Check the path, not the name: for every `var(--mtrl-…)` a change adds or moves, find the rule that
declares it and the sheet that ships that rule to the consumer.

### A size row that lies

The tables between the size markers in `README.md` and `npm-readme.md` must equal the packed
measurement. `scripts/check-readme.ts:104-110` compares each stated figure with
`analysis/package-size.json` at the printed decimal and fails on a mismatch.

A change to the shared kernel, a widely imported component or the full stylesheet moves rows it may
not mention. One sync commit moved the all-js row from 127.3 to 127.4 kB because CI's packed
measurement was 127,409 bytes, and `readme:check` was red until the table said so.

Both files carry the same table; `scripts/check-readme.ts:114-115` fails when they differ. Read the
figure from CI's packed run, since packing varies slightly with the Node and npm versions.

### An accessible name that is missing or wrong

A control can look right, work right, and have no name at all.

`src/core/compose/features/textlabel.ts:85-95` links the label to the input so the field has a name
and a click on the label focuses it. The same code removes an `aria-label` copied from the label
text, because it would outrank the label and go stale when the label changes.

The other half is in `src/components/text-field/features/trailing-icon.ts:131-137`: an icon with no
label is decorative and `aria-hidden`; with a label it becomes a button, and that label is its
name.

Read the name in the accessibility tree — from a label element, `aria-labelledby` or `aria-label` —
for every control a change adds, renames or makes interactive. An icon-only control needs a name; a
decorative icon needs none.

### A selector or file-shape change that breaks a consumer of the built CSS

`dist/styles` is a published surface, and so is the shape of what it contains. A selector can keep
the page pixel-identical in browsers and still break the code that reads the stylesheet.

In 3.2.0 the baseline defaults moved to zero-specificity selectors
(`src/styles/themes/_baseline.scss:154,168`) so a selected theme wins in any import order. Browsers
rendered the same page, but a downstream site matching `:root` or `.dark-theme` literally in the
built CSS found nothing.

In 3.2.2, six `:dir(rtl)` rules in the toolbar and date picker were lowered by a bundler into
`:lang()` lists, which select a language rather than a direction; they matched no element on a
right-to-left page.

Check the output, not only the source: build, search `dist/styles/*.css` for the selector a consumer
might match, and run a bundled build for direction and nesting changes.

## Findings

- **Cite the evidence.** Every finding names a `file:line` in the diff, or the command and its last
  line for a measured claim. A claim without evidence is a question, not a finding.
- **Cap the nits.** At most three per review, each prefixed `nit:`. A nit is taste or polish and
  never holds a merge.
- **Label pre-existing defects.** A bug the diff did not introduce is `pre-existing:`; file it on
  its own and do not hold this pull request for it.
- **Flag the class, not only the instance.** If one direction rule is wrong, say every direction
  rule is suspect and name where to look. A fix that repairs one instance and leaves its siblings
  is a second round.

## The review loop

A review runs for at most three rounds. After round three the approach is the problem: stop the
diff and ask for the plan in writing — what the change promises, and how each promise is measured —
before another round starts.

From round two, review only what changed since the last round. The settled part is settled.

Never repeat a finding. If it is unanswered, name it as still open; do not restate the list.

Every finding is answered before merge: fixed, or closed on the record with a reason both sides
accept. "Later" is not an answer.

Approval means the code was read. CI covers what CI covers, and the sections above are the rest.
