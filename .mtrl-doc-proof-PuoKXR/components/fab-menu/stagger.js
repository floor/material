const OMEGA = Math.sqrt(800);
const remaining = (t) => (1 + OMEGA * t) * Math.exp(-OMEGA * t);
const timeFor = (fraction) => {
    if (fraction >= 1)
        return 0;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 40; i++) {
        const mid = (low + high) / 2;
        if (remaining(mid) > fraction)
            low = mid;
        else
            high = mid;
    }
    return Math.round(high * 1000);
};
export const staggerDelays = (count, opening) => Array.from({ length: count }, (_, index) => {
    const fromFab = count - 1 - index;
    if (opening) {
        const reached = Math.min(fromFab + 1, Math.max(count - 1, 1));
        return timeFor(1 - reached / count);
    }
    return timeFor(Math.min(fromFab + 1, count) / count);
});
