# Server-rendered React inside a Suspense boundary

The contract of the suspension handling in `src/ssr/react.ts`. This file is
documentation only; it is not packed with the package, so the shipped bridge
stays lean. The implementation carries a short comment at each site that
needs one and points here for the reasoning.

## Why the bridge retries at all

The server-rendered shadow root is built in a separate render, without the
context of providers above the component. A `Suspense` boundary inside the
component contributes its fallback to the first static pass, which does not
throw. The host then re-renders on the retry backoff until no boundary inside
it is still pending — wherever the boundary renders, inside an ordinary
component as well, and whatever thenable the child suspends with — and the
shadow root ships the resolved content (#461). A boundary that never resolves
server-side ships its fallback in the root, at the retry cap. An error a
boundary inside the component caught is reported by the streaming renderer's
onError probe and, once the probe's own render completes — every boundary in
the host finished, a still-pending sibling included — ships its
fallback-shaped root without entering the retry ladder, exactly as the page
renders it without the bridge.

## The retry ladder

`RETRY_DELAYS_MS` waits before each retry of a suspending child. The first
retry is the next task, so a child that resolves in a few milliseconds is
snapshotted at once. The wait then doubles, and further retries keep the last
step. A slow child is rendered a few times a second instead of hundreds.

`MAX_SUSPENDS` is the point past which suspensions are left to the page. Forty
attempts is about eight seconds at the delays above. The host is then rendered
with no shadow root, and the page keeps streaming for as long as it would
without the bridge.

## Telling a suspend from an error

`renderToStaticMarkup` reports a synchronous suspend as a plain Error thrown
from one place in React. The thenable the child threw does not escape, and the
Error has no code or digest. The message depends on the build, so it is not
the signal: the header is skipped and the first call frame is compared with a
frame sampled from this process's own React. A child's error is thrown from
the child, including one whose text copies React's message. A frame is a V8
line starting with `at `, or a JavaScriptCore or SpiderMonkey
`name@file:line:col` line. Anything else is not a frame, so the error is not a
suspension.

`sampledFrame` is `null` until the first suspend samples this process's React;
an empty sample stays unset. The sample is cached for the process, so a second
host does not sample again.

`isDevelopment` is the same guard as `core/utils/warn.ts`: tsc leaves NODE_ENV
in place, and a browser without `process` must not throw.

## The thenable subscription count

The static renderer reports a suspend a boundary caught only by subscribing:
it calls `then` on the thenable the child threw, while the boundary renders
its fallback and the pass succeeds (#461). The subscription happens wherever
the boundary sits — directly in the children or inside a component an element
walk cannot reach — and a resolved child subscribes to nothing, so the count
is a synchronous pending signal. Every call passes through unchanged, and the
patch is installed for the length of one nested static pass, which is
synchronous: nothing else runs inside it. A child that calls `then` for its
own reasons during render also counts; that host re-renders to the retry cap
and then ships the current markup, so it is slow, never wrong.

## The string renderer's pending marker

The subscription count reads zero for a thenable whose `then` never dispatches
through this realm's `Promise.prototype`: an object with its own `then`
method, or a native Promise from another realm (#461). The string renderer,
which never waits, instead marks a boundary it left pending in its own
serialized output (`<!--$!-->`), whatever thenable the child threw and
wherever the boundary renders; a boundary whose content it read synchronously
carries no pending marker. The marker is the renderer's report, not the
thenable's dispatch, so it sees every thenable kind. An error the boundary
caught also writes the marker — production output is byte-identical to a
pending boundary's — but the boundary catches that error again in every later
pass, so the static pass never throws and the marker alone cannot say which it
is. The error probe below answers that. The output is discarded — the shipped
markup stays the static pass's.

## The streaming-renderer probe

React reports an error a boundary caught through the streaming renderers'
onError alone: in development and in production, on React 19's
`renderToReadableStream` and React 18's `renderToPipeableStream`. The
serialized markup cannot tell that error from a pending boundary — the string
renderer writes the same pending marker for both, and production strips the
message its client-render template carries in development — and the string
renderers take no onError at all. So the probe renders the host's own element
once through this build's streaming renderer and listens for two answers.
onError firing means a boundary failed rather than waited, and a wait the
renderer itself has abandoned can never resolve, so retrying it can only burn
the ladder. The same render's completion — allReady on the readable renderer,
onAllReady on the pipeable — fires only when every boundary in the host has
finished, errored ones included, so a report while the stream stays open means
a sibling boundary is still pending, and the error must not end the host's
wait on the sibling's behalf. The probe settles on completion, on a shell
failure (the render is dead; nothing can be pending), or on its timeout —
never on the shell alone (React 18 delivers a boundary's error only after its
shell) — and the probe's own abort is ignored once it stops listening. Its
output is discarded; the shipped markup stays the static pass's (#461).

A build whose server exports neither stream renderer cannot be probed; the
ladder keeps its behavior and the cap still ships the markup.

## One attempt counter and one probe per host

The child element is stable across the host's retries; a ref is not, so the
counter is a WeakMap keyed by the child node. Slot wrappers are recreated on
every host render, so the counter hangs from the child inside them. The probe
is keyed the same way.

A settled probe answer is replaced unless it carries the ship signal — a
boundary pending now may resolve or fail on a later pass — but only after the
decision above has read it.

## The pass itself

The bridge's pass renders the host with `renderToStaticMarkup`, with no
Suspense wrapper: renderToStaticMarkup renders an error and a suspension as
the same fallback, so a wrapper cannot tell them apart. A suspension is thrown
from React's static renderer; any other throw is the child's error. A boundary
already inside the children catches its own child's suspend, so this pass
succeeds — and the subscription count still reports that suspend, at whatever
depth the boundary renders (#461), for a thenable whose `then` runs through
this realm's `Promise.prototype`.

A boundary inside the children caught a suspend during the pass: that markup
is fallback-shaped while the page's own stream waits for the data. The
subscription count reports a thenable that dispatched through this realm's
`Promise.prototype`; a custom `then` or a Promise from another realm is
reported by the string pass instead. A subscription is pending by definition;
the marker alone cannot say pending from error — the boundary catches its
error again in every pass — so the marker-only path asks the
streaming-renderer probe. A reported error ships this pass's fallback-shaped
markup once the probe's render has also completed — every boundary in the host
finished, a still-pending sibling included — as the page renders it without
the bridge: retrying a settled host could only burn the ladder to its cap
(#461). A pending boundary re-renders on the same backoff as a thrown suspend,
so a page that waits for its data ships a root built from the resolved
children. At the cap the current markup ships, as a boundary that never
resolves always has.

The marker-only path waits for the probe: the stored probe's settled answer is
the previous pass's. A report together with the probe's completion — every
boundary finished, the errored one and any sibling — ships this pass's
fallback-shaped markup at once. A report with the stream still open, or a
silence, is replaced, and the retry waits for the new probe's answer before its
delay, so the next pass reads a settled one.

An error settles only the boundary that threw it; the probe's completion is
what says the whole host has finished. Both answers in hand, the next pass
ships without the backoff, which a pending boundary alone still needs.
