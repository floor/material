import { pointOnCurve } from "./cubic.js";
import { circle, normalizePolygon, polygonBounds, polygonMaxRadius, rectangle, regularPolygon, rotatePolygon, roundedPolygon, scalePolygon, star, } from "./polygon.js";
const cornerRound15 = { radius: 0.15 };
const cornerRound20 = { radius: 0.2 };
const cornerRound30 = { radius: 0.3 };
const cornerRound50 = { radius: 0.5 };
const cornerRound100 = { radius: 1 };
const point = (x, y, radius = 0, smoothing = 0) => ({ x, y, r: { radius, smoothing } });
const toRadians = (degrees) => (degrees / 360) * 2 * Math.PI;
const repeat = (points, reps, cx, cy, mirroring) => {
    const result = [];
    if (mirroring) {
        const angles = points.map((p) => (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI);
        const distances = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
        const actualReps = reps * 2;
        const sectionAngle = 360 / actualReps;
        for (let it = 0; it < actualReps; it++) {
            for (let index = 0; index < points.length; index++) {
                const i = it % 2 === 0 ? index : points.length - 1 - index;
                if (i > 0 || it % 2 === 0) {
                    const a = toRadians(sectionAngle * it + (it % 2 === 0 ? angles[i] : sectionAngle - angles[i] + 2 * angles[0]));
                    result.push({ x: Math.cos(a) * distances[i] + cx, y: Math.sin(a) * distances[i] + cy, r: points[i].r });
                }
            }
        }
        return result;
    }
    const np = points.length;
    for (let it = 0; it < np * reps; it++) {
        const p = points[it % np];
        const a = toRadians(Math.floor(it / np) * (360 / reps));
        const dx = p.x - cx;
        const dy = p.y - cy;
        result.push({ x: dx * Math.cos(a) - dy * Math.sin(a) + cx, y: dx * Math.sin(a) + dy * Math.cos(a) + cy, r: p.r });
    }
    return result;
};
const custom = (pnr, reps, mirroring = false) => {
    const points = repeat(pnr, reps, 0.5, 0.5, mirroring);
    const vertices = [];
    for (const p of points)
        vertices.push(p.x, p.y);
    return roundedPolygon(vertices, undefined, points.map((p) => p.r), 0.5, 0.5);
};
const shape = (build) => {
    let built;
    return () => (built ??= normalizePolygon(build()));
};
export const shapeCircle = /*#__PURE__*/ shape(() => circle(10));
export const shapeSquare = /*#__PURE__*/ shape(() => rectangle(1, 1, cornerRound30));
export const shapeSlanted = /*#__PURE__*/ shape(() => custom([point(0.926, 0.97, 0.189, 0.811), point(-0.021, 0.967, 0.187, 0.057)], 2));
export const shapeArch = /*#__PURE__*/ shape(() => rotatePolygon(regularPolygon(4, 1, 0, 0, undefined, [cornerRound100, cornerRound100, cornerRound20, cornerRound20]), -135));
export const shapeFan = /*#__PURE__*/ shape(() => custom([point(1.004, 1.0, 0.148, 0.417), point(0.0, 1.0, 0.151), point(0.0, -0.003, 0.148), point(0.978, 0.02, 0.803)], 1));
export const shapeArrow = /*#__PURE__*/ shape(() => custom([point(0.5, 0.892, 0.313), point(-0.216, 1.05, 0.207), point(0.499, -0.16, 0.215, 1.0), point(1.225, 1.06, 0.211)], 1));
export const shapeSemiCircle = /*#__PURE__*/ shape(() => rectangle(1.6, 1, undefined, [cornerRound20, cornerRound20, cornerRound100, cornerRound100]));
export const shapeOval = /*#__PURE__*/ shape(() => rotatePolygon(scalePolygon(circle(), 1, 0.64), -45));
export const shapePill = /*#__PURE__*/ shape(() => custom([point(0.961, 0.039, 0.426), point(1.001, 0.428), point(1.0, 0.609, 1.0)], 2, true));
export const shapeTriangle = /*#__PURE__*/ shape(() => rotatePolygon(regularPolygon(3, 1, 0, 0, cornerRound20), -90));
export const shapeDiamond = /*#__PURE__*/ shape(() => custom([point(0.5, 1.096, 0.151, 0.524), point(0.04, 0.5, 0.159)], 2));
export const shapeClamShell = /*#__PURE__*/ shape(() => custom([point(0.171, 0.841, 0.159), point(-0.02, 0.5, 0.14), point(0.17, 0.159, 0.159)], 2));
export const shapePentagon = /*#__PURE__*/ shape(() => custom([point(0.5, -0.009, 0.172), point(1.03, 0.365, 0.164), point(0.828, 0.97, 0.169)], 1, true));
export const shapeGem = /*#__PURE__*/ shape(() => custom([point(0.499, 1.023, 0.241, 0.778), point(-0.005, 0.792, 0.208), point(0.073, 0.258, 0.228), point(0.433, -0.0, 0.491)], 1, true));
export const shapeSunny = /*#__PURE__*/ shape(() => star(8, 1, 0.8, cornerRound15));
export const shapeVerySunny = /*#__PURE__*/ shape(() => custom([point(0.5, 1.08, 0.085), point(0.358, 0.843, 0.085)], 8));
export const shapeCookie4Sided = /*#__PURE__*/ shape(() => custom([point(1.237, 1.236, 0.258), point(0.5, 0.918, 0.233)], 4));
export const shapeCookie6Sided = /*#__PURE__*/ shape(() => custom([point(0.723, 0.884, 0.394), point(0.5, 1.099, 0.398)], 6));
export const shapeCookie7Sided = /*#__PURE__*/ shape(() => rotatePolygon(star(7, 1, 0.75, cornerRound50), -90));
export const shapeCookie9Sided = /*#__PURE__*/ shape(() => rotatePolygon(star(9, 1, 0.8, cornerRound50), -90));
export const shapeCookie12Sided = /*#__PURE__*/ shape(() => rotatePolygon(star(12, 1, 0.8, cornerRound50), -90));
export const shapeGhostish = /*#__PURE__*/ shape(() => custom([point(0.5, 0, 1.0), point(1, 0, 1.0), point(1, 1.14, 0.254, 0.106), point(0.575, 0.906, 0.253)], 1, true));
export const shapeClover4Leaf = /*#__PURE__*/ shape(() => custom([point(0.5, 0.074), point(0.725, -0.099, 0.476)], 4, true));
export const shapeClover8Leaf = /*#__PURE__*/ shape(() => custom([point(0.5, 0.036), point(0.758, -0.101, 0.209)], 8));
export const shapeBurst = /*#__PURE__*/ shape(() => custom([point(0.5, -0.006, 0.006), point(0.592, 0.158, 0.006)], 12));
export const shapeSoftBurst = /*#__PURE__*/ shape(() => custom([point(0.193, 0.277, 0.053), point(0.176, 0.055, 0.053)], 10));
export const shapeBoom = /*#__PURE__*/ shape(() => custom([point(0.457, 0.296, 0.007), point(0.5, -0.051, 0.007)], 15));
export const shapeSoftBoom = /*#__PURE__*/ shape(() => custom([point(0.733, 0.454), point(0.839, 0.437, 0.532), point(0.949, 0.449, 0.439, 1.0), point(0.998, 0.478, 0.174)], 16, true));
export const shapeFlower = /*#__PURE__*/ shape(() => custom([point(0.37, 0.187), point(0.416, 0.049, 0.381), point(0.479, 0.001, 0.095)], 8, true));
export const shapePuffy = /*#__PURE__*/ shape(() => scalePolygon(custom([
    point(0.5, 0.053), point(0.545, -0.04, 0.405), point(0.67, -0.035, 0.426), point(0.717, 0.066, 0.574),
    point(0.722, 0.128), point(0.777, 0.002, 0.36), point(0.914, 0.149, 0.66), point(0.926, 0.289, 0.66),
    point(0.881, 0.346), point(0.94, 0.344, 0.126), point(1.003, 0.437, 0.255),
], 2, true), 1, 0.742));
export const shapePuffyDiamond = /*#__PURE__*/ shape(() => custom([point(0.87, 0.13, 0.146), point(0.818, 0.357), point(1.0, 0.332, 0.853)], 4, true));
export const shapePixelCircle = /*#__PURE__*/ shape(() => custom([
    point(0.5, 0.0), point(0.704, 0.0), point(0.704, 0.065), point(0.843, 0.065),
    point(0.843, 0.148), point(0.926, 0.148), point(0.926, 0.296), point(1.0, 0.296),
], 2, true));
export const shapePixelTriangle = /*#__PURE__*/ shape(() => custom([
    point(0.11, 0.5), point(0.113, 0.0), point(0.287, 0.0), point(0.287, 0.087), point(0.421, 0.087),
    point(0.421, 0.17), point(0.56, 0.17), point(0.56, 0.265), point(0.674, 0.265), point(0.675, 0.344),
    point(0.789, 0.344), point(0.789, 0.439), point(0.888, 0.439),
], 1, true));
export const shapeBun = /*#__PURE__*/ shape(() => custom([point(0.796, 0.5), point(0.853, 0.518, 1), point(0.992, 0.631, 1), point(0.968, 1.0, 1)], 2, true));
export const shapeHeart = /*#__PURE__*/ shape(() => custom([point(0.5, 0.268, 0.016), point(0.792, -0.066, 0.958), point(1.064, 0.276, 1.0), point(0.501, 0.946, 0.129)], 1, true));
const byName = {
    circle: shapeCircle,
    square: shapeSquare,
    slanted: shapeSlanted,
    arch: shapeArch,
    fan: shapeFan,
    arrow: shapeArrow,
    semiCircle: shapeSemiCircle,
    oval: shapeOval,
    pill: shapePill,
    triangle: shapeTriangle,
    diamond: shapeDiamond,
    clamShell: shapeClamShell,
    pentagon: shapePentagon,
    gem: shapeGem,
    sunny: shapeSunny,
    verySunny: shapeVerySunny,
    cookie4Sided: shapeCookie4Sided,
    cookie6Sided: shapeCookie6Sided,
    cookie7Sided: shapeCookie7Sided,
    cookie9Sided: shapeCookie9Sided,
    cookie12Sided: shapeCookie12Sided,
    ghostish: shapeGhostish,
    clover4Leaf: shapeClover4Leaf,
    clover8Leaf: shapeClover8Leaf,
    burst: shapeBurst,
    softBurst: shapeSoftBurst,
    boom: shapeBoom,
    softBoom: shapeSoftBoom,
    flower: shapeFlower,
    puffy: shapePuffy,
    puffyDiamond: shapePuffyDiamond,
    pixelCircle: shapePixelCircle,
    pixelTriangle: shapePixelTriangle,
    bun: shapeBun,
    heart: shapeHeart,
};
export const materialShape = (name) => byName[name]();
const num = (value) => {
    const rounded = Math.round(value * 1000) / 1000;
    return String(Object.is(rounded, -0) ? 0 : rounded);
};
export const polygonPath = (polygon, size = 1) => {
    const cubics = polygon.cubics;
    if (!cubics.length)
        return '';
    const s = (v) => num(v * size);
    let d = `M${s(cubics[0][0])} ${s(cubics[0][1])}`;
    for (const c of cubics)
        d += `C${s(c[2])} ${s(c[3])} ${s(c[4])} ${s(c[5])} ${s(c[6])} ${s(c[7])}`;
    return `${d}Z`;
};
export const materialShapePath = (name, size = 1) => polygonPath(materialShape(name), size);
const TWO_PI = Math.PI * 2;
export const sampleProfile = (polygon, samples = 360, stepsPerCubic = 24) => {
    const points = [];
    for (const cubic of polygon.cubics) {
        for (let s = 0; s < stepsPerCubic; s++)
            points.push(pointOnCurve(cubic, s / stepsPerCubic));
    }
    let area = 0;
    let centerX = 0;
    let centerY = 0;
    for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        const cross = x0 * y1 - x1 * y0;
        area += cross;
        centerX += (x0 + x1) * cross;
        centerY += (y0 + y1) * cross;
    }
    if (Math.abs(area) > 1e-12) {
        centerX /= 3 * area;
        centerY /= 3 * area;
    }
    else {
        const bounds = polygonBounds(polygon);
        centerX = (bounds[0] + bounds[2]) / 2;
        centerY = (bounds[1] + bounds[3]) / 2;
    }
    const outline = [];
    for (const [x, y] of points) {
        const dx = x - centerX;
        const dy = y - centerY;
        let angle = Math.atan2(dy, dx);
        if (angle < 0)
            angle += TWO_PI;
        outline.push([angle, Math.hypot(dx, dy)]);
    }
    outline.sort((a, b) => a[0] - b[0]);
    const last = outline[outline.length - 1];
    const first = outline[0];
    outline.unshift([last[0] - TWO_PI, last[1]]);
    outline.push([first[0] + TWO_PI, first[1]]);
    const radii = new Float32Array(samples);
    let j = 0;
    let maxRadius = 0;
    for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * TWO_PI;
        while (outline[j + 1][0] < angle)
            j++;
        const [a0, r0] = outline[j];
        const [a1, r1] = outline[j + 1];
        const t = a1 === a0 ? 0 : (angle - a0) / (a1 - a0);
        const r = r0 + (r1 - r0) * t;
        radii[i] = r;
        if (r > maxRadius)
            maxRadius = r;
    }
    return { radii, centerX, centerY, maxRadius };
};
export const radialProfile = (polygon, samples = 360, stepsPerCubic = 24) => {
    const profile = sampleProfile(polygon, samples, stepsPerCubic);
    const { centerX, centerY } = profile;
    const points = [];
    for (const cubic of polygon.cubics) {
        for (let s = 0; s < stepsPerCubic; s++)
            points.push(pointOnCurve(cubic, s / stepsPerCubic));
    }
    let turn = 0;
    for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        let step = Math.atan2(y1 - centerY, x1 - centerX) - Math.atan2(y0 - centerY, x0 - centerX);
        if (step > Math.PI)
            step -= TWO_PI;
        else if (step < -Math.PI)
            step += TWO_PI;
        if (turn === 0)
            turn = Math.sign(step);
        else if (step * turn < -1e-9) {
            throw new Error("radialProfile: the shape is not star-shaped around its centroid, so it has no radial profile");
        }
    }
    return profile;
};
export { polygonMaxRadius };
