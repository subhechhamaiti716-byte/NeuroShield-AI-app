import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../utils/api';
import { router } from 'expo-router';

interface WebSocketContextType {
  socket: WebSocket | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (user && token) {
      const wsUrl = API_URL.replace('http', 'ws') + `/ws/${user.id}`;
      console.log('Connecting to WS:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WS Message received:', data);
          
          if (data.type === 'FRAUD_ALERT') {
            // Navigate to the alert screen with transaction details
            router.push({
              pathname: '/alert',
              params: {
                tx_id: data.tx_id,
                amount: data.amount,
                merchant: data.merchant,
                score: data.score,
                message: data.message
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WS Error:', e);
      };

      ws.onclose = () => {
        console.log('WS Connection closed');
      };

      return () => {
        ws.close();
      };
    }
  }, [user, token]);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
