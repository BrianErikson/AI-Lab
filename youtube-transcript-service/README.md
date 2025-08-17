# YouTube Transcript Service

Small Node.js service that transcribes audio using [Whisper](https://github.com/openai/whisper). It can download audio from a YouTube URL or transcribe an uploaded audio file.

## Quick start

Clone the repository on your server and run the setup script:

```bash
git clone <repo-url>
cd AI-Lab/youtube-transcript-service
./setup.sh
```

The script installs Node.js (if missing), Whisper, and other dependencies. It recreates the `transcript` systemd service and restarts it on port `3001`.

## API

Send a POST request with JSON body containing a YouTube URL to receive the transcription as plain text:

```bash
curl -X POST http://localhost:3001/transcript \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ"}'
```

To transcribe a local audio file, upload it via `PUT` using multipart form data:

```bash
curl -X PUT http://localhost:3001/transcript \
  -F file=@/path/to/audio.mp3
```

To run the optional integration test that exercises Whisper locally, set `RUN_WHISPER_TEST=1` before executing `npm test`.

