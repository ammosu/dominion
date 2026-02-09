# Complete First Game Kingdom Cards

## Gap Analysis

Current: Cellar, Market, Smithy, Village, Workshop (5/10)
Missing: Militia, Mine, Moat, Remodel, Woodcutter (5)

## New Cards

### Woodcutter (Cost: 3)
- +1 Buy, +2 Coins
- Simple effect, no choices needed

### Militia (Cost: 4)
- +2 Coins
- Attack: each other player discards down to 3 cards
- Auto-discard: lowest cost first (Curse > Copper > Estate > etc.)
- Moat blocks this attack

### Moat (Cost: 2)
- +2 Cards
- Reaction: when another player plays an Attack, reveal Moat to be unaffected
- Auto-reveal: if Moat is in hand, automatically block attacks

### Mine (Cost: 5)
- Trash a Treasure from hand, gain a Treasure costing up to 3 more to hand
- Two-step choice: select trash target, then select gain target
- Frontend: mine-trash-select mode → mine-gain-select mode

### Remodel (Cost: 4)
- Trash a card from hand, gain a card costing up to 2 more than trashed card
- Two-step choice: select trash target, then select gain target
- Frontend: remodel-trash-select mode → remodel-gain-select mode

## Design Decisions

- Militia: auto-discard lowest value cards (no manual choice for defenders)
- Moat: auto-reveal when attack played (no choice to decline protection)
- CardType::Attack added as new card type (Militia)
- CardType::Reaction not needed as separate type — Moat is Action + has reaction ability
