// test/scripts/docs-imports.test.ts
/**
 * The extraction behind check-docs-imports.ts: which import statements the
 * documentation shows, and on which lines. A statement missed here is never
 * compiled, so a documented import that does not resolve would pass unseen.
 */

import { describe, test, expect } from 'bun:test';
import { importsIn, jsdocImports, markdownImports, packageImports } from '../../scripts/docs-imports';

describe('imports in a stretch of code', () => {
  test('a one-line import, with its line', () => {
    const code = "import { createButton } from 'material';\nconst button = createButton({});";
    expect(importsIn(code, 'doc.md', 7)).toEqual([
      { file: 'doc.md', line: 7, specifier: 'material', statement: "import { createButton } from 'material';" },
    ]);
  });

  test('a name list across lines is one statement', () => {
    const code = ["import {", "  createMenu,", "  MENU_POSITION,", "} from 'material';"].join('\n');
    expect(importsIn(code, 'doc.md', 1)).toEqual([
      { file: 'doc.md', line: 1, specifier: 'material', statement: code },
    ]);
  });

  test('a side-effect import names its specifier', () => {
    expect(importsIn("import 'material/styles';", 'doc.md', 1)[0]).toEqual({
      file: 'doc.md', line: 1, specifier: 'material/styles', statement: "import 'material/styles';",
    });
  });

  test('a default or namespace import is a statement too', () => {
    expect(importsIn("import createMenu from 'material';", 'doc.md', 1)[0]?.specifier).toBe('material');
    expect(importsIn("import * as mtrl from 'material';", 'doc.md', 1)[0]?.specifier).toBe('material');
    expect(importsIn("import type { MenuConfig } from 'material';", 'doc.md', 1)[0]?.specifier).toBe('material');
  });

  test('a commented-out import is not one', () => {
    expect(importsIn("// import { createMenu } from 'material';", 'doc.md', 1)).toEqual([]);
    expect(importsIn(" * import { createMenu } from 'material';", 'doc.md', 1)).toEqual([]);
  });

  test('an import with no specifier is left out', () => {
    expect(importsIn("import { something } from dynamicName;", 'doc.md', 1)).toEqual([]);
  });
});

describe('imports in the fenced code of a document', () => {
  test('finds the import inside a fence, not the same text in prose', () => {
    const text = [
      'Write `import { createButton } from "material";` in your file.',
      '',
      '```typescript',
      "import { createButton } from 'material';",
      '```',
    ].join('\n');
    expect(markdownImports(text, 'README.md')).toEqual([
      { file: 'README.md', line: 4, specifier: 'material', statement: "import { createButton } from 'material';" },
    ]);
  });

  test('reads a fence with no language', () => {
    const text = ['```', "import { createButton } from 'material';", '```'].join('\n');
    expect(markdownImports(text, 'README.md')[0]?.line).toBe(2);
  });

  test('every fence of the file, in order', () => {
    const text = [
      '```js', "import 'material/styles';", '```',
      '',
      'text',
      '',
      '```ts', "import { BUTTON_VARIANTS } from 'material/components/button/constants';", '```',
    ].join('\n');
    expect(markdownImports(text, 'doc.md').map((item) => [item.line, item.specifier])).toEqual([
      [2, 'material/styles'],
      [8, 'material/components/button/constants'],
    ]);
  });

  test('nothing outside a fence', () => {
    expect(markdownImports("import { createButton } from 'material';", 'doc.md')).toEqual([]);
  });
});

describe('imports in JSDoc examples', () => {
  const source = [
    "import ts from 'typescript';",
    '',
    '/**',
    ' * A menu.',
    ' *',
    ' * @example',
    " * import { createMenu, MENU_POSITION } from 'material';",
    ' *',
    ' * const menu = createMenu({ position: MENU_POSITION.BOTTOM_END });',
    ' */',
    'export const menu = 1;',
  ].join('\n');

  test('finds the import of an @example, with its line', () => {
    expect(jsdocImports(source, 'src/components/menu/index.ts')).toEqual([
      { file: 'src/components/menu/index.ts', line: 7, specifier: 'material', statement: "import { createMenu, MENU_POSITION } from 'material';" },
    ]);
  });

  test('the source’s own imports are not examples', () => {
    expect(jsdocImports(source, 'src/components/menu/index.ts').map((item) => item.statement)).not.toContain("import ts from 'typescript';");
  });

  test('stops at the end of the comment', () => {
    const after = [
      '/**',
      ' * @example',
      " * import { createMenu } from 'material';",
      ' */',
      "import { createSelect } from 'material';",
    ].join('\n');
    expect(jsdocImports(after, 'src/menu.ts').map((item) => item.line)).toEqual([3]);
  });

  test('two examples in one comment are two blocks', () => {
    const two = [
      '/**',
      ' * @example',
      " * import { a } from 'material';",
      ' *',
      ' * @example',
      " * import { b } from 'material/core/compose';",
      ' */',
    ].join('\n');
    expect(jsdocImports(two, 'src/x.ts').map((item) => [item.line, item.specifier])).toEqual([
      [3, 'material'],
      [6, 'material/core/compose'],
    ]);
  });

  test('an example that closes on the tag line', () => {
    const one = ['/**', " * @example import { a } from 'material'; */"].join('\n');
    expect(jsdocImports(one, 'src/x.ts')).toEqual([
      { file: 'src/x.ts', line: 2, specifier: 'material', statement: "import { a } from 'material';" },
    ]);
  });
});

describe('the package’s own imports', () => {
  const item = (specifier: string) => ({ file: 'doc.md', line: 1, specifier, statement: `import x from '${specifier}';` });

  test('keeps the package and its subpaths, drops everything else', () => {
    const kept = packageImports(
      [item('material'), item('material/core/compose'), item('material/components/button/constants'), item('material-ui'), item('materialx'), item('react')],
      'material',
    );
    expect(kept.map((kept) => kept.specifier)).toEqual(['material', 'material/core/compose', 'material/components/button/constants']);
  });

  test('follows the package name, not a spelled-out one', () => {
    expect(packageImports([item('material'), item('mtrl')], 'mtrl').map((kept) => kept.specifier)).toEqual(['mtrl']);
  });
});
