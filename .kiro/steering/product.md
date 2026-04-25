# Product Overview

The Resistance is a real-time online social deduction game. It provides the foundational wiring between a React frontend and AWS AppSync Events for WebSocket-based pub/sub communication, with DynamoDB for room state persistence.

Primary language for UI text and code comments is Brazilian Portuguese (pt-BR).

## The Resistance Game Rules

Source: [en.wikipedia.org/wiki/The_Resistance_(game)](https://en.wikipedia.org/wiki/The_Resistance_(game))

Content was rephrased for compliance with licensing restrictions.

### Objective

The Resistance is a hidden-role social deduction game. Players are split into two teams:

- **Resistance (good):** Must successfully complete 3 out of 5 missions.
- **Spies (evil):** Must cause 3 missions to fail by infiltrating teams and sabotaging from within.

If the Resistance wins 3 missions, the Spies get one last chance: the Assassin may attempt to identify and eliminate the Commander. If correct, the Spies win instead.

### Gameplay Flow

1. **Team Proposal:** The current Mission Leader proposes a team for the mission. Team size depends on the mission number and total player count (see table below).
2. **Team Vote:** All players vote approve or reject. A simple majority is needed to accept. On rejection, leadership passes to the next player. After 4 consecutive rejections, the 5th Leader's proposal is automatically accepted (no vote).
3. **Mission Phase:** Approved team members secretly submit Success or Fail cards. All cards must be Success for the mission to pass. One or more Fail cards causes the mission to fail (some missions require 2 Fail cards — see table). Resistance members must always play Success. Spies may choose either.
4. **Progression:** After the mission outcome, leadership moves to the next player and a new round begins.
5. **Conclusion:** The game ends when either side reaches 3 mission wins. If the Resistance wins 3, the Assassin phase triggers as a final chance for the Spies.

### Mission Team Sizes

| Players | Mission 1 | Mission 2 | Mission 3 | Mission 4 | Mission 5 |
|---------|-----------|-----------|-----------|-----------|-----------|
| 5       | 2         | 3         | 2         | 3         | 3         |
| 6       | 2         | 3         | 4         | 3         | 4         |
| 7       | 2         | 3         | 3         | 4*        | 4         |
| 8       | 3         | 4         | 4         | 5*        | 5         |
| 9       | 3         | 4         | 4         | 5*        | 5         |
| 10      | 3         | 4         | 4         | 5*        | 5         |

Missions marked with `*` require **2 Fail cards** to fail.

### Resistance/Spy Distribution

| Players | Resistance | Spies |
|---------|-----------|-------|
| 5       | 3         | 2     |
| 6       | 4         | 2     |
| 7       | 4         | 3     |
| 8       | 5         | 3     |
| 9       | 6         | 3     |
| 10      | 6         | 4     |

### Special Roles

| Role | Side | Ability |
|------|------|---------|
| Commander | Resistance | Knows all Spies. Must stay hidden to avoid assassination. |
| Bodyguard | Resistance | Sees Commander and False Commander but cannot tell which is which. |
| Resistance Operative | Resistance | No special information. |
| Assassin | Spies | After 3 Resistance mission wins, may attempt to identify the Commander to steal the victory. |
| False Commander | Spies | Appears as Commander to the Bodyguard. |
| Spy | Spies | Knows the other Spies. No special deception ability. |

### Recommended Role Introduction Order

For new players, start with basic roles (Resistance Operatives and Spies). Then add in order:

Commander → Bodyguard → False Commander → Assassin

Optimal group size is 7–10 players for the best experience.
