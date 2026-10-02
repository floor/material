import * as React from "react";
import { Tab, Tabs } from "mtrl/react";

const LabelContext = React.createContext("DEFAULT");
const RequiredContext = React.createContext<string | null>(null);

const Label = () => React.createElement(React.Fragment, null, React.useContext(LabelContext));
const RequiredLabel = () => {
  const value = React.useContext(RequiredContext);
  if (value === null) throw new Error("Required provider is missing");
  return React.createElement(React.Fragment, null, value);
};

export const ContextApp = () => React.createElement(React.Fragment, null,
  React.createElement(LabelContext.Provider, { value: "from provider" },
    React.createElement(Tabs, { id: "provided-tabs", value: "a" },
      React.createElement(Tab, { value: "a" }, React.createElement(Label)))),
  React.createElement(RequiredContext.Provider, { value: "required provider" },
    React.createElement(Tabs, { id: "required-tabs", value: "a" },
      React.createElement(Tab, { value: "a" }, React.createElement(RequiredLabel)))),
);
