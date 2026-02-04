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
  { id: 'ip-1', ip: '192.168.0.1', device: 'WIRELESS ROUTER', category: 'VIDEO', notes: 'LED' },
  { id: 'ip-2', ip: '192.168.0.2', device: 'LED CONTROL', category: 'VIDEO', notes: 'LED CONTROL COMPUTER' },
  { id: 'ip-7', ip: '192.168.0.7', device: 'PTZ CONTROLLER 1', category: 'CAMS' },
  { id: 'ip-8', ip: '192.168.0.8', device: 'PTZ CONTROLLER 2', category: 'CAMS' },
  { id: 'ip-9', ip: '192.168.0.9', device: 'PTZ CONTROLLER 3', category: 'CAMS' },
  { id: 'ip-11', ip: '192.168.0.11', device: 'PTZ 1', category: 'FOH' },
  { id: 'ip-12', ip: '192.168.0.12', device: 'PTZ 2', category: 'FOH' },
  { id: 'ip-13', ip: '192.168.0.13', device: 'PTZ 3', category: 'FOH' },
  { id: 'ip-14', ip: '192.168.0.14', device: 'PTZ 4', category: 'HOUSE' },
  { id: 'ip-15', ip: '192.168.0.15', device: 'PTZ 5', category: 'HOUSE' },
  { id: 'ip-16', ip: '192.168.0.16', device: 'PTZ 6', category: 'HOUSE' },
  { id: 'ip-17', ip: '192.168.0.17', device: 'PTZ 7', category: 'RIGGING' },
  { id: 'ip-18', ip: '192.168.0.18', device: 'PTZ 8', category: 'RIGGING' },
  { id: 'ip-19', ip: '192.168.0.19', device: 'PTZ 9', category: 'RIGGING' },
  { id: 'ip-21', ip: '192.168.0.21', device: 'CCU1', category: 'CAMS', notes: 'LONG CTR 1' },
  { id: 'ip-22', ip: '192.168.0.22', device: 'CCU2', category: 'CAMS', notes: 'LONG CTR 2' },
  { id: 'ip-23', ip: '192.168.0.23', device: 'CCU3', category: 'CAMS', notes: 'HERO 3' },
  { id: 'ip-24', ip: '192.168.0.24', device: 'CCU4', category: 'CAMS' },
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
  // SCREENS Category
  { id: 'chk-1', title: 'Screen Parameters', category: 'SCREENS', item: 'Screen Parameters', daysBeforeShow: 60, completed: false },
  { id: 'chk-2', title: 'Projector, Lens, and Lumen Counts', category: 'SCREENS', item: 'Projector, Lens, and Lumen Counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-3', title: 'Projection Mapping', category: 'SCREENS', item: 'Projection Mapping', daysBeforeShow: 30, completed: false },
  { id: 'chk-4', title: 'Screen Obstructions', category: 'SCREENS', item: 'Screen Obstructions', daysBeforeShow: 45, completed: false },
  { id: 'chk-5', title: 'Staging requirements', category: 'SCREENS', item: 'Staging requirements', daysBeforeShow: 45, completed: false },
  { id: 'chk-6', title: 'Rigging requirements', category: 'SCREENS', item: 'Rigging requirements', daysBeforeShow: 45, completed: false },
  { id: 'chk-7', title: 'Power requirements', category: 'SCREENS', item: 'Power requirements', daysBeforeShow: 30, completed: false },
  { id: 'chk-8', title: 'Build Schedule', category: 'SCREENS', item: 'Build Schedule', daysBeforeShow: 14, completed: false },
  { id: 'chk-9', title: 'Build Special Notes', category: 'SCREENS', item: 'Build Special Notes', daysBeforeShow: 14, completed: false },
  { id: 'chk-10', title: 'Gear list', category: 'SCREENS', item: 'Gear list', daysBeforeShow: 30, completed: false },
  { id: 'chk-11', title: 'Signal flow', category: 'SCREENS', item: 'Signal flow', daysBeforeShow: 14, completed: false },
  
  // SWITCH Category
  { id: 'chk-12', title: 'Input counts', category: 'SWITCH', item: 'Input counts', daysBeforeShow: 30, completed: false },
  { id: 'chk-13', title: 'Processing Plan', category: 'SWITCH', item: 'Processing Plan', daysBeforeShow: 30, completed: false },
  { id: 'chk-14', title: 'Output counts', category: 'SWITCH', item: 'Output counts', daysBeforeShow: 30, completed: false },
  { id: 'chk-15', title: 'Layer requirements', category: 'SWITCH', item: 'Layer requirements', daysBeforeShow: 30, completed: false },
  { id: 'chk-16', title: 'Router requirements', category: 'SWITCH', item: 'Router requirements', daysBeforeShow: 30, completed: false },
  { id: 'chk-17', title: 'Record plan', category: 'SWITCH', item: 'Record plan', daysBeforeShow: 14, completed: false },
  { id: 'chk-18', title: 'ControlNet Plan', category: 'SWITCH', item: 'ControlNet Plan', daysBeforeShow: 14, completed: false },
  
  // IMAG Category
  { id: 'chk-19', title: 'Switcher options', category: 'IMAG', item: 'Switcher options', daysBeforeShow: 60, completed: false },
  { id: 'chk-20', title: 'Camera options', category: 'IMAG', item: 'Camera options', daysBeforeShow: 60, completed: false },
  { id: 'chk-21', title: 'Camera counts', category: 'IMAG', item: 'Camera counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-22', title: 'PTZ counts', category: 'IMAG', item: 'PTZ counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-23', title: 'Static cam counts', category: 'IMAG', item: 'Static cam counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-24', title: 'Wireless cam counts', category: 'IMAG', item: 'Wireless cam counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-25', title: 'Spy cam counts', category: 'IMAG', item: 'Spy cam counts', daysBeforeShow: 60, completed: false },
  { id: 'chk-26', title: 'Special mounts', category: 'IMAG', item: 'Special mounts', daysBeforeShow: 60, completed: false },
  { id: 'chk-27', title: 'Lens calculations', category: 'IMAG', item: 'Lens calculations', daysBeforeShow: 60, completed: false },
  { id: 'chk-28', title: 'Decking + surrounds', category: 'IMAG', item: 'Decking + surrounds', daysBeforeShow: 60, completed: false },
  
  // MEDIA_SERVERS Category
  { id: 'chk-29', title: 'Illustrator Design Template', category: 'MEDIA_SERVERS', item: 'Illustrator Design Template', daysBeforeShow: 60, completed: false },
  { id: 'chk-30', title: 'AE Design Template', category: 'MEDIA_SERVERS', item: 'AE Design Template', daysBeforeShow: 60, completed: false },
  { id: 'chk-31', title: 'AME Presets', category: 'MEDIA_SERVERS', item: 'AME Presets', daysBeforeShow: 60, completed: false },
  { id: 'chk-32', title: 'Initiate Creative Pipeline', category: 'MEDIA_SERVERS', item: 'Initiate Creative Pipeline', daysBeforeShow: 60, completed: false },
  { id: 'chk-33', title: 'Media Server Project [CLOUD]', category: 'MEDIA_SERVERS', item: 'Media Server Project [CLOUD]', daysBeforeShow: 30, completed: false },
  { id: 'chk-34', title: 'Media Server Project [ONSITE]', category: 'MEDIA_SERVERS', item: 'Media Server Project [ONSITE]', daysBeforeShow: 7, completed: false },
  { id: 'chk-35', title: 'Server Allocation Plan', category: 'MEDIA_SERVERS', item: 'Server Allocation Plan', daysBeforeShow: 30, completed: false },
  
  // SOURCES Category
  { id: 'chk-36', title: 'Media', category: 'SOURCES', item: 'Media', daysBeforeShow: 60, completed: false },
  { id: 'chk-37', title: 'Wide', category: 'SOURCES', item: 'Wide', daysBeforeShow: 60, completed: false },
  { id: 'chk-38', title: 'GFX', category: 'SOURCES', item: 'GFX', daysBeforeShow: 60, completed: false },
  { id: 'chk-39', title: 'Notes', category: 'SOURCES', item: 'Notes', daysBeforeShow: 60, completed: false },
  { id: 'chk-40', title: 'Prompter', category: 'SOURCES', item: 'Prompter', daysBeforeShow: 60, completed: false },
  { id: 'chk-41', title: 'Stage', category: 'SOURCES', item: 'Stage', daysBeforeShow: 60, completed: false },
  { id: 'chk-42', title: 'Demo', category: 'SOURCES', item: 'Demo', daysBeforeShow: 60, completed: false },
  { id: 'chk-43', title: 'Polling', category: 'SOURCES', item: 'Polling', daysBeforeShow: 60, completed: false },
  { id: 'chk-44', title: 'Remote', category: 'SOURCES', item: 'Remote', daysBeforeShow: 60, completed: false },
  { id: 'chk-45', title: 'Cams', category: 'SOURCES', item: 'Cams', daysBeforeShow: 60, completed: false },
  { id: 'chk-46', title: 'Timer', category: 'SOURCES', item: 'Timer', daysBeforeShow: 60, completed: false },
  { id: 'chk-47', title: 'Other', category: 'SOURCES', item: 'Other', daysBeforeShow: 60, completed: false },
  
  // DESTINATIONS Category
  { id: 'chk-48', title: 'LED Processors', category: 'DESTINATIONS', item: 'LED Processors', daysBeforeShow: 60, completed: false },
  { id: 'chk-49', title: 'Projectors', category: 'DESTINATIONS', item: 'Projectors', daysBeforeShow: 60, completed: false },
  { id: 'chk-50', title: 'DSMs', category: 'DESTINATIONS', item: 'DSMs', daysBeforeShow: 60, completed: false },
  { id: 'chk-51', title: 'AUX Feed', category: 'DESTINATIONS', item: 'AUX Feed', daysBeforeShow: 60, completed: false },
  { id: 'chk-52', title: 'Monitor Feeds', category: 'DESTINATIONS', item: 'Monitor Feeds', daysBeforeShow: 60, completed: false },
  { id: 'chk-53', title: 'Record', category: 'DESTINATIONS', item: 'Record', daysBeforeShow: 60, completed: false },
  { id: 'chk-54', title: 'Web Encoder', category: 'DESTINATIONS', item: 'Web Encoder', daysBeforeShow: 60, completed: false },
  { id: 'chk-55', title: 'Other', category: 'DESTINATIONS', item: 'Other', daysBeforeShow: 60, completed: false },
  
  // DISPLAYS Category
  { id: 'chk-56', title: 'Backstage', category: 'DISPLAYS', item: 'Backstage', daysBeforeShow: 60, completed: false },
  { id: 'chk-57', title: 'Cam Eng', category: 'DISPLAYS', item: 'Cam Eng', daysBeforeShow: 60, completed: false },
  { id: 'chk-58', title: 'Cam TD', category: 'DISPLAYS', item: 'Cam TD', daysBeforeShow: 60, completed: false },
  { id: 'chk-59', title: 'Downstage', category: 'DISPLAYS', item: 'Downstage', daysBeforeShow: 60, completed: false },
  { id: 'chk-60', title: 'FOH', category: 'DISPLAYS', item: 'FOH', daysBeforeShow: 60, completed: false },
  { id: 'chk-61', title: 'GFX', category: 'DISPLAYS', item: 'GFX', daysBeforeShow: 60, completed: false },
  { id: 'chk-62', title: 'Green Room', category: 'DISPLAYS', item: 'Green Room', daysBeforeShow: 60, completed: false },
  { id: 'chk-63', title: 'Media Server', category: 'DISPLAYS', item: 'Media Server', daysBeforeShow: 60, completed: false },
  { id: 'chk-64', title: 'Prompter', category: 'DISPLAYS', item: 'Prompter', daysBeforeShow: 60, completed: false },
  { id: 'chk-65', title: 'Records', category: 'DISPLAYS', item: 'Records', daysBeforeShow: 60, completed: false },
  { id: 'chk-66', title: 'Show Management', category: 'DISPLAYS', item: 'Show Management', daysBeforeShow: 60, completed: false },
  { id: 'chk-67', title: 'Video', category: 'DISPLAYS', item: 'Video', daysBeforeShow: 60, completed: false },
  { id: 'chk-68', title: 'VMix', category: 'DISPLAYS', item: 'VMix', daysBeforeShow: 60, completed: false },
  { id: 'chk-69', title: 'Foyer', category: 'DISPLAYS', item: 'Foyer', daysBeforeShow: 60, completed: false },
  { id: 'chk-70', title: 'Other', category: 'DISPLAYS', item: 'Other', daysBeforeShow: 60, completed: false },
  
  // OUTSIDE_VENDORS Category
  { id: 'chk-71', title: 'Vendor initial list + contact', category: 'OUTSIDE_VENDORS', item: 'Vendor initial list + contact', daysBeforeShow: 60, completed: false },
  { id: 'chk-72', title: 'Receive + Review quote', category: 'OUTSIDE_VENDORS', item: 'Receive + Review quote', daysBeforeShow: 60, completed: false },
  { id: 'chk-73', title: 'Final quote changes', category: 'OUTSIDE_VENDORS', item: 'Final quote changes', daysBeforeShow: 55, completed: false },
  { id: 'chk-74', title: 'Quote changes due', category: 'OUTSIDE_VENDORS', item: 'Quote changes due', daysBeforeShow: 50, completed: false },
  { id: 'chk-75', title: 'SUB - Quote approval', category: 'OUTSIDE_VENDORS', item: 'SUB - Quote approval', daysBeforeShow: 45, completed: false },
  { id: 'chk-76', title: 'Verify transfer method', category: 'OUTSIDE_VENDORS', item: 'Verify transfer method', daysBeforeShow: 14, completed: false },
  { id: 'chk-77', title: 'Verify delivery address', category: 'OUTSIDE_VENDORS', item: 'Verify delivery address', daysBeforeShow: 14, completed: false },
  { id: 'chk-78', title: 'Verify delivery dates', category: 'OUTSIDE_VENDORS', item: 'Verify delivery dates', daysBeforeShow: 14, completed: false },
  { id: 'chk-79', title: 'Verify delivery times', category: 'OUTSIDE_VENDORS', item: 'Verify delivery times', daysBeforeShow: 14, completed: false },
  { id: 'chk-80', title: 'Purchasing orders requested', category: 'OUTSIDE_VENDORS', item: 'Purchasing orders requested', daysBeforeShow: 60, completed: false },
  { id: 'chk-81', title: 'Purchasing orders placed', category: 'OUTSIDE_VENDORS', item: 'Purchasing orders placed', daysBeforeShow: 45, completed: false },
  { id: 'chk-82', title: 'Purchasing delivery verification', category: 'OUTSIDE_VENDORS', item: 'Purchasing delivery verification', daysBeforeShow: 14, completed: false },
  { id: 'chk-83', title: 'SUB - Pull actuals', category: 'OUTSIDE_VENDORS', item: 'SUB - Pull actuals', daysBeforeShow: 14, completed: false },
  { id: 'chk-84', title: 'SUB - Shop review', category: 'OUTSIDE_VENDORS', item: 'SUB - Shop review', daysBeforeShow: 7, completed: false },
  
  // DOCUMENTATION Category
  { id: 'chk-85', title: 'Backstage Layout', category: 'DOCUMENTATION', item: 'Backstage Layout', daysBeforeShow: 45, completed: false },
  { id: 'chk-86', title: 'Load In Plan', category: 'DOCUMENTATION', item: 'Load In Plan', daysBeforeShow: 45, completed: false },
  { id: 'chk-87', title: 'Cable Path', category: 'DOCUMENTATION', item: 'Cable Path', daysBeforeShow: 30, completed: false },
  { id: 'chk-88', title: 'Budget Review', category: 'DOCUMENTATION', item: 'Budget Review', daysBeforeShow: 60, completed: false },
  { id: 'chk-89', title: 'Equipment List', category: 'DOCUMENTATION', item: 'Equipment List', daysBeforeShow: 60, completed: false },
  { id: 'chk-90', title: 'Master Planning Deck Review', category: 'DOCUMENTATION', item: 'Master Planning Deck Review', daysBeforeShow: 45, completed: false },
  { id: 'chk-91', title: 'Tile Maps', category: 'DOCUMENTATION', item: 'Tile Maps', daysBeforeShow: 45, completed: false },
  { id: 'chk-92', title: 'Video Production Info', category: 'DOCUMENTATION', item: 'Video Production Info', daysBeforeShow: 30, completed: false },
  { id: 'chk-93', title: 'Wiring Diagram', category: 'DOCUMENTATION', item: 'Wiring Diagram', daysBeforeShow: 30, completed: false },
  { id: 'chk-94', title: 'Switcher Show File', category: 'DOCUMENTATION', item: 'Switcher Show File', daysBeforeShow: 30, completed: false },
  { id: 'chk-95', title: 'LED Show File', category: 'DOCUMENTATION', item: 'LED Show File', daysBeforeShow: 30, completed: false },
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
