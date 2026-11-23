import { findLowestCostArrangement, itemCount } from "./arrangement.js";
export const firstFocalIndex = (list) => list.findIndex((k) => k.isFocal);
export const lastFocalIndex = (list) => {
    for (let i = list.length - 1; i >= 0; i--)
        if (list[i].isFocal)
            return i;
    return -1;
};
export const firstNonAnchorIndex = (list) => list.findIndex((k) => !k.isAnchor);
export const lastNonAnchorIndex = (list) => {
    for (let i = list.length - 1; i >= 0; i--)
        if (!list[i].isAnchor)
            return i;
    return -1;
};
export const pivotIndex = (list) => list.findIndex((k) => k.isPivot);
export const focalCount = (list) => lastFocalIndex(list) - firstFocalIndex(list) + 1;
export const minSize = (list) => list.reduce((m, k) => Math.min(m, k.size), Number.MAX_VALUE);
export const maxSize = (list) => list.reduce((m, k) => Math.max(m, k.size), 0);
export const isFirstFocalItemAtStartOfContainer = (list) => {
    const first = list[firstFocalIndex(list)];
    return first.offset - first.size / 2 >= 0 && firstFocalIndex(list) === firstNonAnchorIndex(list);
};
export const isLastFocalItemAtEndOfContainer = (list, containerSize) => {
    const last = list[lastFocalIndex(list)];
    return last.offset + last.size / 2 <= containerSize && lastFocalIndex(list) === lastNonAnchorIndex(list);
};
export const firstIndexAfterFocalRangeWithSize = (list, size) => {
    for (let i = lastFocalIndex(list); i < list.length; i++)
        if (list[i].size === size)
            return i;
    return list.length - 1;
};
export const lastIndexBeforeFocalRangeWithSize = (list, size) => {
    for (let i = firstFocalIndex(list) - 1; i >= 0; i--)
        if (list[i].size === size)
            return i;
    return 0;
};
export const keylineBefore = (list, unadjustedOffset) => {
    for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].unadjustedOffset < unadjustedOffset)
            return list[i];
    }
    return list[0];
};
export const keylineAfter = (list, unadjustedOffset) => list.find((k) => k.unadjustedOffset >= unadjustedOffset) ?? list[list.length - 1];
const mix = (a, b, t) => a + (b - a) * t;
export const lerpKeyline = (a, b, t) => ({
    size: mix(a.size, b.size, t),
    offset: mix(a.offset, b.offset, t),
    unadjustedOffset: mix(a.unadjustedOffset, b.unadjustedOffset, t),
    isFocal: t < 0.5 ? a.isFocal : b.isFocal,
    isAnchor: t < 0.5 ? a.isAnchor : b.isAnchor,
    isPivot: t < 0.5 ? a.isPivot : b.isPivot,
    cutoff: mix(a.cutoff, b.cutoff, t),
});
export const lerpKeylineList = (from, to, t) => from.map((k, i) => lerpKeyline(k, to[i], t));
const isCutoffLeft = (size, offset) => offset - size / 2 < 0 && offset + size / 2 > 0;
const isCutoffRight = (size, offset, containerSize) => offset - size / 2 < containerSize && offset + size / 2 > containerSize;
const focalRange = (tmp) => {
    let first = -1;
    let size = 0;
    tmp.forEach((k, i) => {
        if (!k.isAnchor && k.size > size) {
            first = i;
            size = k.size;
        }
    });
    if (first < 0)
        return [-1, -1, 0];
    let last = first;
    while (last < tmp.length - 1 && tmp[last + 1].size === size)
        last++;
    return [first, last, size];
};
const buildAroundPivot = (tmp, pivotIdx, pivotOffset, firstFocal, lastFocal, itemSize, containerSize, gap) => {
    if (tmp.length === 0 || pivotIdx < 0 || pivotIdx >= tmp.length)
        return [];
    const pivot = tmp[pivotIdx];
    const list = [];
    const pivotCutoff = isCutoffLeft(pivot.size, pivotOffset)
        ? pivotOffset - pivot.size / 2
        : isCutoffRight(pivot.size, pivotOffset, containerSize)
            ? pivotOffset + pivot.size / 2 - containerSize
            : 0;
    list.push({
        size: pivot.size,
        offset: pivotOffset,
        unadjustedOffset: pivotOffset,
        isFocal: pivotIdx >= firstFocal && pivotIdx <= lastFocal,
        isAnchor: pivot.isAnchor,
        isPivot: true,
        cutoff: pivotCutoff,
    });
    let offset = pivotOffset - itemSize / 2 - gap;
    let unadjusted = pivotOffset - itemSize / 2 - gap;
    for (let i = pivotIdx - 1; i >= 0; i--) {
        const k = tmp[i];
        const kOffset = offset - k.size / 2;
        const kUnadjusted = unadjusted - itemSize / 2;
        list.unshift({
            size: k.size,
            offset: kOffset,
            unadjustedOffset: kUnadjusted,
            isFocal: i >= firstFocal && i <= lastFocal,
            isAnchor: k.isAnchor,
            isPivot: false,
            cutoff: isCutoffLeft(k.size, kOffset) ? Math.abs(kOffset - k.size / 2) : 0,
        });
        offset -= k.size + gap;
        unadjusted -= itemSize + gap;
    }
    offset = pivotOffset + itemSize / 2 + gap;
    unadjusted = pivotOffset + itemSize / 2 + gap;
    for (let i = pivotIdx + 1; i < tmp.length; i++) {
        const k = tmp[i];
        const kOffset = offset + k.size / 2;
        const kUnadjusted = unadjusted + itemSize / 2;
        list.push({
            size: k.size,
            offset: kOffset,
            unadjustedOffset: kUnadjusted,
            isFocal: i >= firstFocal && i <= lastFocal,
            isAnchor: k.isAnchor,
            isPivot: false,
            cutoff: isCutoffRight(k.size, kOffset, containerSize) ? kOffset + k.size / 2 - containerSize : 0,
        });
        offset += k.size + gap;
        unadjusted += itemSize + gap;
    }
    return list;
};
export const keylineListWithPivot = (containerSize, gap, pivotIdx, pivotOffset, tmp) => {
    const [firstFocal, lastFocal, itemSize] = focalRange(tmp);
    return buildAroundPivot(tmp, pivotIdx, pivotOffset, firstFocal, lastFocal, itemSize, containerSize, gap);
};
export const keylineListAligned = (containerSize, gap, alignment, tmp) => {
    const [firstFocal, lastFocal, itemSize] = focalRange(tmp);
    if (firstFocal < 0)
        return [];
    const focalItems = lastFocal - firstFocal;
    let pivotOffset = itemSize / 2;
    if (alignment === 'center') {
        const split = gap === 0 || focalItems % 2 === 0 ? 0 : gap / 2;
        const spaces = Math.floor(focalItems / 2) * gap;
        pivotOffset = containerSize / 2 - (itemSize / 2) * focalItems - split - spaces;
    }
    return buildAroundPivot(tmp, firstFocal, pivotOffset, firstFocal, lastFocal, itemSize, containerSize, gap);
};
const fromArrangement = (a, containerSize, gap, leftAnchor, rightAnchor, alignment) => {
    const tmp = [{ size: leftAnchor, isAnchor: true }];
    const push = (size, count) => {
        for (let i = 0; i < count; i++)
            tmp.push({ size, isAnchor: false });
    };
    if (alignment === 'center') {
        push(a.smallSize, Math.floor(a.smallCount / 2));
        push(a.mediumSize, Math.floor(a.mediumCount / 2));
        push(a.largeSize, a.largeCount);
        push(a.mediumSize, Math.ceil(a.mediumCount / 2));
        push(a.smallSize, Math.ceil(a.smallCount / 2));
    }
    else {
        push(a.largeSize, a.largeCount);
        push(a.mediumSize, a.mediumCount);
        push(a.smallSize, a.smallCount);
    }
    tmp.push({ size: rightAnchor, isAnchor: true });
    return keylineListAligned(containerSize, gap, alignment, tmp);
};
const range = (from, to) => {
    const out = [];
    for (let n = from; n >= to; n--)
        out.push(n);
    return out;
};
export const multiBrowseKeylines = (containerSize, preferredItemSize, gap, count, rules) => {
    if (containerSize <= 0 || preferredItemSize <= 0)
        return [];
    let smallCounts = [1];
    const mediumCounts = [1, 0];
    const targetLarge = Math.min(preferredItemSize, containerSize);
    const targetSmall = Math.min(Math.max(targetLarge / 3, rules.minSmallSize), rules.maxSmallSize);
    const targetMedium = (targetLarge + targetSmall) / 2;
    if (containerSize < rules.minSmallSize * 2)
        smallCounts = [0];
    const minLargeSpace = containerSize - targetMedium * Math.max(...mediumCounts) - rules.maxSmallSize * Math.max(...smallCounts);
    const minLargeCount = Math.max(1, Math.floor(minLargeSpace / targetLarge));
    const maxLargeCount = Math.ceil(containerSize / targetLarge);
    const largeCounts = range(maxLargeCount, minLargeCount);
    const options = {
        availableSpace: containerSize,
        gap,
        targetSmallSize: targetSmall,
        minSmallSize: rules.minSmallSize,
        maxSmallSize: rules.maxSmallSize,
        smallCounts,
        targetMediumSize: targetMedium,
        mediumCounts,
        targetLargeSize: targetLarge,
        largeCounts,
    };
    let arrangement = findLowestCostArrangement(options);
    if (arrangement && itemCount(arrangement) > count) {
        let surplus = itemCount(arrangement) - count;
        let smallCount = arrangement.smallCount;
        let mediumCount = arrangement.mediumCount;
        while (surplus > 0) {
            if (smallCount > 0)
                smallCount -= 1;
            else if (mediumCount > 1)
                mediumCount -= 1;
            surplus -= 1;
        }
        arrangement = findLowestCostArrangement({ ...options, smallCounts: [smallCount], mediumCounts: [mediumCount] });
    }
    if (!arrangement)
        return [];
    return fromArrangement(arrangement, containerSize, gap, rules.anchorSize, rules.anchorSize, 'start');
};
export const heroKeylines = (containerSize, maxItemSize, gap, count, centered, rules) => {
    if (containerSize <= 0)
        return [];
    const shouldCenter = centered && count >= 3;
    let smallCounts = count <= 1 ? [0] : shouldCenter ? [2] : [1];
    const targetLarge = Math.min(maxItemSize ?? containerSize, containerSize);
    const targetSmall = Math.min(Math.max(targetLarge / 3, rules.minSmallSize), rules.maxSmallSize);
    const fullscreenThreshold = rules.minSmallSize * Math.max(...smallCounts) + rules.minSmallSize * 1.25;
    if (containerSize < fullscreenThreshold)
        smallCounts = [0];
    const minLargeSpace = containerSize - rules.minSmallSize * Math.max(...smallCounts);
    const minLargeCount = Math.max(1, Math.floor(minLargeSpace / targetLarge));
    const maxLargeCount = Math.ceil(containerSize / targetLarge);
    const arrangement = findLowestCostArrangement({
        availableSpace: containerSize,
        gap,
        targetSmallSize: targetSmall,
        minSmallSize: rules.minSmallSize,
        maxSmallSize: rules.maxSmallSize,
        smallCounts,
        targetMediumSize: 0,
        mediumCounts: [0],
        targetLargeSize: targetLarge,
        largeCounts: range(maxLargeCount, minLargeCount),
    });
    if (!arrangement)
        return [];
    const alignment = shouldCenter && count >= itemCount(arrangement) ? 'center' : 'start';
    return fromArrangement(arrangement, containerSize, gap, rules.anchorSize, rules.anchorSize, alignment);
};
export const cappedKeylines = (containerSize, itemSize, gap, rules) => {
    if (containerSize <= 0 || itemSize <= 0)
        return [];
    const large = Math.min(itemSize, containerSize);
    const largeCount = Math.max(1, Math.floor((containerSize + gap) / (large + gap)));
    const remaining = Math.max(0, containerSize - largeCount * (large + gap));
    let medium = Math.max(remaining * 1.5, rules.anchorSize);
    if (medium > large * rules.mediumLargeThreshold)
        medium = Math.max(remaining * 1.2, rules.anchorSize);
    return fromArrangement({ priority: 0, smallSize: 0, smallCount: 0, mediumSize: medium, mediumCount: remaining > 0 ? 1 : 0, largeSize: large, largeCount }, containerSize, gap, Math.max(Math.min(rules.anchorSize, itemSize), medium * 0.5), rules.anchorSize, 'start');
};
export const uncontainedKeylines = (containerSize, itemSize, gap, _rules) => {
    if (containerSize <= 0 || itemSize <= 0)
        return [];
    const large = Math.min(itemSize, containerSize);
    const count = Math.max(1, Math.ceil((containerSize + gap) / (large + gap)));
    return Array.from({ length: count }, (_, i) => {
        const offset = large / 2 + i * (large + gap);
        return {
            size: large,
            offset,
            unadjustedOffset: offset,
            isFocal: true,
            isAnchor: false,
            isPivot: i === 0,
            cutoff: Math.max(0, offset + large / 2 - containerSize),
        };
    });
};
export const fullScreenKeylines = (containerSize, gap, rules) => {
    if (containerSize <= 0)
        return [];
    const arrangement = {
        priority: 0,
        smallSize: 0,
        smallCount: 0,
        mediumSize: 0,
        mediumCount: 0,
        largeSize: containerSize,
        largeCount: 1,
    };
    return fromArrangement(arrangement, containerSize, gap, rules.anchorSize, rules.anchorSize, 'start');
};
