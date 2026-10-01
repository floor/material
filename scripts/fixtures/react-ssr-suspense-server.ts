// scripts/fixtures/react-ssr-suspense-server.ts
import "mtrl/ssr/react";
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import { Writable } from "node:stream";
import { SuspenseHydration, hydrationPromise, suspenseShape, SUSPENSE_SHAPES, SUSPENSE_TEXT } from "./react-ssr-suspense-app";

export interface StreamResult { html: string; errors: string[] }

const renderStream = (node: React.ReactNode): Promise<StreamResult> => {
  const errors: string[] = [];
  const onError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message.split("\n")[0] ?? message);
  };
  const readable = (ReactDOMServer as unknown as {
    renderToReadableStream?: (
      node: React.ReactNode,
      options: { onError: (error: unknown) => void },
    ) => Promise<{ allReady: Promise<void> }>;
  }).renderToReadableStream;
  if (typeof readable === "function") {
    return readable(node, { onError }).then(async (body) => {
      const done = await Promise.race([
        body.allReady.then(() => "ready" as const),
        new Promise<"timeout">((resolve) => { setTimeout(() => resolve("timeout"), 3000); }),
      ]);
      if (done !== "ready") throw new Error(`renderToReadableStream timed out (${JSON.stringify(errors)})`);
      return { html: await new Response(body as unknown as BodyInit).text(), errors };
    });
  }
  const pipeable = (ReactDOMServer as unknown as {
    renderToPipeableStream: (node: React.ReactNode, options: {
      onError: (error: unknown) => void;
      onShellError: (error: unknown) => void;
      onAllReady: () => void;
    }) => { pipe: (destination: NodeJS.WritableStream) => void };
  }).renderToPipeableStream;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (html: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ html, errors });
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`renderToPipeableStream timed out (${JSON.stringify(errors)})`));
    }, 3000);
    const stream = pipeable(node, {
      onError,
      onShellError(error) { onError(error); finish(""); },
      onAllReady() {
        stream.pipe(new Writable({
          write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); },
          final(callback) { finish(Buffer.concat(chunks).toString()); callback(); },
        }));
      },
    });
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
      results.push([name, { html: "", errors: [message.split("\n")[0] ?? message] }]);
    }
  }
  return results;
};

export const renderHydration = async (): Promise<string> => {
  const rendered = await renderStream(React.createElement(SuspenseHydration, { promise: hydrationPromise() }));
  if (rendered.errors.length) throw new Error(rendered.errors.join("\n"));
  return rendered.html;
};
