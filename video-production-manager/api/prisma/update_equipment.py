#!/usr/bin/env python3
"""Remove Atomos recorders, duplicate HD Plus, old Extreme; add HyperDeck Extreme 4K HDR.
   - Remove 22 legacy LG monitor entries
   - Add LG UA7100 series (6 sizes)
   - Add BMD Video Assist 5" 3G and 7" 3G
   - Add BMD SmartView 4K G3
   - Add Lilliput Q series 17"+ (7 models)
"""
import json, os

script_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(script_dir, "equipment-data.json")

with open(data_path) as f:
    data = json.load(f)

# ── REMOVE all LG entries ────────────────────────────────────────────────────
lg_ids_removed = {e["id"] for e in data if e.get("manufacturer", "").upper() == "LG"}
print(f"Removing {len(lg_ids_removed)} LG entries: {sorted(lg_ids_removed)}")
data = [e for e in data if e["id"] not in lg_ids_removed]

# ── ADD LG UA7100 (43/50/55/65/75/86") ──────────────────────────────────────
ua7100_sizes = [("43", '43"'), ("50", '50"'), ("55", '55"'),
                ("65", '65"'), ("75", '75"'), ("86", '86"')]

for size_id, size_disp in ua7100_sizes:
    data.append({
        "id": f"lg-{size_id}-ua7100",
        "category": "monitor",
        "manufacturer": "LG",
        "model": f"{size_disp} UA7100 4K UHD Smart TV",
        "ioArchitecture": "direct",
        "inputs": [
            {"id": "hdmi-1",    "type": "HDMI",            "label": "HDMI 1"},
            {"id": "hdmi-2",    "type": "HDMI",            "label": "HDMI 2 (ARC)"},
            {"id": "hdmi-3",    "type": "HDMI",            "label": "HDMI 3"},
            {"id": "usb-1",     "type": "USB",             "label": "USB 2.0"},
            {"id": "net-rj45",  "type": "Network (RJ45)",  "label": "LAN"}
        ],
        "outputs": [],
        "deviceFormats": ["4K 60", "4K 30", "1080p60", "1080p30", "720p60"],
        "formatByIO": False
    })

print(f"Added {len(ua7100_sizes)} LG UA7100 entries")

# ── ADD BMD Video Assist 5" 3G ───────────────────────────────────────────────
data.append({
    "id": "blackmagic-video-assist-5-3g",
    "category": "monitor",
    "manufacturer": "Blackmagic Design",
    "model": 'Video Assist 5" 3G',
    "ioArchitecture": "direct",
    "inputs": [
        {"id": "sdi-in",   "type": "3G-SDI", "label": "3G-SDI In"},
        {"id": "hdmi-in",  "type": "HDMI",   "label": "HDMI In"}
    ],
    "outputs": [
        {"id": "sdi-out",   "type": "3G-SDI",    "label": "3G-SDI Out"},
        {"id": "hdmi-out",  "type": "HDMI",      "label": "HDMI Out"},
        {"id": "audio-out", "type": "Headphone", "label": "Headphone (3.5mm)"}
    ],
    "deviceFormats": ["1080p60", "1080p59.94", "1080i59.94", "1080i50", "720p60"],
    "formatByIO": False
})

# ── ADD BMD Video Assist 7" 3G ───────────────────────────────────────────────
data.append({
    "id": "blackmagic-video-assist-7-3g",
    "category": "monitor",
    "manufacturer": "Blackmagic Design",
    "model": 'Video Assist 7" 3G',
    "ioArchitecture": "direct",
    "inputs": [
        {"id": "sdi-in",  "type": "3G-SDI",   "label": "3G-SDI In"},
        {"id": "hdmi-in", "type": "HDMI",     "label": "HDMI In"},
        {"id": "xlr-l",   "type": "Mini XLR", "label": "Audio In L (Mini XLR)"},
        {"id": "xlr-r",   "type": "Mini XLR", "label": "Audio In R (Mini XLR)"}
    ],
    "outputs": [
        {"id": "sdi-out",   "type": "3G-SDI",    "label": "3G-SDI Out"},
        {"id": "hdmi-out",  "type": "HDMI",      "label": "HDMI Out"},
        {"id": "audio-out", "type": "Headphone", "label": "Headphone (3.5mm)"}
    ],
    "deviceFormats": ["1080p60", "1080p59.94", "1080i59.94", "1080i50", "720p60"],
    "formatByIO": False
})

print("Added BMD Video Assist 5\" 3G and 7\" 3G")

