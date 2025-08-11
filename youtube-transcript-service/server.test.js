import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { YoutubeTranscript } from 'youtube-transcript';
import { app } from './server.js';

test('handles youtu.be URLs with extra params', async (t) => {
  const calls = [];
  mock.method(YoutubeTranscript, 'fetchTranscript', async (id) => {
    calls.push(id);
    return [{ text: 'hi' }];
  });

  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://youtu.be/abc123?si=something' })
  });

  assert.equal(res.status, 200);
  const text = await res.text();
  assert.equal(text, 'hi');
  assert.equal(calls[0], 'abc123');
});
