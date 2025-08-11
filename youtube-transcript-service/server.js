import express from 'express';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
app.use(express.json());

app.post('/transcript', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }
  try {
    const items = await YoutubeTranscript.fetchTranscript(url);
    const text = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
    res.type('text/plain').send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));

