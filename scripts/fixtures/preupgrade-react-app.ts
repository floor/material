// The page scripts/check-preupgrade.ts renders with the React adapter on the
// server (renderToString), then hydrates with the pre-upgrade styles in place.
import * as React from "react";
import {
  Button, Card, Checkbox, Chip, Chips, Divider, List, ListItem, Progress, Radio, Radios, Select, SelectOption, Slider,
  Switch, Tab, Tabs, Textfield, TopAppBar,
} from "../../dist/react/index.js";

const h = React.createElement;

export const App = (): React.ReactElement =>
  h(
    "main",
    null,
    h(TopAppBar, { headline: "Settings" }),
    h(Tabs, { defaultValue: "a" }, h(Tab, { value: "a" }, "General"), h(Tab, { value: "b" }, "Privacy")),
    h(Textfield, { label: "Name" }),
    h(Select, { label: "Pet", defaultValue: "cat" }, h(SelectOption, { value: "cat" }, "Cat"), h(SelectOption, { value: "dog" }, "Dog")),
    h(Switch, { defaultChecked: true }, "Notifications"),
    h(Checkbox, null, "Agree"),
    h(Radios, { defaultValue: "s", ariaLabel: "Size" }, h(Radio, { value: "s" }, "Small"), h(Radio, { value: "l" }, "Large")),
    h(Slider, { defaultValue: 40, ariaLabel: "Volume" }),
    h(Progress, { value: 30, ariaLabel: "Upload" }),
    h(Chips, { ariaLabel: "Diet" }, h(Chip, { value: "veg" }, "Vegetarian"), h(Chip, { value: "gf" }, "Gluten free")),
    h(Divider, null),
    h(List, { ariaLabel: "Fruit" }, h(ListItem, { value: "a" }, "Apple"), h(ListItem, { value: "b" }, "Banana")),
    h(Card, { headline: "Card" }, "Supporting text."),
    h(Button, { type: "submit" }, "Save")
  );
