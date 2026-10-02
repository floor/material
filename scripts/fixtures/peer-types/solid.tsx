import { Button } from "mtrl/solid";

export const ok = <Button disabled={false} onChange={() => {}} />;

// @ts-expect-error disabled is a boolean
export const bad = <Button disabled={"no"} onChange={() => {}} />;
