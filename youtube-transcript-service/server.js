import express from 'express';
import fs from 'fs';
import path from 'path';
import { tmpdir, homedir } from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import youtubedl from 'yt-dlp-exec';
import multer from 'multer';

export const app = express();
app.use(express.json());
const upload = multer({ dest: tmpdir() });

// Environment configuration
const MIN_GAP_MS = parseInt(process.env.MIN_GAP_MS || '7000', 10);
const CACHE_DIR = process.env.CACHE_DIR || path.join(homedir(), '.transcripts-cache');
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || '604800000', 10);
const YTDLP_LIMIT_RATE = process.env.YTDLP_LIMIT_RATE || '1500K';
const YTDLP_RETRIES = parseInt(process.env.YTDLP_RETRIES || '3', 10);

fs.mkdirSync(CACHE_DIR, { recursive: true });

// Simple FIFO queue for network work
const queue = [];
let pumping = false;

export function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    if (!pumping) pump();
  });
}

export async function pump() {
  pumping = true;
  while (queue.length) {
    const { fn, resolve, reject } = queue[0];
    try {
      const result = await fn();
      resolve(result);
    } catch (e) {
      reject(e);
    }
    queue.shift();
    if (queue.length) {
      const jitter = Math.floor(Math.random() * 4000) - 2000; // ±2s
      await new Promise(r => setTimeout(r, Math.max(0, MIN_GAP_MS + jitter)));
    }
  }
  pumping = false;
}

// Exponential backoff helper
export async function withBackoff(fn, opts = {}) {
  const { retries = 3, base = 1000, max = 15000 } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const retriable =
        [429, 403].some(code => String(e.message).includes(code)) ||
        ['ECONNRESET', 'ETIMEDOUT'].includes(e.code);
      if (attempt >= retries || !retriable) throw e;
      const delay = Math.min(max, base * 2 ** attempt) * (0.5 + Math.random());
      console.warn(`backoff: ${e.message || e} - waiting ${Math.round(delay)}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function cachePath(id) {
  return path.join(CACHE_DIR, `${id}.txt`);
}

function readCache(id) {
  try {
    const fp = cachePath(id);
    const stat = fs.statSync(fp);
    if (Date.now() - stat.mtimeMs <= CACHE_TTL_MS) {
      return fs.readFileSync(fp, 'utf8');
    }
  } catch {}
  return null;
}

function writeCache(id, text) {
  try {
    fs.writeFileSync(cachePath(id), text);
  } catch {}
}

export function extractVideoID(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return u.pathname.slice(1);
    }
    if (['youtube.com', 'music.youtube.com', 'm.youtube.com'].includes(host)) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        if (id) return id;
      }
    }
  } catch {}
  throw new Error('invalid YouTube url');
}

export function normalizeYoutubeUrl(url) {
  const id = extractVideoID(url);
  return `https://www.youtube.com/watch?v=${id}`;
}

async function fetchVideoMetadata(url) {
  try {
    const out = await youtubedl(url, {
      dumpSingleJson: true,
      quiet: true,
      noWarnings: true,
      skipDownload: true
    });
    const info = typeof out === 'string' ? JSON.parse(out) : out;
    return {
      title: info.title,
      uploader: info.uploader,
      url: info.webpage_url,
      uploadDate: info.upload_date
    };
  } catch (e) {
    console.warn('metadata fetch failed:', e.message || e);
    return {};
  }
}

function formatMetadata(meta) {
  const lines = [];
  if (meta.title) lines.push(`Title: ${meta.title}`);
  if (meta.uploader) lines.push(`Author: ${meta.uploader}`);
  if (meta.url) lines.push(`URL: ${meta.url}`);
  if (meta.uploadDate) lines.push(`Date: ${meta.uploadDate}`);
  return lines.join('\n');
}

const defaultWhisper = path.join(homedir(), '.local', 'bin', 'whisper');
const WHISPER_BIN = process.env.WHISPER_BIN || (fs.existsSync(defaultWhisper) ? defaultWhisper : 'whisper');

async function downloadYoutubeAudio(url) {
  const id = extractVideoID(url);
  console.log('Downloading audio for video ID:', id);
  const output = path.join(tmpdir(), `${randomUUID()}.mp3`);
  await youtubedl(url, {
    output,
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: 0,
    quiet: true,
    noPlaylist: true,
    ignoreConfig: true,
    concurrentFragments: 1,
    sleepRequests: 1.0,
    limitRate: YTDLP_LIMIT_RATE,
    retries: YTDLP_RETRIES,
    fragmentRetries: YTDLP_RETRIES
  });
  return output;
}

async function runWhisper(audioPath) {
  const dir = path.dirname(audioPath);
  const base = path.basename(audioPath, path.extname(audioPath));
  const jsonPath = path.join(dir, `${base}.json`);
  await new Promise((resolve, reject) => {
    const proc = spawn(WHISPER_BIN, [
      audioPath,
      '--model', 'small',
      '--output_dir', dir,
      '--output_format', 'json',
      '--language', 'en',
      '--fp16', 'False'
    ], { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`whisper exited with ${code}`));
    });
  });
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return { text: data.text, jsonPath };
}

app.post('/transcript', async (req, res) => {
  const { url } = req.body;
  console.log('Transcript request (YouTube URL):', url);
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'url required' });
  }
  const videoUrl = url.trim();
  let id;
  try {
    id = extractVideoID(videoUrl);
  } catch {
    return res.status(400).json({ error: 'invalid YouTube url' });
  }
  const normalizedUrl = normalizeYoutubeUrl(videoUrl);
  console.log('Normalized YouTube URL:', normalizedUrl);

  const cached = readCache(id);
  if (cached) {
    console.log('Cache hit for video ID:', id);
    return res.type('text/plain').send(cached.trim());
  }

  let audioPath;
  let jsonPath;
  try {
    const metadataPromise = fetchVideoMetadata(normalizedUrl);
    audioPath = await enqueue(() =>
      withBackoff(() => downloadYoutubeAudio(normalizedUrl), {
        retries: YTDLP_RETRIES,
        base: 1000,
        max: 15000
      })
    );
    const result = await runWhisper(audioPath);
    jsonPath = result.jsonPath;
    const meta = await metadataPromise;
    const header = formatMetadata(meta);
    const body = result.text.trim();
    const output = header ? `${header}\n\n${body}` : body;
    writeCache(id, output);
    res.type('text/plain').send(output);
  } catch (e) {
    console.error('Transcription error:', e);
    res.status(500).json({ error: e.message });
  } finally {
    if (jsonPath) fs.unlink(jsonPath, () => {});
    if (audioPath) fs.unlink(audioPath, () => {});
  }
});

app.put('/transcript', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'file required' });
  }
  let jsonPath;
  try {
    const result = await runWhisper(req.file.path);
    jsonPath = result.jsonPath;
    res.type('text/plain').send(result.text.trim());
  } catch (e) {
    console.error('Transcription error:', e);
    res.status(500).json({ error: e.message });
  } finally {
    if (jsonPath) fs.unlink(jsonPath, () => {});
    fs.unlink(req.file.path, () => {});
  }
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Listening on port ${port}`));
}

