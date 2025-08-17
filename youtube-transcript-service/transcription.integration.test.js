import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from './server.js';

const RUN = process.env.RUN_WHISPER_TEST;

test('transcribes sample audio with whisper', { skip: !RUN }, async (t) => {
  const audioRes = await fetch('https://raw.githubusercontent.com/openai/whisper/main/tests/jfk.flac');
  const buf = Buffer.from(await audioRes.arrayBuffer());

  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const form = new FormData();
  form.append('file', new Blob([buf]), 'jfk.flac');
  const res = await fetch(`http://localhost:${port}/transcript`, {
    method: 'PUT',
    body: form
  });
  assert.equal(res.status, 200);
  const transcription = (await res.text()).toLowerCase();
  assert(transcription.includes('my fellow americans'));
  assert(transcription.includes('your country'));
  assert(transcription.includes('do for you'));
});
