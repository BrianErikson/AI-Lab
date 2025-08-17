import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

process.env.CACHE_DIR = fs.mkdtempSync(path.join(tmpdir(), 'cache-'));
process.env.JOB_SKIP = '1';
const { app, normalizeYoutubeUrl } = await import('./server.js');

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

test('job creation requires url', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(res.status, 400);
});

test('job creation rejects invalid url', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/video' })
  });
  assert.equal(res.status, 400);
});

test('job status and result 404 for unknown id', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const statusRes = await fetch(`http://localhost:${port}/jobs/unknown/status`);
  assert.equal(statusRes.status, 404);
  const resultRes = await fetch(`http://localhost:${port}/jobs/unknown/result`);
  assert.equal(resultRes.status, 404);
});

test('job creation returns id', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=ZOYaz3SIjHw' })
  });
  assert.equal(res.status, 202);
  const data = await res.json();
  assert.ok(data.id);
  assert.equal(data.status, 'queued');
});

test('job returns done immediately when cached', async (t) => {
  const videoId = 'DUMMYID12345';
  const cachedText = 'cached transcript';
  fs.writeFileSync(path.join(process.env.CACHE_DIR, `${videoId}.txt`), cachedText);
  const server = app.listen(0);
  t.after(() => server.close());
  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'done');
  const result = await fetch(`http://localhost:${port}/jobs/${data.id}/result`);
  assert.equal(await result.text(), cachedText);
});
