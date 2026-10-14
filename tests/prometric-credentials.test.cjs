const {test} = require('node:test');
const assert = require('node:assert/strict');
const {generateCredentials} = require('../extension/prometric/utils.js');

test('new registrations use the requested first-initial password template', () => {
  for (const pattern of [undefined,'','{F}@{f}#$1970']) {
    for(const [name,password] of [['Ahmed Student','A@a#$1970'],['beta STUDENT','B@b#$1970']])assert.equal(generateCredentials(name,pattern).password,password);
  }
});
test('explicit custom password patterns retain their existing behavior', () => {
  assert.equal(generateCredentials('ALPHA STUDENT','{F}#{f}Demo1970').password,'A#aDemo1970');
  const first=generateCredentials('ALPHA STUDENT','{random}'),second=generateCredentials('ALPHA STUDENT','{random}');
  assert.notEqual(first.password,second.password);
  assert.match(first.password,/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!])[A-Za-z\d!]{20}$/);
});
