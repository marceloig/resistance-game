# Requirements Document

## Introduction

The Resistance Web Game is a digital adaptation of the popular board game "The Resistance" built as a web application using AWS Amplify. The game enables 5-10 players to participate in a strategic social deduction game where players are secretly assigned roles as either Resistance members or Spies, with the goal of completing or sabotaging missions.

## Glossary

- **Game_Room**: A virtual space identified by a 6-character alphanumeric code where players gather
- **Mission_Leader**: The player responsible for selecting team members for a mission
- **Resistance_Team**: Players working to complete missions successfully
- **Spy_Team**: Players working to sabotage missions
- **Mission**: A round of gameplay consisting of team building, voting, and execution phases
- **Game_Session**: A complete game from start to finish, consisting of up to 5 missions

## Requirements

### Requirement 1: Room Management System

**User Story:** As a player, I want to create or join game rooms using unique codes, so that I can participate in organized game sessions with other players.

#### Acceptance Criteria

1. WHEN the application loads, THE System SHALL generate a random 6-character alphanumeric room code
2. WHEN a player clicks "New Game", THE System SHALL create a new Game_Room using the generated code
3. WHEN a player enters a valid room code and clicks "Join Game", THE System SHALL add them to the existing Game_Room
4. WHEN a player enters an invalid room code, THE System SHALL display an error message and prevent joining
5. THE System SHALL maintain the Game_Room state until all players disconnect

### Requirement 2: Player Registration and Readiness

**User Story:** As a player, I want to set my name and indicate readiness, so that the game can start when enough players are prepared.

#### Acceptance Criteria

1. WHEN a player joins a Game_Room, THE System SHALL prompt them to enter their name
2. WHEN a player enters their name, THE System SHALL display a "Ready" button
3. WHEN a player clicks "Ready", THE System SHALL update their status and notify all players in the room
4. WHEN a player is ready, THE System SHALL allow them to toggle back to "Not Ready"
5. THE System SHALL display the ready status of all players to everyone in the room

### Requirement 3: Game Initialization

**User Story:** As a room creator, I want to start the game when sufficient players are ready, so that we can begin playing.

#### Acceptance Criteria

1. WHEN at least 5 players are marked as "Ready", THE System SHALL enable the "Start Game" button for the room creator
2. WHEN the room creator clicks "Start Game", THE System SHALL begin role assignment
3. WHEN the game starts, THE System SHALL prevent new players from joining the Game_Room
4. THE System SHALL support games with 5 to 10 players maximum

### Requirement 4: Role Assignment System

**User Story:** As the system, I want to randomly assign roles based on player count, so that the game maintains proper balance between teams.

#### Acceptance Criteria

1. WHEN a game starts with 5 players, THE System SHALL assign 3 Resistance_Team members and 2 Spy_Team members
2. WHEN a game starts with 6 players, THE System SHALL assign 4 Resistance_Team members and 2 Spy_Team members
3. WHEN a game starts with 7 players, THE System SHALL assign 4 Resistance_Team members and 3 Spy_Team members
4. WHEN a game starts with 8 players, THE System SHALL assign 5 Resistance_Team members and 3 Spy_Team members
5. WHEN a game starts with 9 players, THE System SHALL assign 6 Resistance_Team members and 3 Spy_Team members
6. WHEN a game starts with 10 players, THE System SHALL assign 6 Resistance_Team members and 4 Spy_Team members
7. THE System SHALL assign roles randomly to ensure fairness

### Requirement 5: Visual Game Interface

**User Story:** As a player, I want to see a clear visual representation of the game state, so that I can understand my role and make informed decisions.

#### Acceptance Criteria

1. WHEN the game starts, THE System SHALL display players arranged in an oval table layout
2. WHEN displaying player roles, THE System SHALL show Resistance_Team members in blue color
3. WHEN displaying player roles, THE System SHALL show Spy_Team members in red color
4. WHEN a player is a Spy_Team member, THE System SHALL reveal all player roles to them
5. WHEN a player is a Resistance_Team member, THE System SHALL only reveal their own role
6. THE System SHALL clearly indicate the current Mission_Leader

### Requirement 6: Mission Team Building

