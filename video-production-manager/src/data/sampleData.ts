import type { 
  Source, 
  Send, 
  LEDScreen, 
  IPAddress, 
  ChecklistItem,
  Production,
  VideoSwitcher,
  ServerAllocation
} from '@/types';

export const sampleProduction: Production = {
  id: 'prod-001',
  client: 'Sample Client',
  showName: 'Annual Conference 2024',
  venue: 'Convention Center',
  room: 'Main Ballroom',
  loadIn: '2024-03-15',
  loadOut: '2024-03-18',
  showInfoUrl: 'https://docs.google.com/spreadsheets/d/example'
};

export const sampleSources: Source[] = [
  { id: 'SRC 1', type: 'LAPTOP', name: 'WIDE A', rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 2', type: 'LAPTOP', name: 'WIDE B', rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 3', type: 'LAPTOP', name: 'GFX A', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 4', type: 'LAPTOP', name: 'GFX B', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 5', type: 'LAPTOP', name: 'NOTES A', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 6', type: 'LAPTOP', name: 'NOTES B', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 8', type: 'LAPTOP', name: 'WORDLY A', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 9', type: 'LAPTOP', name: 'WORDLY B', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }] },
  { id: 'SRC 11', type: 'LAPTOP', name: 'DEMO 01', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 12', type: 'LAPTOP', name: 'DEMO 02', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 13', type: 'LAPTOP', name: 'DEMO 03', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 14', type: 'LAPTOP', name: 'DEMO 04', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }] },
  { id: 'SRC 16', type: 'LAPTOP', name: 'TIMER', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'HDMI' }], note: 'FOH CTRL', secondaryDevice: 'HDMI > FIBER' },
  { id: 'SRC 18', type: 'CAM', name: 'CAM 1', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }], note: 'LONG LENS CTR', secondaryDevice: 'SMPTE FIBER > CCU' },
  { id: 'SRC 19', type: 'CAM', name: 'CAM 2', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }], note: 'LONG LENS CTR', secondaryDevice: 'SMPTE FIBER > CCU' },
  { id: 'SRC 20', type: 'CAM', name: 'CAM 3', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }], note: 'WIDE ANGLE HERO CAM', secondaryDevice: 'SMPTE FIBER > CCU' },
  { id: 'SRC 21', type: 'CAM', name: 'CAM 4', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }], note: 'BOX CAM' },
  { id: 'SRC 22', type: 'CAM', name: 'CAM 5', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }] },
  { id: 'SRC 23', type: 'CAM', name: 'CAM 6', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }] },
  { id: 'SRC 24', type: 'ROBO', name: 'ROBO 1', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }], note: 'AUDIENCE HL' },
  { id: 'SRC 25', type: 'ROBO', name: 'ROBO 2', hRes: 1920, vRes: 1080, rate: 59.94, outputs: [{ id: 'out-1', connector: 'SDI' }], note: 'AUDIENCE HR' },
];

