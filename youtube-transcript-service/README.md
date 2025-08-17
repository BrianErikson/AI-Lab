# YouTube Transcript Service

Small Node.js service that downloads YouTube audio and uses the open-source [Whisper](https://github.com/openai/whisper) model to generate transcripts.

## Quick start

Clone the repository on your server and run the setup script:

```bash
git clone <repo-url>
cd AI-Lab/youtube-transcript-service
./setup.sh
```

The script installs Node.js (if missing), installs or updates dependencies, recreates the `transcript` systemd service, and restarts it on port `3001`. It also ensures Python 3, `ffmpeg`, and the [Whisper CLI](https://github.com/openai/whisper) are installed so audio can be transcribed locally.

## API

Send a POST request with JSON body `{ "url": "https://youtu.be/..." }` to receive the transcript as plain text:

```bash
curl -X POST http://localhost:3001/transcript \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ"}'
```

The service downloads the video's audio stream and runs the `whisper` CLI to derive the transcript.

