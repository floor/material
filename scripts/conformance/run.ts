import { join } from "node:path";

const components = [
  "badge", "bottom-app-bar", "bottom-sheet", "button", "button-group", "card", "carousel",
  "checkbox", "chips", "date-picker", "dialog", "divider", "extended-fab", "fab", "fab-menu",
  "icon-button", "list", "loading-indicator", "menu", "navigation-bar", "navigation-drawer",
  "navigation-rail", "progress", "radio", "search", "select", "side-sheet", "slider", "snackbar",
  "split-button", "switch", "tabs", "text-field", "time-picker", "toolbar", "tooltip", "top-app-bar",
] as const;
type Component = (typeof components)[number];

const entryFor = (component: Component): string => {
  // Audit names are hyphenated. The component directories and fixtures predate them.
  if (component === "date-picker") return "datepicker";
  if (component === "time-picker") return "timepicker";
  return component;
};

const start = (entry: string, args: string[], stdout: "inherit" | "pipe") => Bun.spawn({
  cmd: [process.execPath, join(import.meta.dir, `${entry}.ts`), ...args],
  stdout,
  stderr: "inherit",
});

const [command, ...args] = process.argv.slice(2);
if (!command || command === "--help") {
  console.log(`Usage:
  bun run conformance --list
  bun run conformance --matrix [--check]
  bun run conformance <component> [--webkit] [--case=<substring>]
  bun run conformance all [--webkit]
  bun run conformance tokens <component> [--json | --files] [--only=TokenFile,...]

See scripts/conformance/README.md for setup and component-specific probes.`);
} else if (command === "--matrix") {
  if (args.some(arg => arg !== "--check")) throw new Error("The matrix command accepts only --check");
  const { generateMatrix } = await import("./matrix");
  await generateMatrix(new Map(components.map(component => [component, entryFor(component)])), args.includes("--check"));
} else if (command === "--list") {
  console.log(components.join("\n"));
} else if (command === "tokens") {
  process.exitCode = await start("compose-tokens", args, "inherit").exited;
} else if (command === "all") {
  if (args.some(arg => arg !== "--webkit")) throw new Error("The all command accepts only --webkit; use a component for other options.");
  for (const component of components) {
    const child = start(entryFor(component), args, "pipe");
    const output = await new Response(child.stdout).text();
    if (await child.exited !== 0) throw new Error(`${component} measurement failed`);
    try {
      console.log(JSON.stringify({ component, measurement: JSON.parse(output) }));
    } catch (error) {
      throw new Error(`${component} returned invalid measurement JSON`, { cause: error });
    }
  }
} else {
  const component = components.find(name => name === command || entryFor(name) === command);
  if (!component) throw new Error(`Unknown component ${JSON.stringify(command)}. Run bun run conformance --list.`);
  process.exitCode = await start(entryFor(component), args, "inherit").exited;
}
