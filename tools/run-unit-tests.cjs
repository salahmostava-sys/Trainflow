const {spawnSync} = require('child_process');
const path = require('path');
require('./prepare-runtime.cjs');

const unitTests = require('../package.json').scripts['test'].match(/tests\/[\w.-]+\.(?:cjs|mjs)/g);

console.log('=== RUNNING UNIT TESTS ===');
const results = [];
for (const test of unitTests) {
  const start = Date.now();
  const proc = spawnSync(process.execPath, [path.resolve(test)], {
    encoding: 'utf8',
    env: process.env
  });
  const duration = Date.now() - start;
  const passed = proc.status === 0;
  results.push({test, passed, duration, error: passed ? null : proc.stderr || proc.stdout});
  console.log(`${passed ? '✓ PASS' : '✗ FAIL'}: ${test} (${duration}ms)`);
  if (!passed) {
    console.error(`  Output: ${(proc.stderr || proc.stdout).trim()}`);
  }
}

const passedCount = results.filter(r => r.passed).length;
console.log(`\nUnit Tests Result: ${passedCount}/${results.length} passed.`);
if (passedCount !== results.length) {
  process.exitCode = 1;
}
