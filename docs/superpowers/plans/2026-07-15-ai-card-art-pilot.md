# AI Card Art Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add original full-bleed AI artwork for Copper, Estate, and Smithy across Phaser hand cards, supply piles, and the React card-selection modal without changing game behavior.

**Architecture:** Optional artwork paths live in `CARD_DATA`, the Phaser preloader turns configured paths into deterministic texture keys, and a focused `CardArtwork` container owns cover cropping and presentation. Phaser and React consume the same public WebP files while preserving code-rendered bilingual labels and falling back to the current type-colored cards when artwork is absent or fails to load.

**Tech Stack:** React 18, TypeScript 5.9, Phaser 3.90, Vite 5, CSS Modules, Vitest 2.1.9, built-in image generation, macOS `sips`

## Global Constraints

- Pilot cards are exactly `Copper`, `Estate`, and `Smithy`; the remaining fourteen cards keep their current presentation.
- Artwork is original realistic medieval oil painting with cinematic warm lighting, detailed brushwork, subdued earth tones, and no imitation of Dominion's official illustrations.
- Images contain no card frame, name, rules text, cost, letters, numbers, logo, or watermark.
- One 2:3 portrait WebP per card serves both the portrait hand and the centered landscape supply crop.
- Card names, costs, counts, descriptions, and localization remain code-rendered.
- Backend rules, WebSocket messages, card balance, AI behavior, and action routing do not change.
- Missing or failed artwork must fall back to the existing type-colored card without blocking scene startup or clicks.
- Each final WebP is `768 × 1152`, no larger than `350 KiB`, and stored in `frontend-new/public/assets/cards/`.
- Motion is limited to border glow, low-alpha type tint, fixed legibility shading, and slight internal parallax; `prefers-reduced-motion: reduce` disables parallax.
- Preserve the absolute base-position and base-rotation behavior that prevents hover and drag drift.
- Keep every task in its own commit and leave existing unrelated untracked files untouched.

---

### Task 1: Add the resilient Phaser artwork pipeline

**Files:**
- Modify: `frontend-new/package.json`
- Modify: `frontend-new/package-lock.json`
- Modify: `frontend-new/src/utils/cardData.ts`
- Create: `frontend-new/src/utils/cardData.test.ts`
- Create: `frontend-new/src/game/cardArtworkGeometry.ts`
- Create: `frontend-new/src/game/cardArtworkGeometry.test.ts`
- Create: `frontend-new/src/game/objects/CardArtwork.ts`
- Modify: `frontend-new/src/game/scenes/Preloader.ts`
- Modify: `frontend-new/src/game/objects/Card.ts`
- Modify: `frontend-new/src/game/objects/SupplyPile.ts`

**Interfaces:**
- Consumes: existing `CARD_DATA`, `CardData`, Phaser texture cache, `Card`, and `SupplyPile` containers.
- Produces: `CardData.art?: string`; `getCardArtPath(cardName: string): string | undefined`; `getCardTextureKey(cardName: string): string`; `getConfiguredCardArt(): ConfiguredCardArt[]`; `calculateCoverCrop(...)`; and `CardArtwork.create(...)` returning a renderable layer or `undefined`.

- [ ] **Step 1: Install the test runner and add a deterministic test command**

Run:

```bash
cd frontend-new
npm install --save-dev vitest@2.1.9
npm pkg set scripts.test="vitest run"
```

Expected: `package.json` contains `"test": "vitest run"`, and `package-lock.json` pins Vitest and its transitive dependencies.

- [ ] **Step 2: Write failing tests for metadata and cover cropping**

Create `frontend-new/src/utils/cardData.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  getCardArtPath,
  getCardTextureKey,
  getConfiguredCardArt,
} from './cardData';

describe('card artwork metadata', () => {
  it('uses a stable non-localized Phaser texture key', () => {
    expect(getCardTextureKey('Smithy')).toBe('card-art-smithy');
  });

  it('returns no path for a card without configured artwork', () => {
    expect(getCardArtPath('Village')).toBeUndefined();
  });

  it('starts with no configured artwork before pilot assets are added', () => {
    expect(getConfiguredCardArt()).toEqual([]);
  });
});
```

Create `frontend-new/src/game/cardArtworkGeometry.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { calculateCoverCrop } from './cardArtworkGeometry';

describe('calculateCoverCrop', () => {
  it('keeps the complete image when source and target are both 2:3', () => {
    expect(calculateCoverCrop(768, 1152, 80, 120)).toEqual({
      x: 0,
      y: 0,
      width: 768,
      height: 1152,
    });
  });

  it('center-crops a portrait image for a landscape supply pile', () => {
    const crop = calculateCoverCrop(768, 1152, 110, 90);

    expect(crop.x).toBe(0);
    expect(crop.y).toBeCloseTo(261.82, 1);
    expect(crop.width).toBe(768);
    expect(crop.height).toBeCloseTo(628.36, 1);
  });

  it('rejects zero-sized source or target bounds', () => {
    expect(() => calculateCoverCrop(0, 1152, 80, 120)).toThrow(
      'Artwork dimensions must be positive',
    );
  });
});
```

- [ ] **Step 3: Run the tests and verify RED**

Run:

```bash
cd frontend-new
npm test
```

