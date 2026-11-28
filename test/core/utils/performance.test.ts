// test/core/utils/performance.test.ts
//
// debounce and throttle (core/utils/performance) on a controlled clock. A
// debounce waits for a quiet interval after the last call of a burst, not
// the first; a throttle's trailing call carries the last call's arguments.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, jest, test } from "bun:test";
import { advanceTimersByTime } from "../../utils/fake-clock";
import { debounce, throttle } from "../../../src/core/utils/performance";

const g = globalThis as { window?: unknown };
const previousWindow = g.window;

beforeAll(() => {
  // The library schedules on `window`; these reach whichever timers are
  // installed when they are called, so the fake clock holds them.
  g.window = {
    setTimeout: (callback: () => void, delay?: number) => setTimeout(callback, delay),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  };
});
afterAll(() => {
  g.window = previousWindow;
});
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/** Records each invocation with the clock's time since the test began. */
const recorder = () => {
  const start = Date.now();
  const calls: Array<[number, string]> = [];
  return { calls, fn: (label: string): void => { calls.push([Date.now() - start, label]); } };
};

describe("debounce", () => {
  test("fires once, a full wait after the last call of a burst", () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, 100);

    debounced("a");
    advanceTimersByTime(80);
    debounced("b");
    advanceTimersByTime(99);
    expect(calls).toEqual([]);

    advanceTimersByTime(1);
    expect(calls).toEqual([[180, "b"]]);

    advanceTimersByTime(500);
    expect(calls).toEqual([[180, "b"]]);
  });

  test("a long burst keeps it quiet until the calls stop", () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, 100);

    for (let call = 0; call < 10; call++) {
      debounced(`call ${call}`);
      advanceTimersByTime(40);
    }
    expect(calls).toEqual([]);

    advanceTimersByTime(100);
    expect(calls).toEqual([[460, "call 9"]]);
  });

  test("a single call fires after the wait, and each burst fires on its own", () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, 100);

    debounced("first");
    advanceTimersByTime(100);
    debounced("second");
    advanceTimersByTime(50);
    debounced("third");
    advanceTimersByTime(100);

    expect(calls).toEqual([[100, "first"], [250, "third"]]);
  });

  test("leading fires at once, and again after the burst only if more calls came", () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, 100, { leading: true });

    debounced("only");
    advanceTimersByTime(300);
    expect(calls).toEqual([[0, "only"]]);

    debounced("a");
    advanceTimersByTime(60);
    debounced("b");
    advanceTimersByTime(60);
    debounced("c");
    advanceTimersByTime(300);
    expect(calls).toEqual([[0, "only"], [300, "a"], [520, "c"]]);
  });

  test("maxWait bounds how long a burst can hold it back", () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, 100, { maxWait: 250 });

    for (let call = 0; call < 10; call++) {
      debounced(`call ${call}`);
      advanceTimersByTime(50);
    }
    // Never quiet for 100 ms, so only the bound fires it: at 250 and at 500.
    expect(calls).toEqual([[250, "call 4"], [500, "call 9"]]);

    advanceTimersByTime(500);
    expect(calls).toEqual([[250, "call 4"], [500, "call 9"]]);
  });

  test("cancel drops the pending call, and the next call starts a fresh wait", () => {
    const { calls, fn } = recorder();
    const debounced = debounce(fn, 100);

    debounced("dropped");
    advanceTimersByTime(60);
    debounced.cancel();
    advanceTimersByTime(500);
    expect(calls).toEqual([]);

    debounced("kept");
    advanceTimersByTime(99);
    expect(calls).toEqual([]);
    advanceTimersByTime(1);
    expect(calls).toEqual([[660, "kept"]]);
  });

  test("the call keeps its receiver", () => {
    const seen: unknown[] = [];
    const owner = { run: debounce(function (this: unknown): void { seen.push(this); }, 100) };
    owner.run();
    advanceTimersByTime(100);
    expect(seen).toEqual([owner]);
  });
});

describe("throttle", () => {
  test("the trailing call carries the last call's arguments", () => {
    const { calls, fn } = recorder();
    const throttled = throttle(fn, 100);

    throttled("first");
    advanceTimersByTime(20);
    throttled("second");
    advanceTimersByTime(20);
    throttled("third");
    advanceTimersByTime(20);
    throttled("last");
    advanceTimersByTime(200);

    expect(calls).toEqual([[0, "first"], [100, "last"]]);
  });

  test("fires at most once per wait, leading and trailing", () => {
    const { calls, fn } = recorder();
    const throttled = throttle(fn, 100);

    for (let call = 0; call < 10; call++) {
      throttled(`call ${call}`);
      advanceTimersByTime(30);
    }
    advanceTimersByTime(200);

    expect(calls.map(([time]) => time)).toEqual([0, 100, 200, 300]);
    expect(calls.at(-1)).toEqual([300, "call 9"]);
  });

  test("cancel drops the trailing call", () => {
    const { calls, fn } = recorder();
    const throttled = throttle(fn, 100);

    throttled("first");
    advanceTimersByTime(20);
    throttled("dropped");
    throttled.cancel();
    advanceTimersByTime(300);

    expect(calls).toEqual([[0, "first"]]);
  });
});
