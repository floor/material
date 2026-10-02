// scripts/fixtures/react-ssr-suspense-server.ts
// React 19 uses renderToReadableStream. React 18's Node build of react-dom/server does not
// export it, so 18 uses renderToPipeableStream.
import "mtrl/ssr/react";
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import { Writable } from "node:stream";
import {
  SuspenseHydration, hydrationPromise, suspenseShape, SUSPENSE_SHAPES, SUSPENSE_TEXT,
  countedSuspendedButton, mislabelledTree, neverPromise, rejectionTree, rejectingPromise, renderCounts,
} from "./react-ssr-suspense-app";

export interface StreamResult { html: string; errors: string[]; ms: number }

interface StreamOptions { timeout?: number; abortAfter?: number }

const renderStream = (node: React.ReactNode, options: StreamOptions = {}): Promise<StreamResult> => {
  const errors: string[] = [];
  const started = performance.now();
  const limit = options.timeout ?? 3000;
  const onError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    const line = message.split("\n")[0] ?? message;
    if (!errors.includes(line)) errors.push(line);
  };
  const readable = (ReactDOMServer as unknown as {
    renderToReadableStream?: (
      node: React.ReactNode,
      options: { onError: (error: unknown) => void; signal?: AbortSignal },
    ) => Promise<{ allReady: Promise<void> }>;
  }).renderToReadableStream;
  if (typeof readable === "function") {
    // The timeout aborts the signal, including when the shell never returns. A retry
    // loop otherwise keeps the call pending and the process alive after the check moves on.
    return (async () => {
      const controller = new AbortController();
      const stop = setTimeout(() => controller.abort(), limit);
      const abortTimer = options.abortAfter === undefined ? undefined : setTimeout(() => controller.abort(), options.abortAfter);
      try {
        const body = await readable(node, { onError, signal: controller.signal });
        const done = await Promise.race([
          body.allReady.then(() => "ready" as const, () => "ended" as const),
          new Promise<"timeout">((resolve) => { setTimeout(() => resolve("timeout"), limit); }),
        ]);
        if (done === "timeout") {
          controller.abort();
          throw new Error(`renderToReadableStream timed out (${JSON.stringify(errors)})`);
        }
        const html = await new Response(body as unknown as BodyInit).text().catch(() => "");
        return { html, errors, ms: performance.now() - started };
      } finally {
        clearTimeout(stop);
        clearTimeout(abortTimer);
      }
    })();
  }
  const pipeable = (ReactDOMServer as unknown as {
    renderToPipeableStream: (node: React.ReactNode, options: {
      onError: (error: unknown) => void;
      onShellError: (error: unknown) => void;
      onAllReady: () => void;
    }) => { pipe: (destination: NodeJS.WritableStream) => void; abort: () => void };
  }).renderToPipeableStream;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;
    let abortTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (html: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(abortTimer);
      resolve({ html, errors, ms: performance.now() - started });
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      clearTimeout(abortTimer);
      stream.abort();
      reject(new Error(`renderToPipeableStream timed out (${JSON.stringify(errors)})`));
    }, limit);
    const stream = pipeable(node, {
      onError,
      onShellError(error) { onError(error); finish(""); stream.abort(); },
      onAllReady() {
        stream.pipe(new Writable({
          write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); },
          final(callback) { finish(Buffer.concat(chunks).toString()); callback(); },
        }));
      },
    });
    if (options.abortAfter !== undefined) abortTimer = setTimeout(() => stream.abort(), options.abortAfter);
  });
};

export const renderShapes = async (): Promise<Array<[string, StreamResult]>> => {
  const results: Array<[string, StreamResult]> = [];
  for (const name of SUSPENSE_SHAPES) {
    const promise = new Promise<string>((resolve) => { setTimeout(() => resolve(SUSPENSE_TEXT), 15); });
    try {
      results.push([name, await renderStream(suspenseShape(name, promise))]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push([name, { html: "", errors: [message.split("\n")[0] ?? message], ms: 0 }]);
    }
  }
  return results;
};

export const renderHydration = async (): Promise<string> => {
  const rendered = await renderStream(React.createElement(SuspenseHydration, { promise: hydrationPromise() }));
  if (rendered.errors.length) throw new Error(rendered.errors.join("\n"));
  return rendered.html;
};

const settled = async (node: React.ReactNode, options: StreamOptions): Promise<StreamResult> => {
  const started = performance.now();
  try {
    return await renderStream(node, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { html: "", errors: [message.split("\n")[0] ?? message], ms: performance.now() - started };
  }
};

/** A child that rejects, with the page's Suspense boundary or as a shell error. */
export const renderRejection = (boundary: boolean): Promise<StreamResult> =>
  settled(rejectionTree(rejectingPromise(), boundary), { timeout: 3000 });

/** A child error that copies the production suspend wording. It must surface at once, not after the retry cap. */
export const renderMislabelled = (): Promise<StreamResult> => settled(mislabelledTree(), { timeout: 3000 });

/** A child that never resolves, aborted at 300ms. `after` is sibling renders in the following 500ms. */
export const renderAborted = async (): Promise<StreamResult & { during: number; after: number }> => {
  renderCounts.sibling = 0;
  const result = await settled(countedSuspendedButton(neverPromise()), { timeout: 2000, abortAfter: 300 });
  const during = renderCounts.sibling;
  await new Promise((resolve) => { setTimeout(resolve, 500); });
  return { ...result, during, after: renderCounts.sibling - during };
};

/** One host whose child resolves after a second. `sibling` counts static renders of a child beside it. */
export const renderCeiling = async (): Promise<StreamResult & { sibling: number }> => {
  renderCounts.sibling = 0;
  const promise = new Promise<string>((resolve) => { setTimeout(() => resolve(SUSPENSE_TEXT), 1000); });
  const result = await settled(countedSuspendedButton(promise), { timeout: 5000 });
  return { ...result, sibling: renderCounts.sibling };
};

/** A child that resolves after the retry cap. The page streams its content and that host has no shadow root. */
export const renderGiveUp = async (): Promise<StreamResult & { sibling: number }> => {
  renderCounts.sibling = 0;
  const promise = new Promise<string>((resolve) => { setTimeout(() => resolve(SUSPENSE_TEXT), 9500); });
  const result = await settled(countedSuspendedButton(promise), { timeout: 15000 });
  return { ...result, sibling: renderCounts.sibling };
};