Expected: FAIL because the metadata functions and `cardArtworkGeometry.ts` do not exist yet.

- [ ] **Step 4: Add optional artwork metadata and pure helpers**

Add to `CardData` in `frontend-new/src/utils/cardData.ts`:

```typescript
  art?: string;
```

Append to the same file:

```typescript
export interface ConfiguredCardArt {
  cardName: string;
  path: string;
  textureKey: string;
}

export function getCardArtPath(cardName: string): string | undefined {
  return CARD_DATA[cardName]?.art;
}

export function getCardTextureKey(cardName: string): string {
  return `card-art-${cardName.toLowerCase()}`;
}

export function getConfiguredCardArt(): ConfiguredCardArt[] {
  return Object.entries(CARD_DATA).flatMap(([cardName, data]) =>
    data.art
      ? [{ cardName, path: data.art, textureKey: getCardTextureKey(cardName) }]
      : [],
  );
}
```

Create `frontend-new/src/game/cardArtworkGeometry.ts`:

```typescript
export interface CoverCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverCrop {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    targetWidth <= 0 ||
    targetHeight <= 0
  ) {
    throw new Error('Artwork dimensions must be positive');
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (sourceAspect > targetAspect) {
    const width = sourceHeight * targetAspect;
    return {
      x: (sourceWidth - width) / 2,
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = sourceWidth / targetAspect;
  return {
    x: 0,
    y: (sourceHeight - height) / 2,
    width: sourceWidth,
    height,
  };
}
```

- [ ] **Step 5: Run the tests and verify GREEN**

Run:

```bash
cd frontend-new
npm test
```

Expected: 2 test files pass with 6 tests.

- [ ] **Step 6: Add the basic artwork container**

Create `frontend-new/src/game/objects/CardArtwork.ts`:

```typescript
import Phaser from 'phaser';
import { getCardArtPath, getCardTextureKey } from '../../utils/cardData';
import { calculateCoverCrop } from '../cardArtworkGeometry';

export class CardArtwork extends Phaser.GameObjects.Container {
  private constructor(
    scene: Phaser.Scene,
    cardName: string,
    width: number,
    height: number,
  ) {
    super(scene, 0, 0);

    const textureKey = getCardTextureKey(cardName);
    const frame = scene.textures.getFrame(textureKey);
    if (!frame) {
      throw new Error(`Missing loaded texture: ${textureKey}`);
    }

    const image = scene.add.image(0, 0, textureKey);
    const crop = calculateCoverCrop(frame.width, frame.height, width, height);
    image.setCrop(crop.x, crop.y, crop.width, crop.height);
    image.setScale(width / crop.width, height / crop.height);
    this.add(image);

    scene.add.existing(this);
  }

  static create(
    scene: Phaser.Scene,
    cardName: string,
    width: number,
    height: number,
  ): CardArtwork | undefined {
    const path = getCardArtPath(cardName);
    const textureKey = getCardTextureKey(cardName);
    if (!path || !scene.textures.exists(textureKey)) {
      return undefined;
    }

    return new CardArtwork(scene, cardName, width, height);
  }
}
```

- [ ] **Step 7: Load configured artwork without blocking the scene on failure**

In `frontend-new/src/game/scenes/Preloader.ts`, import the metadata helper:

```typescript
import { getConfiguredCardArt } from '../../utils/cardData';
```

Replace the existing artwork-loading placeholder comment with:

```typescript
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Card artwork failed to load: ${file.key}`);
    });

    getConfiguredCardArt().forEach(({ textureKey, path }) => {
      this.load.image(textureKey, path);
    });
```

Expected behavior: Phaser's loader completes even if one image fails, and `CardArtwork.create` returns `undefined` when no texture exists.

- [ ] **Step 8: Insert the artwork layer behind Phaser labels**

In both `Card.ts` and `SupplyPile.ts`, import:

```typescript
import { CardArtwork } from './CardArtwork';
```

In `Card.ts`, add the property:

```typescript
  private artwork?: CardArtwork;
```

Immediately after adding `cardBg`, add:

```typescript
    this.artwork = CardArtwork.create(scene, cardName, 80, 120);
    if (this.artwork) {
      this.add(this.artwork);
    }
```

In `SupplyPile.ts`, add the same property and insert this immediately after adding `cardBg`:

```typescript
    this.artwork = CardArtwork.create(scene, cardName, 110, 90);
    if (this.artwork) {
      this.add(this.artwork);
    }
