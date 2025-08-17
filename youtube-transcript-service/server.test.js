import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from './server.js';

test('requires url', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(res.status, 400);
});

test('requires file on PUT', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/transcript`, { method: 'PUT' });
  assert.equal(res.status, 400);
});
