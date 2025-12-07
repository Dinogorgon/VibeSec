const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Convert HTTP to WS and HTTPS to WSS for WebSocket connections
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws').replace(/^https/, 'wss');

export interface WebSocketMessage {
  type: 'connected' | 'log' | 'progress' | 'complete' | 'error';
  scanId?: string;
  message?: string;
  status?: 'active' | 'complete';
  progress?: number;
  result?: any;
  error?: string;
}

export const connectToScan = (
  scanId: string,
  onUpdate: (data: WebSocketMessage) => void
): (() => void) => {
  const wsUrl = `${WS_BASE_URL}/ws/scan?scanId=${scanId}`;
  console.log('Connecting to WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log(`WebSocket connected for scan: ${scanId}`);
    onUpdate({
      type: 'connected',
      scanId,
    });
  };

  ws.onmessage = (event) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      onUpdate(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, event.data);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onUpdate({
      type: 'error',
      error: 'WebSocket connection error',
    });
  };

  ws.onclose = (event) => {
    console.log(`WebSocket disconnected for scan: ${scanId}`, event.code, event.reason);
    // Don't send error on normal close
    if (event.code !== 1000) {
      onUpdate({
        type: 'error',
        error: `WebSocket closed unexpectedly: ${event.code} ${event.reason || ''}`,
      });
    }
  };

  // Return cleanup function
  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'Component unmounting');
    }
  };
};

