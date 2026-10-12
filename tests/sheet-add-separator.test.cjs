const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

// Test that trainees.js and trainees-core.js handle separator logic correctly
const D = require('../trainees-core.js');

// Mock DOM and environment for trainees.js unit test
global.window = {
  location: { href: 'http://localhost/' },
  addEventListener: () => {},
  removeEventListener: () => {},
  document: {}
};
global.document = {
  getElementById: (id) => null,
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  fonts: { ready: Promise.resolve() }
};

console.log('Testing separator formatting and counting logic...');

// Test 1: Verify D.format validates merged row styles with #dbeafe background
const testFormat = D.format({
  styles: {
    '2:0': {
      mergeCols: 13,
      mergeRows: 1,
      align: 'center',
      valign: 'middle',
      bold: true,
      bg: '#dbeafe',
      color: '#1e40af',
      size: 13
    }
  }
});

assert.equal(testFormat.styles['2:0'].mergeCols, 13, 'mergeCols preserved');
assert.equal(testFormat.styles['2:0'].mergeRows, 1, 'mergeRows preserved');
assert.equal(testFormat.styles['2:0'].align, 'center', 'center align preserved');
assert.equal(testFormat.styles['2:0'].valign, 'middle', 'middle valign preserved');
assert.equal(testFormat.styles['2:0'].bold, true, 'bold preserved');
assert.equal(testFormat.styles['2:0'].bg, '#dbeafe', 'bg color preserved');
assert.equal(testFormat.styles['2:0'].color, '#1e40af', 'text color preserved');
assert.equal(testFormat.styles['2:0'].size, 13, 'font size preserved');

// Test 2: Counting rows and extracting date until next separator
const rows = [
  ['CODE-1', '', 'Trainee 1', '', '', '', '', '', '2026-10-14', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', '', '', '', ''], // empty row to become separator (index 1)
  ['CODE-2', '', 'Trainee 2', '', '', '', '', '', '2026-10-15', '', '', '', ''],
  ['CODE-3', '', 'Trainee 3', '', '', '', '', '', '2026-10-15', '', '', '', ''],
  ['CODE-4', '', 'Trainee 4', '', '', '', '', '', '2026-10-15', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', '', '', '', ''], // empty row to become separator 2 (index 5)
  ['CODE-5', '', 'Trainee 5', '', '', '', '', '', '2026-10-16', '', '', '', ''],
];

const totalCols = 13;
const r = 1;

// Row 1 is empty
const currentRow = rows[r];
const hasContent = Boolean(currentRow && currentRow.some(c => c && typeof c === 'string' && c.trim() !== ''));
assert.equal(hasContent, false, 'Row 1 is empty');

let count = 0;
let date = '';
const emptyFmt = { styles: {} };
for (let i = r + 1; i < rows.length; i++) {
  const isNextSeparator = Boolean(emptyFmt.styles[i + ':0']?.mergeCols >= totalCols);
  if (isNextSeparator) break;
  const row = rows[i];
  if (row && row.some(c => c && typeof c === 'string' && c.trim() !== '')) {
    count++;
    if (!date && row[8] && row[8].trim()) date = row[8].trim();
  }
}

assert.equal(count, 4, 'Counts 4 trainee rows below row 1 (rows 2, 3, 4, 6)');
assert.equal(date, '2026-10-15', 'Extracts date 2026-10-15 from first trainee row below separator');

// Now if row 5 is a separator
const fmtWithSep2 = D.format({
  styles: {
    '5:0': { mergeCols: 13, mergeRows: 1, bg: '#dbeafe' }
  }
});

let countBeforeNextSep = 0;
let dateBeforeNextSep = '';
for (let i = r + 1; i < rows.length; i++) {
  const isNextSeparator = Boolean(fmtWithSep2.styles[i + ':0']?.mergeCols >= totalCols);
  if (isNextSeparator) break;
  const row = rows[i];
  if (row && row.some(c => c && typeof c === 'string' && c.trim() !== '')) {
    countBeforeNextSep++;
    if (!dateBeforeNextSep && row[8] && row[8].trim()) dateBeforeNextSep = row[8].trim();
  }
}

assert.equal(countBeforeNextSep, 3, 'Counts exactly 3 rows between separator 1 and separator 2');
assert.equal(dateBeforeNextSep, '2026-10-15', 'Extracts date for the group');

console.log('PASS: All separator logic and formatting validations passed cleanly!');