export const sampleSends: Send[] = [
  { id: 'DST 1', type: 'VIDEO SWITCH', name: 'SCREEN 1A', rate: 59.94, output: 'HDMI' },
  { id: 'DST 2', type: 'VIDEO SWITCH', name: 'SCREEN 2A', rate: 59.94, output: 'HDMI' },
  { id: 'DST 3', type: 'VIDEO SWITCH', name: 'SCREEN 3A', rate: 59.94, output: 'HDMI' },
  { id: 'DST 4', type: 'VIDEO SWITCH', name: 'SCREEN 4A', rate: 59.94, output: 'HDMI' },
  { id: 'DST 5', type: 'VIDEO SWITCH', name: 'SCREEN 5A', rate: 59.94, output: 'HDMI' },
  { id: 'DST 6', type: 'VIDEO SWITCH', name: 'SCREEN 6A', rate: 59.94, output: 'HDMI' },
  { id: 'DST 7', type: 'VIDEO SWITCH', name: 'SCREEN 1B', rate: 59.94, output: 'HDMI' },
  { id: 'DST 8', type: 'VIDEO SWITCH', name: 'SCREEN 2B', rate: 59.94, output: 'HDMI' },
  { id: 'DST 9', type: 'VIDEO SWITCH', name: 'SCREEN 3B', rate: 59.94, output: 'HDMI' },
  { id: 'DST 10', type: 'VIDEO SWITCH', name: 'SCREEN 4B', rate: 59.94, output: 'HDMI' },
  { id: 'DST 11', type: 'VIDEO SWITCH', name: 'SCREEN 5B', rate: 59.94, output: 'HDMI' },
  { id: 'DST 12', type: 'VIDEO SWITCH', name: 'SCREEN 6B', rate: 59.94, output: 'HDMI' },
  { id: 'DST 14', type: 'ROUTER', name: 'GFX FEED', hRes: 1920, vRes: 1080, rate: 59.94, output: 'SDI' },
  { id: 'DST 15', type: 'ROUTER', name: 'NOTES FEED', hRes: 1920, vRes: 1080, rate: 59.94, output: 'SDI' },
  { id: 'DST 16', type: 'ROUTER', name: 'VT FEED', hRes: 1920, vRes: 1080, rate: 59.94, output: 'SDI' },
  { id: 'DST 18', type: 'ROUTER', name: 'MVR QUAD', hRes: 1920, vRes: 1080, rate: 59.94, output: 'HDMI', note: 'Q8 MVR 1 - Q8 MVR 2 - CAMS - DSM NOTES', secondaryDevice: 'SDI > HDMI' },
  { id: 'DST 19', type: 'MONITOR', name: 'OP MON 1', rate: 59.94, output: 'HDMI', note: '55"', secondaryDevice: 'SDI > HDMI' },
  { id: 'DST 20', type: 'MONITOR', name: 'GFX MON 1', rate: 59.94, output: 'HDMI', note: 'MVR QUAD', secondaryDevice: 'SDI > HDMI' },
  { id: 'DST 21', type: 'MONITOR', name: 'A2 MON', rate: 59.94, output: 'HDMI', note: 'ME 2 CLEAN', secondaryDevice: 'SDI > HDMI' },
  { id: 'DST 22', type: 'MONITOR', name: 'PA MON', rate: 59.94, output: 'HDMI', note: 'MVR QUAD', secondaryDevice: 'SDI > HDMI' },
  { id: 'DST 23', type: 'MONITOR', name: 'BSM MON 1', rate: 59.94, output: 'HDMI', note: '55"', secondaryDevice: 'SDI > HDMI' },
];

export const sampleLEDScreen: LEDScreen = {
  id: 'led-main',
  name: 'MAIN LED',
  tileModel: 'Infiled AR3.91mm, 500 x 1000mm',
  processorModel: 'Novastar MX40',
  fullModules: { width: 40, height: 3 },
  halfModules: { width: 0, height: 0 },
  totalModules: { full: 120, half: 0 },
  pixels: { width: 5120, height: 768 },
  aspectRatio: 6.67,
  totalPixels: 3932160,
  maxTilesPerPort: 20,
  processorPortCount: 40,
  processorCount: 1,
  dimensionsFt: { width: "65' 7\"", height: "9' 10\"" },
  dimensionsM: { width: '20m', height: '3m' },
  hangingMax: 10,
  stackingMax: 6,
  powerMode: '220v'
};