```

Do not remove the backing rectangles; they are the required fallback and continue to carry border state.

- [ ] **Step 9: Run automated verification**

Run:

```bash
cd frontend-new
npm test
npm run build
git diff --check
```

Expected: 6 tests pass, TypeScript and Vite build successfully, and `git diff --check` prints no errors.

- [ ] **Step 10: Review and commit only the pipeline**

Run:

```bash
git diff -- frontend-new/package.json frontend-new/package-lock.json frontend-new/src/utils/cardData.ts frontend-new/src/utils/cardData.test.ts frontend-new/src/game/cardArtworkGeometry.ts frontend-new/src/game/cardArtworkGeometry.test.ts frontend-new/src/game/objects/CardArtwork.ts frontend-new/src/game/scenes/Preloader.ts frontend-new/src/game/objects/Card.ts frontend-new/src/game/objects/SupplyPile.ts
git status --short
git add frontend-new/package.json frontend-new/package-lock.json frontend-new/src/utils/cardData.ts frontend-new/src/utils/cardData.test.ts frontend-new/src/game/cardArtworkGeometry.ts frontend-new/src/game/cardArtworkGeometry.test.ts frontend-new/src/game/objects/CardArtwork.ts frontend-new/src/game/scenes/Preloader.ts frontend-new/src/game/objects/Card.ts frontend-new/src/game/objects/SupplyPile.ts
git commit -m "feat: add resilient card artwork pipeline"
```

Expected: one commit containing the test harness, metadata API, preloading, cover crop, fallback, and basic Phaser integration, but no pilot images.

---

### Task 2: Generate and add Copper artwork

**Files:**
- Create: `frontend-new/public/assets/cards/copper.webp`
- Create: `docs/card-art/pilot-prompts.md`
- Modify: `frontend-new/src/utils/cardData.ts`
- Modify: `frontend-new/src/utils/cardData.test.ts`

**Interfaces:**
- Consumes: `CardData.art`, `getCardArtPath`, `getConfiguredCardArt`, and `CardArtwork` from Task 1.
- Produces: `/assets/cards/copper.webp` and a configured `Copper.art` path.

- [ ] **Step 1: Write a failing asset-mapping test**

Add imports to `cardData.test.ts`:

```typescript
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
```

Add this helper below the imports:

```typescript
function publicAssetExists(publicPath: string): boolean {
  const publicRoot = fileURLToPath(new URL('../../public/', import.meta.url));
  return existsSync(`${publicRoot}${publicPath.replace(/^\//, '')}`);
}
```

Replace the initial empty-configuration assertion with:

```typescript
  it('configures only the accepted pilot assets', () => {
    expect(getConfiguredCardArt().map(({ cardName }) => cardName)).toEqual([
      'Copper',
    ]);
  });

  it('maps Copper to an existing public WebP', () => {
    const path = getCardArtPath('Copper');
    expect(path).toBe('/assets/cards/copper.webp');
    expect(publicAssetExists(path!)).toBe(true);
  });
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd frontend-new
npm test -- cardData.test.ts
```

Expected: FAIL because Copper has no artwork mapping and the file does not exist.

- [ ] **Step 3: Generate one Copper candidate with the built-in image tool**

Invoke the `imagegen` skill and call the built-in image generator once with this exact prompt:

```text
Use case: historical-scene
Asset type: full-bleed artwork for a digital medieval deck-building card
Primary request: Create an original realistic medieval oil painting representing Copper treasure.
Scene/backdrop: A rough oak counting table inside a dim medieval merchant's room, with an aged leather coin pouch and scattered worn copper coins.
Subject: The copper coins and pouch are the unmistakable central focal point; no people.
Style/medium: Museum-quality realistic oil painting, cinematic but historically grounded, detailed natural brushwork, not based on any existing board-game illustration.
Composition/framing: Portrait 2:3. Keep the subject inside the central 55% of the frame so a landscape center crop remains recognizable. Leave quieter, darker visual space near the top and bottom for UI overlays.
Lighting/mood: Warm low-angle candlelight, restrained highlights on oxidized copper, dignified and tactile rather than magical.
Color palette: Burnished copper, dark umber, worn leather brown, muted charcoal.
Materials/textures: Oxidized metal, scratched wood grain, cracked leather, subtle dust.
Constraints: Artwork only; no card frame, border, title, rules box, letters, numbers, symbols, logo, or watermark. Original composition.
Avoid: Modern coins, fantasy runes, readable writing, excessive gold, piles blocking the central crop, branded board-game styling.
```

Inspect the generated image at full resolution. Accept it only if the coins remain recognizable in a central landscape crop, the top and bottom are quiet enough for labels, and no text-like marks or modern objects appear. If one constraint fails, issue one targeted edit or regeneration that changes only that defect.

- [ ] **Step 4: Convert the accepted result into the project WebP**

Set `GENERATED_IMAGE_PATH` to the exact saved path returned by the built-in image tool, then run:

```bash
SOURCE_WIDTH=$(sips -g pixelWidth "$GENERATED_IMAGE_PATH" | awk '/pixelWidth/{print $2}')
SOURCE_HEIGHT=$(sips -g pixelHeight "$GENERATED_IMAGE_PATH" | awk '/pixelHeight/{print $2}')
test "$((SOURCE_WIDTH * 3))" -eq "$((SOURCE_HEIGHT * 2))"
mkdir -p frontend-new/public/assets/cards
sips --resampleHeightWidth 1152 768 \
  -s format webp \
  -s formatOptions 80 \
  "$GENERATED_IMAGE_PATH" \
  --out frontend-new/public/assets/cards/copper.webp
```

Validate:

```bash
sips -g pixelWidth -g pixelHeight frontend-new/public/assets/cards/copper.webp
test "$(stat -f%z frontend-new/public/assets/cards/copper.webp)" -le 358400
```

Expected: width `768`, height `1152`, and size at most `358400` bytes. If the size is larger, rerun conversion with `formatOptions 72` and validate again.

- [ ] **Step 5: Configure Copper and record the final prompt**

Add to the `Copper` entry in `cardData.ts`:

```typescript
    art: '/assets/cards/copper.webp',
