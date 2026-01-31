// Core Production Types

export * from './mediaServer';

export interface TimestampedEntry {
  id: string;
  text: string;
  timestamp: number;
  type: 'info' | 'completion';
}

export interface Location {
  venueName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Production {
  id: string;
  client: string;
  showName: string;
  venue: string;
  room: string;
  loadIn: string;
  loadOut: string;
  showInfoUrl?: string;
  // New fields for v2 architecture
  loadinDate?: string;
  showStartDate?: string;
  showEndDate?: string;
  loadoutDate?: string;
  location?: Location;
}

export interface SourceOutput {
  id: string;
  connector: ConnectorType;
  // Per-I/O format fields (used when formatAssignmentMode is 'per-io')
  hRes?: number;
  vRes?: number;
  rate?: number;
  standard?: string;
}

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  formatAssignmentMode?: 'system-wide' | 'per-io'; // How format is assigned
  // System-wide format fields (used when formatAssignmentMode is 'system-wide')
  hRes?: number;
  vRes?: number;
  rate: number;
  standard?: string;
  note?: string;
  secondaryDevice?: string;
  outputs: SourceOutput[];
  blanking?: 'none' | 'RBv1' | 'RBv2' | 'RBv3';
}

export type SourceType = 
  | 'LAPTOP' 
  | 'CAM' 
  | 'SERVER' 
  | 'PLAYBACK' 
  | 'GRAPHICS' 
  | 'PTZ'
  | 'ROBO'
  | 'MEDIA_SERVER'
  | 'Computer'
  | 'OTHER';

// CCU (Camera Control Unit) Type
export interface CCU {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  formatMode?: string; // e.g., "1080i59.94", "1080p60", "4K 59.94"
  fiberInput?: string; // SMPTE fiber input connection
  referenceInput?: string; // Reference signal input
  outputs?: CCUOutput[]; // Output connections based on model capabilities
  note?: string;
}

export interface CCUOutput {
  id: string;
  type: string; // e.g., "SDI", "HDMI", "IP", "Viewfinder"
  label?: string; // Optional custom label
  format?: string; // e.g., "1080i59.94", "1080p60", "4K 59.94"
}

// Equipment I/O Port
export interface IOPort {
  id: string;
  type: string; // SDI, HDMI, Fiber, DisplayPort, IP, etc.
  format?: string; // Format if assignable per I/O
  label?: string; // Custom label (e.g., "Program Out", "Aux 1")
}

// Equipment Card (for card-based systems)
export interface EquipmentCard {
  id: string;
  slotNumber: number;
  inputs: IOPort[];
  outputs: IOPort[];
}

// Equipment Specifications
export interface EquipmentSpec {
  id: string;
  category: 'camera' | 'ccu' | 'switcher' | 'router' | 'led-processor' | 'led-tile' | 'projector' | 'recorder' | 'monitor' | 'converter' | 'cam-switcher' | 'vision-switcher';
  manufacturer: string;
  model: string;
  
  // I/O Architecture
  ioArchitecture: 'direct' | 'card-based';
  
  // Direct I/O (when ioArchitecture is 'direct')
  inputs?: IOPort[];
  outputs?: IOPort[];
  
  // Card-based I/O (when ioArchitecture is 'card-based')
  cardSlots?: number; // Total number of available card slots
  cards?: EquipmentCard[]; // Installed cards
  
  // Format Capabilities
  deviceFormats?: string[]; // Formats supported by the device
  formatByIO?: boolean; // true = format per I/O, false = device-wide format
  
  // Secondary Device Designation
  isSecondaryDevice?: boolean; // Can this equipment be used as a secondary device (converter, scaler, etc.)
  
  // Legacy support for CCU migration
  specs?: Record<string, any>; // Additional specifications
}

// Camera Type
export interface Camera {
  id: string;
  name: string;
  model?: string; // Camera model from list
  formatMode?: string; // Inherited from CCU if connected, or set manually
  lensType?: 'zoom' | 'prime';
  maxZoom?: number; // Maximum zoom magnification
  shootingDistance?: number; // Distance in feet/meters
  calculatedZoom?: number; // Calculated from shooting distance
  // Support equipment
  hasTripod?: boolean;
  hasShortTripod?: boolean;
  hasDolly?: boolean;
  hasJib?: boolean;
  // CCU connection
  ccuId?: string; // Connected CCU ID
  smpteCableLength?: number; // SMPTE Fiber cable length in feet/meters
  note?: string;
}

