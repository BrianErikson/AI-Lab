# YouTube Transcript Service

Small Node.js service that returns the transcript of a YouTube video.

## Quick start

Clone the repository on your server and run the setup script:

```bash
git clone <repo-url>
cd AI-Lab/youtube-transcript-service
./setup.sh
```

The script installs Node.js (if missing), installs or updates dependencies, recreates the `transcript` systemd service, and restarts it on port `3001`.

## API

Send a POST request with JSON body `{ "url": "https://youtu.be/..." }` to receive the transcript as plain text:

```bash
curl -X POST http://localhost:3001/transcript \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ"}'
```

The service will respond with the concatenated transcript if available.