```

Create `docs/card-art/pilot-prompts.md`:

```markdown
# AI Card Art Pilot Prompts

All pilot images use the built-in image generation path and are committed only after visual inspection, 2:3 conversion, and size validation.

## Copper

Use case: historical-scene

An original realistic medieval oil painting of worn copper coins and an aged leather coin pouch on a rough oak counting table in a dim merchant's room. Portrait 2:3, central safe subject, quiet dark top and bottom, warm candlelight, oxidized copper and umber palette. No people, card frame, text, numbers, symbols, logo, watermark, modern coins, fantasy runes, or imitation of existing board-game art.
```

- [ ] **Step 6: Run tests, build, and inspect the focused diff**

Run:

```bash
cd frontend-new
npm test -- cardData.test.ts
npm run build
cd ..
git diff --check
git diff -- frontend-new/public/assets/cards/copper.webp frontend-new/src/utils/cardData.ts frontend-new/src/utils/cardData.test.ts docs/card-art/pilot-prompts.md
```

Expected: metadata tests pass, build succeeds, and only the Copper asset, its mapping/test, and prompt record appear.

- [ ] **Step 7: Commit Copper independently**

Run:

```bash
git add frontend-new/public/assets/cards/copper.webp frontend-new/src/utils/cardData.ts frontend-new/src/utils/cardData.test.ts docs/card-art/pilot-prompts.md
git commit -m "feat: add Copper card artwork"
```

---

### Task 3: Generate and add Estate artwork

**Files:**
- Create: `frontend-new/public/assets/cards/estate.webp`
- Modify: `docs/card-art/pilot-prompts.md`
- Modify: `frontend-new/src/utils/cardData.ts`
- Modify: `frontend-new/src/utils/cardData.test.ts`

**Interfaces:**
- Consumes: the Task 1 artwork pipeline and Task 2 asset-existence helper.
- Produces: `/assets/cards/estate.webp` and a configured `Estate.art` path.

- [ ] **Step 1: Extend the tests before adding the asset**

Change the configured-card expectation to:

```typescript
    expect(getConfiguredCardArt().map(({ cardName }) => cardName)).toEqual([
      'Copper',
      'Estate',
    ]);
```

Add:

```typescript
  it('maps Estate to an existing public WebP', () => {
    const path = getCardArtPath('Estate');
    expect(path).toBe('/assets/cards/estate.webp');
    expect(publicAssetExists(path!)).toBe(true);
  });
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
cd frontend-new
npm test -- cardData.test.ts
```

Expected: FAIL because Estate is not mapped and `estate.webp` does not exist.

- [ ] **Step 3: Generate one Estate candidate with the built-in image tool**

Invoke the `imagegen` skill and call the built-in image generator once with:

```text
Use case: historical-scene
Asset type: full-bleed artwork for a digital medieval deck-building card
Primary request: Create an original realistic medieval oil painting representing a modest Estate.
Scene/backdrop: A small stone manor with a timber outbuilding, hedged fields, and a narrow dirt road in a rural medieval landscape.
Subject: The manor is the unmistakable central focal point, prosperous but clearly smaller and humbler than a duchy or province.
Style/medium: Museum-quality realistic oil painting, cinematic but historically grounded, detailed natural brushwork, not based on any existing board-game illustration.
Composition/framing: Portrait 2:3. Keep the manor inside the central 55% so a landscape center crop preserves the building. Leave quieter, darker sky and foreground near the top and bottom for UI overlays.
Lighting/mood: Soft late-afternoon sunlight after rain, calm stewardship, modest prosperity.
Color palette: Weathered gray stone, moss green, muted ochre fields, warm window light, subdued earth tones.
Materials/textures: Rough masonry, timber beams, wet soil, hedges, distant atmospheric haze.
Constraints: Artwork only; no card frame, border, title, rules box, letters, numbers, heraldry, logo, or watermark. Original composition.
Avoid: Castle grandeur, modern architecture, readable signs, fantasy towers, crowds, branded board-game styling.
```

Inspect at full resolution. Accept only if the manor remains complete in a centered landscape crop, reads as modest rather than palatial, and contains no text-like marks or heraldry. Use one targeted edit or regeneration for a single failed constraint.

- [ ] **Step 4: Convert and validate the Estate WebP**

Set `GENERATED_IMAGE_PATH` from the tool result and run:

```bash
SOURCE_WIDTH=$(sips -g pixelWidth "$GENERATED_IMAGE_PATH" | awk '/pixelWidth/{print $2}')
SOURCE_HEIGHT=$(sips -g pixelHeight "$GENERATED_IMAGE_PATH" | awk '/pixelHeight/{print $2}')
test "$((SOURCE_WIDTH * 3))" -eq "$((SOURCE_HEIGHT * 2))"
sips --resampleHeightWidth 1152 768 \
  -s format webp \
  -s formatOptions 80 \
  "$GENERATED_IMAGE_PATH" \
  --out frontend-new/public/assets/cards/estate.webp
