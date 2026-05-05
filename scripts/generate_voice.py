#!/usr/bin/env python3
"""
generate_voice.py — Convert text to MP3 using Edge TTS.

Usage:
  python scripts/generate_voice.py \
    --text "Your full script text here" \
    --output "./output/audio/filename.mp3" \
    --voice "en-US-ChristopherNeural"

Install:
  pip install edge-tts
"""

import asyncio
import argparse
import sys
import os
import edge_tts


AVAILABLE_VOICES = [
    "en-US-ChristopherNeural",
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-GB-RyanNeural",
    "en-AU-WilliamNeural",
]


async def generate(text: str, output_path: str, voice: str) -> None:
    if voice not in AVAILABLE_VOICES:
        print(f"[WARN] Unknown voice '{voice}', falling back to en-US-ChristopherNeural", file=sys.stderr)
        voice = "en-US-ChristopherNeural"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    print(f"[OK] Saved voiceover to: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Edge TTS voiceover generator")
    parser.add_argument("--text", required=True, help="Script text to convert")
    parser.add_argument("--output", required=True, help="Output MP3 path")
    parser.add_argument(
        "--voice",
        default="en-US-ChristopherNeural",
        help="Edge TTS voice name",
    )
    args = parser.parse_args()

    if not args.text.strip():
        print("[ERROR] --text cannot be empty", file=sys.stderr)
        sys.exit(1)

    try:
        asyncio.run(generate(args.text, args.output, args.voice))
    except Exception as e:
        print(f"[ERROR] TTS generation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
