import express from 'express';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
app.use(express.json());

app.post('/transcript', async (req, res) => {
  const { url } = req.body;
  console.log('Transcript request:', url);
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }
  try {
    const items = await YoutubeTranscript.fetchTranscript(url);
    const text = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
    console.log(`Transcript fetched (${items.length} segments)`);
    res.type('text/plain').send(text);
  } catch (e) {
    console.error('Transcript fetch error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Listening on port ${port}`));

