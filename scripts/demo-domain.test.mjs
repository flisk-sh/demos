import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(md|ya?ml|mjs|sh)$/.test(name)) files.push(path);
  }
};
walk(root);

test('the old demo host is gone from docs and workflows', () => {
  const oldHost = 'demo.flisk.' + 'sh';
  const stale = files.filter((path) => readFileSync(path, 'utf8').includes(oldHost));
  assert.deepEqual(stale, [], `old host still in ${stale.join(', ')}`);
});

test('the README points at demo.flisk.si', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  assert.match(readme, /https:\/\/demo\.flisk\.si/);
  assert.match(readme, /\[demo\.flisk\.si\/0xHxxe\/solidity-dapp-contract-done\]/);
});
