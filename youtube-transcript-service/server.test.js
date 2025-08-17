import test from 'node:test';
import assert from 'node:assert/strict';
import { app, normalizeYoutubeUrl } from './server.js';

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

test('rejects invalid url', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/video' })
  });
  assert.equal(res.status, 400);
});

test('rejects malformed youtube domain', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://youtube.be/abc123' })
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

test('normalizes shared links', () => {
  const url = 'https://youtu.be/ZOYaz3SIjHw?si=0grwE-vtOlULzYHN';
  const normalized = normalizeYoutubeUrl(url);
  assert.equal(normalized, 'https://www.youtube.com/watch?v=ZOYaz3SIjHw');
});