export const sampleIPAddresses: IPAddress[] = [
  { ip: '192.168.0.1', device: 'WIRELESS ROUTER', category: 'VIDEO', notes: 'LED' },
  { ip: '192.168.0.2', device: 'LED CONTROL', category: 'VIDEO', notes: 'LED CONTROL COMPUTER' },
  { ip: '192.168.0.7', device: 'PTZ CONTROLLER 1', category: 'CAMS' },
  { ip: '192.168.0.8', device: 'PTZ CONTROLLER 2', category: 'CAMS' },
  { ip: '192.168.0.9', device: 'PTZ CONTROLLER 3', category: 'CAMS' },
  { ip: '192.168.0.11', device: 'PTZ 1', category: 'FOH' },
  { ip: '192.168.0.12', device: 'PTZ 2', category: 'FOH' },
  { ip: '192.168.0.13', device: 'PTZ 3', category: 'FOH' },
  { ip: '192.168.0.14', device: 'PTZ 4', category: 'HOUSE' },
  { ip: '192.168.0.15', device: 'PTZ 5', category: 'HOUSE' },
  { ip: '192.168.0.16', device: 'PTZ 6', category: 'HOUSE' },
  { ip: '192.168.0.17', device: 'PTZ 7', category: 'RIGGING' },
  { ip: '192.168.0.18', device: 'PTZ 8', category: 'RIGGING' },
  { ip: '192.168.0.19', device: 'PTZ 9', category: 'RIGGING' },
  { ip: '192.168.0.21', device: 'CCU1', category: 'CAMS', notes: 'LONG CTR 1' },
  { ip: '192.168.0.22', device: 'CCU2', category: 'CAMS', notes: 'LONG CTR 2' },
  { ip: '192.168.0.23', device: 'CCU3', category: 'CAMS', notes: 'HERO 3' },
  { ip: '192.168.0.24', device: 'CCU4', category: 'CAMS' },
];

