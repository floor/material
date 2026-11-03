// Small standalone fixture for the badge accessibility regression.
import createTabs from "../../src/components/tabs";
import createBadge from "../../src/components/badge";
import { withBadge } from "../../src/core/compose/features/badge";
import { defineBadge } from "../../src/elements/badge";
import { registerStyles } from "../../src/elements/styles";
Object.assign(window, { mtrl: { createBadge, withBadge, createTabs }, registerBadgeStyles: (css: string) => registerStyles({ badge: css }) });
defineBadge();
