export const colorToRGBA = (color, opacity) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return `rgba(0, 0, 0, ${opacity})`;
    ctx.fillStyle = color;
    const computedColor = ctx.fillStyle;
    if (computedColor.startsWith('#')) {
        const hex = computedColor.substring(1);
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    if (computedColor.startsWith('rgb')) {
        const match = computedColor.match(/\d+/g);
        if (match) {
            const [r, g, b] = match;
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
    }
    return `rgba(0, 0, 0, ${opacity})`;
};
