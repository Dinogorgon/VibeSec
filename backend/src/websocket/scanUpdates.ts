import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

const wsClients = new Map<string, WebSocket>();

export function getWsClients(): Map<string, WebSocket> {
  return wsClients;
}

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws/scan' });

  wss.on('connection', (ws: WebSocket, req) => {
    // Extract scan ID from URL: /ws/scan/:scanId
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const scanId = url.searchParams.get('scanId');

    if (!scanId) {
      ws.close(1008, 'Missing scanId parameter');
      return;
    }

    console.log(`WebSocket client connected for scan: ${scanId}`);
    wsClients.set(scanId, ws);

    ws.on('close', () => {
      console.log(`WebSocket client disconnected for scan: ${scanId}`);
      wsClients.delete(scanId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for scan ${scanId}:`, error);
      wsClients.delete(scanId);
    });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      scanId,
    }));
  });
}

