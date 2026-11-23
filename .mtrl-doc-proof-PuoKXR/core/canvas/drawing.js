export const createRoundedRectPath = (ctx, x, y, width, height, radius) => {
    if (width < 0 || height < 0)
        return;
    const radii = typeof radius === 'number'
        ? [radius, radius, radius, radius]
        : radius;
    const [tl, tr, br, bl] = radii;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + width - tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
    ctx.lineTo(x + width, y + height - br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
    ctx.lineTo(x + bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
};
export const fillRoundedRect = (ctx, x, y, width, height, radius, fillStyle) => {
    ctx.save();
    if (fillStyle)
        ctx.fillStyle = fillStyle;
    createRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.restore();
};
export const clipRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.save();
    createRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    return () => ctx.restore();
};
export const fillRoundedRectLR = (ctx, x, y, width, height, leftRadius, rightRadius, fillStyle) => {
    if (width < 0 || height < 0)
        return;
    ctx.save();
    if (fillStyle)
        ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(x + leftRadius, y);
    ctx.lineTo(x + width - rightRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + rightRadius);
    ctx.lineTo(x + width, y + height - rightRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - rightRadius, y + height);
    ctx.lineTo(x + leftRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - leftRadius);
    ctx.lineTo(x, y + leftRadius);
    ctx.quadraticCurveTo(x, y, x + leftRadius, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};
export const clearCanvas = (ctx, width, height, backgroundColor) => {
    if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
    }
    else {
        ctx.clearRect(0, 0, width, height);
    }
};
