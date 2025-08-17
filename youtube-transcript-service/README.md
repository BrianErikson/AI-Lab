# YouTube Transcript Service

Small Node.js service that transcribes audio using [Whisper](https://github.com/openai/whisper). It can download audio from a YouTube URL or transcribe an uploaded audio file. Transcriptions include basic video metadata at the top.

## Quick start

Clone the repository on your server and run the setup script:

```bash
git clone <repo-url>
cd AI-Lab/youtube-transcript-service
./setup.sh
```

The script installs Node.js (if missing), Whisper, and other dependencies. It recreates the `transcript` systemd service under your user account and restarts it on port `3001`.
The server searches for the Whisper CLI in your `PATH` or at `~/.local/bin/whisper`; set `WHISPER_BIN` if it lives elsewhere.

## API

### `/transcript`

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

### `/jobs`

For long-running transcriptions or Shortcuts clients, create a job and poll until the transcript is ready.

1. **Create a job**

   ```bash
   curl -X POST http://localhost:3001/jobs \
     -H 'Content-Type: application/json' \
     -d '{"url":"https://youtu.be/dQw4w9WgXcQ"}'
   ```

   Returns `202 Accepted` with `{ id, status }`.

2. **Poll status**

   ```bash
   curl http://localhost:3001/jobs/<job-id>/status
   ```

   Responds with `{ id, status, error? }` until `status` becomes `done`.

3. **Fetch result**

   ```bash
   curl http://localhost:3001/jobs/<job-id>/result
   ```

   When `status` is `done`, this returns the transcript as plain text. Completed results are cached by video so repeat requests finish immediately.

To run the optional integration test that exercises Whisper locally, set `RUN_WHISPER_TEST=1` before executing `npm test`.