sips -g pixelWidth -g pixelHeight frontend-new/public/assets/cards/estate.webp
test "$(stat -f%z frontend-new/public/assets/cards/estate.webp)" -le 358400
```

Expected: `768 × 1152` and at most `350 KiB`; retry conversion at quality 72 if necessary.

- [ ] **Step 5: Configure Estate and append its final prompt record**

Add to the `Estate` entry:

```typescript
    art: '/assets/cards/estate.webp',
```

Append to `docs/card-art/pilot-prompts.md`:

```markdown
## Estate

Use case: historical-scene

An original realistic medieval oil painting of a modest stone manor, timber outbuilding, hedged fields, and dirt road in a rural landscape. Portrait 2:3, the manor centered for landscape cropping, quiet dark sky and foreground, soft late-afternoon light, gray stone and muted green-ochre palette. No frame, text, numbers, heraldry, logo, watermark, fantasy grandeur, modern architecture, or imitation of existing board-game art.
```

- [ ] **Step 6: Verify and commit Estate independently**

Run:

```bash
cd frontend-new
npm test -- cardData.test.ts
npm run build
cd ..
git diff --check
git add frontend-new/public/assets/cards/estate.webp frontend-new/src/utils/cardData.ts frontend-new/src/utils/cardData.test.ts docs/card-art/pilot-prompts.md
git commit -m "feat: add Estate card artwork"
```

Expected: tests and build pass; the commit contains only Estate's asset, metadata/test update, and prompt record.

---

### Task 4: Generate and add Smithy artwork

**Files:**
- Create: `frontend-new/public/assets/cards/smithy.webp`
- Modify: `docs/card-art/pilot-prompts.md`
- Modify: `frontend-new/src/utils/cardData.ts`
- Modify: `frontend-new/src/utils/cardData.test.ts`

**Interfaces:**
- Consumes: the Task 1 artwork pipeline and existing pilot asset tests.
- Produces: `/assets/cards/smithy.webp` and a configured `Smithy.art` path.

- [ ] **Step 1: Extend the metadata tests before adding Smithy**

Change the configured-card expectation to:

```typescript
    expect(getConfiguredCardArt().map(({ cardName }) => cardName)).toEqual([
      'Copper',
      'Estate',
      'Smithy',
    ]);
```

Add:

```typescript
  it('maps Smithy to an existing public WebP', () => {
    const path = getCardArtPath('Smithy');
    expect(path).toBe('/assets/cards/smithy.webp');
    expect(publicAssetExists(path!)).toBe(true);
  });
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
cd frontend-new
npm test -- cardData.test.ts
```

Expected: FAIL because Smithy is not mapped and `smithy.webp` does not exist.

- [ ] **Step 3: Generate one Smithy candidate with the built-in image tool**

Invoke the `imagegen` skill and call the built-in image generator once with:

```text
Use case: historical-scene
Asset type: full-bleed artwork for a digital medieval deck-building card
Primary request: Create an original realistic medieval oil painting representing a working Smithy.
Scene/backdrop: The interior of a practical medieval forge with stone walls, hanging tools, an anvil, and a glowing charcoal hearth.
Subject: A blacksmith in historically plausible work clothes striking hot iron on the anvil; the smith, hammer, iron, and anvil form one clear central silhouette.
Style/medium: Museum-quality realistic oil painting, cinematic but historically grounded, detailed natural brushwork, not based on any existing board-game illustration.
Composition/framing: Portrait 2:3. Keep the smith and anvil inside the central 55% so a landscape center crop remains readable. Leave quieter, darker rafters and floor near the top and bottom for UI overlays.
Lighting/mood: Strong warm forge light against cool smoky shadows, focused labor, physical craftsmanship, no magical effects.
Color palette: Ember orange, iron gray, soot black, dark umber, restrained skin tones.
Materials/textures: Hammered iron, sparks, rough stone, worn leather apron, smoke haze.
Constraints: Artwork only; no card frame, border, title, rules box, letters, numbers, logo, or watermark. Original composition.
Avoid: Modern tools, fantasy armor, glowing runes, excessive sparks covering the subject, readable writing, branded board-game styling.
```

Inspect at full resolution. Accept only if the action remains clear at thumbnail size and in a centered landscape crop, clothing and tools are historically plausible, and there are no text-like marks. Use one targeted edit or regeneration for a single failed constraint.

- [ ] **Step 4: Convert and validate the Smithy WebP**

Set `GENERATED_IMAGE_PATH` from the tool result and run:

```bash
SOURCE_WIDTH=$(sips -g pixelWidth "$GENERATED_IMAGE_PATH" | awk '/pixelWidth/{print $2}')
SOURCE_HEIGHT=$(sips -g pixelHeight "$GENERATED_IMAGE_PATH" | awk '/pixelHeight/{print $2}')
test "$((SOURCE_WIDTH * 3))" -eq "$((SOURCE_HEIGHT * 2))"
sips --resampleHeightWidth 1152 768 \
  -s format webp \
  -s formatOptions 80 \
  "$GENERATED_IMAGE_PATH" \
  --out frontend-new/public/assets/cards/smithy.webp
sips -g pixelWidth -g pixelHeight frontend-new/public/assets/cards/smithy.webp
test "$(stat -f%z frontend-new/public/assets/cards/smithy.webp)" -le 358400
```

Expected: `768 × 1152` and at most `350 KiB`; retry conversion at quality 72 if necessary.

- [ ] **Step 5: Configure Smithy and append its final prompt record**

Add to the `Smithy` entry:

```typescript
    art: '/assets/cards/smithy.webp',
