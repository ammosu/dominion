#!/usr/bin/env python3
"""Generate cute card artwork with Codex CLI's built-in image generation.

Usage: python3 tools/card-art/generate.py --style NAME [CardId ...] [--jobs N] [--force]
       python3 tools/card-art/generate.py --style NAME --backdrop [wide|tall ...]
Uses tools/card-art/styles/NAME.md and writes
frontend-new/public/assets/cards/NAME/<cardid>.webp (768x1152), or with
--backdrop the start screen's backdrops
frontend-new/public/assets/backdrops/NAME-{wide,tall}.webp.
Raw PNGs are kept in tools/card-art/raw/NAME/ (gitignored); without --force
an existing raw PNG is reused and only re-converted.
To add a style to the game, also list it in ART_STYLES (utils/cardData.ts).
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ASSET_DIR = ROOT / "frontend-new/public/assets/cards"
BACKDROP_DIR = ROOT / "frontend-new/public/assets/backdrops"
STYLE_DIR = HERE / "styles"
RAW_DIR = HERE / "raw"
CODEX_IMAGES = Path.home() / ".codex/generated_images"
SIZE = (768, 1152)
MAX_BYTES = 350 * 1024

# Start-screen backdrops: one scene, a landscape cut for desktops and a portrait one for phones.
BACKDROP_SUBJECT = (
    "The opening view of a peaceful medieval kingdom: a small castle on a distant hill, "
    "a cozy village with a market square and smoking chimneys, a winding road, fields and "
    "forest. A few tiny villagers going about their day. Inviting, like the first page of a story."
)
BACKDROPS = {
    "wide": ((1920, 1080), "landscape 16:9"),
    "tall": ((1080, 1920), "portrait 9:16"),
}
BACKDROP_MAX_BYTES = 600 * 1024


BACKDROP_NOTE = re.compile(r"<!--\s*backdrop:\s*(.*?)\s*-->\n?", re.S)


def build_prompt(card: str, subject: str, style_path: Path) -> str:
    style = BACKDROP_NOTE.sub("", style_path.read_text())
    return (
        "Use your built-in image generation tool to create exactly one image, then reply DONE.\n"
        f"Card: {card}\nSubject: {subject}\n\n{style}"
    )


def build_backdrop_prompt(aspect: str, pixels_across: int, style_path: Path) -> str:
    # The style's card composition rules do not apply to a full-screen scene.
    style = re.sub(r"^Composition:.*$", "", style_path.read_text(), flags=re.M)
    style = re.sub(r"roughly 192 pixels across", f"roughly {pixels_across} pixels across", style)
    # Styles may set the scene's time of day etc. with `<!-- backdrop: ... -->`.
    extra = BACKDROP_NOTE.search(style)
    style = BACKDROP_NOTE.sub("", style)
    subject = BACKDROP_SUBJECT + (f" {extra.group(1)}" if extra else "")
    return (
        "Use your built-in image generation tool to create exactly one image, then reply DONE.\n"
        f"Subject: {subject}\n\n{style}\n"
        f"Composition: {aspect}, a full-bleed scenic backdrop for a game's start screen, no single "
        "foreground subject. The middle of the frame, where a menu will sit, is calm and uncluttered "
        "(open meadow, road or sky); the open sky across the top third leaves room for a title. "
        "Interesting detail sits toward the left and right edges and the lower corners."
    )


def pixel_grid(style_path: Path) -> int | None:
    """Styles may declare `<!-- pixel-grid: N -->` to snap output to an N-pixel-wide grid."""
    match = re.search(r"pixel-grid:\s*(\d+)", style_path.read_text())
    return int(match.group(1)) if match else None


def to_webp(png: Path, out: Path, grid: int | None = None, size=SIZE, max_bytes=MAX_BYTES) -> int:
    source = Image.open(png)
    if source.mode in ("RGBA", "LA", "P"):
        # Flatten transparency onto cream instead of letting it turn black.
        source = source.convert("RGBA")
        backdrop = Image.new("RGBA", source.size, (238, 228, 205, 255))
        source = Image.alpha_composite(backdrop, source)
    image = source.convert("RGB")
    w, h = image.size
    # Center-crop to the exact target aspect before resizing.
    tw, th = size
    if w * th > h * tw:
        new_w = h * tw // th
        image = image.crop(((w - new_w) // 2, 0, (w - new_w) // 2 + new_w, h))
    elif w * th < h * tw:
        new_h = w * th // tw
        image = image.crop((0, (h - new_h) // 2, w, (h - new_h) // 2 + new_h))
    if grid:
        # Snap AI "pixel art" (uneven, blurry pixels) to a true pixel grid.
        # Point-sample (no averaging, no palette reduction) to keep the original colors.
        small = image.resize((grid, grid * th // tw), Image.Resampling.NEAREST)
        image = small.resize(size, Image.Resampling.NEAREST)
        image.save(out, "WEBP", lossless=True, method=6)
        return out.stat().st_size
    image = image.resize(size, Image.Resampling.LANCZOS)
    for quality in (82, 75, 68, 60):
        image.save(out, "WEBP", quality=quality, method=6)
        if out.stat().st_size <= max_bytes:
            break
    return out.stat().st_size


def run_codex(prompt: str, raw: Path) -> str | None:
    """Has Codex draw one image into `raw`; returns the log tail on failure."""
    with tempfile.TemporaryDirectory() as work:
        log = subprocess.run(
            ["codex", "exec", "--skip-git-repo-check", "-C", work, "-s", "workspace-write", "-"],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=900,
        )
    text = log.stdout + log.stderr
    match = re.search(r"session id: ([0-9a-f-]+)", text)
    pngs = sorted(glob.glob(str(CODEX_IMAGES / match.group(1) / "*.png")), key=os.path.getmtime) if match else []
    if not pngs:
        return text[-800:]
    raw.write_bytes(Path(pngs[-1]).read_bytes())
    return None


def generate(card: str, subject: str, force: bool, style_path: Path, out_dir: Path, raw_dir: Path) -> str:
    out = out_dir / f"{card.lower()}.webp"
    raw = raw_dir / f"{card.lower()}.png"
    if raw.exists() and not force:
        return f"{card}: reuse {raw.name} -> {to_webp(raw, out, pixel_grid(style_path)) // 1024} KiB"
    error = run_codex(build_prompt(card, subject, style_path), raw)
    if error:
        return f"{card}: FAILED (no image)\n{error}"
    return f"{card}: {to_webp(raw, out, pixel_grid(style_path)) // 1024} KiB"


def generate_backdrop(shape: str, force: bool, style_path: Path, raw_dir: Path) -> str:
    size, aspect = BACKDROPS[shape]
    out = BACKDROP_DIR / f"{style_path.stem}-{shape}.webp"
    raw = raw_dir / f"backdrop-{shape}.png"
    # Pixel styles snap to 6-pixel squares (320 across the wide backdrop).
    grid = size[0] // 6 if pixel_grid(style_path) else None
    if force or not raw.exists():
        error = run_codex(build_backdrop_prompt(aspect, size[0] // 6, style_path), raw)
        if error:
            return f"backdrop {shape}: FAILED (no image)\n{error}"
    return f"backdrop {shape}: {to_webp(raw, out, grid, size, BACKDROP_MAX_BYTES) // 1024} KiB"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("cards", nargs="*")
    parser.add_argument("--jobs", type=int, default=4)
    parser.add_argument("--force", action="store_true", help="regenerate even if a raw PNG exists")
    parser.add_argument("--style", required=True, help="style name, i.e. styles/<name>.md")
    parser.add_argument("--backdrop", action="store_true", help="draw start-screen backdrops instead of cards")
    args = parser.parse_args()
    style_path = STYLE_DIR / f"{args.style}.md"
    if not style_path.exists():
        sys.exit(f"unknown style {args.style!r}; available: {sorted(p.stem for p in STYLE_DIR.glob('*.md'))}")
    out_dir = ASSET_DIR / args.style
    raw_dir = RAW_DIR / args.style

    if args.backdrop:
        shapes = args.cards or list(BACKDROPS)
        if unknown := [s for s in shapes if s not in BACKDROPS]:
            sys.exit(f"unknown backdrops: {unknown}; available: {list(BACKDROPS)}")
        raw_dir.mkdir(parents=True, exist_ok=True)
        BACKDROP_DIR.mkdir(parents=True, exist_ok=True)
        with ThreadPoolExecutor(args.jobs) as pool:
            for line in pool.map(lambda s: generate_backdrop(s, args.force, style_path, raw_dir), shapes):
                print(line, flush=True)
        return

    subjects = json.loads((HERE / "cards.json").read_text())
    cards = args.cards or list(subjects)
    unknown = [c for c in cards if c not in subjects]
    if unknown:
        sys.exit(f"unknown cards: {unknown}")
    raw_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(args.jobs) as pool:
        for line in pool.map(lambda c: generate(c, subjects[c], args.force, style_path, out_dir, raw_dir), cards):
            print(line, flush=True)


if __name__ == "__main__":
    main()
