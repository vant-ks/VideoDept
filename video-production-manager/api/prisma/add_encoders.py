#!/usr/bin/env python3
"""Add streaming encoder entries (new 'encoder' category)."""
import json, os

data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "equipment-data.json")

with open(data_path) as f:
    data = json.load(f)

new_entries = [
    # ── Blackmagic Design Streaming Encoder HD ───────────────────────────────
    {
        "id": "blackmagic-streaming-encoder-hd",
        "category": "encoder",
        "manufacturer": "Blackmagic Design",
        "model": "Streaming Encoder HD",
        "ioArchitecture": "direct",
        "inputs": [
            {"id": "sdi-in",     "type": "12G-SDI",       "label": "12G-SDI In (downconverts to HD)"}
        ],
        "outputs": [
            {"id": "sdi-loop",   "type": "12G-SDI",       "label": "SDI Loop Out"},
            {"id": "sdi-mon",    "type": "3G-SDI",        "label": "SDI Monitor Out"},
            {"id": "hdmi-mon",   "type": "HDMI",          "label": "HDMI Monitor Out"},
            {"id": "usb-webcam", "type": "USB-C",         "label": "USB-C Webcam Out"},
            {"id": "net-stream", "type": "Network (RJ45)","label": "Ethernet (Streaming)"}
        ],
        "deviceFormats": ["1080p60", "1080p59.94", "1080p50", "1080p30", "720p60"],
        "formatByIO": False
    },

    # ── Blackmagic Design Streaming Encoder 4K ───────────────────────────────
    {
        "id": "blackmagic-streaming-encoder-4k",
        "category": "encoder",
        "manufacturer": "Blackmagic Design",
        "model": "Streaming Encoder 4K",
        "ioArchitecture": "direct",
        "inputs": [
            {"id": "sdi-in",     "type": "12G-SDI",       "label": "12G-SDI In"}
        ],
        "outputs": [
            {"id": "sdi-loop",   "type": "12G-SDI",       "label": "SDI Loop Out"},
            {"id": "sdi-mon",    "type": "12G-SDI",       "label": "SDI Monitor Out"},
            {"id": "hdmi-mon",   "type": "HDMI",          "label": "HDMI Monitor Out"},
            {"id": "usb-webcam", "type": "USB-C",         "label": "USB-C Webcam Out (up to 4K)"},
            {"id": "net-stream", "type": "Network (RJ45)","label": "Ethernet (Streaming)"}
        ],
        "deviceFormats": ["4K 60", "4K 30", "1080p60", "1080p59.94", "1080p50", "1080p30", "720p60", "HDR"],
        "formatByIO": False
    },

    # ── AJA HELO Plus ────────────────────────────────────────────────────────
    {
        "id": "aja-helo-plus",
        "category": "encoder",
        "manufacturer": "AJA",
        "model": "HELO Plus",
        "ioArchitecture": "direct",
        "inputs": [
            {"id": "sdi-in",    "type": "3G-SDI",       "label": "3G-SDI In"},
            {"id": "hdmi-in",   "type": "HDMI",         "label": "HDMI 1.4a In"},
            {"id": "audio-in",  "type": "3.5mm",        "label": "Analog Audio In (3.5mm)"}
        ],
        "outputs": [
            {"id": "sdi-out",    "type": "3G-SDI",       "label": "3G-SDI Out"},
            {"id": "hdmi-out",   "type": "HDMI",         "label": "HDMI 1.4a Out"},
            {"id": "audio-out",  "type": "3.5mm",        "label": "Analog Audio Out (3.5mm)"},
            {"id": "usb-rec",    "type": "USB",          "label": "USB 3.0 (Recording)"},
            {"id": "sd-rec",     "type": "SD Card",      "label": "SD Card Slot (Recording)"},
            {"id": "net-stream", "type": "Network (RJ45)","label": "Ethernet (Streaming / RTMP / SRT)"}
        ],
        "deviceFormats": ["1080p60", "1080p59.94", "1080p50", "1080p30", "1080i59.94", "720p60"],
        "formatByIO": False
    },

    # ── Epiphan Pearl Mini ───────────────────────────────────────────────────
    {
        "id": "epiphan-pearl-mini",
        "category": "encoder",
        "manufacturer": "Epiphan",
        "model": "Pearl Mini",
        "ioArchitecture": "direct",
        "inputs": [
            {"id": "sdi-in",     "type": "3G-SDI",       "label": "3G-SDI In"},
            {"id": "hdmi-1",     "type": "HDMI",         "label": "HDMI 1.4a In 1"},
            {"id": "hdmi-2",     "type": "HDMI",         "label": "HDMI 1.4a In 2"},
            {"id": "usb-1",      "type": "USB",          "label": "USB 3.0 In 1 (UVC)"},
            {"id": "usb-2",      "type": "USB",          "label": "USB 3.0 In 2 (UVC)"},
            {"id": "xlr-l",      "type": "XLR",          "label": "XLR Audio In L"},
            {"id": "xlr-r",      "type": "XLR",          "label": "XLR Audio In R"},
            {"id": "trs-l",      "type": "TRS",          "label": "1/4\" TRS Audio In L"},
            {"id": "trs-r",      "type": "TRS",          "label": "1/4\" TRS Audio In R"},
            {"id": "rca-l",      "type": "RCA",          "label": "RCA Audio In L"},
            {"id": "rca-r",      "type": "RCA",          "label": "RCA Audio In R"},
            {"id": "mic-in",     "type": "3.5mm",        "label": "3.5mm Mic In"},
            {"id": "net-stream", "type": "Network (RJ45)","label": "Ethernet / NDI|HX / SRT In"}
        ],
        "outputs": [
            {"id": "hdmi-out",   "type": "HDMI",          "label": "HDMI 1.4a Program Out"},
            {"id": "audio-out",  "type": "Headphone",     "label": "Headphone (3.5mm)"},
            {"id": "net-out",    "type": "Network (RJ45)","label": "Ethernet (Streaming / SRT / RTMP)"}
        ],
        "deviceFormats": ["1080p60", "1080p59.94", "1080p50", "1080p30", "1080i59.94", "720p60"],
        "formatByIO": False
    },

    # ── Epiphan Pearl-2 ──────────────────────────────────────────────────────
    {
        "id": "epiphan-pearl-2",
        "category": "encoder",
        "manufacturer": "Epiphan",
        "model": "Pearl-2",
        "ioArchitecture": "direct",
        "inputs": [
            {"id": "sdi-in-1",   "type": "12G-SDI",      "label": "12G-SDI In 1"},
            {"id": "sdi-in-2",   "type": "12G-SDI",      "label": "12G-SDI In 2"},
            {"id": "hdmi-1",     "type": "HDMI",         "label": "HDMI 1.4a In 1"},
            {"id": "hdmi-2",     "type": "HDMI",         "label": "HDMI 1.4a In 2"},
            {"id": "hdmi-4k-1",  "type": "HDMI",         "label": "4K HDMI In 1"},
            {"id": "hdmi-4k-2",  "type": "HDMI",         "label": "4K HDMI In 2"},
            {"id": "usb-1",      "type": "USB",          "label": "USB 3.0 In 1 (UVC)"},
            {"id": "usb-2",      "type": "USB",          "label": "USB 3.0 In 2 (UVC)"},
            {"id": "xlr-1",      "type": "XLR",          "label": "XLR Audio In 1"},
            {"id": "xlr-2",      "type": "XLR",          "label": "XLR Audio In 2"},
            {"id": "xlr-3",      "type": "XLR",          "label": "XLR Audio In 3"},
            {"id": "xlr-4",      "type": "XLR",          "label": "XLR Audio In 4"},
            {"id": "rca-l",      "type": "RCA",          "label": "RCA Audio In L"},
            {"id": "rca-r",      "type": "RCA",          "label": "RCA Audio In R"},
            {"id": "net-stream", "type": "Network (RJ45)","label": "Ethernet / NDI / NDI|HX / SRT In"}
        ],
        "outputs": [
            {"id": "hdmi-out-1", "type": "HDMI",          "label": "HDMI Program Out 1"},
            {"id": "hdmi-out-2", "type": "HDMI",          "label": "HDMI Program Out 2"},
            {"id": "audio-out",  "type": "Headphone",     "label": "Headphone (3.5mm)"},
            {"id": "net-out",    "type": "Network (RJ45)","label": "Ethernet (Streaming / SRT / NDI / RTMP)"}
        ],
        "deviceFormats": ["4K 30", "1080p60", "1080p59.94", "1080p50", "1080p30", "1080i59.94", "720p60"],
        "formatByIO": False
    },
]

# Ensure no duplicates before adding
existing_ids = {e["id"] for e in data}
added = 0
for entry in new_entries:
    if entry["id"] not in existing_ids:
        data.append(entry)
        existing_ids.add(entry["id"])
        added += 1
        print(f"  Added: {entry['model']}")
    else:
        print(f"  Skipped (already exists): {entry['model']}")

with open(data_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"\nAdded {added} entries. Total: {len(data)}")
encoders = [e for e in data if e.get("category") == "encoder"]
print(f"\nAll encoder entries ({len(encoders)}):")
for e in encoders:
    print(f"  [{e['id']}]  {e['model']}")
    print(f"    inputs:  {[i['label'] for i in e['inputs']]}")
    print(f"    outputs: {[o['label'] for o in e['outputs']]}")
