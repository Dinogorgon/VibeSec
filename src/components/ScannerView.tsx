import { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import { ShieldCheck, Terminal, Loader2 } from 'lucide-react';
import { ScanResult } from '../types';
import { connectToScan, WebSocketMessage } from '../services/websocketService';

interface ScannerViewProps {
  url: string;
  scanId: string;
  token: string;
  onComplete: (result: ScanResult) => void;
}

// SCAN_STEPS are now handled via WebSocket - this is kept for reference only

export default function ScannerView({ url, scanId, token, onComplete }: ScannerViewProps) {
  const [logs, setLogs] = useState<Array<{ id: number; message: string; status: 'complete' | 'active' }>>([]);
  const [progress, setProgress] = useState(0);
  const logIdCounterRef = React.useRef(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect when logs change
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    // Add initial log message
    setLogs([{ id: 0, message: `Initializing scan for ${url}...`, status: 'active' }]);
    setProgress(0);

    let wsConnected = false;
    let wsErrorShown = false;

    // Connect to WebSocket for real-time updates
    const cleanup = connectToScan(scanId, (data: WebSocketMessage) => {
      console.log('WebSocket message received:', data);
      
      if (data.type === 'connected') {
        wsConnected = true;
        wsErrorShown = false;
        console.log('WebSocket connected for scan:', scanId);
        setLogs((prev) => {
          // Remove any WebSocket error messages
          const filtered = prev.filter(log => 
            !log.message.includes('WebSocket') && !log.message.includes('connection error')
          );
          if (filtered.length === 0 || filtered[0].message.includes('Initializing')) {
            return [{ id: 0, message: `Connected to scan server...`, status: 'complete' }];
          }
          return filtered;
        });
      } else if (data.type === 'log' && data.message) {
        // Clear any previous WebSocket errors when we get real updates
        if (wsConnected) {
          wsErrorShown = false;
        }
        
        setLogs((prev) => {
          // Mark previous active log as complete
          const updated = prev.map((log) => 
            log.status === 'active' ? { ...log, status: 'complete' as const } : log
          );
          
          // Remove WebSocket error messages if we're getting real updates
          const filtered = updated.filter(log => 
            !log.message.includes('WebSocket') && !log.message.includes('connection error')
          );
          
          // Add new log if message doesn't exist
          const exists = filtered.some(log => log.message === data.message);
          if (!exists && data.message) {
            const newLogs = [...filtered, { 
              id: logIdCounterRef.current++, 
              message: data.message, 
              status: data.status || 'active' 
            }];
            // Auto-scroll to bottom after state update
            setTimeout(() => {
              if (terminalRef.current) {
                terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
              }
            }, 0);
            return newLogs;
          }
          return filtered;
        });
      } else if (data.type === 'progress' && data.progress !== undefined) {
        setProgress(data.progress);
      } else if (data.type === 'complete' && data.result) {
        // Mark final log as complete
        setLogs((prev) => prev.map((log) => 
          log.status === 'active' ? { ...log, status: 'complete' as const } : log
        ));
        setProgress(100);
        onComplete(data.result);
      } else if (data.type === 'error' && !wsErrorShown) {
        // Only show WebSocket error once, and don't block if polling is working
        wsErrorShown = true;
        console.warn('WebSocket error (falling back to polling):', data.error);
        // Don't add error to logs - polling will handle updates
      }
    });

    // Fallback: Poll for scan status if WebSocket fails
    const pollInterval = setInterval(async () => {
      try {
        const { getScanStatus } = await import('../services/apiService');
        const status = await getScanStatus(scanId, token);
        setProgress(status.progress);
        
        // Update logs based on progress
        if (status.progress > 0 && status.progress < 100) {
          const progressMessage = `Scanning... ${status.progress}% complete`;
          setLogs((prev) => {
            const exists = prev.some(log => log.message === progressMessage);
            if (!exists && prev.length > 0) {
              const updated = prev.map(log => 
                log.status === 'active' ? { ...log, status: 'complete' as const } : log
              );
              // Remove WebSocket errors
              const filtered = updated.filter(log => 
                !log.message.includes('WebSocket') && !log.message.includes('connection error')
              );
              return [...filtered, { 
                id: logIdCounterRef.current++, 
                message: progressMessage, 
                status: 'active' 
              }];
            }
            return prev;
          });
        }
        
        if (status.status === 'completed') {
          const { getScanResults } = await import('../services/apiService');
          const result = await getScanResults(scanId, token);
          onComplete(result);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Failed to poll scan status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      cleanup();
      clearInterval(pollInterval);
    };
  }, [scanId, token, onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20 relative overflow-hidden">
      {/* Shield Icon */}
      <div className="mb-8 relative w-24 h-24 flex items-center justify-center">
        {/* Pulsing outer ring */}
        <div className="absolute inset-0 border-4 border-vibegreen-500/20 rounded-full animate-pulse"></div>
        {/* Spinning inner ring */}
        <div className="absolute inset-0 border-t-4 border-vibegreen-500 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
        {/* Center shield with checkmark */}
        <div className="relative z-10">
          <ShieldCheck className="w-10 h-10 text-vibegreen-500" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold mb-2 text-white">Scanning Target</h2>
      
      {/* URL */}
      <p className="text-gray-400 font-mono text-sm mb-8">{url}</p>

      {/* Terminal Window */}
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
        {/* Terminal Header */}
        <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
          <Terminal className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400 font-mono">vibesec-scanner — zsh</span>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="p-4 h-64 overflow-y-auto font-mono text-sm space-y-2"
        >
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-2"
            >
              <span className="text-vibegreen-500 flex-shrink-0">→</span>
              <span className={log.status === 'active' ? 'text-white animate-pulse' : 'text-gray-400'}>
                {log.message}
              </span>
              {log.status === 'active' && (
                <Loader2 className="w-3 h-3 text-vibegreen-500 animate-spin ml-2" />
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-800 w-full">
          <div
            className="h-full bg-vibegreen-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

