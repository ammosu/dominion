#!/usr/bin/env python3
"""Generate cute card artwork with Codex CLI's built-in image generation.

Usage: python3 tools/card-art/generate.py [CardId ...] [--jobs N] [--force]
Writes frontend-new/public/assets/cards/<cardid>.webp (768x1152, <= 350 KiB).
Raw PNGs are kept in tools/card-art/raw/ (gitignored) for review.
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
OUT_DIR = ROOT / "frontend-new/public/assets/cards"
RAW_DIR = HERE / "raw"
CODEX_IMAGES = Path.home() / ".codex/generated_images"
SIZE = (768, 1152)
MAX_BYTES = 350 * 1024


def build_prompt(card: str, subject: str) -> str:
    style = (HERE / "style.md").read_text()
    return (
        "Use your built-in image generation tool to create exactly one image, then reply DONE.\n"
        f"Card: {card}\nSubject: {subject}\n\n{style}"
    )


def to_webp(png: Path, out: Path) -> int:
    image = Image.open(png).convert("RGB")
    w, h = image.size
    # Center-crop to exact 2:3 portrait before resizing.
    if w * 3 > h * 2:
        new_w = h * 2 // 3
        image = image.crop(((w - new_w) // 2, 0, (w - new_w) // 2 + new_w, h))
    elif w * 3 < h * 2:
        new_h = w * 3 // 2
        image = image.crop((0, (h - new_h) // 2, w, (h - new_h) // 2 + new_h))
    image = image.resize(SIZE, Image.Resampling.LANCZOS)
    for quality in (82, 75, 68, 60):
        image.save(out, "WEBP", quality=quality, method=6)
        if out.stat().st_size <= MAX_BYTES:
            break
    return out.stat().st_size


def generate(card: str, subject: str, force: bool) -> str:
    out = OUT_DIR / f"{card.lower()}.webp"
    raw = RAW_DIR / f"{card.lower()}.png"
    if raw.exists() and not force:
        return f"{card}: reuse {raw.name} -> {to_webp(raw, out) // 1024} KiB"
    with tempfile.TemporaryDirectory() as work:
        log = subprocess.run(
            ["codex", "exec", "--skip-git-repo-check", "-C", work, "-s", "workspace-write", "-"],
            input=build_prompt(card, subject),
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
    return f"{card}: {to_webp(raw, out) // 1024} KiB"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("cards", nargs="*")
    parser.add_argument("--jobs", type=int, default=4)
    parser.add_argument("--force", action="store_true", help="regenerate even if a raw PNG exists")
    args = parser.parse_args()

    subjects = json.loads((HERE / "cards.json").read_text())
    cards = args.cards or list(subjects)
    unknown = [c for c in cards if c not in subjects]
    if unknown:
        sys.exit(f"unknown cards: {unknown}")
    RAW_DIR.mkdir(exist_ok=True)
    with ThreadPoolExecutor(args.jobs) as pool:
        for line in pool.map(lambda c: generate(c, subjects[c], args.force), cards):
            print(line, flush=True)


if __name__ == "__main__":
    main()