```

Append to `docs/card-art/pilot-prompts.md`:

```markdown
## Smithy

Use case: historical-scene

An original realistic medieval oil painting of a blacksmith striking hot iron on an anvil inside a practical stone forge. Portrait 2:3, smith and anvil centered for landscape cropping, quiet dark rafters and floor, warm forge light against cool smoky shadows, ember orange and iron-gray palette. No frame, text, numbers, logo, watermark, modern tools, fantasy armor, magical runes, or imitation of existing board-game art.
```

- [ ] **Step 6: Verify and commit Smithy independently**

Run:

```bash
cd frontend-new
npm test -- cardData.test.ts
npm run build
cd ..
git diff --check
git add frontend-new/public/assets/cards/smithy.webp frontend-new/src/utils/cardData.ts frontend-new/src/utils/cardData.test.ts docs/card-art/pilot-prompts.md
git commit -m "feat: add Smithy card artwork"
```

Expected: tests and build pass; the commit contains only Smithy's asset, metadata/test update, and prompt record.

---

### Task 5: Add restrained Phaser artwork effects

**Files:**
- Create: `frontend-new/src/game/cardArtworkVisuals.ts`
- Create: `frontend-new/src/game/cardArtworkVisuals.test.ts`
- Modify: `frontend-new/src/game/cardArtworkGeometry.ts`
- Modify: `frontend-new/src/game/cardArtworkGeometry.test.ts`
- Modify: `frontend-new/src/game/objects/CardArtwork.ts`
- Modify: `frontend-new/src/game/objects/Card.ts`
- Modify: `frontend-new/src/game/objects/SupplyPile.ts`

**Interfaces:**
- Consumes: `CardData.type`, the Task 1 `CardArtwork` layer, and existing hover callbacks.
- Produces: `getCardArtTint(type)` and `CardArtwork.setHovered(hovered)`; preserves all container position, rotation, input, and drag APIs.

- [ ] **Step 1: Write failing tests for type treatments**

Create `frontend-new/src/game/cardArtworkVisuals.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getCardArtTint } from './cardArtworkVisuals';

describe('getCardArtTint', () => {
  it.each([
    ['treasure', 0xd6a84f],
    ['victory', 0x5f8f62],
    ['action', 0x8b929b],
    ['curse', 0x765080],
  ] as const)('returns the approved %s tint', (type, color) => {
    expect(getCardArtTint(type)).toBe(color);
  });
});
```

Also extend the import in `cardArtworkGeometry.test.ts`:

```typescript
import {
  calculateCoverCrop,
  calculateHoverCrop,
} from './cardArtworkGeometry';
```

Append this test inside the existing `describe` block:

```typescript
  it('keeps the parallax crop inside the visible cover crop', () => {
    const base = calculateCoverCrop(768, 1152, 80, 120);
    const hover = calculateHoverCrop(base);

    expect(hover.x).toBeCloseTo(11.52, 2);
    expect(hover.y).toBeCloseTo(5.76, 2);
    expect(hover.width).toBeCloseTo(752.64, 2);
    expect(hover.height).toBeCloseTo(1128.96, 2);
    expect(hover.x).toBeGreaterThanOrEqual(base.x);
    expect(hover.y).toBeGreaterThanOrEqual(base.y);
    expect(hover.x + hover.width).toBeLessThanOrEqual(base.x + base.width);
    expect(hover.y + hover.height).toBeLessThanOrEqual(base.y + base.height);
  });
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd frontend-new
npm test -- cardArtworkVisuals.test.ts
```

Expected: FAIL because `cardArtworkVisuals.ts` does not exist.

- [ ] **Step 3: Add the pure type-treatment mapping**

Create `frontend-new/src/game/cardArtworkVisuals.ts`:

```typescript
import type { CardData } from '../utils/cardData';

const CARD_ART_TINTS: Record<CardData['type'], number> = {
  treasure: 0xd6a84f,
  victory: 0x5f8f62,
  action: 0x8b929b,
  curse: 0x765080,
};

export function getCardArtTint(type: CardData['type']): number {
  return CARD_ART_TINTS[type];
}
```

Append to `frontend-new/src/game/cardArtworkGeometry.ts`:

```typescript
export function calculateHoverCrop(base: CoverCrop): CoverCrop {
  const width = base.width * 0.98;
  const height = base.height * 0.98;
  const horizontalInset = base.width - width;
  const verticalInset = base.height - height;

  return {
    x: base.x + horizontalInset * 0.75,
    y: base.y + verticalInset * 0.25,
    width,
    height,
  };
}
```

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run:

```bash
cd frontend-new
npm test -- cardArtworkVisuals.test.ts cardArtworkGeometry.test.ts
```

Expected: all tint and crop tests pass.

- [ ] **Step 5: Replace the basic artwork container with the effect-aware version**

Replace `CardArtwork.ts` with:

```typescript
import Phaser from 'phaser';
import {
  CARD_DATA,
  getCardArtPath,
  getCardTextureKey,
} from '../../utils/cardData';
import {
  calculateCoverCrop,
  calculateHoverCrop,
  type CoverCrop,
} from '../cardArtworkGeometry';
import { getCardArtTint } from '../cardArtworkVisuals';

