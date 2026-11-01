// Small standalone fixture for the badge accessibility regression.
import createBadge from "../../src/components/badge";
import { withBadge } from "../../src/core/compose/features/badge";
import { defineBadge } from "../../src/elements/badge";
import { registerStyles } from "../../src/elements/styles";
Object.assign(window, { mtrl: { createBadge, withBadge }, registerBadgeStyles: (css: string) => registerStyles({ badge: css }) });
defineBadge();
