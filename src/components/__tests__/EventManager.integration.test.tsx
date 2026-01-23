import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventManager } from '../EventManager';

// Mock the AWS Amplify events module
vi.mock('aws-amplify/data', () => ({
  events: {
    connect: vi.fn().mockImplementation((channelPath: string) => {
      console.log('Mock events.connect called with:', channelPath);
      return Promise.resolve({
        subscribe: vi.fn().mockImplementation(({ next, error }) => {
          console.log('Mock channel.subscribe called');
          // Simulate successful subscription
          return {
            unsubscribe: vi.fn()
          };
        }),
        publish: vi.fn().mockImplementation((data) => {
          console.log('Mock channel.publish called with:', data);
          return Promise.resolve();
        }),
        close: vi.fn().mockImplementation(() => {
          console.log('Mock channel.close called');
        })
      });
    })
  }
}));

describe('EventManager AWS AppSync Integration', () => {
  let mockOnEvent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnEvent = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should connect to AWS AppSync Events with correct channel path', async () => {
    const { events } = await import('aws-amplify/data');
    
    const { result } = renderHook(() => 
      useEventManager('TEST123', 'player1', mockOnEvent)
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Verify that events.connect was called with the correct channel path
    expect(events.connect).toHaveBeenCalledWith('/default/game-room-TEST123');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should publish events to AWS AppSync Events', async () => {
    const { events } = await import('aws-amplify/data');
    
    // Create a mock channel with publish method
    const mockPublish = vi.fn().mockResolvedValue(undefined);
    const mockChannel = {
      subscribe: vi.fn().mockImplementation(({ next }) => ({ unsubscribe: vi.fn() })),
      publish: mockPublish,
      close: vi.fn()
    };
    
    // Mock events.connect to return our mock channel
    events.connect = vi.fn().mockResolvedValue(mockChannel);
    
    const { result } = renderHook(() => 
      useEventManager('TEST123', 'player1', mockOnEvent)
    );

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isConnected).toBe(true);

    // Publish an event
    const testEvent = {
      type: 'player-joined' as const,
      data: { playerId: 'player2', playerName: 'Test Player' }
    };

    await act(async () => {
      await result.current.publishEvent(testEvent);
    });

    // Verify that channel.publish was called with the correct data structure
    expect(mockPublish).toHaveBeenCalledTimes(1);
    const publishCall = mockPublish.mock.calls[0][0];
    expect(publishCall).toHaveProperty('event');
    
    const eventData = JSON.parse(publishCall.event);
    expect(eventData).toMatchObject({
      type: 'player-joined',
      data: { playerId: 'player2', playerName: 'Test Player' },
      roomCode: 'TEST123',
      playerId: 'player1'
    });
    expect(eventData.timestamp).toBeTypeOf('number');
  });

  it('should handle connection errors gracefully', async () => {
    const { events } = await import('aws-amplify/data');
    
    // Mock connection failure
    events.connect = vi.fn().mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => 
      useEventManager('TEST123', 'player1', mockOnEvent)
    );

    // Wait for connection attempt
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toContain('Connection failed');
  });

  it('should subscribe to channel and handle incoming events', async () => {
    const { events } = await import('aws-amplify/data');
    
    let subscriptionCallback: any = null;
    
    // Mock the subscription to capture the callback
    events.connect = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        subscribe: vi.fn().mockImplementation(({ next }) => {
          subscriptionCallback = next;
          return { unsubscribe: vi.fn() };
        }),
        publish: vi.fn(),
        close: vi.fn()
      });
    });

    renderHook(() => 
      useEventManager('TEST123', 'player1', mockOnEvent)
    );

    // Wait for connection and subscription
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Simulate receiving an event from another player
    const incomingEvent = {
      type: 'player-ready',
      roomCode: 'TEST123',
      playerId: 'player2',
      timestamp: Date.now(),
      data: { playerId: 'player2', isReady: true }
    };

    await act(async () => {
      if (subscriptionCallback) {
        subscriptionCallback({ event: JSON.stringify(incomingEvent) });
      }
    });

    // Verify that the event was processed and passed to onEvent
    expect(mockOnEvent).toHaveBeenCalledWith(incomingEvent);
  });

  it('should not process events from the same player', async () => {
    const { events } = await import('aws-amplify/data');
    
    let subscriptionCallback: any = null;
    
    events.connect = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        subscribe: vi.fn().mockImplementation(({ next }) => {
          subscriptionCallback = next;
          return { unsubscribe: vi.fn() };
        }),
        publish: vi.fn(),
        close: vi.fn()
      });
    });

    renderHook(() => 
      useEventManager('TEST123', 'player1', mockOnEvent)
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Simulate receiving an event from the same player
    const ownEvent = {
      type: 'player-ready',
      roomCode: 'TEST123',
      playerId: 'player1', // Same as the current player
      timestamp: Date.now(),
      data: { playerId: 'player1', isReady: true }
    };

    await act(async () => {
      if (subscriptionCallback) {
        subscriptionCallback({ event: JSON.stringify(ownEvent) });
      }
    });

    // Verify that the event was NOT processed
    expect(mockOnEvent).not.toHaveBeenCalled();
  });
});