#!/usr/bin/env python3
"""
transcribe.py — Transcribe audio to SRT captions using OpenAI Whisper (local).

Usage:
  python scripts/transcribe.py --audio "./output/audio/filename.mp3"

Output: creates filename.srt in the same directory as the audio file.

Install:
  pip install openai-whisper
  # Also requires ffmpeg to be installed and on PATH
"""

import argparse
import sys
import os
import re
import whisper


def format_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def segments_to_srt(segments: list) -> str:
    """Convert Whisper segment list to SRT format string."""
    lines = []
    for i, seg in enumerate(segments, start=1):
        start = format_timestamp(seg["start"])
        end = format_timestamp(seg["end"])
        text = seg["text"].strip()
        lines.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Whisper audio transcriber → SRT")
    parser.add_argument("--audio", required=True, help="Path to audio file (MP3/WAV)")
    parser.add_argument(
        "--model",
        default="base",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Whisper model size (default: base)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.audio):
        print(f"[ERROR] Audio file not found: {args.audio}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Loading Whisper model: {args.model}", file=sys.stderr)
    try:
        model = whisper.load_model(args.model)
    except Exception as e:
        print(f"[ERROR] Failed to load Whisper model: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Transcribing: {args.audio}", file=sys.stderr)
    try:
        result = model.transcribe(args.audio, verbose=False)
    except Exception as e:
        print(f"[ERROR] Transcription failed: {e}", file=sys.stderr)
        sys.exit(1)

    srt_content = segments_to_srt(result["segments"])

    # Output SRT to same directory with same base name
    base, _ = os.path.splitext(args.audio)
    srt_path = base + ".srt"

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt_content)

    print(f"[OK] SRT saved to: {srt_path}")


if __name__ == "__main__":
    main()
