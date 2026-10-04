// test/scripts/internal-ids.test.ts
/**
 * The guard behind check-package-size.ts: a shipped file must carry no
 * internal ticket reference.
 */

import { describe, test, expect } from 'bun:test';
import { internalIdRefs } from '../../scripts/internal-ids';

// This repository is public, so the samples are assembled at runtime instead
// of spelling an internal reference here.
const reference = (ticket: number) => ['FLO', String(ticket)].join('-');

describe('internal id guard', () => {
  test('finds one reference', () => {
    expect(internalIdRefs(`// fixed in ${reference(999998)}`)).toEqual([reference(999998)]);
  });

  test('finds several, in the order they appear', () => {
    const text = `${reference(999998)}, then ${reference(999999)}.`;
    expect(internalIdRefs(text)).toEqual([reference(999998), reference(999999)]);
  });

  test('requires the prefix, the dash and the digits', () => {
    expect(internalIdRefs('flo-999998 FLO FLO- NLO-999998')).toEqual([]);
  });

  test('a clean comment has none', () => {
    expect(internalIdRefs('// the ring is a ::before 2dp outside the chip')).toEqual([]);
    expect(internalIdRefs('')).toEqual([]);
  });
});