export interface Computer {
  id: string;
  name: string;
  type?: 'playback' | 'graphics' | 'control' | 'media-server' | 'other';
  os?: string;
  specs?: string;
  ipAddress?: string;
  connectedTo?: string;
  note?: string;
}

export interface Send {
  id: string;
  type: SendType;
  name: string;
  hRes?: number;
  vRes?: number;
  rate: number;
  standard?: string;
  note?: string;
  secondaryDevice?: string;
  output: ConnectorType;
}

export type SendType = 
  | 'VIDEO SWITCH' 
  | 'ROUTER' 
  | 'LED PROCESSOR' 
  | 'PROJECTOR'
  | 'MONITOR'
  | 'RECORD'
  | 'STREAM'
  | 'OTHER';

export type ConnectorType = 'HDMI' | 'SDI' | 'DP' | 'FIBER' | 'NDI' | 'USB-C';

// Equipment Types

export interface Projector {
  id: string;
  screenId: string;
  makeModel: string;
  mode: ResolutionMode;
  totalStacks: number;
  projectorsPerStack: number;
  stackLayout: StackLayout;
  stackPosition: StackPosition;
  displayOption: DisplayOption;
  nativeResolution?: Resolution;
  workingResolution: Resolution;
  dimensions?: ProjectorDimensions;
}

export type ResolutionMode = 'FHD' | 'UHD' | '4K' | 'WUXGA' | 'WQXGA' | 'Custom';

export type StackLayout = 
  | 'Side by Side, Flown' 
  | 'Side by Side, Ground'
  | 'Vertical, Flown'
  | 'Vertical, Ground'
  | 'Side by Side, Scaff'
  | 'Vertical, Scaff';

export type StackPosition = 
  | 'Front, Landscape' 
  | 'Front, Portrait'
  | 'Rear, Landscape'
  | 'Rear, Portrait';

export type DisplayOption = 'Single' | 'Blended' | 'Converged' | 'Mapped';

export interface Resolution {
  width: number;
  height: number;
}

export interface ProjectorDimensions {
  height: { imperial: string; metric: string };
  width: { imperial: string; metric: string };
  depth: { imperial: string; metric: string };
}

export interface LEDScreen {
  id: string;
  name: string;
  tileModel: string;
  processorModel: string;
  fullModules: { width: number; height: number };
  halfModules: { width: number; height: number };
  totalModules: { full: number; half: number };
  pixels: Resolution;
  aspectRatio: number;
  totalPixels: number;
  maxTilesPerPort: number;
  processorPortCount: number;
  processorCount: number;
  dimensionsFt: { width: string; height: string };
  dimensionsM: { width: string; height: string };
  hangingMax: number;
  stackingMax: number;
  powerMode: string;
}

export interface ProjectionScreen {
  id: string;
  name: string;
  horizontal: { ft: number; inches: number; meters: number };
  vertical: { ft: number; inches: number; meters: number };
  ratio: number;
  sqFt: number;
  sqM: number;
  projectorResolution: Resolution;
  totalPixels: number;
  blendWidth: { percent: number; pixels: number };
  blendCount: number;
  gainFactor: number;
  totalLumens: number;
  lumensPerPj: number;
  lumenUsage: { total: number; percentage: number };
  nits: number;
  pixelsPerSqFt: number;
  pixelsPerIn: number;
  contrastRatio: number;
  imageWidth: { ft: number; inches: number; meters: number };
  throwDistance: { ft: number; inches: number; meters: number };
}

// Network & Routing

export interface IPAddress {
  id: string;
  ip: string;
  device: string;
  category: IPCategory;
  notes?: string;
}

export type IPCategory = 
  | 'VIDEO' 
  | 'CAMS' 
  | 'FOH' 
  | 'HOUSE' 
  | 'RIGGING' 
  | 'LED'
  | 'NETWORK'
  | 'OTHER';

export interface Router {
  id: string;
  name: string;
  inputs: RouterIO[];
  outputs: RouterIO[];
}

export interface RouterIO {
  id: string;
  connector: ConnectorType;
  feed: string;
  notes?: string;
}

export interface VideoSwitcher {
  id: string;
  name: string;
  type: SwitcherType;
  ip?: string;
  inputs: SwitcherIO[];
  outputs: SwitcherIO[];
  layers?: SwitcherLayer[];
}

