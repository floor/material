// test/scripts/public-names.test.ts
/**
 * The public-text rule: the team's seat and persona names never appear in the
 * repository everyone reads.
 *
 * The samples are assembled at runtime, like the internal-id test's: this file
 * is tracked, so spelling a seat name or a persona name here would be the very
 * finding the check reports.
 */

import { describe, expect, test } from 'bun:test';
import {
  personaNames,
  publicNameRefs,
  scanPublicNames,
  scanTrackedTree,
} from '../../scripts/public-names';

const seat = (role: string, suffix: string) => [role, suffix].join('-');
const roleSeat = (word: string) => ['the', word].join(' ');
const ROOT = new URL('../..', import.meta.url).pathname;

describe('public name guard', () => {
  test('finds a persona name as a whole word', () => {
    const name = personaNames[0];
    expect(publicNameRefs(`Fixed by ${name}.`)).toEqual([name]);
    expect(publicNameRefs(`${name}'s merge line`)).toEqual([name]);
  });

  test('finds a seat name: a role with a suffix', () => {
    expect(publicNameRefs(`Review OK by ${seat('reviewer', '7')}.`)).toEqual([seat('reviewer', '7')]);
    expect(publicNameRefs(`Tester ${seat('tester', '1')} signed it off.`)).toEqual([seat('tester', '1')]);
    expect(publicNameRefs(`An ${seat('implementer', 'kimi')} pushed it.`)).toEqual([seat('implementer', 'kimi')]);
    expect(publicNameRefs(`${seat('builder', '5')} stopped.`)).toEqual([seat('builder', '5')]);
  });

  test('finds the role words used as seat names', () => {
    expect(publicNameRefs(roleSeat('orchestrator'))).toEqual([roleSeat('orchestrator')]);
    expect(publicNameRefs(roleSeat('operator'))).toEqual([roleSeat('operator')]);
    expect(publicNameRefs(`raised by ${roleSeat('orchestrator')} (Floor)`)).toEqual([roleSeat('orchestrator')]);
    expect(publicNameRefs(`the ${['Floor', 'orchestrator'].join(' ')}`)).toEqual([`the ${['Floor', 'orchestrator'].join(' ')}`]);
    expect(publicNameRefs([['operator', "'s"].join(''), 'decision'].join(' '))).toEqual([['operator', "'s"].join('')]);
    expect(publicNameRefs(['operator', '3'].join('-'))).toEqual([['operator', '3'].join('-')]);
    expect(publicNameRefs(['orchestrator', '@docs'].join(''))).toEqual([['orchestrator', '@docs'].join('')]);
  });

  test('leaves the language and ordinary prose alone', () => {
    expect(publicNameRefs('operator fun minus(o: Offset) = Offset(x - o.x, y - o.y)')).toEqual([]);
    expect(publicNameRefs('parent.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken')).toEqual([]);
    expect(publicNameRefs('the spread operator keeps its meaning')).toEqual([]);
    expect(publicNameRefs('a reviewer reads those; a theme builder calls it.')).toEqual([]);
  });

  test('allows the role word of the standard agent trailer', () => {
    expect(publicNameRefs(`**Agent:** Some Model · ${'orchestrator'}`)).toEqual([]);
    expect(publicNameRefs(`**Agent:** Some Model · ${seat('reviewer', '7')}`)).toEqual([seat('reviewer', '7')]);
  });

  test('a fixture changelog line naming a persona fails', () => {
    const line = `- **A fix** prepared by ${personaNames[0]}.`;
    const findings = scanPublicNames('CHANGELOG.md', `# Changelog\n\n${line}\n`);
    expect(findings).toEqual([{ file: 'CHANGELOG.md', line: 3, text: line }]);
  });

  test('reports the file, the line and the text', () => {
    const text = `const a = 1;\n// reviewed by ${seat('reviewer', '7')}\n`;
    expect(scanPublicNames('src/example.ts', text)).toEqual([
      { file: 'src/example.ts', line: 2, text: `// reviewed by ${seat('reviewer', '7')}` },
    ]);
  });

  test('the tracked tree has none', () => {
    expect(scanTrackedTree(ROOT)).toEqual([]);
  });
});