# ── ADD BMD SmartView 4K G3 ──────────────────────────────────────────────────
data.append({
    "id": "blackmagic-smartview-4k-g3",
    "category": "monitor",
    "manufacturer": "Blackmagic Design",
    "model": "SmartView 4K G3",
    "ioArchitecture": "direct",
    "inputs": [
        {"id": "sdi-in-1",  "type": "12G-SDI",        "label": "12G-SDI In 1"},
        {"id": "sdi-in-2",  "type": "12G-SDI",        "label": "12G-SDI In 2"},
        {"id": "sfp-in",    "type": "SFP Optical",    "label": "SFP Optical/IP In"},
        {"id": "net-10g",   "type": "Network (RJ45)", "label": "10G Ethernet (SMPTE 2110)"}
    ],
    "outputs": [
        {"id": "sdi-loop",  "type": "12G-SDI", "label": "12G-SDI Loop Out"}
    ],
    "deviceFormats": ["4K 60", "4K 30", "1080p60", "1080p59.94", "1080i59.94", "HDR"],
    "formatByIO": False
})

print("Added BMD SmartView 4K G3")

# ── ADD Lilliput Q series 17"+ ───────────────────────────────────────────────
# (id_suffix, model_name, formats)
lilliput_q_large = [
    ("q17",
     'Q17 17.3" 12G-SDI Broadcast Monitor',
     ["4K 60", "1080p60", "1080p59.94", "1080i59.94", "720p60", "HDR"]),
    ("q18",
     'Q18 17.3" 4K 12G-SDI Broadcast Studio Monitor',
     ["4K 60", "4K 30", "1080p60", "1080p59.94", "1080i59.94", "HDR"]),
    ("q18-8k",
     'Q18-8K 17.3" 8K 12G-SDI Broadcast Studio Monitor',
     ["8K 30", "4K 60", "4K 30", "1080p60", "1080p59.94", "HDR"]),
    ("q24",
     'Q24 23.6" 4K 12G-SDI Broadcast Studio Monitor',
     ["4K 60", "4K 30", "1080p60", "1080p59.94", "1080i59.94", "HDR"]),
    ("q23-8k",
     'Q23-8K 23.8" 8K 12G-SDI Broadcast Studio Monitor',
     ["8K 30", "4K 60", "4K 30", "1080p60", "1080p59.94", "HDR"]),
    ("q28-8k",
     'Q28-8K 28" 8K 12G-SDI Broadcast Studio Monitor',
     ["8K 30", "4K 60", "4K 30", "1080p60", "1080p59.94", "HDR"]),
    ("q31-8k",
     'Q31-8K 31.5" 8K 12G-SDI Broadcast Studio Monitor',
     ["8K 30", "4K 60", "4K 30", "1080p60", "1080p59.94", "HDR"]),
]

for suffix, model_name, formats in lilliput_q_large:
    data.append({
        "id": f"lilliput-{suffix}",
        "category": "monitor",
        "manufacturer": "Lilliput",
        "model": model_name,
        "ioArchitecture": "direct",
        "inputs": [
            {"id": "sdi-in",  "type": "12G-SDI", "label": "12G-SDI In"},
            {"id": "hdmi-in", "type": "HDMI",    "label": "HDMI 2.0 In"}
        ],
        "outputs": [
            {"id": "sdi-out",   "type": "12G-SDI",   "label": "12G-SDI Loop Out"},
            {"id": "hdmi-out",  "type": "HDMI",      "label": "HDMI Loop Out"},
            {"id": "audio-out", "type": "Headphone", "label": "Headphone (3.5mm)"}
        ],
        "deviceFormats": formats,
        "formatByIO": False
    })

print(f"Added {len(lilliput_q_large)} Lilliput Q series 17\"+ entries")

# ── WRITE ────────────────────────────────────────────────────────────────────
with open(data_path, "w") as f:
    json.dump(data, f, indent=2)

# ── VERIFY ───────────────────────────────────────────────────────────────────
print(f"\n=== VERIFICATION ===")
print(f"Total entries: {len(data)}")

lg_after = [e for e in data if e.get("manufacturer", "").upper() == "LG"]
print(f"\nLG entries ({len(lg_after)}):")
for e in lg_after:
    print(f"  [{e['id']}]  {e['model']}")

bmd_monitors = [e for e in data if "blackmagic" in e.get("manufacturer", "").lower() and e.get("category") == "monitor"]
print(f"\nBlackmagic Design monitor entries ({len(bmd_monitors)}):")
for e in bmd_monitors:
    print(f"  [{e['id']}]  {e['model']}")
    print(f"    inputs:  {[i['label'] for i in e['inputs']]}")
    print(f"    outputs: {[o['label'] for o in e['outputs']]}")

lil_q = [e for e in data if "lilliput" in e.get("manufacturer", "").lower()]
print(f"\nLilliput entries ({len(lil_q)}):")
for e in lil_q:
    print(f"  [{e['id']}]  {e['model']}")
