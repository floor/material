const MEDIUM_ITEM_FLEX = 0.1;
export const itemCount = (a) => a.largeCount + a.mediumCount + a.smallCount;
const isValid = (a) => {
    if (a.largeCount > 0 && a.smallCount > 0 && a.mediumCount > 0) {
        return a.largeSize > a.mediumSize && a.mediumSize > a.smallSize;
    }
    if (a.largeCount > 0 && a.smallCount > 0) {
        return a.largeSize > a.smallSize;
    }
    return true;
};
const cost = (a, targetLargeSize) => isValid(a) ? Math.abs(targetLargeSize - a.largeSize) * a.priority : Number.MAX_VALUE;
const largeSizeFor = (space, smallCount, smallSize, mediumCount, largeCount) => (space - (smallCount + mediumCount / 2) * smallSize) / (largeCount + mediumCount / 2);
const fit = (priority, availableSpace, gap, smallCount, smallSize, minSmallSize, maxSmallSize, mediumCount, mediumSize, largeCount, largeSize) => {
    const total = largeCount + mediumCount + smallCount;
    const space = availableSpace - (total - 1) * gap;
    let small = Math.min(Math.max(smallSize, minSmallSize), maxSmallSize);
    const taken = largeSize * largeCount + mediumSize * mediumCount + small * smallCount;
    const delta = space - taken;
    if (smallCount > 0 && delta > 0) {
        small += Math.min(delta / smallCount, maxSmallSize - small);
    }
    else if (smallCount > 0 && delta < 0) {
        small += Math.max(delta / smallCount, minSmallSize - small);
    }
    small = smallCount > 0 ? small : 0;
    let large = largeSizeFor(space, smallCount, small, mediumCount, largeCount);
    let medium = (large + small) / 2;
    if (mediumCount > 0 && large !== largeSize) {
        const targetAdjustment = (largeSize - large) * largeCount;
        const flex = medium * MEDIUM_ITEM_FLEX * mediumCount;
        const distribute = Math.min(Math.abs(targetAdjustment), flex);
        if (targetAdjustment > 0) {
            medium -= distribute / mediumCount;
            large += distribute / largeCount;
        }
        else {
            medium += distribute / mediumCount;
            large -= distribute / largeCount;
        }
    }
    return { priority, smallSize: small, smallCount, mediumSize: medium, mediumCount, largeSize: large, largeCount };
};
export const findLowestCostArrangement = (o) => {
    let lowest = null;
    let priority = 1;
    for (const largeCount of o.largeCounts) {
        for (const mediumCount of o.mediumCounts) {
            for (const smallCount of o.smallCounts) {
                const candidate = fit(priority, o.availableSpace, o.gap, smallCount, o.targetSmallSize, o.minSmallSize, o.maxSmallSize, mediumCount, o.targetMediumSize, largeCount, o.targetLargeSize);
                if (lowest === null || cost(candidate, o.targetLargeSize) < cost(lowest, o.targetLargeSize)) {
                    lowest = candidate;
                    if (cost(lowest, o.targetLargeSize) === 0)
                        return lowest;
                }
                priority++;
            }
        }
    }
    return lowest;
};
