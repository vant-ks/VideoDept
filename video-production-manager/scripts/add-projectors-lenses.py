import json, sys, os

script_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(script_dir, '..', 'api', 'prisma', 'equipment-data.json')

with open(json_path) as f:
    data = json.load(f)

new_entries = [
  # ─── PROJECTORS ───────────────────────────────────────────────────────────
  {
    "id": "barco-udx-4k35",
    "category": "projector",
    "manufacturer": "Barco",
    "model": "UDX-4K35",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"DisplayPort","label":"DP 2"},
      {"id":"in-5","type":"12G-SDI","label":"SDI 1"},
      {"id":"in-6","type":"Ethernet","label":"Network (HDBaseT)"}
    ],
    "outputs": [],
    "deviceFormats": ["4K 60","4K 30","1080p60","WUXGA"],
    "formatByIO": False,
    "specs": {
      "lumens": 35000,
      "nativeRes": "4K (4096x2160)",
      "technology": "3-chip DLP laser",
      "lensMount": "Barco TLD+",
      "weightKg": 68,
      "laserSource": True
    }
  },
  {
    "id": "barco-udx-4k40",
    "category": "projector",
    "manufacturer": "Barco",
    "model": "UDX-4K40",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"DisplayPort","label":"DP 2"},
      {"id":"in-5","type":"12G-SDI","label":"SDI 1"},
      {"id":"in-6","type":"Ethernet","label":"Network (HDBaseT)"}
    ],
    "outputs": [],
    "deviceFormats": ["4K 60","4K 30","1080p60","WUXGA"],
    "formatByIO": False,
    "specs": {
      "lumens": 37500,
      "nativeRes": "4K (4096x2160)",
      "technology": "3-chip DLP laser",
      "lensMount": "Barco TLD+",
      "weightKg": 68,
      "laserSource": True
    }
  },
  {
    "id": "barco-udm-4k22",
    "category": "projector",
    "manufacturer": "Barco",
    "model": "UDM-4K22",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"12G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"Ethernet","label":"Network (HDBaseT)"}
    ],
    "outputs": [],
    "deviceFormats": ["4K 60","4K 30","1080p60","WUXGA"],
    "formatByIO": False,
    "specs": {
      "lumens": 22000,
      "nativeRes": "4K (4096x2160)",
      "technology": "3-chip DLP laser",
      "lensMount": "Barco TLD+",
      "weightKg": 47,
      "laserSource": True
    }
  },
  {
    "id": "barco-udx-w26",
    "category": "projector",
    "manufacturer": "Barco",
    "model": "UDX-W26",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"12G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"Ethernet","label":"Network (HDBaseT)"}
    ],
    "outputs": [],
    "deviceFormats": ["WUXGA","1080p60","1080p50"],
    "formatByIO": False,
    "specs": {
      "lumens": 26000,
      "nativeRes": "WUXGA (1920x1200)",
      "technology": "3-chip DLP laser",
      "lensMount": "Barco TLD+",
      "weightKg": 68,
      "laserSource": True
    }
  },
  {
    "id": "christie-m-4k15",
    "category": "projector",
    "manufacturer": "Christie",
    "model": "M 4K15",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"12G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"Ethernet","label":"Network"}
    ],
    "outputs": [],
    "deviceFormats": ["4K 60","4K 30","1080p60","WUXGA"],
    "formatByIO": False,
    "specs": {
      "lumens": 15000,
      "nativeRes": "4K (4096x2160)",
      "technology": "3-chip DLP laser",
      "lensMount": "Christie M-Series",
      "weightKg": 36,
      "laserSource": True
    }
  },
  {
    "id": "christie-roadster-hd20k-j",
    "category": "projector",
    "manufacturer": "Christie",
    "model": "Roadster HD20K-J",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"3G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"3G-SDI","label":"SDI 2"},
      {"id":"in-6","type":"Ethernet","label":"Network"}
    ],
    "outputs": [],
    "deviceFormats": ["1080p60","1080p50","1080i","WUXGA"],
    "formatByIO": False,
    "specs": {
      "lumens": 20000,
      "nativeRes": "1080p (1920x1080)",
      "technology": "3-chip DLP laser",
      "lensMount": "Christie Roadster",
      "weightKg": 42,
      "laserSource": True
    }
  },
  {
    "id": "christie-roadster-hd30k-j",
    "category": "projector",
    "manufacturer": "Christie",
    "model": "Roadster HD30K-J",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"3G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"3G-SDI","label":"SDI 2"},
      {"id":"in-6","type":"Ethernet","label":"Network"}
    ],
    "outputs": [],
    "deviceFormats": ["1080p60","1080p50","1080i","WUXGA"],
    "formatByIO": False,
    "specs": {
      "lumens": 30000,
      "nativeRes": "1080p (1920x1080)",
      "technology": "3-chip DLP laser",
      "lensMount": "Christie Roadster",
      "weightKg": 57,
      "laserSource": True
    }
  },
  {
    "id": "epson-eb-l30002u",
    "category": "projector",
    "manufacturer": "Epson",
    "model": "EB-L30002U",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"3G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"Ethernet","label":"Network"}
    ],
    "outputs": [],
    "deviceFormats": ["WUXGA","1080p60","1080p50"],
    "formatByIO": False,
    "specs": {
      "lumens": 30000,
      "nativeRes": "WUXGA (1920x1200)",
      "technology": "3LCD laser",
      "lensMount": "Epson ELP",
      "weightKg": 51,
      "laserSource": True
    }
  },
  {
    "id": "epson-eb-l25000u",
    "category": "projector",
    "manufacturer": "Epson",
    "model": "EB-L25000U",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"3G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"Ethernet","label":"Network"}
    ],
    "outputs": [],
    "deviceFormats": ["WUXGA","1080p60","1080p50"],
    "formatByIO": False,
    "specs": {
      "lumens": 25000,
      "nativeRes": "WUXGA (1920x1200)",
      "technology": "3LCD laser",
      "lensMount": "Epson ELP",
      "weightKg": 50,
      "laserSource": True
    }
  },
  {
    "id": "panasonic-pt-rq35k",
    "category": "projector",
    "manufacturer": "Panasonic",
    "model": "PT-RQ35K",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"12G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"Ethernet","label":"Network"}
    ],
    "outputs": [],
    "deviceFormats": ["4K 60","4K 30","1080p60","WUXGA"],
    "formatByIO": False,
    "specs": {
      "lumens": 35000,
      "nativeRes": "4K (3840x2400)",
      "technology": "3-chip DLP laser",
      "lensMount": "Panasonic ET-D3",
      "weightKg": 52,
      "laserSource": True
    }
  },
  {
    "id": "panasonic-pt-rz31k",
    "category": "projector",
    "manufacturer": "Panasonic",
    "model": "PT-RZ31K",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"12G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"Ethernet","label":"Network"}
    ],
    "outputs": [],
    "deviceFormats": ["WUXGA","1080p60","1080p50"],
    "formatByIO": False,
    "specs": {
      "lumens": 31000,
      "nativeRes": "WUXGA (1920x1200)",
      "technology": "3-chip DLP laser",
      "lensMount": "Panasonic ET-D3",
      "weightKg": 52,
      "laserSource": True
    }
  },
  {
    "id": "panasonic-pt-rz21k",
    "category": "projector",
    "manufacturer": "Panasonic",
    "model": "PT-RZ21K",
    "ioArchitecture": "direct",
    "inputs": [
      {"id":"in-1","type":"HDMI","label":"HDMI 1"},
      {"id":"in-2","type":"HDMI","label":"HDMI 2"},
      {"id":"in-3","type":"DisplayPort","label":"DP 1"},
      {"id":"in-4","type":"12G-SDI","label":"SDI 1"},
      {"id":"in-5","type":"Ethernet","label":"Network"}
    ],
    "outputs": [],
    "deviceFormats": ["WUXGA","1080p60","1080p50"],
    "formatByIO": False,
    "specs": {
      "lumens": 21000,
      "nativeRes": "WUXGA (1920x1200)",
      "technology": "3-chip DLP laser",
      "lensMount": "Panasonic ET-D3",
      "weightKg": 52,
      "laserSource": True
    }
  },

  # ─── LENSES ───────────────────────────────────────────────────────────────

  # Barco TLD+ (6)
  {
    "id": "barco-tld-plus-038",
    "category": "lens",
    "manufacturer": "Barco",
    "model": "TLD+ 0.38 Ultra Short Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "0.38:1",
      "lensMount": "Barco TLD+",
      "compatibleWith": ["barco-udx-4k35","barco-udx-4k40","barco-udm-4k22","barco-udx-w26"]
    }
  },
  {
    "id": "barco-tld-plus-069-092",
    "category": "lens",
    "manufacturer": "Barco",
    "model": "TLD+ 0.69-0.92 Short Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "0.69-0.92:1",
      "lensMount": "Barco TLD+",
      "compatibleWith": ["barco-udx-4k35","barco-udx-4k40","barco-udm-4k22","barco-udx-w26"]
    }
  },
  {
    "id": "barco-tld-plus-122-153",
    "category": "lens",
    "manufacturer": "Barco",
    "model": "TLD+ 1.22-1.53 Standard",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.22-1.53:1",
      "lensMount": "Barco TLD+",
      "compatibleWith": ["barco-udx-4k35","barco-udx-4k40","barco-udm-4k22","barco-udx-w26"]
    }
  },
  {
    "id": "barco-tld-plus-152-289",
    "category": "lens",
    "manufacturer": "Barco",
    "model": "TLD+ 1.52-2.89 Long Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.52-2.89:1",
      "lensMount": "Barco TLD+",
      "compatibleWith": ["barco-udx-4k35","barco-udx-4k40","barco-udm-4k22","barco-udx-w26"]
    }
  },
  {
    "id": "barco-tld-plus-290-550",
    "category": "lens",
    "manufacturer": "Barco",
    "model": "TLD+ 2.90-5.50 Tele",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "2.90-5.50:1",
      "lensMount": "Barco TLD+",
      "compatibleWith": ["barco-udx-4k35","barco-udx-4k40","barco-udm-4k22","barco-udx-w26"]
    }
  },
  {
    "id": "barco-tld-plus-560-890",
    "category": "lens",
    "manufacturer": "Barco",
    "model": "TLD+ 5.60-8.90 Ultra Tele",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "5.60-8.90:1",
      "lensMount": "Barco TLD+",
      "compatibleWith": ["barco-udx-4k35","barco-udx-4k40","barco-udm-4k22","barco-udx-w26"]
    }
  },

  # Christie M-Series (5)
  {
    "id": "christie-slmr-0-80",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "SLMR 0.80 Short Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "0.80:1",
      "lensMount": "Christie M-Series",
      "compatibleWith": ["christie-m-4k15","christie-m-4k25"]
    }
  },
  {
    "id": "christie-slmr-1-20-174",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "SLMR 1.20-1.74 Standard",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.20-1.74:1",
      "lensMount": "Christie M-Series",
      "compatibleWith": ["christie-m-4k15","christie-m-4k25"]
    }
  },
  {
    "id": "christie-slmr-174-237",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "SLMR 1.74-2.37 Long Standard",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.74-2.37:1",
      "lensMount": "Christie M-Series",
      "compatibleWith": ["christie-m-4k15","christie-m-4k25"]
    }
  },
  {
    "id": "christie-slmr-275-400",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "SLMR 2.75-4.00 Long Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "2.75-4.00:1",
      "lensMount": "Christie M-Series",
      "compatibleWith": ["christie-m-4k15","christie-m-4k25"]
    }
  },
  {
    "id": "christie-slmr-480-700",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "SLMR 4.80-7.00 Tele",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "4.80-7.00:1",
      "lensMount": "Christie M-Series",
      "compatibleWith": ["christie-m-4k15","christie-m-4k25"]
    }
  },

  # Christie Roadster (5)
  {
    "id": "christie-roadster-hb-073",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "Roadster HB 0.73 Short Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "0.73:1",
      "lensMount": "Christie Roadster",
      "compatibleWith": ["christie-roadster-hd20k-j","christie-roadster-hd30k-j"]
    }
  },
  {
    "id": "christie-roadster-hb-100-135",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "Roadster HB 1.00-1.35 Standard",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.00-1.35:1",
      "lensMount": "Christie Roadster",
      "compatibleWith": ["christie-roadster-hd20k-j","christie-roadster-hd30k-j"]
    }
  },
  {
    "id": "christie-roadster-hb-150-200",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "Roadster HB 1.50-2.00 Long Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.50-2.00:1",
      "lensMount": "Christie Roadster",
      "compatibleWith": ["christie-roadster-hd20k-j","christie-roadster-hd30k-j"]
    }
  },
  {
    "id": "christie-roadster-hb-260-410",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "Roadster HB 2.60-4.10 Tele",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "2.60-4.10:1",
      "lensMount": "Christie Roadster",
      "compatibleWith": ["christie-roadster-hd20k-j","christie-roadster-hd30k-j"]
    }
  },
  {
    "id": "christie-roadster-hb-550-800",
    "category": "lens",
    "manufacturer": "Christie",
    "model": "Roadster HB 5.50-8.00 Ultra Tele",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "5.50-8.00:1",
      "lensMount": "Christie Roadster",
      "compatibleWith": ["christie-roadster-hd20k-j","christie-roadster-hd30k-j"]
    }
  },

  # Epson ELP (4)
  {
    "id": "epson-elp-lw04",
    "category": "lens",
    "manufacturer": "Epson",
    "model": "ELP-LW04 Wide Angle Zoom",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "0.46-0.75:1",
      "lensMount": "Epson ELP",
      "compatibleWith": ["epson-eb-l30002u","epson-eb-l25000u"]
    }
  },
  {
    "id": "epson-elp-lm15",
    "category": "lens",
    "manufacturer": "Epson",
    "model": "ELP-LM15 Standard Zoom",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.30-2.17:1",
      "lensMount": "Epson ELP",
      "compatibleWith": ["epson-eb-l30002u","epson-eb-l25000u"]
    }
  },
  {
    "id": "epson-elp-ll08",
    "category": "lens",
    "manufacturer": "Epson",
    "model": "ELP-LL08 Long Throw Zoom",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "2.17-4.34:1",
      "lensMount": "Epson ELP",
      "compatibleWith": ["epson-eb-l30002u","epson-eb-l25000u"]
    }
  },
  {
    "id": "epson-elp-le04",
    "category": "lens",
    "manufacturer": "Epson",
    "model": "ELP-LE04 Ultra Short Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "0.35:1",
      "lensMount": "Epson ELP",
      "compatibleWith": ["epson-eb-l30002u","epson-eb-l25000u"]
    }
  },

  # Panasonic ET-D3 (6)
  {
    "id": "panasonic-et-dle085",
    "category": "lens",
    "manufacturer": "Panasonic",
    "model": "ET-DLE085 Ultra Short Throw",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "0.76-0.95:1",
      "lensMount": "Panasonic ET-D3",
      "compatibleWith": ["panasonic-pt-rq50k","panasonic-pt-rq35k","panasonic-pt-rz31k","panasonic-pt-rz21k"]
    }
  },
  {
    "id": "panasonic-et-dle105",
    "category": "lens",
    "manufacturer": "Panasonic",
    "model": "ET-DLE105 Short Throw Zoom",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.04-1.38:1",
      "lensMount": "Panasonic ET-D3",
      "compatibleWith": ["panasonic-pt-rq50k","panasonic-pt-rq35k","panasonic-pt-rz31k","panasonic-pt-rz21k"]
    }
  },
  {
    "id": "panasonic-et-dle150",
    "category": "lens",
    "manufacturer": "Panasonic",
    "model": "ET-DLE150 Standard Zoom",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "1.36-2.10:1",
      "lensMount": "Panasonic ET-D3",
      "compatibleWith": ["panasonic-pt-rq50k","panasonic-pt-rq35k","panasonic-pt-rz31k","panasonic-pt-rz21k"]
    }
  },
  {
    "id": "panasonic-et-dle250",
    "category": "lens",
    "manufacturer": "Panasonic",
    "model": "ET-DLE250 Long Throw Zoom",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "2.10-3.58:1",
      "lensMount": "Panasonic ET-D3",
      "compatibleWith": ["panasonic-pt-rq50k","panasonic-pt-rq35k","panasonic-pt-rz31k","panasonic-pt-rz21k"]
    }
  },
  {
    "id": "panasonic-et-dle350",
    "category": "lens",
    "manufacturer": "Panasonic",
    "model": "ET-DLE350 Tele Zoom",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "3.58-5.40:1",
      "lensMount": "Panasonic ET-D3",
      "compatibleWith": ["panasonic-pt-rq50k","panasonic-pt-rq35k","panasonic-pt-rz31k","panasonic-pt-rz21k"]
    }
  },
  {
    "id": "panasonic-et-dle450",
    "category": "lens",
    "manufacturer": "Panasonic",
    "model": "ET-DLE450 Ultra Tele Zoom",
    "ioArchitecture": "direct",
    "inputs": [], "outputs": [],
    "deviceFormats": [], "formatByIO": False,
    "isSecondaryDevice": True,
    "specs": {
      "throwRatio": "5.40-8.60:1",
      "lensMount": "Panasonic ET-D3",
      "compatibleWith": ["panasonic-pt-rq50k","panasonic-pt-rq35k","panasonic-pt-rz31k","panasonic-pt-rz21k"]
    }
  },
]

# Duplicate check
existing_ids = {e['id'] for e in data}
new_ids = [e['id'] for e in new_entries]
dupes = [i for i in new_ids if i in existing_ids]
if dupes:
    print(f"ERROR: duplicate IDs: {dupes}", file=sys.stderr)
    sys.exit(1)

data.extend(new_entries)

proj_count = sum(1 for e in new_entries if e['category'] == 'projector')
lens_count = sum(1 for e in new_entries if e['category'] == 'lens')
print(f"Adding {proj_count} projectors + {lens_count} lenses = {len(new_entries)} entries")
print(f"New total: {len(data)}")

with open(json_path, 'w') as f:
    json.dump(data, f, indent=2)
print("Done: equipment-data.json updated")
