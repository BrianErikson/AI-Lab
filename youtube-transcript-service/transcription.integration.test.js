import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { app } from './server.js';

const RUN = process.env.RUN_WHISPER_TEST;

test('transcribes sample audio with whisper', { skip: !RUN }, async (t) => {
  const file = path.join(tmpdir(), 'jfk.flac');
  const audioRes = await fetch('https://raw.githubusercontent.com/openai/whisper/main/tests/jfk.flac');
  const buf = Buffer.from(await audioRes.arrayBuffer());
  await fs.writeFile(file, buf);

  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: file })
  });
  assert.equal(res.status, 200);
  const transcription = (await res.text()).toLowerCase();
  assert(transcription.includes('my fellow americans'));
  assert(transcription.includes('your country'));
  assert(transcription.includes('do for you'));
});
