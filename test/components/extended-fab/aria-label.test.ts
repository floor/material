import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

// Isolate DOM globals and test the real constructor without component mocks.
test('real extended FAB accessible name', async () => {
  const child = Bun.spawn([
    process.execPath, 'test', fileURLToPath(new URL('./aria-label.fixture.ts', import.meta.url)),
  ], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(code, stdout + stderr).toBe(0);
});
