import type { EquipmentSpec } from '@/types';

export const defaultEquipmentSpecs: EquipmentSpec[] = [
  // ===== CCUs (Direct I/O) =====
  {
    id: 'sony-hdcu-5500',
    category: 'ccu',
    manufacturer: 'Sony',
    model: 'HDCU-5500',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'fiber-1', type: 'SMPTE Fiber', label: 'Camera Input' },
      { id: 'ref-1', type: 'Reference', label: 'Ref In' }
    ],
    outputs: [
      { id: 'sdi-1', type: 'SDI', label: 'SDI Out 1', format: '1080i59.94' },
      { id: 'sdi-2', type: 'SDI', label: 'SDI Out 2', format: '1080i59.94' },
      { id: 'sdi-3', type: 'SDI', label: 'SDI Out 3', format: '1080i59.94' },
      { id: 'sdi-4', type: 'SDI', label: 'SDI Out 4', format: '1080i59.94' },
      { id: 'vf-1', type: 'SDI', label: 'Viewfinder', format: '1080i59.94' }
    ],
    deviceFormats: ['1080i59.94', '1080i60', '1080p59.94', '1080p60', '720p59.94', '720p60'],
    formatByIO: true
  },
  {
    id: 'sony-hdcu-3500',
    category: 'ccu',
    manufacturer: 'Sony',
    model: 'HDCU-3500',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'fiber-1', type: 'SMPTE Fiber', label: 'Camera Input' },
      { id: 'ref-1', type: 'Reference', label: 'Ref In' }
    ],
    outputs: [
      { id: 'sdi-1', type: 'SDI', label: 'SDI Out 1', format: '1080i59.94' },
      { id: 'sdi-2', type: 'SDI', label: 'SDI Out 2', format: '1080i59.94' },
      { id: 'vf-1', type: 'SDI', label: 'Viewfinder', format: '1080i59.94' }
    ],
    deviceFormats: ['1080i59.94', '1080i60', '1080p59.94', '1080p60', '720p59.94', '720p60'],
    formatByIO: true
  },
  {
    id: 'panasonic-ak-ucu600',
    category: 'ccu',
    manufacturer: 'Panasonic',
    model: 'AK-UCU600',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'fiber-1', type: 'SMPTE Fiber', label: 'Camera Input' },
      { id: 'ref-1', type: 'Reference', label: 'Ref In' }
    ],
    outputs: [
      { id: 'sdi-1', type: '12G-SDI', label: 'SDI Out 1', format: '4K 59.94' },
      { id: 'sdi-2', type: '12G-SDI', label: 'SDI Out 2', format: '4K 59.94' },
      { id: 'sdi-3', type: '12G-SDI', label: 'SDI Out 3', format: '4K 59.94' },
      { id: 'vf-1', type: 'SDI', label: 'Viewfinder', format: '1080p59.94' }
    ],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50'],
    formatByIO: true
  },

  // ===== Cameras (Direct I/O) =====
  {
    id: 'sony-hdc-5500',
    category: 'camera',
    manufacturer: 'Sony',
    model: 'HDC-5500',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'ref-1', type: 'Reference', label: 'Ref In' }
    ],
    outputs: [
      { id: 'fiber-1', type: 'SMPTE Fiber', label: 'To CCU' }
    ],
    deviceFormats: ['1080i59.94', '1080i60', '1080p59.94', '1080p60', '720p59.94', '720p60'],
    formatByIO: false
  },
  {
    id: 'panasonic-ak-uc4000',
    category: 'camera',
    manufacturer: 'Panasonic',
    model: 'AK-UC4000',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'ref-1', type: 'Reference', label: 'Ref In' }
    ],
    outputs: [
      { id: 'fiber-1', type: 'SMPTE Fiber', label: 'To CCU' }
    ],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60'],
    formatByIO: false
  },
  {
    id: 'sony-hdc-3500',
    category: 'camera',
    manufacturer: 'Sony',
    model: 'HDC-3500',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'ref-1', type: 'Reference', label: 'Ref In' }
    ],
    outputs: [
      { id: 'fiber-1', type: 'SMPTE Fiber', label: 'To CCU' }
    ],
    deviceFormats: ['1080i59.94', '1080i60', '1080p59.94', '1080p60', '720p59.94', '720p60'],
    formatByIO: false
  },

  // ===== Switchers (Card-based) =====
  {
    id: 'grass-valley-korona-k-frame',
    category: 'switcher',
    manufacturer: 'Grass Valley',
    model: 'Korona K-Frame',
    ioArchitecture: 'card-based',
    cardSlots: 20,
    cards: [
      {
        id: 'card-1',
        slotNumber: 1,
        inputs: [
          { id: 'in-1', type: '12G-SDI', label: 'Input 1' },
          { id: 'in-2', type: '12G-SDI', label: 'Input 2' },
          { id: 'in-3', type: '12G-SDI', label: 'Input 3' },
          { id: 'in-4', type: '12G-SDI', label: 'Input 4' }
        ],
        outputs: []
      },
      {
        id: 'card-2',
        slotNumber: 2,
        inputs: [],
        outputs: [
          { id: 'out-1', type: '12G-SDI', label: 'Output 1' },
          { id: 'out-2', type: '12G-SDI', label: 'Output 2' },
          { id: 'out-3', type: '12G-SDI', label: 'Output 3' },
          { id: 'out-4', type: '12G-SDI', label: 'Output 4' }
        ]
      }
    ],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080i59.94'],
    formatByIO: false
  },
  {
    id: 'ross-acuity',
    category: 'switcher',
    manufacturer: 'Ross',
    model: 'Acuity',
    ioArchitecture: 'card-based',
    cardSlots: 16,
    cards: [],
    deviceFormats: ['4K 59.94', '4K 60', '1080p59.94', '1080p60', '1080i59.94'],
    formatByIO: false
  },

  // ===== Routers (Card-based) =====
  {
    id: 'evertz-exeqip',
    category: 'router',
    manufacturer: 'Evertz',
    model: 'EXE-QIP',
    ioArchitecture: 'card-based',
    cardSlots: 32,
    cards: [
      {
        id: 'card-1',
        slotNumber: 1,
        inputs: [
          { id: 'in-1', type: '12G-SDI', label: 'Input 1' },
          { id: 'in-2', type: '12G-SDI', label: 'Input 2' }
        ],
        outputs: [
          { id: 'out-1', type: '12G-SDI', label: 'Output 1' },
          { id: 'out-2', type: '12G-SDI', label: 'Output 2' }
        ]
      }
    ],
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD'],
    formatByIO: true
  },
  {
    id: 'imagine-platinum-ip3',
    category: 'router',
    manufacturer: 'Imagine Communications',
    model: 'Platinum IP3',
    ioArchitecture: 'card-based',
    cardSlots: 24,
    cards: [],
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD', 'IP'],
    formatByIO: true
  },

  // ===== Processors (Direct I/O) =====
  {
    id: 'barco-e2',
    category: 'led-processor',
    manufacturer: 'Barco',
    model: 'E2',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-2', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-6', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-2', type: 'DisplayPort', label: 'DP Out 2' },
      { id: 'out-3', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-4', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'analog-way-midra-4k',
    category: 'led-processor',
    manufacturer: 'Analog Way',
    model: 'Midra 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: '12G-SDI', label: 'SDI Out 1' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'blackmagic-teranex-av',
    category: 'led-processor',
    manufacturer: 'Blackmagic Design',
    model: 'Teranex AV',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'in-4', type: '12G-SDI', label: 'SDI In 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-4', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p30', '1080i59.94'],
    formatByIO: true
  },

  // ===== LED Tiles (Direct I/O) =====
  {
    id: 'roe-black-pearl-bp2v2',
    category: 'led-tile',
    manufacturer: 'ROE Visual',
    model: 'Black Pearl BP2V2',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'Ethernet', label: 'Data In' },
      { id: 'in-2', type: 'Power', label: 'Power In' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'Data Out' },
      { id: 'out-2', type: 'Power', label: 'Power Out' }
    ],
    deviceFormats: ['LED'],
    formatByIO: false
  },
  {
    id: 'absen-acclaim-plus',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'Acclaim Plus',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'Ethernet', label: 'Data In' },
      { id: 'in-2', type: 'Power', label: 'Power In' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'Data Out' },
      { id: 'out-2', type: 'Power', label: 'Power Out' }
    ],
    deviceFormats: ['LED'],
    formatByIO: false
  },

  // ===== Projectors (Direct I/O) =====
  {
    id: 'christie-m-4k25',
    category: 'projector',
    manufacturer: 'Christie',
    model: 'M 4K25',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-5', type: 'Ethernet', label: 'Network' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'WUXGA'],
    formatByIO: false
  },
  {
    id: 'panasonic-pt-rq50k',
    category: 'projector',
    manufacturer: 'Panasonic',
    model: 'PT-RQ50K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '1080p60', 'WUXGA'],
    formatByIO: false
  },

  // ===== Recorders (Direct I/O) =====
  {
    id: 'atomos-shogun-ultra',
    category: 'recorder',
    manufacturer: 'Atomos',
    model: 'Shogun Ultra',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI In' },
      { id: 'in-2', type: '12G-SDI', label: 'SDI In' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out' },
      { id: 'out-2', type: '12G-SDI', label: 'SDI Out' }
    ],
    deviceFormats: ['4K 60', '1080p60', 'ProRes', 'DNxHD'],
    formatByIO: false
  },
  {
    id: 'blackmagic-hyperdeck-extreme',
    category: 'recorder',
    manufacturer: 'Blackmagic Design',
    model: 'HyperDeck Extreme 8K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-2', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'out-3', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['8K', '4K 60', '1080p60', 'ProRes', 'DNxHD'],
    formatByIO: false
  },

  // ===== Monitors (Direct I/O) =====
  {
    id: 'sony-bvm-hx310',
    category: 'monitor',
    manufacturer: 'Sony',
    model: 'BVM-HX310',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI In' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP In' }
    ],
    outputs: [
      { id: 'out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-2', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '1080p60', 'HDR'],
    formatByIO: false
  },
  {
    id: 'flanders-scientific-xm311k',
    category: 'monitor',
    manufacturer: 'Flanders Scientific',
    model: 'XM311K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'out-1', type: '12G-SDI', label: 'SDI Out' }
    ],
    deviceFormats: ['4K 60', '1080p60', 'HDR'],
    formatByIO: false
  },

  // ===== Converters / Secondary Devices =====
  {
    id: 'aja-hi5-4k',
    category: 'converter',
    manufacturer: 'AJA',
    model: 'Hi5-4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: '12G-SDI', label: 'SDI In' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 60', '1080p60', '1080i60'],
    formatByIO: false
  },
  {
    id: 'aja-ha5-4k',
    category: 'converter',
    manufacturer: 'AJA',
    model: 'HA5-4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'out-1', type: '12G-SDI', label: 'SDI Out' }
    ],
    deviceFormats: ['4K 60', '1080p60', '1080i60'],
    formatByIO: false
  },
  {
    id: 'blackmagic-mini-converter-sdi-hdmi',
    category: 'converter',
    manufacturer: 'Blackmagic Design',
    model: 'Mini Converter SDI to HDMI 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'SDI', label: 'SDI In' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 60', '1080p60', '1080i60'],
    formatByIO: false
  },
  {
    id: 'blackmagic-mini-converter-hdmi-sdi',
    category: 'converter',
    manufacturer: 'Blackmagic Design',
    model: 'Mini Converter HDMI to SDI 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'out-1', type: 'SDI', label: 'SDI Out' }
    ],
    deviceFormats: ['4K 60', '1080p60', '1080i60'],
    formatByIO: false
  },
  {
    id: 'decimator-md-hx',
    category: 'converter',
    manufacturer: 'Decimator',
    model: 'MD-HX',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-hdmi', type: 'HDMI', label: 'HDMI In' },
      { id: 'in-sdi', type: '3G-SDI', label: 'SDI In' }
    ],
    outputs: [
      { id: 'out-hdmi', type: 'HDMI', label: 'HDMI Out' },
      { id: 'out-sdi-1', type: '3G-SDI', label: 'SDI Out 1' },
      { id: 'out-sdi-2', type: '3G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['1080p60', '1080i60', '720p60'],
    formatByIO: false
  },
  {
    id: 'muxlab-hdmi-fiber',
    category: 'converter',
    manufacturer: 'MuxLab',
    model: '500466 HDMI Fiber Extender',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'out-1', type: 'SMPTE Fiber', label: 'Fiber Out' }
    ],
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: false
  }
];
