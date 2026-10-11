const {spawnSync} = require('child_process');
const path = require('path');

const unitTests = [
  'tests/cloud.test.cjs',
  'tests/trainees.test.cjs',
  'tests/trainees-xlsx.test.cjs',
  'tests/certificate-name.test.cjs',
  'tests/trainees-formulas.test.cjs',
  'tests/trainees-performance.test.cjs',
  'tests/sheet-delete.test.cjs',
  'tests/session-policy.test.cjs',
  'tests/server.test.mjs',
  'tests/prometric.test.cjs',
  'tests/prometric-session.test.cjs',
  'tests/selection-export.test.cjs',
  'tests/worksheet-actions.test.cjs'
];

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
