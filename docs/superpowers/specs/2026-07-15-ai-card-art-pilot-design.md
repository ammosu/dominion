# AI Card Art Pilot Design

## Purpose

Improve card readability and atmosphere by adding original AI-generated artwork to a three-card vertical slice. The pilot covers Copper, Estate, and Smithy so the team can validate treasure, victory, and action card treatments before generating the remaining fourteen cards.

## Scope

The pilot adds three final web assets, shared artwork metadata, Phaser rendering for hand cards and supply piles, React rendering in the card-selection modal, graceful fallbacks, and restrained visual effects.

The pilot does not change backend rules, WebSocket messages, card balance, AI behavior, card names, descriptions, localization content, or the remaining fourteen cards. Expanding the art set happens only after the pilot is reviewed in the running game.

## Approved Visual Direction

- Original realistic medieval oil paintings with cinematic warm lighting, detailed brushwork, subdued earth tones, and a coherent visual language.
- Full-bleed artwork rather than a framed illustration window.
- No baked-in card frame, name, rules text, cost, logo, or watermark.
- Card names, costs, counts, and descriptions remain code-rendered so one asset works for both Traditional Chinese and English.
- Portrait 2:3 artwork supplies both presentations: the hand uses the full portrait composition, while the landscape supply pile uses a centered cover crop.
- The work must not reproduce or imitate Dominion's official card illustrations. Subjects and compositions are original.

## Pilot Artwork Briefs

All three images share the approved direction and these constraints:

- Keep the main subject within the central safe area so a landscape center crop remains recognizable.
- Keep the upper and lower edges visually quieter and darker enough for code-rendered labels.
- Avoid letters, numbers, borders, logos, watermarks, anachronistic objects, and modern clothing.
- Preserve useful tonal contrast at small display sizes.

Individual subjects:

1. **Copper** — aged copper coins and a worn leather coin pouch on a medieval wooden table.
2. **Estate** — a modest stone manor surrounded by fields, hedges, and a rural medieval landscape.
3. **Smithy** — a blacksmith working iron at an anvil, lit by forge fire in a medieval workshop.

The selected final for each card is converted to an optimized WebP at a consistent 2:3 portrait size. The final project assets live under `frontend-new/public/assets/cards/`; discarded generation variants remain outside the application bundle.

## Metadata and Asset Loading

`CardData` gains an optional artwork field. Copper, Estate, and Smithy reference their corresponding public asset paths; all other cards omit the field and keep their existing presentation.

The existing `Preloader` loads configured artwork into Phaser before `TableScene` starts. Texture keys are deterministic and derived from card IDs rather than localized display names. A small shared utility exposes the same public artwork URL to React, keeping Phaser and React tied to one metadata source.

Load or decode failure must not prevent the game scene from starting. A card without a usable texture falls back to its current type-colored rectangle and code-rendered text.

## Phaser Rendering Architecture

A focused artwork presentation helper owns image placement and effects. It accepts a card ID and target bounds, then provides:

- cover-scale and center-crop behavior;
- clipping to the card or pile bounds;
- type-specific color treatment;
- a legibility layer for labels;
- hover glow and internal artwork parallax;
- reduced-motion behavior; and
- cleanup of masks, tweens, and child objects.

`Card` uses the helper inside its existing `80 × 120` container. The artwork fills the portrait card, while the translated card name remains a Phaser text object above a darkened legibility layer. Existing click, hover, drag, depth, base-position, and base-rotation behavior remains authoritative.

`SupplyPile` uses the same portrait texture inside its existing `110 × 90` bounds with centered cover cropping. Cost, count, translated name, empty-pile state, and click behavior remain code-rendered. The artwork moves internally during hover; the container continues to use its stored absolute base position so the existing drift fix is preserved.

## React Card Selection Modal

The modal reads the optional artwork URL from the shared card metadata and uses it as a full-bleed background. A dark gradient keeps the translated name, cost, and tooltip legible. Type-specific borders and selected-state styling remain visible over the artwork.

Cards without artwork retain the current CSS treatment. React does not preload a second copy manually; the browser cache serves the same public URL already used by Phaser.

## Motion and Accessibility

The approved effect level is restrained rather than particle-heavy:

- a subtle border glow on hover;
- a small internal artwork offset that creates parallax without moving the label layer;
- a non-destructive vignette or gradient for text contrast; and
- a low-alpha type treatment: warm gold for treasure, soft green for victory, cool neutral for action, and purple for curse when the system later expands.

Existing drag and hover timings remain the baseline. Motion must not change hit areas or action routing. When `prefers-reduced-motion: reduce` is active, artwork parallax is disabled and state changes use border or color feedback only.

## Data Flow

```text
CARD_DATA artwork path
  ├─> Preloader ─> Phaser texture cache ─> Card / SupplyPile artwork helper
  └─> React public URL ─> CardSelectionModal background

Missing path or failed texture
  └─> existing type-colored card fallback
```

Localization remains independent:

```text
uiStore language ─> getCardName / tooltip text ─> code-rendered overlays
AI artwork remains unchanged
```

## Error Handling

- An absent artwork field is an intentional fallback, not an error.
- Phaser records a failed artwork load but still starts the table scene.
- Rendering helpers check texture availability before creating an image.
- React uses its current background treatment when the artwork URL is absent; a failed browser image request must not obscure labels or make the card unclickable.
- Empty supply piles preserve their current disabled and desaturated state.

## Verification

Automated verification:

```bash
cd frontend-new
npm run build
```

Asset checks confirm that each configured pilot path exists, uses WebP, has a 2:3 portrait ratio, and stays within the agreed web-size budget established from the first accepted asset.

Browser verification covers:

1. Copper, Estate, and Smithy in the hand at normal, hovered, and dragged states.
2. The same cards in supply piles, including centered landscape crops and empty-pile styling.
3. Traditional Chinese and English labels without reloading artwork.
4. Card-selection modal backgrounds, selection states, costs, and tooltips.
5. A deliberately missing texture falling back to the current colored card.
6. Reduced-motion behavior with parallax disabled.
7. No new browser console errors during a playable turn.

The pilot is successful when all three subjects remain recognizable in both aspect ratios, labels remain legible at current game sizes, interactions behave exactly as before, and the visual style is consistent enough to guide the remaining fourteen cards.

## Independent Commit Boundaries

The work is split so each commit has one reviewable purpose:

1. `docs: design AI card art pilot`
2. `feat: add resilient card artwork pipeline`
3. `feat: add Copper card artwork`
4. `feat: add Estate card artwork`
5. `feat: add Smithy card artwork`
6. `feat: add restrained card artwork effects`
7. `feat: show card artwork in selection modal`

Each implementation commit must build independently. Generated assets are not combined with unrelated refactors or backend changes.

## Rollout After the Pilot

After visual review, the approved prompt structure, safe-area rules, compression budget, and rendering pipeline become the template for the remaining fourteen cards. Those cards are generated and committed individually so any asset can be revised or reverted without disturbing the rest of the set.
