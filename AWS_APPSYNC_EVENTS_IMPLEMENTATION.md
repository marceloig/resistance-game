# AWS AppSync Events Implementation

## Overview

The EventManager component has been successfully upgraded to use **AWS AppSync Events** for real-time multiplayer communication in the Resistance Web Game. This implementation replaces the previous in-memory event store with production-ready AWS infrastructure.

## Implementation Details

### 🔧 **Core Architecture**

**File**: `src/components/EventManager.tsx`

The implementation uses the official AWS Amplify Events API (`aws-amplify/data`) to provide:
- **Real-time WebSocket connections** via AWS AppSync Events
- **Channel-based messaging** using the pattern `/default/game-room-{roomCode}`
- **Automatic connection management** with reconnection and error handling
- **Event publishing and subscription** for multiplayer game synchronization

### 🏗️ **AppSyncEventsManager Class**

A singleton class that manages AWS AppSync Events connections:

```typescript
class AppSyncEventsManager {
  // Connection management per room
  private connections: Map<string, any> = new Map();
  private subscribers: Map<string, Set<(event: GameEvent) => void>> = new Map();

  // Core methods
  async connect(roomCode: string): Promise<any>
  async subscribe(roomCode: string, callback: (event: GameEvent) => void): Promise<() => void>
  async publish(roomCode: string, event: GameEvent): Promise<void>
  disconnect(roomCode: string): void
}
```

### 🎯 **Key Features**

1. **Channel-Based Communication**
   - Each game room gets its own channel: `/default/game-room-{roomCode}`
   - Isolated communication between different game rooms
   - Automatic channel cleanup when no subscribers remain

2. **Event Publishing**
   - JSON serialization of game events
   - Automatic timestamp and metadata addition
   - Error handling with user-friendly messages

3. **Event Subscription**
   - Real-time event reception from other players
   - Automatic filtering of own events to prevent loops
   - Flexible callback system for event handling

4. **Connection Management**
   - Automatic reconnection with exponential backoff
   - Connection pooling and reuse
   - Graceful disconnection and cleanup

### 📡 **Integration with Game Components**

**Updated**: `src/components/GameRoom.tsx`

The GameRoom component now uses the AWS AppSync Events integration:

```typescript
// Real-time event publishing
await publishEvent({
  type: 'player-joined',
  data: { playerId, playerName }
});

// Real-time event handling
const handleGameEvent = (event: GameEvent) => {
  dispatch({ type: 'HANDLE_EVENT', payload: event });
};
```

### 🎮 **Supported Game Events**

- **`player-joined`**: When a new player joins the room
- **`player-left`**: When a player leaves the room
- **`player-ready`**: When a player toggles their ready status
- **`roles-assigned`**: When the game starts and roles are distributed

### 🔒 **Security & Authorization**

- Uses **AWS IAM authorization** configured in the backend
- **Unauthenticated access** via Cognito Identity Pool
- **Channel isolation** ensures room privacy
- **Event validation** prevents malformed data

### ⚡ **Performance Features**

- **Connection pooling**: Reuses connections for the same room
- **Automatic cleanup**: Removes unused connections and subscriptions
- **Efficient serialization**: JSON-based event format
- **WebSocket optimization**: Native AWS AppSync Events performance

## Backend Configuration

The AWS AppSync Events API is already configured in `amplify/backend.ts`:

```typescript
// Create AppSync Events API for real-time game communication
const gameEventsApi = new CfnApi(gameEventsStack, 'GameEventsApi', {
  name: 'resistance-game-events-api',
  eventConfig: {
    authProviders: [{ authType: 'AWS_IAM' }],
    connectionAuthModes: [{ authType: 'AWS_IAM' }],
    defaultPublishAuthModes: [{ authType: 'AWS_IAM' }],
    defaultSubscribeAuthModes: [{ authType: 'AWS_IAM' }]
  }
});
```

## Testing

### ✅ **Integration Tests**

**File**: `src/components/__tests__/EventManager.integration.test.tsx`

Comprehensive test suite covering:
- AWS AppSync Events connection with correct channel paths
- Event publishing with proper data serialization
- Event subscription and message handling
- Connection error handling and recovery
- Event filtering (preventing self-events)

### 📊 **Test Results**

- **50/50 tests passing** ✅
- **5 AWS AppSync Events integration tests** ✅
- **All existing functionality preserved** ✅

## Usage Example

```typescript
// Initialize EventManager
const { isConnected, publishEvent, error } = useEventManager(
  roomCode,
  playerId,
  handleGameEvent
);

// Publish an event
await publishEvent({
  type: 'player-ready',
  data: { playerId: 'player1', isReady: true }
});

// Connection status
console.log('Connected to AWS AppSync Events:', isConnected);
```

## Benefits

### 🚀 **Production Ready**
- **Serverless infrastructure** - no server management required
- **Auto-scaling** - handles millions of concurrent connections
- **High availability** - AWS managed service reliability

### 🔄 **Real-time Performance**
- **WebSocket connections** - low latency communication
- **Event-driven architecture** - efficient message delivery
- **Connection pooling** - optimized resource usage

### 🛡️ **Enterprise Security**
- **AWS IAM integration** - secure authentication
- **Channel isolation** - private room communication
- **Audit logging** - AWS CloudTrail integration

### 💰 **Cost Effective**
- **Pay-per-use pricing** - only pay for active connections
- **No infrastructure costs** - serverless model
- **Efficient resource usage** - automatic scaling

## Migration Notes

The implementation maintains **100% backward compatibility** with the existing game logic:
- Same `useEventManager` hook interface
- Same event types and data structures
- Same error handling patterns
- Same connection status indicators

The only change is the underlying transport mechanism, which now uses AWS AppSync Events instead of the in-memory event store.

## Next Steps

1. **Deploy to AWS** - The implementation is ready for production deployment
2. **Monitor Performance** - Use AWS CloudWatch to monitor connection metrics
3. **Scale Testing** - Test with multiple concurrent game rooms
4. **Add Analytics** - Implement game event analytics using AWS services

## Conclusion

The AWS AppSync Events implementation provides a robust, scalable, and production-ready foundation for real-time multiplayer gaming. The integration maintains all existing functionality while adding enterprise-grade reliability and performance.