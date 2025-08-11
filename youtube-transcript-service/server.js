import express from 'express';
import { YoutubeTranscript } from 'youtube-transcript';

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

app.post('/transcript', async (req, res) => {
  const { url } = req.body;
  console.log('Transcript request:', url);
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }
  try {
    const videoId = extractVideoId(url);
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    const text = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
    console.log(`Transcript fetched (${items.length} segments)`);
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

