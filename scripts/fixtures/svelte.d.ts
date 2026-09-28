// The fixtures import a .svelte file; the check compiles it.
declare module "*.svelte" {
  import type { Component } from "svelte";
  const component: Component;
  export default component;
}
