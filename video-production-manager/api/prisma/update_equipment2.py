#!/usr/bin/env python3
"""Remove Atomos recorders, duplicate HD Plus, old non-HDR Extreme; add HyperDeck Extreme 4K HDR."""
import json, os

script_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(script_dir, "equipment-data.json")

with open(data_path) as f:
    data = json.load(f)

# ── REMOVE ───────────────────────────────────────────────────────────────────
remove = {
    "atomos-shogun-ultra",           # Atomos recorder
    "atomos-ninja-v",                # Atomos recorder
    "blackmagic-hyperdeck-studio",   # duplicate HD Plus (generic ID)
    "blackmagic-hyperdeck-extreme",  # old HyperDeck Extreme 8K (non-HDR)
}
before = len(data)
data = [e for e in data if e["id"] not in remove]
print(f"Removed {before - len(data)} entries")

# ── ADD HyperDeck Extreme 4K HDR ─────────────────────────────────────────────
data.append({
    "id": "blackmagic-hyperdeck-extreme-4k-hdr",
    "category": "recorder",
    "manufacturer": "Blackmagic Design",
    "model": "HyperDeck Extreme 4K HDR",
    "ioArchitecture": "direct",
    "inputs": [
        {"id": "sdi-in-1", "type": "12G-SDI", "label": "SDI In 1"},
        {"id": "sdi-in-2", "type": "12G-SDI", "label": "SDI In 2"},
        {"id": "hdmi-in",  "type": "HDMI",    "label": "HDMI In"}
    ],
    "outputs": [
        {"id": "sdi-out-1", "type": "12G-SDI", "label": "SDI Out 1"},
        {"id": "sdi-out-2", "type": "12G-SDI", "label": "SDI Out 2"},
        {"id": "hdmi-out",  "type": "HDMI",    "label": "HDMI Out"}
    ],
    "deviceFormats": ["4K 60", "4K 59.94", "4K 50", "4K 30", "1080p60", "1080p59.94", "1080p50", "HDR"],
    "formatByIO": False
})
print("Added HyperDeck Extreme 4K HDR")

# ── WRITE ─────────────────────────────────────────────────────────────────────
with open(data_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"Total entries: {len(data)}")

# Verify recorders
recorders = [e for e in data if e.get("category", "").upper() == "RECORDER"]
print(f"\nRecorders ({len(recorders)}):")
for e in recorders:
    print(f"  [{e['id']}]  {e['model']}")
