# Skymood Relay

A real-time Bluesky [emoji tracker](https://skymood.skorfmann.com/) built with Bun. This service connects to Bluesky's firehose and monitors posts for emoji usage, allowing clients to subscribe to specific emoji patterns and receive notifications in real-time. [Read more about it](https://dev.to/skorfmann/skymood-watch-blueskys-heartbeat-through-emojis-in-real-time-4knm) and reach out on Bluesky [@skorfmann](https://bsky.app/profile/skorfmann.com).

## Goal

Skymood Relay aims to reduce client-side network traffic by an order of magnitude compared to connecting directly to Bluesky's [Jetstream](https://github.com/bluesky-social/jetstream). While Jetstream provides a full firehose of Bluesky activities, Skymood Relay focuses specifically on emoji usage patterns, allowing clients to receive only the emoji-related data they're interested in. This targeted approach significantly reduces bandwidth requirements while still enabling real-time emoji tracking and analysis.

This can be easily adapted to similar scenarios where you need to filter and relay specific patterns from a larger data stream.

## Features

- 🔄 Real-time monitoring of Bluesky posts
- 🎯 Emoji filtering capabilities
- 🔌 WebSocket-based communication
- 🚀 Built with Bun for high performance
- 📊 Live client connection tracking

## Prerequisites

- [Bun](https://bun.sh) v1.1.34 or higher

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/skymood-bun.git
cd skymood-bun
```

2. Install dependencies:

```bash
bun install
```

## Running Locally

Start the server:

```bash
bun run index.ts
```

The WebSocket server will be available at `ws://localhost:3000`.

## Docker Support

Build and run using Docker:

```bash
docker build -t skymood .
docker run -p 3000:3000 skymood
```

## Deployment

This project includes configuration for deployment on [Fly.io](https://fly.io). Deploy using:

```bash
fly launch
```

## WebSocket API

### Client Messages

Send filter messages in the following format:

```json
{
  "type": "filter",
  "emoji": "🚀"  // The emoji to filter for
}
```

To clear filters:

```json
{
  "type": "filter",
  "emoji": "clear"
}
```

### Server Messages

The server sends three types of messages:

1. Emoji Updates:

```json
{
  "type": "emojis",
  "emojis": ["🚀", "💫"]
}
```

2. Filtered Posts:

```json
{
  "type": "post",
  "text": "Post content",
  "url": "https://bsky.app/...",
  "timestamp": 1234567890,
  "emojis": ["🚀"]
}
```

3. Client Count Updates:

```json
{
  "type": "clientCount",
  "count": 5
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
