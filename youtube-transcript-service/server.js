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

export function extractVideoID(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1);
    }
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v');
      }
    }
  } catch {}
  throw new Error('invalid YouTube url');
}

export function normalizeYoutubeUrl(url) {
  const id = extractVideoID(url);
  return `https://www.youtube.com/watch?v=${id}`;
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
    quiet: true
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
  let normalizedUrl;
  try {
    normalizedUrl = normalizeYoutubeUrl(videoUrl);
  } catch {
    return res.status(400).json({ error: 'invalid YouTube url' });
  }
  console.log('Normalized YouTube URL:', normalizedUrl);
  let audioPath;
  let jsonPath;
  try {
    audioPath = await downloadYoutubeAudio(normalizedUrl);
    const result = await runWhisper(audioPath);
    jsonPath = result.jsonPath;
    res.type('text/plain').send(result.text.trim());
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

