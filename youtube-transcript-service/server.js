import express from 'express';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import ytdl from 'ytdl-core';

export const app = express();
app.use(express.json());

function isLocalFile(p) {
  return fs.existsSync(p);
}

async function downloadYoutubeAudio(url) {
  const output = path.join(tmpdir(), `${randomUUID()}.mp3`);
  const stream = ytdl(url, { filter: 'audioonly' });
  const file = fs.createWriteStream(output);
  stream.pipe(file);
  await new Promise((resolve, reject) => {
    file.on('finish', resolve);
    stream.on('error', reject);
    file.on('error', reject);
  });
  return output;
}

async function runWhisper(audioPath) {
  const dir = path.dirname(audioPath);
  const base = path.basename(audioPath, path.extname(audioPath));
  const jsonPath = path.join(dir, `${base}.json`);
  await new Promise((resolve, reject) => {
    const proc = spawn('whisper', [
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
  console.log('Transcript request:', url);
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }
  let audioPath;
  let jsonPath;
  try {
    audioPath = isLocalFile(url) ? url : await downloadYoutubeAudio(url);
    const result = await runWhisper(audioPath);
    jsonPath = result.jsonPath;
    res.type('text/plain').send(result.text.trim());
  } catch (e) {
    console.error('Transcription error:', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    if (jsonPath) fs.unlink(jsonPath, () => {});
    if (audioPath && !isLocalFile(url)) fs.unlink(audioPath, () => {});
  }
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Listening on port ${port}`));
}