**User Story:** As a Mission_Leader, I want to select team members for missions, so that I can form teams according to the mission requirements.

#### Acceptance Criteria

1. WHEN it's team building phase, THE System SHALL highlight the current Mission_Leader
2. WHEN the Mission_Leader clicks on player names, THE System SHALL add them to the mission team
3. WHEN the Mission_Leader clicks on selected players, THE System SHALL remove them from the mission team
4. WHEN the correct number of players is selected, THE System SHALL enable the "Prepare Mission" button
5. THE System SHALL enforce mission team size requirements based on player count and mission number
6. WHEN the Mission_Leader clicks "Prepare Mission", THE System SHALL proceed to the voting phase

### Requirement 7: Team Approval Voting

**User Story:** As a player, I want to vote on proposed mission teams, so that I can influence which players participate in missions.

#### Acceptance Criteria

1. WHEN the voting phase begins, THE System SHALL present "Yes" and "No" voting buttons to all players
2. WHEN the Mission_Leader votes, THE System SHALL automatically assign them a "Yes" vote
3. WHEN all players have voted, THE System SHALL reveal the vote results
4. WHEN the majority votes "Yes", THE System SHALL proceed to mission execution
5. WHEN there is a tie or majority "No" vote, THE System SHALL pass leadership to the next player alphabetically
6. WHEN leadership changes, THE System SHALL return to team building phase

### Requirement 8: Mission Execution

**User Story:** As a mission participant, I want to choose whether to help or sabotage the mission, so that I can work toward my team's victory.

#### Acceptance Criteria

1. WHEN mission execution begins, THE System SHALL present "Success" and "Fail" buttons to mission participants
2. WHEN a Resistance_Team member is on a mission, THE System SHALL disable the "Fail" button
3. WHEN a Spy_Team member is on a mission, THE System SHALL enable both "Success" and "Fail" buttons
4. WHEN all mission participants have chosen, THE System SHALL calculate mission results
5. WHEN all choices are "Success", THE System SHALL award 1 point to the Resistance_Team
6. WHEN one or more choices are "Fail", THE System SHALL award 1 point to the Spy_Team

### Requirement 9: Game Progression and Leadership

**User Story:** As a player, I want the game to progress through multiple missions with rotating leadership, so that all players have opportunities to lead.

#### Acceptance Criteria

1. WHEN a mission completes, THE System SHALL pass Mission_Leader role to the next player alphabetically
2. WHEN a new mission begins, THE System SHALL increment the mission number
3. THE System SHALL continue missions until one team reaches 3 points
4. THE System SHALL support up to 5 missions maximum per Game_Session

### Requirement 10: Game Logging System

**User Story:** As a player, I want to see a history of game events, so that I can track the progress and make strategic decisions.

#### Acceptance Criteria

1. WHEN each mission begins, THE System SHALL log the mission number and Mission_Leader
2. WHEN team voting occurs, THE System SHALL log who voted "Yes" or "No"
3. WHEN missions are executed, THE System SHALL log the mission participants
4. THE System SHALL NOT log individual "Success" or "Fail" choices from mission execution
5. THE System SHALL display the game log to all players throughout the game

### Requirement 11: Victory Conditions and Game End

**User Story:** As a player, I want to see clear victory conditions and final results, so that I understand the game outcome.

#### Acceptance Criteria

1. WHEN either team reaches 3 points, THE System SHALL end the game immediately
2. WHEN the game ends, THE System SHALL display the winning team
3. WHEN displaying results, THE System SHALL show team-based rankings
4. WHEN displaying results, THE System SHALL show individual rankings with +1 point for winning team members
5. THE System SHALL provide a "Play Again" button to return to the lobby

### Requirement 12: Session Management

**User Story:** As a player, I want to start new games after completion, so that I can continue playing with the same group.

#### Acceptance Criteria

1. WHEN a player clicks "Play Again", THE System SHALL return all players to the Game_Room lobby
2. WHEN returning to lobby, THE System SHALL reset all game state while maintaining player connections
3. WHEN in the lobby after a completed game, THE System SHALL allow players to ready up for a new game
4. THE System SHALL maintain the same room code for continued play