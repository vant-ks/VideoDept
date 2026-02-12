# Data Architecture Proposal: Project-Based Storage

## Current Architecture Problems

### Single Monolithic Store
Currently, **everything** is stored in one Zustand store persisted to `localStorage` under the key `video-production-storage`:

```typescript
{
  // Show-specific data (should be per-project)
  production: Production,
  sources: Source[],
  sends: Send[],
  checklist: ChecklistItem[],
  ledScreens: LEDScreen[],
  ccus: CCU[],
  cameras: Camera[],
  
  // Equipment library (should be global/centrally managed)
  equipmentSpecs: EquipmentSpec[],
  connectorTypes: string[],
  sourceTypes: string[],
  frameRates: string[],
  resolutions: string[],
  
  // UI preferences (could be global)
  theme: 'light' | 'dark',
  accentColor: string,
  activeTab: string
}
```

**Issues:**
1. ❌ Can only work on one show at a time
2. ❌ No way to export/import shows
3. ❌ Equipment library mixed with show data
4. ❌ Can't archive completed shows
5. ❌ Can't share shows with team members
6. ❌ Equipment updates require manual intervention

---

## Proposed Architecture

### Three-Layer Data Model

```
┌─────────────────────────────────────────┐
│   APPLICATION PREFERENCES (Global)      │
│   - Theme, UI settings, window state    │
│   - Stored: localStorage                │
└─────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────┐
│   EQUIPMENT LIBRARY (Centrally Managed) │
│   - Equipment specs, connector types    │
│   - Frame rates, resolutions            │
│   - Stored: Hosted DB + Local cache     │
│   - Synced from central server          │
└─────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────┐
│   PROJECT FILES (Per-Show)              │
│   - Production metadata                 │
│   - Sources, Sends, Signal Flow, Checklist           │
│   - LED/Projection screens              │
│   - Computers, Cameras, CCUs, Media Servers        │
│   - Settings additions (almost like subclassing "settings")    │
│   - Stored: IndexedDB or File System    │
│   - Exportable as .vdpx file            │
└─────────────────────────────────────────┘
```

---

## Project File Format (.vdpx)

### Structure
```typescript
interface VideoDepProject {
  // Metadata
  version: string;  // Format version (e.g., "1.0.0")
  created: number;  // Timestamp
  modified: number; // Timestamp
  
  // Production Info
  production: Production;
  //ADD
  loadinDate: date;
  showStartDate: date;
  showEndDate: date;
  loadoutDate: date: //default to same as showEndDate
  location: Dict? [venueName: string; address1: string; address2: string; city: string; state: string; zipCode: string;]
  //endADD
  
  // Show-specific Resources
  sources: Source[];
  sends: Send[];
  checklist: ChecklistItem[];
  ledScreens: LEDScreen[];
  projectionScreens: ProjectionScreen[];
  //ADD
  computers: Computer[];
  //endADD
  ccus: CCU[];
  cameras: Camera[];
  mediaServers: MediaServer[];
  mediaServerLayers: MediaServerLayer[];
  videoSwitchers: VideoSwitcher[];
  serverAllocations: ServerAllocation[];
  ipAddresses: IPAddress[];
  
  // Equipment References (IDs only, specs come from library)
  usedEquipmentIds: string[];
}
```

### File Storage Options

#### Option 1: IndexedDB (Browser Native)
**Pros:**
- Built into browser
- No file system permissions needed
- Fast querying
- Good for web app

**Cons:**
- Can be cleared by browser
- Not easily portable
- Harder to share

#### Option 2: File System Access API (Recommended)
**Pros:**
- Real files users can manage
- Easy to backup/share
- Clear ownership
- Works like traditional desktop apps

**Cons:**
- Requires user permission
- Only works in modern browsers
- Need fallback for older browsers

#### Option 3: Hybrid Approach (Best)
- **Primary:** IndexedDB for active projects
- **Export:** Save as .vdpx JSON file
- **Import:** Load .vdpx files into IndexedDB
- **Auto-backup:** Periodic export to downloads

//ADD
The project is designed to be syncing with the cloud regularly. So we should be able to sync up/down changes to IndexDB and not have to worry about browser cache clearing. Unless I am missing something about the structure here.
//endADD

---

## Equipment Library Management

### Central Equipment Database
```typescript
interface EquipmentLibrary {
  version: string;  // Library version
  lastUpdated: number;
  
  // Reference Data
  equipmentSpecs: EquipmentSpec[];
  connectorTypes: ConnectorType[];
  sourceTypes: SourceType[];
  frameRates: FrameRate[];
  resolutions: ResolutionPreset[];
}
```