export type SwitcherType = 'E2' | 'Q8' | 'X80' | 'CARBONITE' | 'ATEM';

export interface SwitcherIO {
  id: string;
  connector: ConnectorType;
  feed: string;
  notes?: string;
}

export interface SwitcherLayer {
  id: string;
  name: string;
}

// Server & Media

export interface ServerAllocation {
  serverId: string;
  outputs: ServerOutput[];
}

export interface ServerOutput {
  id: number;
  processor?: string;
  resolution?: string;
  layers: ServerLayer[];
}

export interface ServerLayer {
  id: string;
  name: string;
}

// Checklists

export interface ChecklistItem {
  id: string;
  title: string;  // Required for database - derived from category + item
  category: ChecklistCategory;
  item: string;
  moreInfo?: TimestampedEntry[];  // Array of timestamped notes
  completionNote?: TimestampedEntry[];  // Array of timestamped completion notes
  assignedTo?: string;  // For future email/calendar/slack integration
  dueDate?: string;
  completionDate?: string;
  completedAt?: number;  // Timestamp of completion
  completed: boolean;
  answer?: string;
  reference?: string;
  daysBeforeShow?: number;
}

export type ChecklistCategory = 
  | 'PRE_PRODUCTION'
  | 'SCREENS'
  | 'SWITCH'
  | 'IMAG'
  | 'MEDIA_SERVERS'
  | 'SOURCES'
  | 'DESTINATIONS'
  | 'DISPLAYS'
  | 'OUTSIDE_VENDORS'
  | 'DOCUMENTATION'
  | 'NOTES';

// Cable & Snake Management

export interface CableSnake {
  id: string;
  name: string;
  type: SnakeType;
  connections: SnakeConnection[];
}

export type SnakeType = 
  | 'ENG' 
  | 'VIDEO' 
  | 'DSM_A' 
  | 'DSM_B' 
  | 'FIBER';

export interface SnakeConnection {
  id: string;
  sourceId: string;
  sourceName: string;
  destId: string;
  destName: string;
  connector: ConnectorType;
}

// Presets

export interface Preset {
  id: string;
  name: string;
  description?: string;
  assignments: PresetAssignment[];
}

export interface PresetAssignment {
  destinationId: string;
  sourceId: string;
}

// Scaling Calculator

export interface ScalingCalculation {
  inputResolution: Resolution;
  outputResolution: Resolution;
  scaleFactor: number;
}

// App State

export interface AppState {
  currentProduction: Production | null;
  sources: Source[];
  sends: Send[];
  projectors: Projector[];
  ledScreens: LEDScreen[];
  projectionScreens: ProjectionScreen[];
  ipAddresses: IPAddress[];
  routers: Router[];
  videoSwitchers: VideoSwitcher[];
  serverAllocations: ServerAllocation[];
  checklists: ChecklistItem[];
  cableSnakes: CableSnake[];
  presets: Preset[];
}

// Project File Format (.vdpx)

export interface VideoDepProject {
  // Metadata
  version: number;  // Version number for conflict detection (matches database Int)
  created: number;  // Timestamp
  modified: number; // Timestamp
  
  // Production Info
  production: Production;
  
  // Show-specific Resources
  sources: Source[];
  sends: Send[];
  checklist: ChecklistItem[];
  ledScreens: LEDScreen[];
  projectionScreens: ProjectionScreen[];
  computers: Computer[];
  ccus: CCU[];
  cameras: Camera[];
  mediaServers: any[]; // TODO: Import MediaServer type
  mediaServerLayers: any[]; // TODO: Import MediaServerLayer type
  videoSwitchers: VideoSwitcher[];
  routers: Router[];
  serverAllocations: ServerAllocation[];
  ipAddresses: IPAddress[];
  cableSnakes: CableSnake[];
  presets: Preset[];
  
  // Equipment References (IDs only, specs come from library)
  usedEquipmentIds: string[];
  
  // Project-specific UI preferences
  uiPreferences?: {
    collapsedChecklistCategories?: string[];
  };
}

// Change Tracking (for sync)

export interface ChangeRecord {
  id: string;
  timestamp: number;
  userId?: string; // Optional for future multi-user
  action: 'create' | 'update' | 'delete';
  entityType: string; // e.g., 'source', 'send', 'checklist'
  entityId: string;
  changes: any; // Delta of what changed
}
