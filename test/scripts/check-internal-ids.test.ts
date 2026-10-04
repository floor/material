// test/scripts/check-internal-ids.test.ts
/**
 * The repository-wide half of the internal-id guard: what a finding carries,
 * and the one file exempt on one kind of line.
 */

import { describe, test, expect } from 'bun:test';
import { scanInternalIds } from '../../scripts/internal-ids';

// This repository is public, so the samples are assembled at runtime instead
// of spelling an internal reference here.
const reference = (ticket: number) => ['FLO', String(ticket)].join('-');

describe('repo-wide internal id guard', () => {
  test('reports the file, the line and the text', () => {
    const findings = scanInternalIds('src/example.ts', `const a = 1;\n// fixed in ${reference(999998)}\n`);
    expect(findings).toEqual([
      { file: 'src/example.ts', line: 2, text: `// fixed in ${reference(999998)}` },
    ]);
  });

  test('finds references on several lines, in order', () => {
    const text = `${reference(999998)}\nclean\n${reference(999999)}, then ${reference(999998)}`;
    expect(scanInternalIds('README.md', text).map((f) => f.line)).toEqual([1, 3]);
  });

  test('a clean file has none', () => {
    expect(scanInternalIds('src/example.ts', 'const b = 2;\n')).toEqual([]);
  });

  test('the rename table is exempt only on its old values', () => {
    const file = 'scripts/text-field-rename-entries.ts';
    expect(scanInternalIds(file, `  old: "keeps ${reference(999998)}",`)).toEqual([]);
    expect(scanInternalIds(file, `  new: "no ${reference(999998)}",`)).toHaveLength(1);
    expect(scanInternalIds(file, `  // ${reference(999998)} in a comment`)).toHaveLength(1);
  });
});
