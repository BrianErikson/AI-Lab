# AI-Lab

Monorepo for tools built by AI for AI users.

## Projects

- [youtube-transcript-service](./youtube-transcript-service) – Node.js service that returns the transcript of a YouTube video.

## Setup

Clone the repository and run the setup script for the transcript service:

```bash
git clone <repo-url>
cd AI-Lab/youtube-transcript-service
./setup.sh
```

The script auto-detects common Linux distributions (Debian/Ubuntu, Fedora, RHEL/CentOS, and Arch) to install dependencies and configure a systemd service.
See the [project README](./youtube-transcript-service/README.md) for API details and additional options.
