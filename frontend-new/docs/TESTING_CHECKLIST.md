# Dominion Complete Playable Version - Testing Checklist

## Core Gameplay
- [ ] Start new game with custom player name
- [ ] Hand displays 5 initial cards
- [ ] Click card in hand to play during Action phase
- [ ] Action counters decrease when playing action cards
- [ ] Treasure cards add coins when played
- [ ] Click supply pile to buy card during Buy phase
- [ ] Buy counters decrease when buying
- [ ] Coins decrease by card cost when buying
- [ ] End Phase button advances phase correctly
- [ ] Turn cycles through Action → Buy → Cleanup
- [ ] Hand cleared and redrawn (5 cards) after Cleanup
- [ ] Next player's turn starts after Cleanup

## Action Cards
- [ ] Village: +1 Card, +2 Actions
- [ ] Smithy: +3 Cards
- [ ] Market: +1 Card, +1 Action, +1 Buy, +1 Coin
- [ ] Cellar: Discard cards, draw same number
- [ ] Workshop: Gain card costing ≤4
- [ ] Militia: +2 Coins, others discard to 3
- [ ] Moat: +2 Cards
- [ ] Remodel: Trash card, gain one costing +2
- [ ] Mine: Trash treasure, gain one costing +3
- [ ] Woodcutter: +1 Buy, +2 Coins

## Supply Area
- [ ] All card piles visible
- [ ] Correct counts displayed
- [ ] Counts update after purchase
- [ ] Empty piles grayed out
- [ ] Cost badges show correct values
- [ ] Hover effect on piles

## Victory Conditions
- [ ] Game ends when Province pile empty
- [ ] Game ends when 3 piles empty
- [ ] Final scores calculated correctly
- [ ] Winner displayed in modal
- [ ] All players' scores shown

## AI Opponent
- [ ] AI turn plays automatically
- [ ] AI actions visible in action log
- [ ] AI plays action cards
- [ ] AI buys cards
- [ ] AI ends turn automatically
- [ ] Delay between AI actions (1 second)

## UI & Visual
- [ ] TopBar shows current player
- [ ] TopBar shows current phase
- [ ] Action/Buy/Coin counters update in real-time
- [ ] Language toggle works (zh/en)
- [ ] All text translates correctly
- [ ] ActionLog displays all game events
- [ ] ActionLog auto-scrolls to bottom
- [ ] Hand cards arranged in fan shape
- [ ] Hand cards rotate correctly
- [ ] Card hover lifts card up
- [ ] Drag-and-drop works smoothly

## Animations
- [ ] Draw card animation (deck → hand)
- [ ] Play card animation (hand → play area)
- [ ] Buy card animation (supply → discard)
- [ ] Phase transition smooth
- [ ] All animations 60fps

## Sound (If implemented)
- [ ] Card draw sound
- [ ] Card play sound
- [ ] Card buy sound
- [ ] Phase change sound
- [ ] Game over sound
- [ ] Sound toggle button works

## Edge Cases
- [ ] Cannot play action card with 0 actions
- [ ] Cannot buy card with insufficient coins
- [ ] Cannot buy card with 0 buys
- [ ] Cannot play card not in hand
- [ ] Empty deck triggers shuffle
- [ ] Hand limit enforced during Militia attack
- [ ] Game handles 2 players correctly

## Performance
- [ ] No memory leaks (play 5+ turns)
- [ ] Frame rate stays 60fps
- [ ] WebSocket reconnects on disconnect
- [ ] No console errors
- [ ] Build size reasonable (<2MB)

## Cross-Browser (Bonus)
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
