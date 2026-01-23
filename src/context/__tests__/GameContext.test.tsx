import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { GameProvider, useGame } from '../GameContext';
import { Player } from '../../types/game';

// Test component to access the context
function TestComponent() {
  const { state, dispatch } = useGame();
  
  return (
    <div>
      <div data-testid="room-code">{state.roomCode}</div>
      <div data-testid="phase">{state.phase}</div>
      <div data-testid="player-count">{state.players.length}</div>
      <button 
        data-testid="set-room-code" 
        onClick={() => dispatch({ type: 'SET_ROOM_CODE', payload: 'TEST123' })}
      >
        Set Room Code
      </button>
      <button 
        data-testid="add-player" 
        onClick={() => {
          const player: Player = {
            id: '1',
            name: 'Test Player',
            role: 'resistance',
            isReady: false,
            isConnected: true,
            isLeader: false,
          };
          dispatch({ type: 'ADD_PLAYER', payload: player });
        }}
      >
        Add Player
      </button>
    </div>
  );
}

describe('GameContext', () => {
  it('should provide initial game state', () => {
    const { getByTestId } = render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    expect(getByTestId('room-code')).toHaveTextContent('');
    expect(getByTestId('phase')).toHaveTextContent('lobby');
    expect(getByTestId('player-count')).toHaveTextContent('0');
  });

  it('should update room code when dispatched', () => {
    const { getByTestId } = render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    act(() => {
      getByTestId('set-room-code').click();
    });

    expect(getByTestId('room-code')).toHaveTextContent('TEST123');
  });

  it('should add player when dispatched', () => {
    const { getByTestId } = render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    act(() => {
      getByTestId('add-player').click();
    });

    expect(getByTestId('player-count')).toHaveTextContent('1');
  });

  it('should throw error when useGame is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useGame must be used within a GameProvider');

    console.error = originalError;
  });
});