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

export interface FieldVersion {
  version: number;
  updated_at: string;
}

export type FieldVersions = Record<string, FieldVersion>;

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
  // Field-level versioning
  fieldVersions?: FieldVersions;
}

// ============================================================================
// BASE ENTITY ARCHITECTURE
// ============================================================================

/**
 * Base entity interface that all production entities inherit from.
 * Provides common fields: id, name, category, and metadata.
 */
export interface BaseEntity {
  id: string;
  name: string;
  category: string; // Subcategory name from sidebar (e.g., "Computers", "LED", "Cam Switcher")
  categoryMember: 'source' | 'send' | 'signal-flow'; // Top-level category
  // Metadata
  created_at?: string;
  updated_at?: string;
  version?: number;
  production_id?: string;
  is_deleted?: boolean;
  note?: string;
}

// ============================================================================
// INPUTS & OUTPUTS (Universal for all entities)
// ============================================================================

export type ReducedBlanking = 'none' | 'RBv1' | 'RBv2' | 'RBv3';
export type ConnectorType = 'HDMI' | 'SDI' | 'DP' | 'FIBER' | 'NDI' | 'USB-C';
export type IOMode = 'direct' | 'card-based' | 'direct+card';
export type IODirection = 'input' | 'output';

/**
 * Slot definition for card-based devices
 * Defines physical slots where cards can be installed
 */
export interface Slot {
  id: string;
  label: string; // e.g., "Slot 1", "Slot A"
  type?: string; // Slot type if device has multiple slot types
}

/**
 * Card interface - Cards populate slots in card-based devices
 * Each card is dedicated to either inputs OR outputs (not both)
 * Supports up to 8 I/O ports per card
 */
export interface Card {
  id: string;
  parentDevice: string; // Equipment ID this card belongs to
  slotId: string; // References a Slot.id on the parent device
  direction: IODirection; // 'input' or 'output' - card is dedicated to one direction
  ports: IOPort[]; // Up to 8 ports
}

/**
 * IOPort - Individual port on a card
 * Contains same format specifications as direct I/O
 */
export interface IOPort {
  id: string;
  connector: ConnectorType;
  // Format fields (preset is UX helper, not stored)
  hRes: number;
  vRes: number;
  rate: number;
  reducedBlanking?: ReducedBlanking;
  secondaryDevice?: string;
  feed?: string; // What's connected (for inputs)
  notes?: string;
}

/**
 * Output interface - Sources have outputs
 * Can be direct output or reference a card output
 */
export interface Output {
  id: string;
  connector: ConnectorType;
  // Format fields (preset is UX helper, not stored)
  hRes: number;
  vRes: number;
  rate: number;
  reducedBlanking?: ReducedBlanking;
  secondaryDevice?: string;
  // Card reference (if card-based)
  cardId?: string;
  portId?: string;
}

/**
 * Input interface - Sends have inputs
 * Can be direct input or reference a card input
 */
export interface Input {
  id: string;
  connector: ConnectorType;
  // Format fields
  hRes?: number;
  vRes?: number;
  rate?: number;
  feed?: string; // What's connected to this input
  notes?: string;
  // Card reference (if card-based)
  cardId?: string;
  portId?: string;
}

// ============================================================================
// SOURCES CATEGORY
// ============================================================================

/**
 * Computer source (subcategory: "Computers")
 * Extends BaseEntity with outputs (up to 4)
 * I/O Mode: direct only
 */
export interface Computer extends BaseEntity {
  category: 'Computers';
  categoryMember: 'source';
  computerType: string; // From Settings (renamed from "Source Type")
  ioMode: 'direct'; // Computers always use direct I/O
  outputs: Output[]; // Max 4 direct outputs
}

/**
 * Media Server source (subcategory: "Media Servers")
 * Extends BaseEntity with outputs (up to 8)
 * I/O Mode: direct only
 */
export interface MediaServer extends BaseEntity {
  category: 'Media Servers';
  categoryMember: 'source';
  software: string; // From Settings group (like Computer Type)
  ioMode: 'direct'; // Media servers use direct I/O
  outputs: Output[]; // Max 8 direct outputs
}

/**
 * CCU - Camera Control Unit (subcategory: "CCUs")
 * Extends BaseEntity with camera connection and SMPTE fiber
 * I/O Mode: direct only
 */
