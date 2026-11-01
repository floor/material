// Evidence only: simulate the runner being descheduled between open() and
// registering the test's 3 ms wait. Product timers keep their actual delays.
console.log("CLOSE_CONTRACT_PRELOAD_READY");
const stall = Number(process.env.CLOSE_CONTRACT_STALL_MS ?? 0);
const schedule = globalThis.setTimeout;
globalThis.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
  if (stall && delay === 3) {
    console.log("CLOSE_CONTRACT_SCHEDULER_PAUSE");
    const deadline = performance.now() + stall;
    while (performance.now() < deadline) { /* controlled scheduler pause */ }
  }
  return schedule(callback, delay, ...args);
}) as typeof setTimeout;

// Bun loads each preload as its own module.
export {};
