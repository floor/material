// The fake clock for tests that assert on a component's timers.
// `jest.useFakeTimers()` and `jest.useRealTimers()` are used from `bun:test`
// directly. Advancing is here because the runner has
// `jest.advanceTimersByTime` and the `bun:test` types the repository installs
// do not declare it yet: the one place that says so, typed, instead of a cast
// at each call.
import { jest } from 'bun:test';

type AdvancingClock = typeof jest & { advanceTimersByTime(milliseconds: number): void };

/** Moves the fake clock forward, running every timer that falls due, in order. */
export const advanceTimersByTime = (milliseconds: number): void => {
  (jest as AdvancingClock).advanceTimersByTime(milliseconds);
};
