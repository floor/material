import { afterEach, expect, test } from "bun:test";
import { createCanvasContext, updateCanvasDimensions } from "../../src/core/canvas/utils";

let restoreWindow: (() => void) | undefined;
afterEach(() => { restoreWindow?.(); restoreWindow = undefined; });

const canvasFixture = (ratio: number) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const calls: string[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { get devicePixelRatio() { calls.push("pixelRatio"); return ratio; } },
  });
  restoreWindow = () => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  };
  const ctx = {
    setTransform(...values: number[]) { calls.push(`transform:${values.join(",")}`); },
    scale(x: number, y: number) { calls.push(`scale:${x},${y}`); },
  } as unknown as CanvasRenderingContext2D;
  let width = 0, height = 0;
  const canvas = {
    getContext(kind: string) { calls.push(`context:${kind}`); return ctx; },
    style: {
      set width(value: string) { calls.push(`styleWidth:${value}`); },
      set height(value: string) { calls.push(`styleHeight:${value}`); },
    },
    get width() { return width; },
    set width(value: number) { width = value; calls.push(`width:${value}`); },
    get height() { return height; },
    set height(value: number) { height = value; calls.push(`height:${value}`); },
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx, calls, changeRatio(value: number) { ratio = value; } };
};

for (const ratio of [0, 1.5]) {
  test(`initial canvas sizing keeps native call order and rounding at pixel ratio ${ratio}`, () => {
    const fixture = canvasFixture(ratio);
    const context = createCanvasContext(fixture.canvas, 10.25, 20.5);
    const effective = ratio || 1;
    expect(fixture.calls).toEqual([
      "pixelRatio", "context:2d", "styleWidth:10.25px", "styleHeight:20.5px",
      `width:${Math.round(10.25 * effective)}`, `height:${Math.round(20.5 * effective)}`,
      "transform:1,0,0,1,0,0", `scale:${effective},${effective}`,
    ]);
    expect(context.canvas).toBe(fixture.canvas);
    expect(context.ctx).toBe(fixture.ctx);
    expect([context.width, context.height, context.pixelRatio]).toEqual([10.25, 20.5, effective]);
  });
}

test("resizing retains the stored pixel ratio and context while updating both dimensions", () => {
  const fixture = canvasFixture(1.5);
  const context = createCanvasContext(fixture.canvas, 10, 20);
  fixture.calls.length = 0;
  fixture.changeRatio(3);
  updateCanvasDimensions(context, 12.5, 9.25);
  expect(fixture.calls).toEqual([
    "styleWidth:12.5px", "styleHeight:9.25px", "width:19", "height:14",
    "transform:1,0,0,1,0,0", "scale:1.5,1.5",
  ]);
  expect(context.ctx).toBe(fixture.ctx);
  expect([context.width, context.height, context.pixelRatio]).toEqual([12.5, 9.25, 1.5]);
});
