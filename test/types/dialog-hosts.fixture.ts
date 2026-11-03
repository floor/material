// Dialog's internal event hosts must accept the callback type supplied
// by withEvents. These assertions are compiled, not executed. DialogFeatureHost
// is the private host withAPI reads, exported by api.ts so this can name it.
// ts:check also checks the real composition pipeline.
import type { DialogComponent, DialogEvent, DialogFeatureComponent } from "../../src/components/dialog/types";
import type { ApiOptions, DialogFeatureHost } from "../../src/components/dialog/api";
import type { EventCallback } from "../../src/core/state/emitter";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const featureOnUsesCoreCallback: Equals<
  Parameters<DialogFeatureComponent["on"]>[1], EventCallback
> = true;

export const hostOnUsesCoreCallback: Equals<
  Parameters<DialogFeatureHost["on"]>[1], EventCallback
> = true;

export const hostOffUsesCoreCallback: Equals<
  Parameters<DialogFeatureHost["off"]>[1], EventCallback
> = true;

export const apiOnUsesCoreCallback: Equals<
  Parameters<ApiOptions["events"]["on"]>[1], EventCallback
> = true;

export const apiOffUsesCoreCallback: Equals<
  Parameters<ApiOptions["events"]["off"]>[1], EventCallback
> = true;

// Existing public behavior: handlers receive DialogEvent, arbitrary event names
// remain accepted, and both methods return the component for chaining.
type PublicSubscription = (event: string, handler: (event: DialogEvent) => void) => DialogComponent;

export const publicOnIsUnchanged: Equals<DialogComponent["on"], PublicSubscription> = true;
export const publicOffIsUnchanged: Equals<DialogComponent["off"], PublicSubscription> = true;
