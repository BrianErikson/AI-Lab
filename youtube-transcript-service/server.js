import express from 'express';

export const app = express();
app.use(express.json());

export function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1);
    }
    return u.searchParams.get('v') ?? url;
  } catch {
    return url;
  }
}

export const transcriber = {
  async fromVideoId(videoId) {
    const { default: ytdl } = await import('ytdl-core');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { spawn } = await import('child_process');

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'yt-'));
    const audioPath = path.join(tmpDir, 'audio.mp4');
    await new Promise((resolve, reject) => {
      const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, { filter: 'audioonly', quality: 'lowestaudio' });
      const file = fs.createWriteStream(audioPath);
      stream.pipe(file);
      stream.on('error', reject);
      file.on('finish', resolve);
      file.on('error', reject);
    });

    await new Promise((resolve, reject) => {
      const proc = spawn('whisper', [audioPath, '--model', 'tiny', '--output_format', 'txt'], {
        stdio: ['ignore', 'inherit', 'inherit']
      });
      proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`whisper exit ${code}`)));
    });

    const text = await fs.promises.readFile(`${audioPath}.txt`, 'utf8');
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    return text.trim();
  }
};

app.post('/transcript', async (req, res) => {
  const { url } = req.body;
  console.log('Transcript request:', url);
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }
  try {
    const videoId = extractVideoId(url);
    const text = await transcriber.fromVideoId(videoId);
    console.log('Transcript derived from audio');
    res.type('text/plain').send(text);
  } catch (e) {
    console.error('Transcript fetch error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Listening on port ${port}`));
}

