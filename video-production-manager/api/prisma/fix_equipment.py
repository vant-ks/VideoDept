#!/usr/bin/env python3
"""One-shot cleanup: deduplicate by id, remove target entries, ensure single 4K HDR entry."""
import json, os

data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "equipment-data.json")

with open(data_path) as f:
    data = json.load(f)

# Deduplicate (keep first occurrence of each id)
seen = set()
deduped = []
for e in data:
    if e["id"] not in seen:
        seen.add(e["id"])
        deduped.append(e)
print(f"Deduped: {len(data)} -> {len(deduped)}")
data = deduped

# Remove unwanted entries
remove = {
    "atomos-shogun-ultra",
    "atomos-ninja-v",
    "blackmagic-hyperdeck-studio",
    "blackmagic-hyperdeck-extreme",
}
before = len(data)
data = [e for e in data if e["id"] not in remove]
print(f"Removed {before - len(data)} entries")

# Ensure HyperDeck Extreme 4K HDR exists (add if missing)
if not any(e["id"] == "blackmagic-hyperdeck-extreme-4k-hdr" for e in data):
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
else:
    print("HyperDeck Extreme 4K HDR already present")

with open(data_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"Total entries: {len(data)}")
recorders = [e for e in data if e.get("category", "").upper() == "RECORDER"]
print(f"\nRecorders ({len(recorders)}):")
for e in recorders:
    print(f"  [{e['id']}]  {e['model']}")
