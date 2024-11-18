import { serve } from "bun";
import type { ServerWebSocket } from "bun";

// Track client subscriptions with their filters
const clients = new Map<ServerWebSocket<unknown>, Set<string>>();
let upstreamSocket: WebSocket | null = null;

const server = serve({
  port: 3000,
  fetch(req, server) {
    if (!server.upgrade(req)) {
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
  },
  websocket: {
    perMessageDeflate: true,
    maxPayloadLength: 100 * 1024,
    open(ws) {
      // Initialize client with empty filter set
      clients.set(ws, new Set());
      console.log('Client connected');
      broadcastClientCount();

      // Connect to upstream if this is the first client
      if (!upstreamSocket) {
        connectToUpstream();
      }
    },

    message(ws, message) {
      try {
        const data = JSON.parse(message as string);
        // Handle filter messages
        if (data.type === 'filter' && data.emoji) {
          const clientFilters = clients.get(ws);
          if (clientFilters) {
            if (data.emoji === 'clear') {
              clientFilters.clear();
            } else {
              clientFilters.add(data.emoji);
            }
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    },

    close(ws) {
      clients.delete(ws);
      console.log('Client disconnected');
      broadcastClientCount();

      // Close upstream if no more clients
      if (clients.size === 0 && upstreamSocket) {
        console.log('No more clients, closing upstream connection');
        upstreamSocket.close();
        upstreamSocket = null;
      }
    }
  }
});

// Helper function to broadcast client count
function broadcastClientCount() {
  const message = JSON.stringify({
    type: 'clientCount',
    count: clients.size
  });

  for (const client of clients.keys()) {
    try {
      client.send(message);
    } catch (err) {
      console.error('Failed to send client count:', err);
    }
  }
}

// Function to handle upstream connection
async function connectToUpstream() {
  console.log('Connecting to Bluesky firehose...');
  const ws = new WebSocket('wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post');

  ws.addEventListener('open', () => {
    upstreamSocket = ws;
    console.log('Upstream connection established');
  });

  ws.addEventListener('message', async (event) => {
    if (ws !== upstreamSocket) return;

    try {
      const data = JSON.parse(event.data as string);

      if (data.kind === 'commit' && data.commit.operation === 'create') {
        // Only process if there are actually clients connected
        if (clients.size === 0) return;

        const postText = data.commit.record.text?.toLowerCase() || '';
        const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
        const emojis = [...new Set(postText.match(emojiRegex) || [])];

        // Only proceed if we found emojis
        if (emojis.length === 0) return;

        // Prepare message once instead of per client
        const emojiMessage = JSON.stringify({ type: 'emojis', emojis });

        const failures = [];
        for (const [client, filters] of clients) {
          try {
            // Send emoji-only message
            client.send(emojiMessage);

            // Only prepare full post message if client has filters
            if (filters.size > 0 && emojis.some((emoji) => filters.has(emoji as string))) {
              const postMessage = JSON.stringify({
                type: 'post',
                text: data.commit.record.text,
                url: `https://bsky.app/profile/${data.did}/post/${data.commit.rkey}`,
                timestamp: Date.now(),
                emojis
              });
              client.send(postMessage);
            }
          } catch (err) {
            console.error('Failed to send to client:', err);
            failures.push(client);
          }
        }
        // Clean up failed connections
        for (const failed of failures) {
          clients.delete(failed);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.addEventListener('close', () => {
    if (ws === upstreamSocket) {
      console.log('Upstream connection closed');
      upstreamSocket = null;

      // Attempt reconnection if we still have clients
      if (clients.size > 0) {
        console.log('Scheduling reconnection attempt in 5 seconds...');
        setTimeout(connectToUpstream, 5000);
      }
    }
  });
}

console.log(`WebSocket server listening on port ${server.port}`);