### Update Flow
```
1. User opens app
2. Check library version vs. server
3. If outdated → Download updates
4. Merge with local customizations
5. Cache locally
```

### Custom Equipment
Users can add custom equipment that:
- Stored locally per-user
- Merged with central library
- Flagged as "custom" in UI
- Can submit to central DB for review

---

## Implementation Plan

### Phase 1: Separate Stores
```typescript
// Global preferences (localStorage)
const usePreferencesStore = create(persist(...))

// Equipment library (localStorage + sync)
const useEquipmentLibrary = create(persist(...))

// Active project (IndexedDB)
const useProjectStore = create(...)
```

### Phase 2: Project Management UI
- Projects dashboard (list all shows)
- Create new project
- Open existing project
- Import project (.vdpx file)
- Export project (.vdpx file)
- Archive/Delete project

### Phase 3: IndexedDB Integration
- Create database schema
- CRUD operations for projects
- Migration from old localStorage

### Phase 4: Equipment Library Sync
- API endpoint for equipment library
- Version checking
- Background sync
- Conflict resolution

### Phase 5: File Import/Export
- Export project as JSON
- Import .vdpx files
- Validation and migration
- Backward compatibility

---

## Data Migration Strategy

### Step 1: Detect Old Format
```typescript
const oldData = localStorage.getItem('video-production-storage');
if (oldData && !localStorage.getItem('migrated-v2')) {
  // Migrate to new format
}
```

### Step 2: Split Data
```typescript
const parsed = JSON.parse(oldData);

// Extract preferences
const preferences = {
  theme: parsed.state.theme,
  accentColor: parsed.state.accentColor,
  // ...
};

// Extract equipment library
const equipment = {
  equipmentSpecs: parsed.state.equipmentSpecs,
  connectorTypes: parsed.state.connectorTypes,
  // ...
};

// Extract project data
const project = {
  production: parsed.state.production,
  sources: parsed.state.sources,
  // ...
};
```

### Step 3: Save to New Locations
```typescript
// Save preferences
localStorage.setItem('app-preferences', JSON.stringify(preferences));

// Save equipment library
localStorage.setItem('equipment-library', JSON.stringify(equipment));

// Save project to IndexedDB
await db.projects.add({
  id: 'migrated-project',
  ...project,
  created: Date.now(),
  modified: Date.now()
});

// Mark as migrated
localStorage.setItem('migrated-v2', 'true');
```

---

## UI Changes Needed

### 1. New: Projects Dashboard
- **Route:** `/projects` (new landing page)
- **Features:**
  - Grid/list of all projects
  - Create new project
  - Open project (loads into app)
  - Import/Export buttons
  - Archive toggle

### 2. Modified: Main App
- Only shows after project is loaded
- "Project" menu with:
  - Save
  - Save As
  - Export
  - Close (returns to dashboard)
  
### 3. New: Equipment Library Manager
- **Route:** `/equipment-library`
- **Features:**
  - Browse all equipment
  - Check for updates
  - Add custom equipment
  - Submit equipment for review

---

## API Endpoints Needed

### Equipment Library
```
GET  /api/equipment-library/version
GET  /api/equipment-library/download
GET  /api/equipment-library/equipment-specs
GET  /api/equipment-library/connector-types
POST /api/equipment-library/submit-custom
```

### Project Sharing (Future)
```
POST /api/projects/share        # Generate share link
GET  /api/projects/:shareId     # Download shared project
POST /api/projects/:id/collaborate  # Multi-user editing
```

---

## Benefits of New Architecture

### For Users
✅ Work on multiple shows simultaneously
✅ Archive completed shows
✅ Share projects with team members
✅ Export for backup/portfolio
✅ Import templates and examples
✅ Always have latest equipment specs

### For Development
✅ Cleaner separation of concerns
✅ Easier testing (mock project data)
✅ Better performance (load only active project)
✅ Simpler state management
✅ Central equipment updates
✅ Version control for project format

### For Business
✅ Build template library
✅ Share best practices
✅ Collaborate on shows
✅ Equipment database as a service
✅ Analytics on equipment usage
✅ Future: Multi-user features

---

## Next Steps

1. **Review & Approve** this architecture
2. **Create new store structure** (3 separate stores)
3. **Implement IndexedDB** wrapper
4. **Build project dashboard** UI
5. **Create import/export** functionality
6. **Migrate existing data**
7. **Test thoroughly**
8. **Deploy incrementally**

Would you like me to proceed with implementation?
