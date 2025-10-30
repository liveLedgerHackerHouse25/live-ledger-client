"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api, WebSocketMessage, StreamCalculation } from "@/lib/api";

export interface UseWebSocketOptions {
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  connectionAttempts: number;
  error: string | null;
}

export interface NotificationData {
  type: string;
  streamId: string;
  message: string;
  timestamp: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    enabled = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    lastMessage: null,
    connectionAttempts: 0,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamCallbacksRef = useRef<Map<string, (calculation: StreamCalculation) => void>>(new Map());
  const notificationCallbacksRef = useRef<Array<(data: NotificationData) => void>>([]);
  const connectRef = useRef<(() => void) | null>(null);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Intentional disconnect");
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionAttempts: 0
    }));
  }, []);

  const connect = useCallback(() => {
    if (!enabled || state.isConnecting || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const ws = api.createWebSocketConnection();
      if (!ws) {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: "Failed to create WebSocket connection"
        }));
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          connectionAttempts: 0,
          error: null
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          setState(prev => ({ ...prev, lastMessage: message }));

          // Handle different message types
          if (message.type === "STREAM_UPDATE") {
            const calculation = message.data as StreamCalculation;
            const callback = streamCallbacksRef.current.get(calculation.streamId);
            if (callback) {
              callback(calculation);
            }
          } else if (message.type === "NOTIFICATION") {
            notificationCallbacksRef.current.forEach(callback => callback(message.data as NotificationData));
          }

        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));

        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && enabled && state.connectionAttempts < maxReconnectAttempts) {
          setState(prev => ({ ...prev, connectionAttempts: prev.connectionAttempts + 1 }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (connectRef.current) {
              connectRef.current();
            }
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setState(prev => ({
          ...prev,
          error: "WebSocket connection error",
          isConnecting: false
        }));
      };

    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: "Failed to create WebSocket connection"
      }));
    }
  }, [enabled, state.isConnecting, state.connectionAttempts, maxReconnectAttempts, reconnectInterval]);

  // Store connect function reference for use in callbacks
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Subscribe to stream updates for a specific stream
  const subscribeToStream = useCallback((streamId: string, callback: (calculation: StreamCalculation) => void) => {
    streamCallbacksRef.current.set(streamId, callback);
    
    return () => {
      streamCallbacksRef.current.delete(streamId);
    };
  }, []);

  // Subscribe to general notifications
  const subscribeToNotifications = useCallback((callback: (data: NotificationData) => void) => {
    notificationCallbacksRef.current.push(callback);
    
    return () => {
      const index = notificationCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        notificationCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (enabled) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        connect();
      }, 0);
      
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    subscribeToStream,
    subscribeToNotifications,
    sendMessage
  };
}