export class CardArtwork extends Phaser.GameObjects.Container {
  private readonly image: Phaser.GameObjects.Image;
  private readonly targetWidth: number;
  private readonly targetHeight: number;
  private readonly restCrop: CoverCrop;
  private readonly hoverCrop: CoverCrop;
  private readonly cropState: CoverCrop;
  private readonly reducedMotion: boolean;

  private constructor(
    scene: Phaser.Scene,
    cardName: string,
    width: number,
    height: number,
  ) {
    super(scene, 0, 0);

    const textureKey = getCardTextureKey(cardName);
    const frame = scene.textures.getFrame(textureKey);
    if (!frame) {
      throw new Error(`Missing loaded texture: ${textureKey}`);
    }

    this.targetWidth = width;
    this.targetHeight = height;
    this.restCrop = calculateCoverCrop(frame.width, frame.height, width, height);
    this.hoverCrop = calculateHoverCrop(this.restCrop);
    this.cropState = { ...this.restCrop };

    this.image = scene.add.image(0, 0, textureKey);
    this.applyCrop();
    this.add(this.image);

    const type = CARD_DATA[cardName].type;
    const tint = scene.add.rectangle(0, 0, width, height, getCardArtTint(type), 0.08);
    const topShade = scene.add.rectangle(0, -height * 0.4, width, height * 0.2, 0x000000, 0.32);
    const bottomShade = scene.add.rectangle(0, height * 0.38, width, height * 0.24, 0x000000, 0.42);
    this.add([tint, topShade, bottomShade]);

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scene.add.existing(this);
  }

  static create(
    scene: Phaser.Scene,
    cardName: string,
    width: number,
    height: number,
  ): CardArtwork | undefined {
    const path = getCardArtPath(cardName);
    const textureKey = getCardTextureKey(cardName);
    if (!path || !scene.textures.exists(textureKey)) {
      return undefined;
    }

    return new CardArtwork(scene, cardName, width, height);
  }

  setHovered(hovered: boolean): void {
    this.scene.tweens.killTweensOf(this.cropState);
    if (this.reducedMotion) {
      Object.assign(this.cropState, this.restCrop);
      this.applyCrop();
      return;
    }

    const destination = hovered ? this.hoverCrop : this.restCrop;
    this.scene.tweens.add({
      targets: this.cropState,
      x: destination.x,
      y: destination.y,
      width: destination.width,
      height: destination.height,
      duration: 180,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.applyCrop(),
    });
  }

  private applyCrop(): void {
    const { x, y, width, height } = this.cropState;
    this.image.setCrop(x, y, width, height);
    this.image.setScale(this.targetWidth / width, this.targetHeight / height);
  }

  destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this.cropState);
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 6: Connect hover state without changing movement logic**

In `Card.onPointerOver`, immediately after setting `isHovered`, add:

```typescript
      this.artwork?.setHovered(true);
      this.cardBg.setStrokeStyle(2, 0xffd27a);
```

In `Card.onPointerOut`, immediately after clearing `isHovered`, add:

```typescript
      this.artwork?.setHovered(false);
      this.cardBg.setStrokeStyle(1, 0x999999);
```

In `Card.onDragStart`, add before the container tween:

```typescript
      this.artwork?.setHovered(false);
```

In `SupplyPile.onPointerOver`, add:

```typescript
    this.artwork?.setHovered(true);
```

In `SupplyPile.onPointerOut`, add:

```typescript
    this.artwork?.setHovered(false);
```

Do not replace any existing absolute `y`, `rotation`, `baseY`, or `originalY` tween targets.

- [ ] **Step 7: Verify tests, build, and motion behavior**

Run:

```bash
cd frontend-new
npm test
npm run build
cd ..
git diff --check
```

Expected: all metadata, crop, and tint tests pass; build succeeds.

In the running app, verify:

1. Hover changes only the artwork internally plus the border glow.
2. Repeated hover does not move the card or supply pile away from its stored base position.
3. Dragging still restores the hand card's base position and rotation.
4. With reduced motion enabled in the browser, parallax stops but border feedback remains.

- [ ] **Step 8: Commit effects independently**

Run:

```bash
git add frontend-new/src/game/cardArtworkVisuals.ts frontend-new/src/game/cardArtworkVisuals.test.ts frontend-new/src/game/cardArtworkGeometry.ts frontend-new/src/game/cardArtworkGeometry.test.ts frontend-new/src/game/objects/CardArtwork.ts frontend-new/src/game/objects/Card.ts frontend-new/src/game/objects/SupplyPile.ts
git commit -m "feat: add restrained card artwork effects"
```

---

### Task 6: Show artwork in the React card-selection modal and verify the pilot

**Files:**
- Create: `frontend-new/src/utils/cardArtworkStyle.ts`
- Create: `frontend-new/src/utils/cardArtworkStyle.test.ts`
- Modify: `frontend-new/src/components/GameUI/CardSelectionModal.tsx`
- Modify: `frontend-new/src/components/GameUI/CardSelectionModal.module.css`

