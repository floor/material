/** The semantic names a component renders through the icon registry. */
export type IconName = "menu" | "menu-open" | "close";

/** Overrides by semantic name; `null` or `""` restores the built-in. */
export type IconOverrides = Partial<Record<IconName, string | null | undefined>>;
