# Product Overview

Amplify Game Base is a starter template for building real-time online games. It provides the foundational wiring between a React frontend and AWS AppSync Events for WebSocket-based pub/sub communication.

The project is in early stage — it currently displays a connection status dashboard and exposes a `useEventsConnection` hook for subscribing to channels and publishing events. Game logic is intended to be built on top of this base.

Primary language for UI text and code comments is Brazilian Portuguese (pt-BR).

## Avalon Game Rules

Source: [avalon-game.com/wiki/rules/](https://avalon-game.com/wiki/rules/)

Content was rephrased for compliance with licensing restrictions.

### Objective

Avalon is a hidden-role game set in the world of King Arthur. Players are split into two teams:

- **Loyal Servants of Arthur (good):** Must successfully complete 3 out of 5 missions.
- **Minions of Mordred (evil):** Must cause 3 missions to fail by infiltrating teams and sabotaging from within.

If the good side wins 3 missions, the evil team gets one last chance: the Assassin may attempt to identify and kill Merlin. If correct, evil wins instead.

### Gameplay Flow

1. **Team Proposal:** The current Leader proposes a team for the mission. Team size depends on the mission number and total player count (see table below).
2. **Team Vote:** All players vote approve or reject. A simple majority is needed to accept. On rejection, leadership passes to the next player. After 4 consecutive rejections, the 5th Leader's proposal is automatically accepted (no vote).
3. **Mission Phase:** Approved team members secretly submit Success or Fail cards. All cards must be Success for the mission to pass. One or more Fail cards causes the mission to fail (some missions require 2 Fail cards — see table).
4. **Progression:** After the mission outcome, leadership moves clockwise and a new round begins.
5. **Conclusion:** The game ends when either side reaches 3 mission wins. If good wins 3, the Assassin phase triggers as a final chance for evil.

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

### Special Roles

| Role | Side | Ability |
|------|------|---------|
| Merlin | Good | Knows all evil players (except Mordred). Must stay hidden to avoid assassination. |
| Percival | Good | Sees Merlin and Morgana but cannot tell which is which. |
| Loyal Servant | Good | No special information. |
| Assassin | Evil | After 3 good mission wins, may attempt to identify Merlin to steal the victory. |
| Morgana | Evil | Appears as Merlin to Percival. |
| Minion | Evil | Knows the other evil players. No special deception ability. |

### Recommended Role Introduction Order

For new players, start with basic roles (Loyal Servants and Minions). Then add in order:

Merlin → Percival → Morgana → Oberon → Mordred → Lady of the Lake → Tristan + Isolde

Optimal group size is 7–10 players for the best experience.