**Interfaces:**
- Consumes: `getCardArtPath(cardName)` and existing `CardSelectionModal` metadata.
- Produces: `getCardArtworkBackground(cardName): string | undefined`, used as a CSS background image while retaining existing selection and type classes.

- [ ] **Step 1: Write failing tests for the React background value**

Create `frontend-new/src/utils/cardArtworkStyle.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getCardArtworkBackground } from './cardArtworkStyle';

describe('getCardArtworkBackground', () => {
  it('returns a legibility gradient and URL for configured artwork', () => {
    expect(getCardArtworkBackground('Copper')).toBe(
      'linear-gradient(180deg, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.12) 42%, rgba(0, 0, 0, 0.78)), url("/assets/cards/copper.webp")',
    );
  });

  it('returns undefined for a card without artwork', () => {
    expect(getCardArtworkBackground('Village')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd frontend-new
npm test -- cardArtworkStyle.test.ts
```

Expected: FAIL because `cardArtworkStyle.ts` does not exist.

- [ ] **Step 3: Implement the tested style helper**

Create `frontend-new/src/utils/cardArtworkStyle.ts`:

```typescript
import { getCardArtPath } from './cardData';

export function getCardArtworkBackground(cardName: string): string | undefined {
  const path = getCardArtPath(cardName);
  if (!path) return undefined;

  return `linear-gradient(180deg, rgba(0, 0, 0, 0.48), rgba(0, 0, 0, 0.12) 42%, rgba(0, 0, 0, 0.78)), url("${path}")`;
}
```

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run:

```bash
cd frontend-new
npm test -- cardArtworkStyle.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Apply the optional artwork style in the modal**

Add this import to `CardSelectionModal.tsx`:

```typescript
import { getCardArtworkBackground } from '../../utils/cardArtworkStyle';
```

Replace the complete `cards.map` block with:

```typescript
            {cards.map((cardName, index) => {
              const artworkBackground = getCardArtworkBackground(cardName);

              return (
                <div
                  key={`${cardName}-${index}`}
                className={`${styles.card} ${getCardTypeClass(cardName)} ${
                  artworkBackground ? styles.withArtwork : ''
                } ${selectedIndices.includes(index) ? styles.selected : ''}`}
                  onClick={() => handleCardClick(cardName, index)}
                style={
                  artworkBackground
                    ? { backgroundImage: artworkBackground }
                    : undefined
                }
                  data-testid={`modal-card-${cardName}-${index}`}
                >
                  <div className={styles.cardName}>
                    {getCardName(cardName, language)}
                  </div>
                  <div className={styles.cardCost}>{getCardCost(cardName)}</div>
                  {CARD_DATA[cardName]?.tooltip && (
                    <div className={styles.cardDesc}>
                      {CARD_DATA[cardName].tooltip![language]}
                    </div>
                  )}
                </div>
              );
            })}
```

This keeps the existing key, click handler, test ID, translated name, cost, and tooltip unchanged.

- [ ] **Step 6: Add full-bleed modal styling and reduced-motion behavior**

Append to `CardSelectionModal.module.css`:

```css
.withArtwork {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  overflow: hidden;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.withArtwork .cardName {
  color: #fff1d2;
  position: relative;
  z-index: 1;
}

.withArtwork .cardDesc {
  color: #eadfc9;
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .card:hover {
    transition: none;
    transform: none;
  }
}
```

- [ ] **Step 7: Run the full automated verification suite**

Run:

```bash
cd frontend-new
npm test
npm run build
cd ..
git diff --check
```

Expected: all test files pass, TypeScript and Vite production build succeed, and no whitespace errors are reported.

- [ ] **Step 8: Verify the complete pilot in the browser**

Start or reuse the backend and frontend in separate terminals:

```bash
# Terminal 1
~/.cargo/bin/cargo run --release -p backend

# Terminal 2
cd frontend-new
npm run dev
```

Open `http://localhost:5173/` and verify:

1. Copper, Estate, and Smithy render as full-bleed art in the hand.
2. Their supply piles use centered landscape crops; the focal subjects remain recognizable.
3. Other cards still use the existing colored fallback.
4. Card names and descriptions switch between Traditional Chinese and English without reloading art.
5. The selection modal shows artwork for configured cards and fallback styling for other cards.
6. Costs, counts, selection outlines, empty piles, clicks, hover, drag, and card action routing remain correct.
7. Repeated hover and drag do not introduce position drift.
8. Reduced-motion mode disables parallax.
9. A temporary invalid path falls back to the colored card; restore the valid path before committing.
10. Browser console contains no new errors.

If a check fails, stop and repair the owning task in a new focused commit rather than combining unrelated fixes with the modal commit.

- [ ] **Step 9: Commit the React integration independently**

Run:

```bash
git add frontend-new/src/utils/cardArtworkStyle.ts frontend-new/src/utils/cardArtworkStyle.test.ts frontend-new/src/components/GameUI/CardSelectionModal.tsx frontend-new/src/components/GameUI/CardSelectionModal.module.css
git commit -m "feat: show card artwork in selection modal"
```

- [ ] **Step 10: Confirm final history and clean status**

Run:

```bash
git log --oneline -7
git status --short
```

Expected: the design commit plus six focused implementation commits are present. Only the repository's pre-existing unrelated untracked files remain; no generated source variants or temporary invalid paths are staged.
