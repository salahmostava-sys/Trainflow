const {spawnSync} = require('child_process');
const path = require('path');

const browserTests = require('../package.json').scripts['test:browser'].match(/tests\/[\w.-]+\.(?:cjs|mjs)/g);

console.log('=== RUNNING BROWSER TESTS BATCH ===');
const results = [];
for (const test of browserTests) {
  const start = Date.now();
  const proc = spawnSync(process.execPath, [path.resolve(test)], {
    encoding: 'utf8',
    env: process.env
  });
  const duration = Date.now() - start;
  const passed = proc.status === 0;
  results.push({test, passed, duration, output: (proc.stderr || proc.stdout).trim()});
  console.log(`${passed ? '✓ PASS' : '✗ FAIL'}: ${test} (${duration}ms)`);
  if (!passed) {
    console.error(`  Output: ${results[results.length - 1].output}`);
  }
}

const passedCount = results.filter(r => r.passed).length;
console.log(`\nBatch Result: ${passedCount}/${results.length} passed.`);
if (passedCount !== results.length) {
  process.exitCode = 1;
}
