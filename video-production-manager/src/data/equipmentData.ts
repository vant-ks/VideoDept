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

  // ===== Cam Switchers (Card-based) =====
  {
    id: 'grass-valley-korona-k-frame',
    category: 'cam-switcher',
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
    category: 'cam-switcher',
    manufacturer: 'Ross',
    model: 'Acuity',
    ioArchitecture: 'card-based',
    cardSlots: 16,
    cards: [],
    deviceFormats: ['4K 59.94', '4K 60', '1080p59.94', '1080p60', '1080i59.94'],
    formatByIO: false
  },
  {
    id: 'ross-carbonite-hypermax',
    category: 'cam-switcher',
    manufacturer: 'Ross',
    model: 'Carbonite HyperMax',
    ioArchitecture: 'card-based',
    cardSlots: 32,
    cards: [],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50', '1080i59.94', '1080i60', '1080i50'],
    formatByIO: false
  },
  {
    id: 'ross-ultrix-acuity',
    category: 'cam-switcher',
    manufacturer: 'Ross',
    model: 'Ultrix Acuity',
    ioArchitecture: 'card-based',
    cardSlots: 24,
    cards: [],
    deviceFormats: ['4K 59.94', '4K 60', '1080p59.94', '1080p60', '1080i59.94'],
    formatByIO: false
  },
  {
    id: 'ross-ultrix-carbonite',
    category: 'cam-switcher',
    manufacturer: 'Ross',
    model: 'Ultrix Carbonite',
    ioArchitecture: 'card-based',
    cardSlots: 32,
    cards: [],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50', '1080i59.94', '1080i60', '1080i50'],
    formatByIO: false
  },
  {
    id: 'ross-carbonite-ultra-60',
    category: 'cam-switcher',
    manufacturer: 'Ross',
    model: 'Carbonite Ultra 60',
    ioArchitecture: 'card-based',
    cardSlots: 20,
    cards: [],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50', '1080i59.94', '1080i60', '1080i50'],
    formatByIO: false
  },
  {
    id: 'ross-carbonite-ultra',
    category: 'cam-switcher',
    manufacturer: 'Ross',
    model: 'Carbonite Ultra',
    ioArchitecture: 'card-based',
    cardSlots: 16,
    cards: [],
    deviceFormats: ['4K 59.94', '4K 60', '1080p59.94', '1080p60', '1080i59.94'],
    formatByIO: false
  },
  {
    id: 'ross-carbonite-ultra-solo',
    category: 'cam-switcher',
    manufacturer: 'Ross',
    model: 'Carbonite Ultra Solo',
    ioArchitecture: 'card-based',
    cardSlots: 12,
    cards: [],
    deviceFormats: ['4K 59.94', '4K 60', '1080p59.94', '1080p60', '1080i59.94'],
    formatByIO: false
  },
  {
    id: 'blackmagic-atem-1me-constellation-4k',
    category: 'cam-switcher',
    manufacturer: 'Blackmagic Design',
    model: 'ATEM 1 M/E Constellation 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'sdi-in-3', type: '12G-SDI', label: 'SDI In 3' },
      { id: 'sdi-in-4', type: '12G-SDI', label: 'SDI In 4' },
      { id: 'sdi-in-5', type: '12G-SDI', label: 'SDI In 5' },
      { id: 'sdi-in-6', type: '12G-SDI', label: 'SDI In 6' },
      { id: 'sdi-in-7', type: '12G-SDI', label: 'SDI In 7' },
      { id: 'sdi-in-8', type: '12G-SDI', label: 'SDI In 8' },
      { id: 'hdmi-in-1', type: 'HDMI', label: 'HDMI In 1' },
      { id: 'hdmi-in-2', type: 'HDMI', label: 'HDMI In 2' },
      { id: 'hdmi-in-3', type: 'HDMI', label: 'HDMI In 3' },
      { id: 'hdmi-in-4', type: 'HDMI', label: 'HDMI In 4' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'sdi-out-3', type: '12G-SDI', label: 'SDI Out 3' },
      { id: 'sdi-out-4', type: '12G-SDI', label: 'SDI Out 4' },
      { id: 'sdi-out-5', type: '12G-SDI', label: 'SDI Out 5' },
      { id: 'sdi-out-6', type: '12G-SDI', label: 'SDI Out 6' },
      { id: 'hdmi-out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'hdmi-out-2', type: 'HDMI', label: 'HDMI Out 2' }
    ],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50', '1080i59.94', '1080i60', '1080i50'],
    formatByIO: false
  },
  {
    id: 'blackmagic-atem-2me-constellation-4k',
    category: 'cam-switcher',
    manufacturer: 'Blackmagic Design',
    model: 'ATEM 2 M/E Constellation 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'sdi-in-3', type: '12G-SDI', label: 'SDI In 3' },
      { id: 'sdi-in-4', type: '12G-SDI', label: 'SDI In 4' },
      { id: 'sdi-in-5', type: '12G-SDI', label: 'SDI In 5' },
      { id: 'sdi-in-6', type: '12G-SDI', label: 'SDI In 6' },
      { id: 'sdi-in-7', type: '12G-SDI', label: 'SDI In 7' },
      { id: 'sdi-in-8', type: '12G-SDI', label: 'SDI In 8' },
      { id: 'sdi-in-9', type: '12G-SDI', label: 'SDI In 9' },
      { id: 'sdi-in-10', type: '12G-SDI', label: 'SDI In 10' },
      { id: 'sdi-in-11', type: '12G-SDI', label: 'SDI In 11' },
      { id: 'sdi-in-12', type: '12G-SDI', label: 'SDI In 12' },
      { id: 'hdmi-in-1', type: 'HDMI', label: 'HDMI In 1' },
      { id: 'hdmi-in-2', type: 'HDMI', label: 'HDMI In 2' },
      { id: 'hdmi-in-3', type: 'HDMI', label: 'HDMI In 3' },
      { id: 'hdmi-in-4', type: 'HDMI', label: 'HDMI In 4' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'sdi-out-3', type: '12G-SDI', label: 'SDI Out 3' },
      { id: 'sdi-out-4', type: '12G-SDI', label: 'SDI Out 4' },
      { id: 'sdi-out-5', type: '12G-SDI', label: 'SDI Out 5' },
      { id: 'sdi-out-6', type: '12G-SDI', label: 'SDI Out 6' },
      { id: 'sdi-out-7', type: '12G-SDI', label: 'SDI Out 7' },
      { id: 'sdi-out-8', type: '12G-SDI', label: 'SDI Out 8' },
      { id: 'hdmi-out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'hdmi-out-2', type: 'HDMI', label: 'HDMI Out 2' }
    ],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50', '1080i59.94', '1080i60', '1080i50'],
    formatByIO: false
  },
  {
    id: 'blackmagic-atem-4me-constellation-4k',
    category: 'cam-switcher',
    manufacturer: 'Blackmagic Design',
    model: 'ATEM 4 M/E Constellation 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'sdi-in-3', type: '12G-SDI', label: 'SDI In 3' },
      { id: 'sdi-in-4', type: '12G-SDI', label: 'SDI In 4' },
      { id: 'sdi-in-5', type: '12G-SDI', label: 'SDI In 5' },
      { id: 'sdi-in-6', type: '12G-SDI', label: 'SDI In 6' },
      { id: 'sdi-in-7', type: '12G-SDI', label: 'SDI In 7' },
      { id: 'sdi-in-8', type: '12G-SDI', label: 'SDI In 8' },
      { id: 'sdi-in-9', type: '12G-SDI', label: 'SDI In 9' },
      { id: 'sdi-in-10', type: '12G-SDI', label: 'SDI In 10' },
      { id: 'sdi-in-11', type: '12G-SDI', label: 'SDI In 11' },
      { id: 'sdi-in-12', type: '12G-SDI', label: 'SDI In 12' },
      { id: 'sdi-in-13', type: '12G-SDI', label: 'SDI In 13' },
      { id: 'sdi-in-14', type: '12G-SDI', label: 'SDI In 14' },
      { id: 'sdi-in-15', type: '12G-SDI', label: 'SDI In 15' },
      { id: 'sdi-in-16', type: '12G-SDI', label: 'SDI In 16' },
      { id: 'hdmi-in-1', type: 'HDMI', label: 'HDMI In 1' },
      { id: 'hdmi-in-2', type: 'HDMI', label: 'HDMI In 2' },
      { id: 'hdmi-in-3', type: 'HDMI', label: 'HDMI In 3' },
      { id: 'hdmi-in-4', type: 'HDMI', label: 'HDMI In 4' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'sdi-out-3', type: '12G-SDI', label: 'SDI Out 3' },
      { id: 'sdi-out-4', type: '12G-SDI', label: 'SDI Out 4' },
      { id: 'sdi-out-5', type: '12G-SDI', label: 'SDI Out 5' },
      { id: 'sdi-out-6', type: '12G-SDI', label: 'SDI Out 6' },
      { id: 'sdi-out-7', type: '12G-SDI', label: 'SDI Out 7' },
      { id: 'sdi-out-8', type: '12G-SDI', label: 'SDI Out 8' },
      { id: 'sdi-out-9', type: '12G-SDI', label: 'SDI Out 9' },
      { id: 'sdi-out-10', type: '12G-SDI', label: 'SDI Out 10' },
      { id: 'hdmi-out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'hdmi-out-2', type: 'HDMI', label: 'HDMI Out 2' }
    ],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50', '1080i59.94', '1080i60', '1080i50'],
    formatByIO: false
  },
  {
    id: 'blackmagic-atem-4me-constellation-4k-plus',
    category: 'cam-switcher',
    manufacturer: 'Blackmagic Design',
    model: 'ATEM 4 M/E Constellation 4K Plus',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'sdi-in-3', type: '12G-SDI', label: 'SDI In 3' },
      { id: 'sdi-in-4', type: '12G-SDI', label: 'SDI In 4' },
      { id: 'sdi-in-5', type: '12G-SDI', label: 'SDI In 5' },
      { id: 'sdi-in-6', type: '12G-SDI', label: 'SDI In 6' },
      { id: 'sdi-in-7', type: '12G-SDI', label: 'SDI In 7' },
      { id: 'sdi-in-8', type: '12G-SDI', label: 'SDI In 8' },
      { id: 'sdi-in-9', type: '12G-SDI', label: 'SDI In 9' },
      { id: 'sdi-in-10', type: '12G-SDI', label: 'SDI In 10' },
      { id: 'sdi-in-11', type: '12G-SDI', label: 'SDI In 11' },
      { id: 'sdi-in-12', type: '12G-SDI', label: 'SDI In 12' },
      { id: 'sdi-in-13', type: '12G-SDI', label: 'SDI In 13' },
      { id: 'sdi-in-14', type: '12G-SDI', label: 'SDI In 14' },
      { id: 'sdi-in-15', type: '12G-SDI', label: 'SDI In 15' },
      { id: 'sdi-in-16', type: '12G-SDI', label: 'SDI In 16' },
      { id: 'sdi-in-17', type: '12G-SDI', label: 'SDI In 17' },
      { id: 'sdi-in-18', type: '12G-SDI', label: 'SDI In 18' },
      { id: 'sdi-in-19', type: '12G-SDI', label: 'SDI In 19' },
      { id: 'sdi-in-20', type: '12G-SDI', label: 'SDI In 20' },
      { id: 'hdmi-in-1', type: 'HDMI', label: 'HDMI In 1' },
      { id: 'hdmi-in-2', type: 'HDMI', label: 'HDMI In 2' },
      { id: 'hdmi-in-3', type: 'HDMI', label: 'HDMI In 3' },
      { id: 'hdmi-in-4', type: 'HDMI', label: 'HDMI In 4' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'sdi-out-3', type: '12G-SDI', label: 'SDI Out 3' },
      { id: 'sdi-out-4', type: '12G-SDI', label: 'SDI Out 4' },
      { id: 'sdi-out-5', type: '12G-SDI', label: 'SDI Out 5' },
      { id: 'sdi-out-6', type: '12G-SDI', label: 'SDI Out 6' },
      { id: 'sdi-out-7', type: '12G-SDI', label: 'SDI Out 7' },
      { id: 'sdi-out-8', type: '12G-SDI', label: 'SDI Out 8' },
      { id: 'sdi-out-9', type: '12G-SDI', label: 'SDI Out 9' },
      { id: 'sdi-out-10', type: '12G-SDI', label: 'SDI Out 10' },
      { id: 'sdi-out-11', type: '12G-SDI', label: 'SDI Out 11' },
      { id: 'sdi-out-12', type: '12G-SDI', label: 'SDI Out 12' },
      { id: 'hdmi-out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'hdmi-out-2', type: 'HDMI', label: 'HDMI Out 2' }
    ],
    deviceFormats: ['4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50', '1080i59.94', '1080i60', '1080i50'],
    formatByIO: false
  },
  {
    id: 'blackmagic-atem-constellation-8k',
    category: 'cam-switcher',
    manufacturer: 'Blackmagic Design',
    model: 'ATEM Constellation 8K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'sdi-in-3', type: '12G-SDI', label: 'SDI In 3' },
      { id: 'sdi-in-4', type: '12G-SDI', label: 'SDI In 4' },
      { id: 'sdi-in-5', type: '12G-SDI', label: 'SDI In 5' },
      { id: 'sdi-in-6', type: '12G-SDI', label: 'SDI In 6' },
      { id: 'sdi-in-7', type: '12G-SDI', label: 'SDI In 7' },
      { id: 'sdi-in-8', type: '12G-SDI', label: 'SDI In 8' },
      { id: 'sdi-in-9', type: '12G-SDI', label: 'SDI In 9' },
      { id: 'sdi-in-10', type: '12G-SDI', label: 'SDI In 10' },
      { id: 'sdi-in-11', type: '12G-SDI', label: 'SDI In 11' },
      { id: 'sdi-in-12', type: '12G-SDI', label: 'SDI In 12' },
      { id: 'sdi-in-13', type: '12G-SDI', label: 'SDI In 13' },
      { id: 'sdi-in-14', type: '12G-SDI', label: 'SDI In 14' },
      { id: 'sdi-in-15', type: '12G-SDI', label: 'SDI In 15' },
      { id: 'sdi-in-16', type: '12G-SDI', label: 'SDI In 16' },
      { id: 'hdmi-in-1', type: 'HDMI', label: 'HDMI In 1' },
      { id: 'hdmi-in-2', type: 'HDMI', label: 'HDMI In 2' },
      { id: 'hdmi-in-3', type: 'HDMI', label: 'HDMI In 3' },
      { id: 'hdmi-in-4', type: 'HDMI', label: 'HDMI In 4' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'sdi-out-3', type: '12G-SDI', label: 'SDI Out 3' },
      { id: 'sdi-out-4', type: '12G-SDI', label: 'SDI Out 4' },
      { id: 'sdi-out-5', type: '12G-SDI', label: 'SDI Out 5' },
      { id: 'sdi-out-6', type: '12G-SDI', label: 'SDI Out 6' },
      { id: 'sdi-out-7', type: '12G-SDI', label: 'SDI Out 7' },
      { id: 'sdi-out-8', type: '12G-SDI', label: 'SDI Out 8' },
      { id: 'sdi-out-9', type: '12G-SDI', label: 'SDI Out 9' },
      { id: 'sdi-out-10', type: '12G-SDI', label: 'SDI Out 10' },
      { id: 'hdmi-out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'hdmi-out-2', type: 'HDMI', label: 'HDMI Out 2' }
    ],
    deviceFormats: ['8K 59.94', '8K 60', '8K 50', '4K 59.94', '4K 60', '4K 50', '1080p59.94', '1080p60', '1080p50', '1080i59.94', '1080i60', '1080i50'],
    formatByIO: false
  },

  // ===== Vision Switchers (Direct I/O) =====
  {
    id: 'barco-pds4k',
    category: 'vision-switcher',
    manufacturer: 'Barco',
    model: 'PDS-4K',
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
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'barco-e2-gen2',
    category: 'vision-switcher',
    manufacturer: 'Barco',
    model: 'E2 Gen 2',
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
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'barco-e3',
    category: 'vision-switcher',
    manufacturer: 'Barco',
    model: 'E3',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-2', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 3' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 4' },
      { id: 'in-5', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-6', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-7', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-8', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-2', type: 'DisplayPort', label: 'DP Out 2' },
      { id: 'out-3', type: 'DisplayPort', label: 'DP Out 3' },
      { id: 'out-4', type: 'DisplayPort', label: 'DP Out 4' },
      { id: 'out-5', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-6', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['8K 30', '4K 120', '4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'pixelhue-q8',
    category: 'vision-switcher',
    manufacturer: 'Pixelhue',
    model: 'Q8',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI 4' },
      { id: 'in-5', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-6', type: 'DisplayPort', label: 'DP 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-4', type: 'DisplayPort', label: 'DP Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'pixelhue-p80',
    category: 'vision-switcher',
    manufacturer: 'Pixelhue',
    model: 'P80',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI 4' },
      { id: 'in-5', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-6', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-7', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-8', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-4', type: 'DisplayPort', label: 'DP Out 2' },
      { id: 'out-5', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-6', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'pixelhue-p20',
    category: 'vision-switcher',
    manufacturer: 'Pixelhue',
    model: 'P20',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: 'DisplayPort', label: 'DP Out 1' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'christie-spyder-s',
    category: 'vision-switcher',
    manufacturer: 'Christie',
    model: 'Spyder S',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-6', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-2', type: 'DisplayPort', label: 'DP Out 2' },
      { id: 'out-3', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-4', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'christie-spyder-x80',
    category: 'vision-switcher',
    manufacturer: 'Christie',
    model: 'Spyder X80',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI 4' },
      { id: 'in-5', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-6', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-7', type: 'DisplayPort', label: 'DP 3' },
      { id: 'in-8', type: 'DisplayPort', label: 'DP 4' },
      { id: 'in-9', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-10', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-2', type: 'DisplayPort', label: 'DP Out 2' },
      { id: 'out-3', type: 'DisplayPort', label: 'DP Out 3' },
      { id: 'out-4', type: 'DisplayPort', label: 'DP Out 4' },
      { id: 'out-5', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-6', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'analog-way-aquilon-rs2',
    category: 'vision-switcher',
    manufacturer: 'Analog Way',
    model: 'Aquilon RS2',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-6', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-4', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-5', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'analog-way-aquilon-rs4',
    category: 'vision-switcher',
    manufacturer: 'Analog Way',
    model: 'Aquilon RS4',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI 4' },
      { id: 'in-5', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-6', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-7', type: 'DisplayPort', label: 'DP 3' },
      { id: 'in-8', type: 'DisplayPort', label: 'DP 4' },
      { id: 'in-9', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-10', type: '12G-SDI', label: 'SDI 2' },
      { id: 'in-11', type: '12G-SDI', label: 'SDI 3' },
      { id: 'in-12', type: '12G-SDI', label: 'SDI 4' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-4', type: 'DisplayPort', label: 'DP Out 2' },
      { id: 'out-5', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-6', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'out-7', type: '12G-SDI', label: 'SDI Out 3' },
      { id: 'out-8', type: '12G-SDI', label: 'SDI Out 4' }
    ],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'analog-way-aquilon-rs6',
    category: 'vision-switcher',
    manufacturer: 'Analog Way',
    model: 'Aquilon RS6',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI 4' },
      { id: 'in-5', type: 'HDMI', label: 'HDMI 5' },
      { id: 'in-6', type: 'HDMI', label: 'HDMI 6' },
      { id: 'in-7', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-8', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-9', type: 'DisplayPort', label: 'DP 3' },
      { id: 'in-10', type: 'DisplayPort', label: 'DP 4' },
      { id: 'in-11', type: 'DisplayPort', label: 'DP 5' },
      { id: 'in-12', type: 'DisplayPort', label: 'DP 6' },
      { id: 'in-13', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-14', type: '12G-SDI', label: 'SDI 2' },
      { id: 'in-15', type: '12G-SDI', label: 'SDI 3' },
      { id: 'in-16', type: '12G-SDI', label: 'SDI 4' },
      { id: 'in-17', type: '12G-SDI', label: 'SDI 5' },
      { id: 'in-18', type: '12G-SDI', label: 'SDI 6' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: 'HDMI', label: 'HDMI Out 3' },
      { id: 'out-4', type: 'DisplayPort', label: 'DP Out 1' },
      { id: 'out-5', type: 'DisplayPort', label: 'DP Out 2' },
      { id: 'out-6', type: 'DisplayPort', label: 'DP Out 3' },
      { id: 'out-7', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'out-8', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'out-9', type: '12G-SDI', label: 'SDI Out 3' },
      { id: 'out-10', type: '12G-SDI', label: 'SDI Out 4' },
      { id: 'out-11', type: '12G-SDI', label: 'SDI Out 5' },
      { id: 'out-12', type: '12G-SDI', label: 'SDI Out 6' }
    ],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', 'Custom'],
    formatByIO: true
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
  {
    id: 'lightware-mmx4x2-ht200',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MMX4x2-HT200',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI/TPS In 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI/TPS In 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI/TPS In 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI/TPS In 4' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI/TPS Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI/TPS Out 2' }
    ],
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mmx6x2-ht200',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MMX6x2-HT200',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI/TPS In 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI/TPS In 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI/TPS In 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI/TPS In 4' },
      { id: 'in-5', type: 'HDMI', label: 'HDMI/TPS In 5' },
      { id: 'in-6', type: 'HDMI', label: 'HDMI/TPS In 6' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI/TPS Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI/TPS Out 2' }
    ],
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-4x4-hdmi20-ca',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-4x4-HDMI20-CA',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI In 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI In 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI In 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI In 4' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out 1' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out 2' },
      { id: 'out-3', type: 'HDMI', label: 'HDMI Out 3' },
      { id: 'out-4', type: 'HDMI', label: 'HDMI Out 4' }
    ],
    deviceFormats: ['4K 60 4:4:4', '4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-16x16-hdmi20-r',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-16x16-HDMI20-R',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 16 }, (_, i) => ({ id: `in-${i + 1}`, type: 'HDMI', label: `HDMI In ${i + 1}` })),
    outputs: Array.from({ length: 16 }, (_, i) => ({ id: `out-${i + 1}`, type: 'HDMI', label: `HDMI Out ${i + 1}` })),
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-8x8-hdmi20-l',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-8x8-HDMI20-L',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 8 }, (_, i) => ({ id: `in-${i + 1}`, type: 'HDMI', label: `HDMI In ${i + 1}` })),
    outputs: Array.from({ length: 8 }, (_, i) => ({ id: `out-${i + 1}`, type: 'HDMI', label: `HDMI Out ${i + 1}` })),
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-8x8-dh-8dpi-a',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-8x8-DH-8DPi-A',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 8 }, (_, i) => ({ id: `in-${i + 1}`, type: i < 4 ? 'DisplayPort' : 'HDMI', label: i < 4 ? `DP In ${i + 1}` : `HDMI In ${i - 3}` })),
    outputs: Array.from({ length: 8 }, (_, i) => ({ id: `out-${i + 1}`, type: i < 4 ? 'DisplayPort' : 'HDMI', label: i < 4 ? `DP Out ${i + 1}` : `HDMI Out ${i - 3}` })),
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-16x16-dh-8dpi-a-r',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-16x16-DH-8DPi-A-R',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 16 }, (_, i) => ({ id: `in-${i + 1}`, type: i < 8 ? 'DisplayPort' : 'HDMI', label: i < 8 ? `DP In ${i + 1}` : `HDMI In ${i - 7}` })),
    outputs: Array.from({ length: 16 }, (_, i) => ({ id: `out-${i + 1}`, type: i < 8 ? 'DisplayPort' : 'HDMI', label: i < 8 ? `DP Out ${i + 1}` : `HDMI Out ${i - 7}` })),
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-8x8-dh-8dpio-a',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-8x8-DH-8DPio-A',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 8 }, (_, i) => ({ id: `in-${i + 1}`, type: i < 4 ? 'DisplayPort' : 'HDMI', label: i < 4 ? `DP In ${i + 1}` : `HDMI In ${i - 3}` })),
    outputs: Array.from({ length: 8 }, (_, i) => ({ id: `out-${i + 1}`, type: i < 4 ? 'DisplayPort' : 'HDMI', label: i < 4 ? `DP Out ${i + 1}` : `HDMI Out ${i - 3}` })),
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-24x24-dh-12dpi-r',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-24x24-DH-12DPI-R',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 24 }, (_, i) => ({ id: `in-${i + 1}`, type: i < 12 ? 'DisplayPort' : 'HDMI', label: i < 12 ? `DP In ${i + 1}` : `HDMI In ${i - 11}` })),
    outputs: Array.from({ length: 24 }, (_, i) => ({ id: `out-${i + 1}`, type: i < 12 ? 'DisplayPort' : 'HDMI', label: i < 12 ? `DP Out ${i + 1}` : `HDMI Out ${i - 11}` })),
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-32x32-dh-16dpi-a-r',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-32x32-DH-16DPi-A-R',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 32 }, (_, i) => ({ id: `in-${i + 1}`, type: i < 16 ? 'DisplayPort' : 'HDMI', label: i < 16 ? `DP In ${i + 1}` : `HDMI In ${i - 15}` })),
    outputs: Array.from({ length: 32 }, (_, i) => ({ id: `out-${i + 1}`, type: i < 16 ? 'DisplayPort' : 'HDMI', label: i < 16 ? `DP Out ${i + 1}` : `HDMI Out ${i - 15}` })),
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'lightware-mx2-48x48-dh-48dpi-a-r',
    category: 'router',
    manufacturer: 'Lightware',
    model: 'MX2-48x48-DH-48DPi-A-R',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 48 }, (_, i) => ({ id: `in-${i + 1}`, type: i < 24 ? 'DisplayPort' : 'HDMI', label: i < 24 ? `DP In ${i + 1}` : `HDMI In ${i - 23}` })),
    outputs: Array.from({ length: 48 }, (_, i) => ({ id: `out-${i + 1}`, type: i < 24 ? 'DisplayPort' : 'HDMI', label: i < 24 ? `DP Out ${i + 1}` : `HDMI Out ${i - 23}` })),
    deviceFormats: ['4K 60', '1080p60'],
    formatByIO: true
  },
  {
    id: 'blackmagic-videohub-mini-4x2-12g',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Videohub Mini 4x2 12G',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'sdi-in-3', type: '12G-SDI', label: 'SDI In 3' },
      { id: 'sdi-in-4', type: '12G-SDI', label: 'SDI In 4' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD', 'DCI 4K'],
    formatByIO: true
  },
  {
    id: 'blackmagic-videohub-mini-6x2-12g',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Videohub Mini 6x2 12G',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 6 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '12G-SDI', label: `SDI In ${i + 1}` })),
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD', 'DCI 4K'],
    formatByIO: true
  },
  {
    id: 'blackmagic-videohub-10x10-12g',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Videohub 10x10 12G',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 10 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '12G-SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 10 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: '12G-SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD', 'DCI 4K'],
    formatByIO: true
  },
  {
    id: 'blackmagic-videohub-20x20-12g',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Videohub 20x20 12G',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 20 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '12G-SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 20 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: '12G-SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD', 'DCI 4K'],
    formatByIO: true
  },
  {
    id: 'blackmagic-videohub-40x40-12g',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Videohub 40x40 12G',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 40 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '12G-SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 40 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: '12G-SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD', 'DCI 4K'],
    formatByIO: true
  },
  {
    id: 'blackmagic-videohub-120x120-12g',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Videohub 120x120 12G',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 120 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '12G-SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 120 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: '12G-SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD', 'DCI 4K'],
    formatByIO: true
  },
  {
    id: 'blackmagic-smart-videohub-12x12',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Smart Videohub 12x12',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 12 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: 'SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 12 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: 'SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['3G', 'HD', 'SD'],
    formatByIO: true
  },
  {
    id: 'blackmagic-smart-videohub-20x20',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Smart Videohub 20x20',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 20 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: 'SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 20 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: 'SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['3G', 'HD', 'SD'],
    formatByIO: true
  },
  {
    id: 'blackmagic-smart-videohub-40x40',
    category: 'router',
    manufacturer: 'Blackmagic Design',
    model: 'Smart Videohub 40x40',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 40 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: 'SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 40 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: 'SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['3G', 'HD', 'SD'],
    formatByIO: true
  },
  {
    id: 'aja-kumo-1616-compact-3g',
    category: 'router',
    manufacturer: 'AJA',
    model: 'Kumo 1616 Compact 3G-SDI Router',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 16 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '3G-SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 16 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: '3G-SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['3G', 'HD', 'SD'],
    formatByIO: true
  },
  {
    id: 'aja-kumo-3232-compact-3g',
    category: 'router',
    manufacturer: 'AJA',
    model: 'Kumo 3232 Compact 3G-SDI Router',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 32 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '3G-SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 32 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: '3G-SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['3G', 'HD', 'SD'],
    formatByIO: true
  },
  {
    id: 'aja-kumo-compact-12g-16x16',
    category: 'router',
    manufacturer: 'AJA',
    model: 'Kumo Compact 12G-SDI Router 16x16',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 16 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '12G-SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 16 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: '12G-SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD'],
    formatByIO: true
  },
  {
    id: 'aja-kumo-compact-12g-64x64',
    category: 'router',
    manufacturer: 'AJA',
    model: 'Kumo Compact 64x64 12G-SDI Router',
    ioArchitecture: 'direct',
    inputs: Array.from({ length: 64 }, (_, i) => ({ id: `sdi-in-${i + 1}`, type: '12G-SDI', label: `SDI In ${i + 1}` })),
    outputs: Array.from({ length: 64 }, (_, i) => ({ id: `sdi-out-${i + 1}`, type: '12G-SDI', label: `SDI Out ${i + 1}` })),
    deviceFormats: ['12G', '6G', '3G', 'HD', 'SD'],
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
  {
    id: 'brompton-tessera-sq200',
    category: 'led-processor',
    manufacturer: 'Brompton Technology',
    model: 'Tessera SQ200',
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
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' },
      { id: 'out-4', type: 'Ethernet', label: 'LED Out 4' }
    ],
    deviceFormats: ['8K', '4K 120', '4K 60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'brompton-tessera-sx40',
    category: 'led-processor',
    manufacturer: 'Brompton Technology',
    model: 'Tessera SX40',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-3', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'brompton-tessera-s8',
    category: 'led-processor',
    manufacturer: 'Brompton Technology',
    model: 'Tessera S8',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-3', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'brompton-tessera-s4',
    category: 'led-processor',
    manufacturer: 'Brompton Technology',
    model: 'Tessera S4',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-3', type: 'SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' }
    ],
    deviceFormats: ['4K 30', '1080p60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-mx20',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'MX20',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-6', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'SMPTE Fiber', label: '10G Optical 1' },
      { id: 'out-4', type: 'SMPTE Fiber', label: '10G Optical 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-mx30',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'MX30',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-6', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' },
      { id: 'out-4', type: 'SMPTE Fiber', label: '10G Optical 1' },
      { id: 'out-5', type: 'SMPTE Fiber', label: '10G Optical 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-mx40-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'MX40 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-6', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' },
      { id: 'out-4', type: 'Ethernet', label: 'LED Out 4' },
      { id: 'out-5', type: 'SMPTE Fiber', label: 'Optical Out 1' },
      { id: 'out-6', type: 'SMPTE Fiber', label: 'Optical Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-mx6000-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'MX6000 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'in-4', type: 'HDMI', label: 'HDMI 4' },
      { id: 'in-5', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-6', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-7', type: 'DisplayPort', label: 'DP 3' },
      { id: 'in-8', type: 'DisplayPort', label: 'DP 4' },
      { id: 'in-9', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-10', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' },
      { id: 'out-4', type: 'Ethernet', label: 'LED Out 4' },
      { id: 'out-5', type: 'Ethernet', label: 'LED Out 5' },
      { id: 'out-6', type: 'Ethernet', label: 'LED Out 6' }
    ],
    deviceFormats: ['8K', '4K 120', '4K 60', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-tu15-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'TU15 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-tu20-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'TU20 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-tu40-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'TU40 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-6', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' },
      { id: 'out-4', type: 'Ethernet', label: 'LED Out 4' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-tu4k-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'TU4K Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-6', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' },
      { id: 'out-4', type: 'Ethernet', label: 'LED Out 4' }
    ],
    deviceFormats: ['4K 120', '4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-vx400-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'VX400 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-3', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-vx600-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'VX600 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-vx1000-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'VX1000 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-5', type: '12G-SDI', label: 'SDI 1' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' },
      { id: 'out-4', type: 'Ethernet', label: 'LED Out 4' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-vx2000-pro',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'VX2000 Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'in-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'in-4', type: 'DisplayPort', label: 'DP 1' },
      { id: 'in-5', type: 'DisplayPort', label: 'DP 2' },
      { id: 'in-6', type: 'DisplayPort', label: 'DP 3' },
      { id: 'in-7', type: '12G-SDI', label: 'SDI 1' },
      { id: 'in-8', type: '12G-SDI', label: 'SDI 2' }
    ],
    outputs: [
      { id: 'out-1', type: 'Ethernet', label: 'LED Out 1' },
      { id: 'out-2', type: 'Ethernet', label: 'LED Out 2' },
      { id: 'out-3', type: 'Ethernet', label: 'LED Out 3' },
      { id: 'out-4', type: 'Ethernet', label: 'LED Out 4' },
      { id: 'out-5', type: 'Ethernet', label: 'LED Out 5' },
      { id: 'out-6', type: 'Ethernet', label: 'LED Out 6' }
    ],
    deviceFormats: ['4K 60', '4K 30', 'Custom'],
    formatByIO: true
  },
  {
    id: 'novastar-cvt10-s',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'CVT10-S Fiber Converter (Single-mode)',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'Ethernet', label: 'Ethernet In' }
    ],
    outputs: [
      { id: 'out-1', type: 'SMPTE Fiber', label: 'Fiber Out (Single-mode)' }
    ],
    deviceFormats: ['LED'],
    formatByIO: false
  },
  {
    id: 'novastar-cvt10-m',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'CVT10-M Fiber Converter (Multi-mode)',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'Ethernet', label: 'Ethernet In' }
    ],
    outputs: [
      { id: 'out-1', type: 'SMPTE Fiber', label: 'Fiber Out (Multi-mode)' }
    ],
    deviceFormats: ['LED'],
    formatByIO: false
  },
  {
    id: 'novastar-cvt4k-s',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'CVT4K-S Fiber Converter (Single-mode)',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'Ethernet', label: 'Ethernet In 1' },
      { id: 'in-2', type: 'Ethernet', label: 'Ethernet In 2' },
      { id: 'in-3', type: 'Ethernet', label: 'Ethernet In 3' },
      { id: 'in-4', type: 'Ethernet', label: 'Ethernet In 4' }
    ],
    outputs: [
      { id: 'out-1', type: 'SMPTE Fiber', label: 'Fiber Out 1 (Single-mode)' },
      { id: 'out-2', type: 'SMPTE Fiber', label: 'Fiber Out 2 (Single-mode)' },
      { id: 'out-3', type: 'SMPTE Fiber', label: 'Fiber Out 3 (Single-mode)' },
      { id: 'out-4', type: 'SMPTE Fiber', label: 'Fiber Out 4 (Single-mode)' }
    ],
    deviceFormats: ['LED'],
    formatByIO: false
  },
  {
    id: 'novastar-cvt4k-m',
    category: 'led-processor',
    manufacturer: 'NovaStar',
    model: 'CVT4K-M Fiber Converter (Multi-mode)',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'Ethernet', label: 'Ethernet In 1' },
      { id: 'in-2', type: 'Ethernet', label: 'Ethernet In 2' },
      { id: 'in-3', type: 'Ethernet', label: 'Ethernet In 3' },
      { id: 'in-4', type: 'Ethernet', label: 'Ethernet In 4' }
    ],
    outputs: [
      { id: 'out-1', type: 'SMPTE Fiber', label: 'Fiber Out 1 (Multi-mode)' },
      { id: 'out-2', type: 'SMPTE Fiber', label: 'Fiber Out 2 (Multi-mode)' },
      { id: 'out-3', type: 'SMPTE Fiber', label: 'Fiber Out 3 (Multi-mode)' },
      { id: 'out-4', type: 'SMPTE Fiber', label: 'Fiber Out 4 (Multi-mode)' }
    ],
    deviceFormats: ['LED'],
    formatByIO: false
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
  {
    id: 'absen-pl1.9-pro',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL1.9 Pro (V2/V10)',
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
    id: 'absen-pl2.5-pro',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL2.5 Pro (V2/V10)',
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
    id: 'absen-pl2.9',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL2.9 (V2/V10)',
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
    id: 'absen-pl3.9-pro',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL3.9 Pro (V2/V3/V10)',
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
    id: 'absen-pl4.8-pro',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL4.8 Pro (V2/V10)',
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
    id: 'absen-pl-lite-2.5',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL Lite 2.5',
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
    id: 'absen-pl-lite-2.9',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL Lite 2.9',
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
    id: 'absen-pl-lite-3.9',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL Lite 3.9',
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
    id: 'absen-pl-lite-4.8',
    category: 'led-tile',
    manufacturer: 'Absen',
    model: 'PL Lite 4.8',
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
    id: 'infiled-mc-1.56',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'MC Series 1.56',
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
    id: 'infiled-mc-1.95',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'MC Series 1.95',
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
    id: 'infiled-mc-2.6',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'MC Series 2.6',
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
    id: 'infiled-armk2-indoor-2.97',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'ARmk2 Indoor 2.97',
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
    id: 'infiled-armk2-indoor-3.91',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'ARmk2 Indoor 3.91',
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
    id: 'infiled-armk2-indoor-4.81',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'ARmk2 Indoor 4.81',
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
    id: 'infiled-armk2-outdoor-2.97',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'ARmk2 Outdoor 2.97',
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
    id: 'infiled-armk2-outdoor-3.91',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'ARmk2 Outdoor 3.91',
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
    id: 'infiled-armk2-outdoor-4.63',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'ARmk2 Outdoor 4.63',
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
    id: 'infiled-armk2-outdoor-5.95',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'ARmk2 Outdoor 5.95',
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
    id: 'infiled-armk2-outdoor-7.81',
    category: 'led-tile',
    manufacturer: 'INFiLED',
    model: 'ARmk2 Outdoor 7.81',
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
    id: 'roe-black-pearl-bp2',
    category: 'led-tile',
    manufacturer: 'ROE Visual',
    model: 'Black Pearl BP2',
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
    id: 'roe-carbon-cb5',
    category: 'led-tile',
    manufacturer: 'ROE Visual',
    model: 'Carbon Series CB5',
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
    id: 'roe-carbon-cb8',
    category: 'led-tile',
    manufacturer: 'ROE Visual',
    model: 'Carbon Series CB8',
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
    id: 'unilumin-upad-iv-1.5',
    category: 'led-tile',
    manufacturer: 'Unilumin',
    model: 'Upad IV 1.5',
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
    id: 'unilumin-upad-iv-1.9',
    category: 'led-tile',
    manufacturer: 'Unilumin',
    model: 'Upad IV 1.9',
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
    id: 'unilumin-upad-iv-2.6',
    category: 'led-tile',
    manufacturer: 'Unilumin',
    model: 'Upad IV 2.6',
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
    id: 'unilumin-upad-iv-s-2.6',
    category: 'led-tile',
    manufacturer: 'Unilumin',
    model: 'Upad IV-S 2.6 (Curvable)',
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
    id: 'unilumin-upad-iv-c-2.6',
    category: 'led-tile',
    manufacturer: 'Unilumin',
    model: 'Upad IV-C 2.6 (Corner/Cube)',
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
    id: 'atomos-ninja-v',
    category: 'recorder',
    manufacturer: 'Atomos',
    model: 'Ninja V',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'out-1', type: 'HDMI', label: 'HDMI Out' }
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
  {
    id: 'blackmagic-hyperdeck-studio',
    category: 'recorder',
    manufacturer: 'Blackmagic Design',
    model: 'HyperDeck Studio HD Plus',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'SDI', label: 'SDI In' }
    ],
    outputs: [
      { id: 'out-1', type: 'SDI', label: 'SDI Out' }
    ],
    deviceFormats: ['1080p60', '1080i60', 'ProRes', 'DNxHD'],
    formatByIO: false
  },
  {
    id: 'aja-ki-pro-ultra',
    category: 'recorder',
    manufacturer: 'AJA',
    model: 'Ki Pro Ultra',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: '12G-SDI', label: 'SDI In' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'out-1', type: '12G-SDI', label: 'SDI Out' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 60', '1080p60', 'ProRes', 'DNxHD'],
    formatByIO: false
  },
  {
    id: 'aja-ki-pro-go',
    category: 'recorder',
    manufacturer: 'AJA',
    model: 'Ki Pro GO',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'in-1', type: 'SDI', label: 'SDI In' },
      { id: 'in-2', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'out-1', type: 'SDI', label: 'SDI Out' },
      { id: 'out-2', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['1080p60', '1080i60', 'ProRes'],
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

  // ===== Blackmagic Design Broadcast Monitors =====
  {
    id: 'blackmagic-smartscope-duo-4k',
    category: 'monitor',
    manufacturer: 'Blackmagic Design',
    model: 'SmartScope Duo 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p59.94', '1080i59.94', '1080i50', '720p60', 'HDR'],
    formatByIO: false
  },
  {
    id: 'blackmagic-smartview-4k',
    category: 'monitor',
    manufacturer: 'Blackmagic Design',
    model: 'SmartView 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: '12G-SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: '12G-SDI In 2' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: '12G-SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: '12G-SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p59.94', '1080i59.94', 'HDR'],
    formatByIO: false
  },
  {
    id: 'blackmagic-smartview-hd',
    category: 'monitor',
    manufacturer: 'Blackmagic Design',
    model: 'SmartView HD',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '3G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '3G-SDI', label: 'SDI In 2' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '3G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '3G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['1080p60', '1080p59.94', '1080i59.94', '1080i50', '720p60'],
    formatByIO: false
  },
  {
    id: 'blackmagic-video-assist-5-12g',
    category: 'monitor',
    manufacturer: 'Blackmagic Design',
    model: 'Video Assist 5" 12G HDR',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '12G-SDI', label: '12G-SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '12G-SDI', label: '12G-SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p59.94', '1080i59.94', 'HDR10+'],
    formatByIO: false
  },
  {
    id: 'blackmagic-video-assist-7-12g',
    category: 'monitor',
    manufacturer: 'Blackmagic Design',
    model: 'Video Assist 7" 12G HDR',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '12G-SDI', label: '12G-SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '12G-SDI', label: '12G-SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p59.94', '1080i59.94', 'HDR10+'],
    formatByIO: false
  },

  // ===== Lilliput Broadcast Director Monitors =====
  {
    id: 'lilliput-q7',
    category: 'monitor',
    manufacturer: 'Lilliput',
    model: 'Q7 7" 4K Broadcast Director Monitor',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '12G-SDI', label: '12G-SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '12G-SDI', label: '12G-SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p59.94', '1080i59.94', 'HDR'],
    formatByIO: false
  },
  {
    id: 'lilliput-q5',
    category: 'monitor',
    manufacturer: 'Lilliput',
    model: 'Q5 5" Broadcast Monitor',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '3G-SDI', label: 'SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '3G-SDI', label: 'SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['1080p60', '1080p59.94', '1080i59.94', '720p60'],
    formatByIO: false
  },
  {
    id: 'lilliput-bm150-4ks',
    category: 'monitor',
    manufacturer: 'Lilliput',
    model: 'BM150-4KS 15.6" 4K Broadcast Director Monitor',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '12G-SDI', label: '12G-SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '12G-SDI', label: '12G-SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p59.94', '1080i59.94', 'HDR'],
    formatByIO: false
  },
  {
    id: 'lilliput-tm-1018s',
    category: 'monitor',
    manufacturer: 'Lilliput',
    model: 'TM-1018/S 10.1" Broadcast Monitor',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '12G-SDI', label: '12G-SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '12G-SDI', label: '12G-SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 30', '1080p60', '1080p59.94', '1080i59.94', 'HDR'],
    formatByIO: false
  },
  {
    id: 'lilliput-a11',
    category: 'monitor',
    manufacturer: 'Lilliput',
    model: 'A11 11.6" 4K Broadcast Director Monitor',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '12G-SDI', label: '12G-SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '12G-SDI', label: '12G-SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '1080p59.94', '1080i59.94', 'HDR'],
    formatByIO: false
  },
  {
    id: 'lilliput-663-s2',
    category: 'monitor',
    manufacturer: 'Lilliput',
    model: '663/S2 7" SDI/HDMI Monitor',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '3G-SDI', label: 'SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '3G-SDI', label: 'SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['1080p60', '1080p59.94', '1080i59.94', '720p60'],
    formatByIO: false
  },

  // ===== Samsung TVs (Costco) =====
  // --- The Frame (LS03D) ---
  {
    id: 'samsung-32-the-frame-ls03d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '32" The Frame LS03D 4K QLED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-43-the-frame-ls03d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '43" The Frame LS03D 4K QLED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-50-the-frame-ls03d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '50" The Frame LS03D 4K QLED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-55-the-frame-ls03d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '55" The Frame LS03D 4K QLED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-65-the-frame-ls03d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '65" The Frame LS03D 4K QLED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-75-the-frame-ls03d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '75" The Frame LS03D 4K QLED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-85-the-frame-ls03d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '85" The Frame LS03D 4K QLED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- QN90D Neo QLED 4K ---
  {
    id: 'samsung-55-qn90d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '55" QN90D Neo QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-65-qn90d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '65" QN90D Neo QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-75-qn90d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '75" QN90D Neo QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-85-qn90d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '85" QN90D Neo QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- QN85D QLED 4K ---
  {
    id: 'samsung-43-qn85d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '43" QN85D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-55-qn85d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '55" QN85D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-65-qn85d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '65" QN85D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-75-qn85d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '75" QN85D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-85-qn85d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '85" QN85D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- QN900D Neo QLED 8K ---
  {
    id: 'samsung-65-qn900d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '65" QN900D Neo QLED 8K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (8K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (8K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['8K 60', '4K 120', '4K 60', '1080p60'],
    formatByIO: false
  },
  {
    id: 'samsung-75-qn900d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '75" QN900D Neo QLED 8K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (8K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (8K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['8K 60', '4K 120', '4K 60', '1080p60'],
    formatByIO: false
  },
  {
    id: 'samsung-85-qn900d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '85" QN900D Neo QLED 8K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (8K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (8K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['8K 60', '4K 120', '4K 60', '1080p60'],
    formatByIO: false
  },
  // --- Q60D QLED 4K ---
  {
    id: 'samsung-32-q60d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '32" Q60D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-43-q60d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '43" Q60D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-55-q60d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '55" Q60D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-65-q60d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '65" Q60D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-75-q60d',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '75" Q60D QLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- CU8000 4K UHD ---
  {
    id: 'samsung-55-cu8000',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '55" CU8000 4K UHD',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-65-cu8000',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '65" CU8000 4K UHD',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-75-cu8000',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '75" CU8000 4K UHD',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'samsung-85-cu8000',
    category: 'monitor',
    manufacturer: 'Samsung',
    model: '85" CU8000 4K UHD',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },

  // ===== Sony TVs (Costco) =====
  // --- Bravia 9 (X95L) Mini LED 4K ---
  {
    id: 'sony-65-bravia9-x95l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '65" Bravia 9 XR-65X95L 4K Mini LED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-75-bravia9-x95l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '75" Bravia 9 XR-75X95L 4K Mini LED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-85-bravia9-x95l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '85" Bravia 9 XR-85X95L 4K Mini LED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- Bravia 8 (A80L) OLED 4K ---
  {
    id: 'sony-55-bravia8-a80l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '55" Bravia 8 XR-55A80L OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-65-bravia8-a80l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '65" Bravia 8 XR-65A80L OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-77-bravia8-a80l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '77" Bravia 8 XR-77A80L OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- Bravia 7 (X90L/X93L) 4K LED ---
  {
    id: 'sony-55-bravia7-x90l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '55" Bravia 7 XR-55X90L 4K HDR',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-65-bravia7-x90l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '65" Bravia 7 XR-65X90L 4K HDR',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-75-bravia7-x90l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '75" Bravia 7 XR-75X90L 4K HDR',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-85-bravia7-x90l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '85" Bravia 7 XR-85X90L 4K HDR',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- X85L 4K LED ---
  {
    id: 'sony-43-x85l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '43" X85L 4K HDR LED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-55-x85l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '55" X85L 4K HDR LED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-65-x85l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '65" X85L 4K HDR LED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-75-x85l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '75" X85L 4K HDR LED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-85-x85l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '85" X85L 4K HDR LED',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- A95L OLED 4K ---
  {
    id: 'sony-55-a95l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '55" Bravia XR A95L OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-65-a95l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '65" Bravia XR A95L OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'sony-77-a95l',
    category: 'monitor',
    manufacturer: 'Sony',
    model: '77" Bravia XR A95L OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },

  // ===== LG TVs (Costco) =====
  // --- C4 OLED evo 4K ---
  {
    id: 'lg-42-c4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '42" C4 evo OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-48-c4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '48" C4 evo OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-55-c4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '55" C4 evo OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-65-c4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '65" C4 evo OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-77-c4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '77" C4 evo OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-83-c4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '83" C4 evo OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- G4 OLED gallery 4K ---
  {
    id: 'lg-55-g4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '55" G4 OLED evo Gallery 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-65-g4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '65" G4 OLED evo Gallery 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-77-g4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '77" G4 OLED evo Gallery 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-83-g4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '83" G4 OLED evo Gallery 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-97-g4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '97" G4 OLED evo Gallery 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@144Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@144Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 144', '4K 120', '4K 60', '1080p120', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- B4 OLED 4K ---
  {
    id: 'lg-55-b4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '55" B4 OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-65-b4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '65" B4 OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-77-b4-oled',
    category: 'monitor',
    manufacturer: 'LG',
    model: '77" B4 OLED 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- QNED90 4K ---
  {
    id: 'lg-65-qned90',
    category: 'monitor',
    manufacturer: 'LG',
    model: '65" QNED90 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-75-qned90',
    category: 'monitor',
    manufacturer: 'LG',
    model: '75" QNED90 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-86-qned90',
    category: 'monitor',
    manufacturer: 'LG',
    model: '86" QNED90 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1 (4K@120Hz)' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2 (4K@120Hz)' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' },
      { id: 'hdmi-4', type: 'HDMI', label: 'HDMI 4' }
    ],
    outputs: [],
    deviceFormats: ['4K 120', '4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  // --- UR9000 NanoCell 4K ---
  {
    id: 'lg-43-ur9000',
    category: 'monitor',
    manufacturer: 'LG',
    model: '43" UR9000 NanoCell 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-55-ur9000',
    category: 'monitor',
    manufacturer: 'LG',
    model: '55" UR9000 NanoCell 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-65-ur9000',
    category: 'monitor',
    manufacturer: 'LG',
    model: '65" UR9000 NanoCell 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-75-ur9000',
    category: 'monitor',
    manufacturer: 'LG',
    model: '75" UR9000 NanoCell 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
    formatByIO: false
  },
  {
    id: 'lg-86-ur9000',
    category: 'monitor',
    manufacturer: 'LG',
    model: '86" UR9000 NanoCell 4K',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'hdmi-1', type: 'HDMI', label: 'HDMI 1' },
      { id: 'hdmi-2', type: 'HDMI', label: 'HDMI 2' },
      { id: 'hdmi-3', type: 'HDMI', label: 'HDMI 3' }
    ],
    outputs: [],
    deviceFormats: ['4K 60', '4K 30', '1080p60', '720p60'],
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
  },

  // ===== Recorders =====
  {
    id: 'blackmagic-hyperdeck-studio-hd-mini',
    category: 'recorder',
    manufacturer: 'Blackmagic Design',
    model: 'HyperDeck Studio HD Mini',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: 'SDI', label: 'SDI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: 'SDI', label: 'SDI Out' }
    ],
    deviceFormats: ['1080p60', '1080p59.94', '1080p50', '1080i60', '1080i59.94', '1080i50', '720p60', '720p59.94', '720p50'],
    formatByIO: false
  },
  {
    id: 'blackmagic-hyperdeck-studio-hd-plus',
    category: 'recorder',
    manufacturer: 'Blackmagic Design',
    model: 'HyperDeck Studio HD Plus',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: '3G-SDI', label: 'SDI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: '3G-SDI', label: 'SDI Out' }
    ],
    deviceFormats: ['1080p60', '1080p59.94', '1080p50', '1080i60', '1080i59.94', '1080i50', '720p60', '720p59.94', '720p50'],
    formatByIO: false
  },
  {
    id: 'blackmagic-hyperdeck-studio-hd-pro',
    category: 'recorder',
    manufacturer: 'Blackmagic Design',
    model: 'HyperDeck Studio HD Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '3G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '3G-SDI', label: 'SDI In 2' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '3G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '3G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['1080p60', '1080p59.94', '1080p50', '1080i60', '1080i59.94', '1080i50', '720p60', '720p59.94', '720p50'],
    formatByIO: false
  },
  {
    id: 'blackmagic-hyperdeck-studio-4k-pro',
    category: 'recorder',
    manufacturer: 'Blackmagic Design',
    model: 'HyperDeck Studio 4K Pro',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '6G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '6G-SDI', label: 'SDI In 2' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '6G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '6G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 59.94', '4K 50', '1080p60', '1080p59.94', '1080p50'],
    formatByIO: false
  },
  {
    id: 'blackmagic-hyperdeck-extreme-8k-hdr',
    category: 'recorder',
    manufacturer: 'Blackmagic Design',
    model: 'HyperDeck Extreme 8K HDR',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' },
      { id: 'sdi-in-3', type: '12G-SDI', label: 'SDI In 3' },
      { id: 'sdi-in-4', type: '12G-SDI', label: 'SDI In 4' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' },
      { id: 'sdi-out-3', type: '12G-SDI', label: 'SDI Out 3' },
      { id: 'sdi-out-4', type: '12G-SDI', label: 'SDI Out 4' }
    ],
    deviceFormats: ['8K 60', '8K 50', '4K 120', '4K 60', '4K 59.94', '4K 50', '1080p60', '1080p59.94', '1080p50'],
    formatByIO: false
  },
  {
    id: 'aja-ki-pro-ultra-12g',
    category: 'recorder',
    manufacturer: 'AJA',
    model: 'Ki Pro Ultra 12G',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: '12G-SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: '12G-SDI', label: 'SDI In 2' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: '12G-SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: '12G-SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['4K 60', '4K 59.94', '4K 50', '1080p60', '1080p59.94', '1080p50'],
    formatByIO: false
  },
  {
    id: 'aja-ki-pro-go2',
    category: 'recorder',
    manufacturer: 'AJA',
    model: 'Ki Pro GO2',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in', type: 'SDI', label: 'SDI In' },
      { id: 'hdmi-in', type: 'HDMI', label: 'HDMI In' }
    ],
    outputs: [
      { id: 'sdi-out', type: 'SDI', label: 'SDI Out' },
      { id: 'hdmi-out', type: 'HDMI', label: 'HDMI Out' }
    ],
    deviceFormats: ['1080p60', '1080p59.94', '1080p50', '1080i60', '1080i59.94', '1080i50', '720p60', '720p59.94', '720p50'],
    formatByIO: false
  },
  {
    id: 'aja-ki-pro-rack',
    category: 'recorder',
    manufacturer: 'AJA',
    model: 'Ki Pro Rack',
    ioArchitecture: 'direct',
    inputs: [
      { id: 'sdi-in-1', type: 'SDI', label: 'SDI In 1' },
      { id: 'sdi-in-2', type: 'SDI', label: 'SDI In 2' }
    ],
    outputs: [
      { id: 'sdi-out-1', type: 'SDI', label: 'SDI Out 1' },
      { id: 'sdi-out-2', type: 'SDI', label: 'SDI Out 2' }
    ],
    deviceFormats: ['1080p60', '1080p59.94', '1080p50', '1080i60', '1080i59.94', '1080i50', '720p60', '720p59.94', '720p50'],
    formatByIO: false
  }
];
