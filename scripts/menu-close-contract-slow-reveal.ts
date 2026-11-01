// Measurement only; not part of the proposed fix. Keep real timers but delay
// the menu's 20 ms reveal beyond the former 160 ms positive-observation sleep.
console.log("CLOSE_CONTRACT_SLOW_REVEAL_READY");
const schedule = globalThis.setTimeout;
globalThis.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
  if (delay === 20) console.log("CLOSE_CONTRACT_SLOW_REVEAL_250MS");
  return schedule(callback, delay === 20 ? 250 : delay, ...args);
}) as typeof setTimeout;