export interface CCU extends BaseEntity {
  category: 'CCUs';
  categoryMember: 'source';
  manufacturer: string; // From Equipment
  makeModel: string; // From Equipment
  connectedCamera?: string; // Camera ID
  ioMode: 'direct'; // CCUs use direct I/O
  outputs: Output[]; // Max 8 direct outputs
  smpteCableLength?: number; // In feet
}

export interface CameraLens {
  minFactor: number; // Default 8.5
  zoomFactor: number;
  maxDistance: number; // In feet
}

export interface CameraAccessories {
  tripod?: boolean;
  dolly?: boolean;
  jib?: boolean;
  steadicam?: boolean;
  wirelessTX?: boolean;
}

/**
 * Camera (subcategory: "Cameras")
 * Extends BaseEntity with CCU connection, lens, and accessories
 */
export interface Camera extends BaseEntity {
  category: 'Cameras';
  categoryMember: 'source';
  manufacturer: string; // From Equipment
  makeModel: string; // From Equipment
  connectedCCU?: string; // CCU ID
  lens?: CameraLens;
  accessories?: CameraAccessories;
  smpteCableLength?: number; // In feet
}

// Legacy Source interface for backward compatibility
// TODO: Remove once migration is complete
export interface SourceOutput {
  id: string;
  connector: ConnectorType;
  hRes?: number;
  vRes?: number;
  rate?: number;
  standard?: string;
}

export interface Source {
  id: string;
  category: SourceCategory; // Base category: COMPUTER, SERVER, CAMERA, CCU (matches equipment)
  type?: string; // Settings-defined type specific to category (e.g., "Laptop - PC GFX" for computers)
  name: string;
  formatAssignmentMode?: 'system-wide' | 'per-io';
  hRes?: number;
  vRes?: number;
  rate: number;
  standard?: string;
  note?: string;
  secondaryDevice?: string;
  outputs: SourceOutput[];
  blanking?: 'none' | 'RBv1' | 'RBv2' | 'RBv3';
}

export type SourceCategory = 
  | 'COMPUTER'
  | 'SERVER' 
  | 'CAMERA' 
  | 'CCU';

// Legacy alias for backward compatibility
export type SourceType = SourceCategory;

// Legacy CCU interface for backward compatibility
// TODO: Remove once migration to new CCU interface is complete
export interface LegacyCCU {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  formatMode?: string;
  fiberInput?: string;
  referenceInput?: string;
  outputs?: CCUOutput[];
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
  manufacturer?: string; // Camera manufacturer
  model?: string; // Camera model from list
  formatMode?: string; // Inherited from CCU if connected, or set manually
  maxZoom?: number; // Maximum zoom magnification (always zoom lens)
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

// ============================================================================
// SENDS CATEGORY
// TODO: Refactor Sends to extend BaseEntity with proper subcategories:
//   - LED extends BaseEntity (category: "LED") with inputs
//   - Projection extends BaseEntity (category: "Projection") with inputs
//   - Monitors extends BaseEntity (category: "Monitors") with inputs
// ============================================================================

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

// ============================================================================
// SIGNAL FLOW CATEGORY
// TODO: Refactor Signal Flow entities to extend BaseEntity with proper subcategories:
//   - VisionSwitcher extends BaseEntity (category: "Vision Switcher") with inputs and outputs
//   - CamSwitcher extends BaseEntity (category: "Cam Switcher") with inputs and outputs
//   - Router extends BaseEntity (category: "Routers") with inputs and outputs
// Signal flow devices sit in the middle and manage traffic from sources to sends.
// I/O Mode: Vision Switchers, Cam Switchers, and Routers support all IOMode options:
//   - 'direct' for fixed I/O devices
//   - 'card-based' for fully modular devices
//   - 'direct+card' for devices with built-in I/O plus expansion slots
// ============================================================================

export interface Router {
  id: string;
  name: string;
  ioMode?: IOMode; // TODO: Add when refactoring to BaseEntity
  inputs: RouterIO[];
  outputs: RouterIO[];
  slots?: Slot[]; // TODO: Add when refactoring to BaseEntity
  cards?: Card[]; // TODO: Add when refactoring to BaseEntity
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
