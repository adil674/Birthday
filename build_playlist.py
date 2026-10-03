"""
build_playlist.py  →  save in the Birthday folder (next to Birthday.html)

Scans the "songs" folder and writes songs/songs.json.
Run it whenever you add or remove songs:

    python build_playlist.py

Name your files like  "Artist - Song Title.mp3"  so the cassette label
shows the artist and title. (Artist is optional.)
"""
import json
from pathlib import Path

EXTS = {".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"}
songs_dir = Path(__file__).parent / "songs"
songs_dir.mkdir(exist_ok=True)

files = sorted(
    (p.name for p in songs_dir.iterdir() if p.suffix.lower() in EXTS),
    key=str.lower,
)

(songs_dir / "songs.json").write_text(
    json.dumps(files, indent=2, ensure_ascii=False), encoding="utf-8"
)

print(f"Found {len(files)} song(s):")
for f in files:
    print("  -", f)