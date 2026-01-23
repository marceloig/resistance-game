import { useEffect, useRef, useCallback, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { events } from 'aws-amplify/data';
import { GameEvent } from '../types/game';
import outputs from '../../amplify_outputs.json';

// Configure Amplify with outputs
Amplify.configure(outputs);

// AWS AppSync Events WebSocket connection manager
class AppSyncEventsManager {
  private static instance: AppSyncEventsManager;
  private connections: Map<string, any> = new Map(); // channel -> connection
  private subscribers: Map<string, Set<(event: GameEvent) => void>> = new Map();

  static getInstance(): AppSyncEventsManager {
    if (!AppSyncEventsManager.instance) {
      AppSyncEventsManager.instance = new AppSyncEventsManager();
    }
    return AppSyncEventsManager.instance;
  }

  async connect(roomCode: string): Promise<any> {
    const channelPath = `/default/game-room-${roomCode}`;
    
    if (this.connections.has(channelPath)) {
      return this.connections.get(channelPath);
    }

    try {
      console.log('AppSyncEventsManager: Connecting to channel:', channelPath);
      const channel = await events.connect(channelPath);
      this.connections.set(channelPath, channel);
      
      console.log('AppSyncEventsManager: Successfully connected to channel');
      return channel;
    } catch (error) {
      console.error('AppSyncEventsManager: Failed to connect:', error);
      throw error;
    }
  }

  async subscribe(roomCode: string, callback: (event: GameEvent) => void): Promise<() => void> {
    const channelPath = `/default/game-room-${roomCode}`;
    
    // Add callback to subscribers
    if (!this.subscribers.has(channelPath)) {
      this.subscribers.set(channelPath, new Set());
    }
    this.subscribers.get(channelPath)!.add(callback);

    try {
      const channel = await this.connect(roomCode);
      
      // Subscribe to the channel
      const subscription = channel.subscribe({
        next: (data: any) => {
          console.log('AppSyncEventsManager: Received event:', data);
          try {
            // Parse the event data
            let gameEvent: GameEvent;
            if (typeof data === 'string') {
              gameEvent = JSON.parse(data);
            } else if (data.event) {
              gameEvent = typeof data.event === 'string' ? JSON.parse(data.event) : data.event;
            } else {
              gameEvent = data;
            }

            // Notify all subscribers for this channel
            const channelSubscribers = this.subscribers.get(channelPath);
            if (channelSubscribers) {
              channelSubscribers.forEach(cb => cb(gameEvent));
            }
          } catch (error) {
            console.error('AppSyncEventsManager: Failed to parse event:', error);
          }
        },
        error: (error: any) => {
          console.error('AppSyncEventsManager: Subscription error:', error);
        }
      });

      // Return unsubscribe function
      return () => {
        console.log('AppSyncEventsManager: Unsubscribing from channel');
        const channelSubscribers = this.subscribers.get(channelPath);
        if (channelSubscribers) {
          channelSubscribers.delete(callback);
          if (channelSubscribers.size === 0) {
            this.subscribers.delete(channelPath);
            // Close connection if no more subscribers
            const connection = this.connections.get(channelPath);
            if (connection) {
              connection.close();
              this.connections.delete(channelPath);
            }
          }
        }
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      };
    } catch (error) {
      console.error('AppSyncEventsManager: Failed to subscribe:', error);
      throw error;
    }
  }

  async publish(roomCode: string, event: GameEvent): Promise<void> {
    try {
      const channel = await this.connect(roomCode);
      
      // Publish the event
      await channel.publish({
        event: JSON.stringify(event)
      });
      
      console.log('AppSyncEventsManager: Published event:', event.type);
    } catch (error) {
      console.error('AppSyncEventsManager: Failed to publish event:', error);
      throw error;
    }
  }

  disconnect(roomCode: string): void {
    const channelPath = `/default/game-room-${roomCode}`;
    const connection = this.connections.get(channelPath);
    
    if (connection) {
      console.log('AppSyncEventsManager: Disconnecting from channel:', channelPath);
      connection.close();
      this.connections.delete(channelPath);
      this.subscribers.delete(channelPath);
    }
  }
}

// Hook for using EventManager in components
export function useEventManager(
  roomCode: string,
  playerId: string,
  onEvent: (event: GameEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const eventsManager = AppSyncEventsManager.getInstance();
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  // Connect to the event system
  const connect = useCallback(async () => {
    try {
      console.log('EventManager: Attempting to connect to AWS AppSync Events...');
      
      // Subscribe to events for this room
      const unsubscribe = await eventsManager.subscribe(roomCode, (event) => {
        // Don't process events from the same player to avoid loops
        if (event.playerId !== playerId) {
          onEvent(event);
        }
      });
      
      unsubscribeRef.current = unsubscribe;
      setIsConnected(true);
      setReconnectAttempts(0);
      setError(null);
      
      console.log('EventManager: Successfully connected to AWS AppSync Events');
    } catch (error) {
      console.error('EventManager: Connection failed:', error);
      setIsConnected(false);
      setError(error instanceof Error ? error.message : 'Connection failed');
      
      // Attempt reconnection with exponential backoff
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
        console.log(`EventManager: Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, delay);
      } else {
        setError('Maximum reconnection attempts reached. Please refresh the page.');
      }
    }
  }, [roomCode, playerId, onEvent, reconnectAttempts, eventsManager]);

  // Publish an event
  const publishEvent = useCallback(async (event: Omit<GameEvent, 'roomCode' | 'playerId' | 'timestamp'>) => {
    if (!isConnected) {
      throw new Error('Not connected to event system');
    }

    const fullEvent: GameEvent = {
      ...event,
      roomCode,
      playerId,
      timestamp: Date.now()
    };

    try {
      await eventsManager.publish(roomCode, fullEvent);
      console.log('EventManager: Published event to AWS AppSync Events:', fullEvent.type);
    } catch (error) {
      console.error('EventManager: Failed to publish event:', error);
      setError('Failed to send event');
      throw error;
    }
  }, [roomCode, playerId, isConnected, eventsManager]);

  // Disconnect from the event system
  const disconnect = useCallback(() => {
    console.log('EventManager: Disconnecting from AWS AppSync Events...');
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Unsubscribe from events
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Disconnect from AppSync Events
    eventsManager.disconnect(roomCode);
    
    setIsConnected(false);
    setReconnectAttempts(0);
    setError(null);
  }, [roomCode, eventsManager]);

  // Connect on mount and when roomCode/playerId changes
  useEffect(() => {
    if (roomCode && playerId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [roomCode, playerId, connect, disconnect]);

  return {
    isConnected,
    error,
    publishEvent,
    reconnectAttempts
  };
}

// Legacy EventManager function for backward compatibility
export function EventManager(props: {
  roomCode: string;
  playerId: string;
  onEvent: (event: GameEvent) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: string) => void;
}) {
  // This is just a wrapper that uses the hook
  const result = useEventManager(props.roomCode, props.playerId, props.onEvent);
  
  // Update connection and error callbacks
  useEffect(() => {
    props.onConnectionChange(result.isConnected);
  }, [result.isConnected, props]);

  useEffect(() => {
    if (result.error) {
      props.onError(result.error);
    }
  }, [result.error, props]);

  return {
    isConnected: result.isConnected,
    publishEvent: result.publishEvent,
    disconnect: () => {}, // Handled by the hook
    reconnectAttempts: result.reconnectAttempts
  };
}