import { DISTANCE_EPSILON, circularArc, cubicBounds, direction, distance, dot, lerp, pointOnCurve, reverseCubic, splitCubic, rotate90, straightLine, transformCubic, zeroLength, } from "./cubic.js";
export const UNROUNDED = { radius: 0, smoothing: 0 };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const length = (a) => distance(a[0], a[1]);
const unit = (a) => direction(a[0], a[1]);
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const lineIntersection = (p0, d0, p1, d1) => {
    const rotatedD1 = rotate90(d1);
    const den = dot(d0, rotatedD1);
    if (Math.abs(den) < DISTANCE_EPSILON)
        return null;
    const num = dot(sub(p1, p0), rotatedD1);
    if (Math.abs(den) < DISTANCE_EPSILON * Math.abs(num))
        return null;
    return add(p0, mul(d0, num / den));
};
const roundedCorner = (p0, p1, p2, rounding) => {
    const v01 = sub(p0, p1);
    const v21 = sub(p2, p1);
    const d01 = length(v01);
    const d21 = length(v21);
    if (d01 > 0 && d21 > 0) {
        const d1 = mul(v01, 1 / d01);
        const d2 = mul(v21, 1 / d21);
        const cornerRadius = rounding.radius;
        const smoothing = rounding.smoothing ?? 0;
        const cosAngle = dot(d1, d2);
        const sinAngle = Math.sqrt(1 - cosAngle * cosAngle);
        const expectedRoundCut = sinAngle > 1e-3 ? (cornerRadius * (cosAngle + 1)) / sinAngle : 0;
        return {
            p0, p1, p2, d1, d2, cornerRadius, smoothing, expectedRoundCut,
            expectedCut: (1 + smoothing) * expectedRoundCut,
        };
    }
    return { p0, p1, p2, d1: [0, 0], d2: [0, 0], cornerRadius: 0, smoothing: 0, expectedRoundCut: 0, expectedCut: 0 };
};
const actualSmoothing = (corner, allowedCut) => {
    if (allowedCut > corner.expectedCut)
        return corner.smoothing;
    if (allowedCut > corner.expectedRoundCut) {
        return (corner.smoothing * (allowedCut - corner.expectedRoundCut)) / (corner.expectedCut - corner.expectedRoundCut);
    }
    return 0;
};
const flankingCurve = (actualRoundCut, smoothing, corner, sideStart, circleSegmentIntersection, otherCircleSegmentIntersection, circleCenter, actualR) => {
    const sideDirection = unit(sub(sideStart, corner));
    const curveStart = add(corner, mul(sideDirection, actualRoundCut * (1 + smoothing)));
    const p = mix(circleSegmentIntersection, mul(add(circleSegmentIntersection, otherCircleSegmentIntersection), 0.5), smoothing);
    const curveEnd = add(circleCenter, mul(direction(p[0] - circleCenter[0], p[1] - circleCenter[1]), actualR));
    const circleTangent = rotate90(sub(curveEnd, circleCenter));
    const anchorEnd = lineIntersection(sideStart, sideDirection, curveEnd, circleTangent) ?? circleSegmentIntersection;
    const anchorStart = mul(add(curveStart, mul(anchorEnd, 2)), 1 / 3);
    return [curveStart[0], curveStart[1], anchorStart[0], anchorStart[1], anchorEnd[0], anchorEnd[1], curveEnd[0], curveEnd[1]];
};
const cornerCubics = (corner, allowedCut0, allowedCut1) => {
    const allowedCut = Math.min(allowedCut0, allowedCut1);
    const { p0, p1, p2, d1, d2, cornerRadius, expectedRoundCut } = corner;
    if (expectedRoundCut < DISTANCE_EPSILON || allowedCut < DISTANCE_EPSILON || cornerRadius < DISTANCE_EPSILON) {
        return [straightLine(p1[0], p1[1], p1[0], p1[1])];
    }
    const actualRoundCut = Math.min(allowedCut, expectedRoundCut);
    const smoothing0 = actualSmoothing(corner, allowedCut0);
    const smoothing1 = actualSmoothing(corner, allowedCut1);
    const actualR = (cornerRadius * actualRoundCut) / expectedRoundCut;
    const centerDistance = Math.sqrt(actualR * actualR + actualRoundCut * actualRoundCut);
    const center = add(p1, mul(unit(mul(add(d1, d2), 0.5)), centerDistance));
    const circleIntersection0 = add(p1, mul(d1, actualRoundCut));
    const circleIntersection2 = add(p1, mul(d2, actualRoundCut));
    const flanking0 = flankingCurve(actualRoundCut, smoothing0, p1, p0, circleIntersection0, circleIntersection2, center, actualR);
    const flanking2 = reverseCubic(flankingCurve(actualRoundCut, smoothing1, p1, p2, circleIntersection2, circleIntersection0, center, actualR));
    return [
        flanking0,
        circularArc(center[0], center[1], flanking0[6], flanking0[7], flanking2[0], flanking2[1]),
        flanking2,
    ];
};
export const roundedPolygon = (vertices, rounding = UNROUNDED, perVertexRounding, centerX, centerY) => {
    if (vertices.length < 6)
        throw new Error('Polygons must have at least 3 vertices');
    if (vertices.length % 2 === 1)
        throw new Error('The vertices array should have even size');
    const n = vertices.length / 2;
    if (perVertexRounding && perVertexRounding.length !== n) {
        throw new Error('perVertexRounding should have one entry per vertex');
    }
    const vertex = (i) => [vertices[(i % n) * 2], vertices[(i % n) * 2 + 1]];
    const corners = [];
    for (let i = 0; i < n; i++) {
        corners.push(roundedCorner(vertex(i + n - 1), vertex(i), vertex(i + 1), perVertexRounding?.[i] ?? rounding));
    }
    const cutAdjusts = [];
    for (let i = 0; i < n; i++) {
        const next = corners[(i + 1) % n];
        const expectedRoundCut = corners[i].expectedRoundCut + next.expectedRoundCut;
        const expectedCut = corners[i].expectedCut + next.expectedCut;
        const a = vertex(i);
        const b = vertex(i + 1);
        const sideSize = distance(a[0] - b[0], a[1] - b[1]);
        if (expectedRoundCut > sideSize) {
            cutAdjusts.push([sideSize / expectedRoundCut, 0]);
        }
        else if (expectedCut > sideSize) {
            cutAdjusts.push([1, (sideSize - expectedRoundCut) / (expectedCut - expectedRoundCut)]);
        }
        else {
            cutAdjusts.push([1, 1]);
        }
    }
    const cornerRuns = [];
    for (let i = 0; i < n; i++) {
        const corner = corners[i];
        const allowed = [];
        for (let delta = 0; delta <= 1; delta++) {
            const [roundCutRatio, cutRatio] = cutAdjusts[(i + n - 1 + delta) % n];
            allowed.push(corner.expectedRoundCut * roundCutRatio + (corner.expectedCut - corner.expectedRoundCut) * cutRatio);
        }
        cornerRuns.push(cornerCubics(corner, allowed[0], allowed[1]));
    }
    const features = [];
    for (let i = 0; i < n; i++) {
        const run = cornerRuns[i];
        const last = run[run.length - 1];
        const first = cornerRuns[(i + 1) % n][0];
        features.push(run, [straightLine(last[6], last[7], first[0], first[1])]);
    }
    const first = features[0];
    const split = first.length === 3 ? splitCubic(first[1], 0.5) : null;
    const all = split ? [split[1], first[2], ...features.slice(1).flat(), first[0], split[0]] : features.flat();
    const cubics = [];
    for (const c of all) {
        const last = cubics.length - 1;
        if (!zeroLength(c))
            cubics.push(c);
        else if (last >= 0)
            cubics[last] = [...cubics[last].slice(0, 6), c[6], c[7]];
    }
    let cx = centerX;
    let cy = centerY;
    if (cx === undefined || cy === undefined) {
        let sx = 0;
        let sy = 0;
        for (let i = 0; i < n; i++) {
            sx += vertices[i * 2];
            sy += vertices[i * 2 + 1];
        }
        cx = sx / n;
        cy = sy / n;
    }
    const last = cubics.length - 1;
    if (last >= 0)
        cubics[last] = [...cubics[last].slice(0, 6), cubics[0][0], cubics[0][1]];
    else
        cubics.push([cx, cy, cx, cy, cx, cy, cx, cy]);
    return { cubics, centerX: cx, centerY: cy };
};
const radial = (radius, angle, cx, cy) => [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
export const regularPolygon = (numVertices, radius = 1, centerX = 0, centerY = 0, rounding = UNROUNDED, perVertexRounding) => {
    const vertices = [];
    for (let i = 0; i < numVertices; i++) {
        vertices.push(...radial(radius, (Math.PI / numVertices) * 2 * i, centerX, centerY));
    }
    return roundedPolygon(vertices, rounding, perVertexRounding, centerX, centerY);
};
export const circle = (numVertices = 8, radius = 1, centerX = 0, centerY = 0) => {
    if (numVertices < 3)
        throw new Error('Circle must have at least three vertices');
    const theta = Math.PI / numVertices;
    return regularPolygon(numVertices, radius / Math.cos(theta), centerX, centerY, { radius });
};
export const star = (numVerticesPerRadius, radius = 1, innerRadius = 0.5, rounding = UNROUNDED, innerRounding, perVertexRounding, centerX = 0, centerY = 0) => {
    if (radius <= 0 || innerRadius <= 0)
        throw new Error('Star radii must both be greater than 0');
    if (innerRadius >= radius)
        throw new Error('innerRadius must be less than radius');
    let pvRounding = perVertexRounding;
    if (!pvRounding && innerRounding) {
        pvRounding = [];
        for (let i = 0; i < numVerticesPerRadius; i++)
            pvRounding.push(rounding, innerRounding);
    }
    const vertices = [];
    for (let i = 0; i < numVerticesPerRadius; i++) {
        vertices.push(...radial(radius, (Math.PI / numVerticesPerRadius) * 2 * i, centerX, centerY));
        vertices.push(...radial(innerRadius, (Math.PI / numVerticesPerRadius) * (2 * i + 1), centerX, centerY));
    }
    return roundedPolygon(vertices, rounding, pvRounding, centerX, centerY);
};
export const rectangle = (width = 2, height = 2, rounding = UNROUNDED, perVertexRounding, centerX = 0, centerY = 0) => {
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    const right = centerX + width / 2;
    const bottom = centerY + height / 2;
    return roundedPolygon([right, bottom, left, bottom, left, top, right, top], rounding, perVertexRounding, centerX, centerY);
};
export const transformPolygon = (polygon, f) => {
    const center = f(polygon.centerX, polygon.centerY);
    return { cubics: polygon.cubics.map((c) => transformCubic(c, f)), centerX: center[0], centerY: center[1] };
};
export const rotatePolygon = (polygon, degrees) => {
    const a = (degrees * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return transformPolygon(polygon, (x, y) => [x * cos - y * sin, x * sin + y * cos]);
};
export const scalePolygon = (polygon, sx, sy = sx) => transformPolygon(polygon, (x, y) => [x * sx, y * sy]);
export const polygonBounds = (polygon) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const c of polygon.cubics) {
        const b = cubicBounds(c);
        minX = Math.min(minX, b[0]);
        minY = Math.min(minY, b[1]);
        maxX = Math.max(maxX, b[2]);
        maxY = Math.max(maxY, b[3]);
    }
    return [minX, minY, maxX, maxY];
};
export const polygonMaxRadius = (polygon) => {
    let max = 0;
    for (const c of polygon.cubics) {
        const mid = pointOnCurve(c, 0.5);
        max = Math.max(max, distance(c[0] - polygon.centerX, c[1] - polygon.centerY), distance(mid[0] - polygon.centerX, mid[1] - polygon.centerY));
    }
    return max;
};
export const normalizePolygon = (polygon) => {
    const bounds = polygonBounds(polygon);
    const width = bounds[2] - bounds[0];
    const height = bounds[3] - bounds[1];
    const side = Math.max(width, height);
    const offsetX = (side - width) / 2 - bounds[0];
    const offsetY = (side - height) / 2 - bounds[1];
    return transformPolygon(polygon, (x, y) => [(x + offsetX) / side, (y + offsetY) / side]);
};
