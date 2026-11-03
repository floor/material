// test/ssr/prune-styles.test.ts
import { expect, test } from "bun:test";
import { pruneStyles, renderedClasses } from "../../src/ssr/prune-styles";

const classes = (...names: string[]): ReadonlySet<string> => new Set(names);

test("a rule every selector needs an absent class for is dropped; a present class keeps it", () => {
  expect(pruneStyles(".absent{color:red}.present{color:blue}", classes("present"))).toBe(".present{color:blue}");
  expect(pruneStyles(".present{color:blue}", classes())).toBe("");
});

test("a selector list is kept when any one selector can still match", () => {
  expect(pruneStyles("a, .absent{color:red}", classes())).toBe("a, .absent{color:red}");
  expect(pruneStyles(".absent, .present{color:red}", classes("present"))).toBe(".absent, .present{color:red}");
  expect(pruneStyles(".absent, .other{color:red}", classes())).toBe("");
});

test("a selector requiring no class is kept", () => {
  expect(pruneStyles("*{box-sizing:border-box}:host{display:inline-flex}", classes())).toBe("*{box-sizing:border-box}:host{display:inline-flex}");
  expect(pruneStyles(':host([variant="text"]){color:red}', classes())).toBe(':host([variant="text"]){color:red}');
  expect(pruneStyles("m-divider{height:1px}", classes())).toBe("m-divider{height:1px}");
});

test("functional pseudo-classes and the slotted/part pseudo-elements are kept", () => {
  for (const selector of [
    ":not(.absent)", ":has(.absent)", ":is(.absent)", ":where(.absent)",
    ":host(.absent)", "::slotted(.absent)", "::part(label)",
  ]) {
    expect(pruneStyles(`${selector}{color:red}`, classes())).toBe(`${selector}{color:red}`);
  }
});

test("a dot inside an attribute string is not a class", () => {
  // `.absent` here is a value, not a class: it must not rescue a rule whose real class is missing…
  expect(pruneStyles('.gone[data-x=".present"]{color:red}', classes("present"))).toBe("");
  // …and must not condemn one whose real class is there.
  expect(pruneStyles('.present[data-x=".absent"]{color:red}', classes("present"))).toBe('.present[data-x=".absent"]{color:red}');
});

test("an escaped selector is kept", () => {
  expect(pruneStyles(".a\\:b{color:red}", classes())).toBe(".a\\:b{color:red}");
});

test("strings in a declaration cannot unbalance the block scan", () => {
  expect(pruneStyles('.present::after{content:"}"}.absent{color:red}', classes("present"))).toBe('.present::after{content:"}"}');
});

test("conditional groups are pruned inside and dropped only when empty", () => {
  expect(pruneStyles("@media (width > 10px){.absent{color:red}}", classes())).toBe("");
  expect(pruneStyles("@media (width > 10px){.absent{color:red}.present{color:blue}}", classes("present")))
    .toBe("@media (width > 10px){.present{color:blue}}");
  expect(pruneStyles("@supports (display:grid){.absent{color:red}.present{color:blue}}", classes("present")))
    .toBe("@supports (display:grid){.present{color:blue}}");
  expect(pruneStyles("@container (width > 10px){.absent{color:red}.present{color:blue}}", classes("present")))
    .toBe("@container (width > 10px){.present{color:blue}}");
});

test("nested conditional groups are pruned to the depth the CSS uses", () => {
  expect(pruneStyles("@media screen{@supports (display:grid){.absent{color:red}.present{color:blue}}}", classes("present")))
    .toBe("@media screen{@supports (display:grid){.present{color:blue}}}");
});

test("every non-conditional at-rule is kept whole", () => {
  const kept = [
    "@keyframes pulse{0%{opacity:0}to{opacity:1}}",
    "@property --x{syntax:\"<number>\";inherits:false;initial-value:0}",
    "@layer base{.absent{color:red}}",
    "@starting-style{.absent{opacity:0}}",
    "@layer reset, base;",
  ];
  for (const css of kept) expect(pruneStyles(css, classes())).toBe(css);
});

test("a statement at-rule survives the rules around it", () => {
  const css = "@layer reset, base;\n.absent{color:red}\n.present{color:blue}";
  expect(pruneStyles(css, classes("present"))).toBe("@layer reset, base;\n.present{color:blue}");
});

test("the output keeps every byte the kept rules carried", () => {
  const css = "/* a comment */\n.present { color: blue; }\n\n@media print { .absent { color: red } }";
  expect(pruneStyles(css, classes("present"))).toBe("/* a comment */\n.present { color: blue; }");
});

test("a class named in a comment is not a class the rule requires", () => {
  expect(pruneStyles("/* .absent */\n.present{color:blue}", classes("present"))).toBe("/* .absent */\n.present{color:blue}");
});

test("a comment cannot unbalance the block scan", () => {
  expect(pruneStyles("/* } { ; */ .present{a:b}", classes("present"))).toBe("/* } { ; */ .present{a:b}");
  expect(pruneStyles("/* } { ; */ .absent{a:b}", classes())).toBe("");
});

test("renderedClasses collects every class in the tree", () => {
  const root = { querySelectorAll: () => [{ classList: ["a", "b"] }, { classList: ["b"] }] } as unknown as ShadowRoot;
  expect([...renderedClasses(root)]).toEqual(["a", "b"]);
});
