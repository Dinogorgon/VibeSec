import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { setupWebSocketServer } from './websocket/scanUpdates.js';
import { startScanWorker } from './services/scanQueue.js';

// Global error handlers for unhandled promise rejections and exceptions
process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
  const errorCode = reason?.code;
  const errorMessage = reason?.message || String(reason);
  
  // Suppress ECONNRESET errors - these are recoverable connection issues
  if (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED' || 
      errorMessage.includes('ECONNRESET') || errorMessage.includes('ECONNREFUSED')) {
    // These are handled by connection pools, just log as warning in development
    if (config.nodeEnv === 'development') {
      console.warn('Unhandled connection error (recoverable):', errorCode || errorMessage);
    }
    return;
  }
  
  // Log other unhandled rejections
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  const errorCode = (error as any).code;
  const errorMessage = error.message;
  
  // Suppress ECONNRESET errors
  if (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED' ||
      errorMessage.includes('ECONNRESET') || errorMessage.includes('ECONNREFUSED')) {
    if (config.nodeEnv === 'development') {
      console.warn('Uncaught connection error (recoverable):', errorCode || errorMessage);
    }
    return;
  }
  
  // Log other uncaught exceptions
  console.error('Uncaught Exception:', error);
  // Don't exit - let the app continue running
});

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Setup WebSocket server
setupWebSocketServer(server);

// Start scan worker
startScanWorker();

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

