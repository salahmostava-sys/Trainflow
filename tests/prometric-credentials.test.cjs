const {test} = require('node:test');
const assert = require('node:assert/strict');
const {generateCredentials} = require('../extension/prometric/utils.js');

test('new registrations use independent passwords for missing, legacy and random defaults', () => {
  for (const pattern of [undefined,'','{F}@{f}#$1970','{random}']) {
    const first=generateCredentials('ALPHA STUDENT',pattern),second=generateCredentials('ALPHA STUDENT',pattern);
    assert.equal(first.username,'ALPHASTUDENT');
    assert.notEqual(first.password,second.password);
    assert.match(first.password,/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!])[A-Za-z\d!]{20}$/);
    assert.notEqual(first.password,'A@a#$1970');
  }
});
test('explicit custom password patterns retain their existing behavior', () => {
  assert.equal(generateCredentials('ALPHA STUDENT','{F}#{f}Demo1970').password,'A#aDemo1970');
});