export const sampleVideoSwitcher: VideoSwitcher = {
  id: 'e2-0',
  name: 'E2 ID.0',
  type: 'E2',
  ip: '192.168.0.175',
  inputs: [
    { id: 'E2 ID.0 IN 1.1', connector: 'HDMI', feed: 'GFX A [SRC 3]' },
    { id: 'E2 ID.0 IN 1.2', connector: 'HDMI', feed: '' },
    { id: 'E2 ID.0 IN 1.3', connector: 'HDMI', feed: '' },
    { id: 'E2 ID.0 IN 1.4', connector: 'HDMI', feed: '' },
    { id: 'E2 ID.0 IN 2.1', connector: 'HDMI', feed: 'GFX B [SRC 4]' },
    { id: 'E2 ID.0 IN 2.2', connector: 'HDMI', feed: '' },
    { id: 'E2 ID.0 IN 2.3', connector: 'HDMI', feed: '' },
    { id: 'E2 ID.0 IN 2.4', connector: 'HDMI', feed: '' },
    { id: 'E2 ID.0 IN 3.1', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 IN 3.2', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 IN 3.3', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 IN 3.4', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 IN 4.1', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 IN 4.2', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 IN 4.3', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 IN 4.4', connector: 'DP', feed: '' },
  ],
  outputs: [
    { id: 'E2 ID.0 OUT 1.1', connector: 'DP', feed: 'SCREEN 1A DST 1' },
    { id: 'E2 ID.0 OUT 1.2', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 OUT 1.3', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 OUT 1.4', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 OUT 2.1', connector: 'DP', feed: 'SCREEN 1B DST 7' },
    { id: 'E2 ID.0 OUT 2.2', connector: 'HDMI', feed: '' },
    { id: 'E2 ID.0 OUT 2.3', connector: 'SDI', feed: '' },
    { id: 'E2 ID.0 OUT 2.4', connector: 'SDI', feed: '' },
    { id: 'E2 ID.0 OUT 3.1', connector: 'DP', feed: '' },
    { id: 'E2 ID.0 OUT 3.2', connector: 'HDMI', feed: '' },
    { id: 'E2 ID.0 OUT 3.3', connector: 'SDI', feed: '' },
    { id: 'E2 ID.0 OUT 3.4', connector: 'SDI', feed: '' },
    { id: 'E2 ID.0 OUT 4.1', connector: 'HDMI', feed: 'MVR 0.1' },
    { id: 'E2 ID.0 OUT 4.2', connector: 'HDMI', feed: 'MVR 0.2' },
    { id: 'E2 ID.0 OUT 4.3', connector: 'HDMI', feed: 'MVR 0.3' },
    { id: 'E2 ID.0 OUT 4.4', connector: 'HDMI', feed: '' },
  ],
  layers: []
};

export const sampleServerAllocation: ServerAllocation = {
  serverId: 'server-1',
  outputs: [
    {
      id: 1,
      processor: 'Processor 1 - 4736 x 1024',
      layers: [
        { id: '1.1', name: 'BKGD VIDEO/STILL A' },
        { id: '1.2', name: 'BKGD VIDEO/STILL B' },
        { id: '1.3', name: 'TRANSPARENCY WIPE' },
        { id: '1.4', name: '' },
      ]
    },
    {
      id: 2,
      layers: [
        { id: '2.1', name: '' },
        { id: '2.2', name: '' },
        { id: '2.3', name: '' },
        { id: '2.4', name: '' },
      ]
    },
    {
      id: 3,
      layers: [
        { id: '3.1', name: '' },
        { id: '3.2', name: '' },
        { id: '3.3', name: '' },
        { id: '3.4', name: '' },
      ]
    }
  ]
};

export const sampleChecklist: ChecklistItem[] = [
  { id: 'chk-1', category: 'PRE_PRODUCTION', item: 'Screen Parameters', daysBeforeShow: 60, completed: false },
  { id: 'chk-2', category: 'PRE_PRODUCTION', item: 'Screen Obstructions', daysBeforeShow: 45, completed: false },
  { id: 'chk-3', category: 'PRE_PRODUCTION', item: 'Staging requirements', daysBeforeShow: 45, completed: false },
  { id: 'chk-4', category: 'PRE_PRODUCTION', item: 'Rigging requirements', daysBeforeShow: 45, completed: false },
  { id: 'chk-5', category: 'PRE_PRODUCTION', item: 'Power requirements', daysBeforeShow: 30, completed: false },
  { id: 'chk-6', category: 'PRE_PRODUCTION', item: 'Build Schedule', daysBeforeShow: 14, completed: false },
  { id: 'chk-7', category: 'PRE_PRODUCTION', item: 'Build Special Notes', daysBeforeShow: 14, completed: false },
  { id: 'chk-8', category: 'PRE_PRODUCTION', item: 'Tile, Projector, Lens, and Lumen Counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-9', category: 'PRE_PRODUCTION', item: 'Projection Mapping', daysBeforeShow: 30, completed: false },
  { id: 'chk-10', category: 'SCREENS', item: 'Vendor initial list + contact', completed: false },
  { id: 'chk-11', category: 'SCREENS', item: 'SUB - Vendor initial contact', completed: false },
  { id: 'chk-12', category: 'SCREENS', item: 'SUB - Review quote', completed: false },
  { id: 'chk-13', category: 'SCREENS', item: 'SUB - Last changes due', completed: false },
  { id: 'chk-14', category: 'SCREENS', item: 'SUB - Quote approval', completed: false },
  { id: 'chk-15', category: 'SCREENS', item: 'Verify transfer method', completed: false },
  { id: 'chk-16', category: 'SCREENS', item: 'Verify delivery address', completed: false },
  { id: 'chk-17', category: 'SCREENS', item: 'Verify delivery dates', completed: false },
  { id: 'chk-18', category: 'SCREENS', item: 'Verify delivery times', completed: false },
  { id: 'chk-19', category: 'SWITCH', item: 'Input counts', daysBeforeShow: 30, completed: false },
  { id: 'chk-20', category: 'SWITCH', item: 'Output counts', daysBeforeShow: 30, completed: false },
  { id: 'chk-21', category: 'SWITCH', item: 'Layer requirements', daysBeforeShow: 30, completed: false },
  { id: 'chk-22', category: 'SWITCH', item: 'Router requirements', daysBeforeShow: 30, completed: false },
  { id: 'chk-23', category: 'IMAG', item: 'Switcher options', daysBeforeShow: 60, completed: false },
  { id: 'chk-24', category: 'IMAG', item: 'Camera options', daysBeforeShow: 60, completed: false },
  { id: 'chk-25', category: 'IMAG', item: 'Camera counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-26', category: 'IMAG', item: 'PTZ counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-27', category: 'MEDIA_SERVERS', item: 'Illustrator Design Template', daysBeforeShow: 60, completed: false },
  { id: 'chk-28', category: 'MEDIA_SERVERS', item: 'AE Design Template', daysBeforeShow: 60, completed: false },
  { id: 'chk-29', category: 'MEDIA_SERVERS', item: 'AME Presets', daysBeforeShow: 60, completed: false },
  { id: 'chk-30', category: 'MEDIA_SERVERS', item: 'Media Server Project [CLOUD]', daysBeforeShow: 30, completed: false },
  { id: 'chk-31', category: 'MEDIA_SERVERS', item: 'Media Server Project [ONSITE]', daysBeforeShow: 7, completed: false },
  { id: 'chk-32', category: 'MEDIA_SERVERS', item: 'Server Allocation Plan', daysBeforeShow: 30, completed: false },
  { id: 'chk-33', category: 'DOCUMENTATION', item: 'Backstage Layout', daysBeforeShow: 45, completed: false },
  { id: 'chk-34', category: 'DOCUMENTATION', item: 'Load In Plan', daysBeforeShow: 45, completed: false },
  { id: 'chk-35', category: 'DOCUMENTATION', item: 'Cable Path', daysBeforeShow: 30, completed: false },
  { id: 'chk-36', category: 'DOCUMENTATION', item: 'Budget Review', daysBeforeShow: 60, completed: false },
  { id: 'chk-37', category: 'DOCUMENTATION', item: 'Tile Maps', daysBeforeShow: 45, completed: false },
  { id: 'chk-38', category: 'DOCUMENTATION', item: 'Video Production Info', daysBeforeShow: 30, completed: false },
  { id: 'chk-39', category: 'DOCUMENTATION', item: 'Wiring Diagram', daysBeforeShow: 30, completed: false },
  { id: 'chk-40', category: 'DOCUMENTATION', item: 'Equipment List', daysBeforeShow: 60, completed: false },
];

// Default checklist items (without id and completed) used as templates
export const defaultChecklistItems = sampleChecklist.map(({ id, completed, ...rest }) => rest);

// Resolution presets from the Video Data sheet
export const resolutionPresets = [
  { name: 'QUAD Drive', width: 5120, height: 3200, totalPixels: 16384000, term: '5120 x 3200' },
  { name: '4K', width: 4096, height: 2160, totalPixels: 8847360, term: '4096 x 2160' },
  { name: 'UHD (WQUXGA)', width: 3840, height: 2160, totalPixels: 8294400, term: '3840 x 2160' },
  { name: 'QHD+ (WQXGA)', width: 2560, height: 1600, totalPixels: 4096000, term: '2560 x 1600' },
  { name: 'FHD+', width: 1920, height: 1200, totalPixels: 2304000, term: '1920 x 1200' },
  { name: 'FHD', width: 1920, height: 1080, totalPixels: 2073600, term: '1920 x 1080' },
  { name: 'Custom', width: 0, height: 0, totalPixels: 0, term: 'Custom' },
];

export const stackLayouts = [
  '- Flown -',
  'Side by Side, Flown',
  'Vertical, Flown',
  '- Ground -',
  'Side by Side, Ground',
  'Vertical, Ground',
  '- Scaff -',
  'Side by Side, Scaff',
  'Vertical, Scaff',
  '- Truss Tower -',
];

export const stackPositions = [
  '- Front -',
  'Front, Landscape',
  'Front, Portrait',
  '-Rear-',
  'Rear, Landscape',
  'Rear, Portrait',
];

export const displayOptions = ['Single', 'Blended', 'Converged', 'Mapped'];

export const sourceTypes = ['LAPTOP', 'CAM', 'SERVER', 'PLAYBACK', 'GRAPHICS', 'PTZ', 'ROBO', 'OTHER'];

export const connectorTypes = ['HDMI', 'SDI', 'DP', 'FIBER', 'NDI', 'USB-C'];

export const secondaryDevices = [
  'BARREL', 'BIDI', 'DECIMATOR', 'USB-C > DP', 'USB-C > HDMI', 
  'DP > HDMI', 'HDMI > FIBER', 'HDMI > SDI', 'SDI > FIBER',
  'SDI > HDMI', 'SMPTE FIBER > CCU', 'WIRELESS Tx > Rx', 
  'PATCH PANEL', 'LED PROCESSOR', 'CCU'
];
