import test from 'node:test';
import assert from 'node:assert/strict';
import { extractVideoID } from './server.js';

const cases = [
  ['https://youtu.be/abc123', 'abc123'],
  ['https://www.youtube.com/watch?v=abc123', 'abc123'],
  ['https://youtube.com/watch?v=abc123', 'abc123'],
  ['https://music.youtube.com/watch?v=abc123', 'abc123'],
  ['https://m.youtube.com/watch?v=abc123', 'abc123']
];

for (const [url, id] of cases) {
  test(`extracts id from ${url}`, () => {
    assert.equal(extractVideoID(url), id);
  });
}

test('rejects non youtube urls', () => {
  assert.throws(() => extractVideoID('https://example.com/watch?v=abc123'));
});
