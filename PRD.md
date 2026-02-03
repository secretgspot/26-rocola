# Product Requirements Document (PRD)

## 1. Executive Summary

- **Problem Statement**: The current queue ranking system allows high-tier songs (Platinum, Gold) to monopolize playback by playing consecutively until their daily limit is exhausted. This reduces variety and creates a repetitive experience for other users.
- **Proposed Solution**: Implement a "Fair Queue / Gap Enforcement" algorithm that mandates a minimum number of other songs must play between repeats of the same high-tier song. This "spreads out" the premium plays over time.
- **Success Criteria**:
  - A Platinum song does not play more than once every 2 songs.
  - A Gold song does not play more than once every 3 songs.
  - A Silver song does not play more than once every 5 songs.
  - Users perceive the queue as dynamic and varied.

## 2. User Experience & Functionality

### User Personas
- **The Whale (Platinum/Gold User)**: Wants their song heard often, but understands that spamming it 10 times in a row annoys listeners and leads to skipping/muting.
- **The Free User**: Wants their single submission to eventually play and not be permanently pushed down by a wall of premium songs.
- **The Listener**: Wants a good mix of music without repetitive loops.

### User Stories
- **Story**: As a listener, I want premium songs to be spaced out so I don't hear the same track back-to-back.
- **Story**: As a premium user, I want my song to have high priority, but interleaved with others to maintain audience engagement.
- **AC**:
  - Platinum songs have a minimum gap of 1 slot (Play, Other, Play).
  - Gold songs have a minimum gap of 2 slots (Play, Other, Other, Play).
  - Silver songs have a minimum gap of 4 slots.

### Non-Goals
- We are NOT implementing complex "playlist shuffling" or randomizing the entire queue. The system remains deterministic based on Tier and Time.

## 3. Technical Specifications

### Architecture Overview
The solution relies on a "Global Turn Counter" and a "Last Played Turn" tracker for each queue item.

1.  **Global Turn Counter**: Represents the total number of songs played by the system. Derived from `SELECT COUNT(*) FROM queue_plays`.
2.  **Last Played Turn**: Stored on the `queue` item (new column). Updated whenever a song finishes playing.
3.  **Effective Rank Calculation**:
    -   `Gap` is defined by Tier (Platinum=2, Gold=3, Silver=5).
    -   `NextEligibleTurn` = `lastPlayedTurn` + `Gap`.
    -   If `GlobalTurn` < `NextEligibleTurn`, the song is in "Cooldown".
    -   **Sorting Priority**:
        1.  `EffectiveTurn` (Ascending). Where `EffectiveTurn` = `max(GlobalTurn, NextEligibleTurn)`.
        2.  Tier Priority (Platinum > Gold > Silver > Free).
        3.  Base Rank (Time Submitted).

### Integration Points
- **Database Schema**:
  - Modify `queue` table: Add `lastPlayedTurn` (integer, default 0).
- **Service Logic (`queue.js`)**:
  - `getQueue()`: Update sorting logic to calculate `GlobalTurn` and `NextEligibleTurn` dynamically (or via query).
  - `advanceQueue()`: Update `lastPlayedTurn` to the current `GlobalTurn` when a song is played.

### Security & Privacy
- No new PII collected.

## 4. Risks & Roadmap

### Phased Rollout
- **Phase 1 (Current)**: Implement the Gap Logic.
- **Phase 2 (Future)**: Visual indicators in UI showing "Next Play" or "Cooling Down" status.
- **Phase 3**: Payments (Stripe integration).

### Technical Risks
- **Queue Stalling**: If *all* songs are in cooldown (e.g., only 1 Platinum song in queue), the system must still play it.
  - **Mitigation**: The sorting logic `max(GlobalTurn, NextEligibleTurn)` naturally handles this. If everyone is in the future, the one with the *smallest* `NextEligibleTurn` (closest to now) wins. Effectively, the gaps compress if no other content exists.

## 5. Implementation Guide (Suggestion)

1.  **Schema Change**: Run migration to add `lastPlayedTurn` to `queue`.
2.  **Global Counter**: Create a helper `getGlobalTurn()` (count of `queue_plays`).
3.  **Update `advanceQueue`**:
    -   Get `currentTurn` = `getGlobalTurn()`.
    -   Update `queue` row: `playsRemaining--`, `lastPlayedTurn = currentTurn`.
4.  **Update `getQueue`**:
    -   Fetch all queue items.
    -   Get `currentTurn`.
    -   Map items to add `effectiveSortIndex`:
        ```javascript
        const gap = { platinum: 2, gold: 3, silver: 5, free: 0 }[item.tier];
        const nextEligible = (item.lastPlayedTurn || 0) + gap;
        const effectiveIndex = Math.max(currentTurn, nextEligible);
        ```
    -   Sort by:
        1.  `effectiveIndex` ASC
        2.  `tierPriority` DESC
        3.  `baseRank` ASC
