// scripts/expected-failure.ts
import { AssertionError } from "node:assert/strict";

/**
 * Runs the acceptance check of a bug that is filed and not fixed yet.
 *
 * The check reproduces the bug deterministically and asserts the behaviour the fix
 * must give, so today it fails, and that failure is what this accepts: the one
 * assertion whose message starts with the issue's id. Anything else (another
 * assertion, a timeout, an error in the reproduction) is thrown as usual, so a
 * broken reproduction cannot pass as "still failing".
 *
 * When the check passes, the bug is fixed and this throws: the fix's own change
 * replaces `expectedFailure(issue, …, check)` with `await check()`.
 */
export const expectedFailure = async (issue: string, what: string, check: () => Promise<void>): Promise<void> => {
  try {
    await check();
  } catch (error) {
    if (error instanceof AssertionError && error.message.startsWith(`${issue}:`)) {
      console.log(`  known ${issue} (not fixed yet): ${what}`);
      return;
    }
    throw error;
  }
  throw new Error(`${issue} looks fixed: "${what}" now passes. Call the check directly instead of through expectedFailure, in the change that fixes it.`);
};
