#!/usr/bin/env python3
"""Generate cute card artwork with Codex CLI's built-in image generation.

Usage: python3 tools/card-art/generate.py --style NAME [CardId ...] [--jobs N] [--force]
Uses tools/card-art/styles/NAME.md and writes
frontend-new/public/assets/cards/NAME/<cardid>.webp (768x1152).
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
STYLE_DIR = HERE / "styles"
RAW_DIR = HERE / "raw"
CODEX_IMAGES = Path.home() / ".codex/generated_images"
SIZE = (768, 1152)
MAX_BYTES = 350 * 1024


def build_prompt(card: str, subject: str, style_path: Path) -> str:
    style = style_path.read_text()
    return (
        "Use your built-in image generation tool to create exactly one image, then reply DONE.\n"
        f"Card: {card}\nSubject: {subject}\n\n{style}"
    )


def pixel_grid(style_path: Path) -> int | None:
    """Styles may declare `<!-- pixel-grid: N -->` to snap output to an N-pixel-wide grid."""
    match = re.search(r"pixel-grid:\s*(\d+)", style_path.read_text())
    return int(match.group(1)) if match else None


def to_webp(png: Path, out: Path, grid: int | None = None) -> int:
    source = Image.open(png)
    if source.mode in ("RGBA", "LA", "P"):
        # Flatten transparency onto cream instead of letting it turn black.
        source = source.convert("RGBA")
        backdrop = Image.new("RGBA", source.size, (238, 228, 205, 255))
        source = Image.alpha_composite(backdrop, source)
    image = source.convert("RGB")
    w, h = image.size
    # Center-crop to exact 2:3 portrait before resizing.
    if w * 3 > h * 2:
        new_w = h * 2 // 3
        image = image.crop(((w - new_w) // 2, 0, (w - new_w) // 2 + new_w, h))
    elif w * 3 < h * 2:
        new_h = w * 3 // 2
        image = image.crop((0, (h - new_h) // 2, w, (h - new_h) // 2 + new_h))
    if grid:
        # Snap AI "pixel art" (uneven, blurry pixels) to a true pixel grid.
        # Point-sample (no averaging, no palette reduction) to keep the original colors.
        small = image.resize((grid, grid * 3 // 2), Image.Resampling.NEAREST)
        image = small.resize(SIZE, Image.Resampling.NEAREST)
        image.save(out, "WEBP", lossless=True, method=6)
        return out.stat().st_size
    image = image.resize(SIZE, Image.Resampling.LANCZOS)
    for quality in (82, 75, 68, 60):
        image.save(out, "WEBP", quality=quality, method=6)
        if out.stat().st_size <= MAX_BYTES:
            break
    return out.stat().st_size


def generate(card: str, subject: str, force: bool, style_path: Path, out_dir: Path, raw_dir: Path) -> str:
    out = out_dir / f"{card.lower()}.webp"
    raw = raw_dir / f"{card.lower()}.png"
    if raw.exists() and not force:
        return f"{card}: reuse {raw.name} -> {to_webp(raw, out, pixel_grid(style_path)) // 1024} KiB"
    with tempfile.TemporaryDirectory() as work:
        log = subprocess.run(
            ["codex", "exec", "--skip-git-repo-check", "-C", work, "-s", "workspace-write", "-"],
            input=build_prompt(card, subject, style_path),
            capture_output=True,
            text=True,
            timeout=900,
        )
    text = log.stdout + log.stderr
    match = re.search(r"session id: ([0-9a-f-]+)", text)
    pngs = sorted(glob.glob(str(CODEX_IMAGES / match.group(1) / "*.png")), key=os.path.getmtime) if match else []
    if not pngs:
        return f"{card}: FAILED (no image)\n{text[-800:]}"
    raw.write_bytes(Path(pngs[-1]).read_bytes())
    return f"{card}: {to_webp(raw, out, pixel_grid(style_path)) // 1024} KiB"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("cards", nargs="*")
    parser.add_argument("--jobs", type=int, default=4)
    parser.add_argument("--force", action="store_true", help="regenerate even if a raw PNG exists")
    parser.add_argument("--style", required=True, help="style name, i.e. styles/<name>.md")
    args = parser.parse_args()
    style_path = STYLE_DIR / f"{args.style}.md"
    if not style_path.exists():
        sys.exit(f"unknown style {args.style!r}; available: {sorted(p.stem for p in STYLE_DIR.glob('*.md'))}")
    out_dir = ASSET_DIR / args.style
    raw_dir = RAW_DIR / args.style

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
