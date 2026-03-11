# Source and Send Models & Services

This document describes the Source and Send data models, their associated services, and CRUD operations implemented for the Video Production Manager.

## Overview

Sources and Sends are core entities in the video production workflow:
- **Sources**: Video input devices (laptops, cameras, servers, etc.)
- **Sends**: Video output destinations (monitors, projectors, LED processors, etc.)

## Architecture

### Models (`src/models/`)

Class-based models that provide:
- Data validation
- Type safety with TypeScript
- Utility methods for common operations
- Serialization/deserialization (JSON import/export)

#### Source Model

```typescript
import { Source } from '@/models';

// Create a new source
const source = Source.create('SRC 1', 'LAPTOP', 'Main Presentation');

// Access properties
console.log(source.getResolutionString()); // "1920x1080"
console.log(source.getFormatString());     // "1920x1080@59.94"
console.log(source.getAspectRatioString()); // "16:9"
console.log(source.isHD());                // true

// Update source
const updated = source.update({ name: 'Updated Name' });

// Duplicate source
const copy = source.duplicate('SRC 2');

// Validate
source.validate(); // throws if invalid

// Convert to/from JSON
const json = source.toJSON();
const restored = Source.fromJSON(json);
```

#### Send Model

```typescript
import { Send } from '@/models';

// Create a new send
const send = Send.create('DST 1', 'VIDEO SWITCH', 'Main Screen');

// Check compatibility with a source
console.log(send.canAcceptResolution(1920, 1080)); // true

// All the same utility methods as Source
console.log(send.getResolutionString());
console.log(send.is4K());
```

### Services (`src/services/`)

Service classes provide higher-level operations:

#### SourceService

```typescript
import { SourceService } from '@/services';

// Generate unique ID
const newId = SourceService.generateId(existingSources);

// Create new with auto-generated ID
const newSource = SourceService.createNew(existingSources, 'LAPTOP', 'New Laptop');

// Validate before saving
const { valid, errors } = SourceService.validate(sourceData);

// Check for ID conflicts
const exists = SourceService.idExists('SRC 1', sources);

// Filter sources
const laptops = SourceService.filterByType(sources, 'LAPTOP');
const hdmiSources = SourceService.filterByConnector(sources, 'HDMI');

// Search sources
const results = SourceService.search(sources, 'camera');

// Sort sources
const sorted = SourceService.sort(sources, 'name', 'asc');

// Export/Import
const json = SourceService.exportToJSON(sources);
const { sources: imported, errors } = SourceService.importFromJSON(json);

// Statistics
const stats = SourceService.getStatistics(sources);
// Returns: { total, byType, byConnector, uniqueResolutions, hdCount, uhd4kCount }
```

#### SendService

Similar operations available for Sends, plus:

```typescript
import { SendService } from '@/services';

// Check compatibility
const isCompatible = SendService.isCompatible(send, 1920, 1080);

// Find compatible sends for a source
const compatible = SendService.findCompatible(sends, 1920, 1080);
```

### State Management (`src/hooks/useStore.ts`)

Zustand store with persistence:

```typescript
import { useProductionStore } from '@/hooks/useStore';

function MyComponent() {
  // Access state
  const sources = useProductionStore(state => state.sources);
  const sends = useProductionStore(state => state.sends);
  
  // CRUD operations
  const { 
    addSource, 
    updateSource, 
    deleteSource, 
    duplicateSource,
    bulkDeleteSources,
    addSend,
    updateSend,
    deleteSend,
    duplicateSend,
    bulkDeleteSends
  } = useProductionStore();
  
  // Add new source
  const handleAdd = () => {
    const newSource = SourceService.createNew(sources, 'LAPTOP');
    addSource(newSource);
  };
  
  // Update source
  const handleUpdate = (id: string) => {
    updateSource(id, { name: 'Updated Name' });
  };
  
  // Delete source
  const handleDelete = (id: string) => {
    deleteSource(id);
  };
  
  // Duplicate source
  const handleDuplicate = (id: string) => {
    duplicateSource(id);
  };
  
  // Bulk delete
  const handleBulkDelete = (ids: string[]) => {
    bulkDeleteSources(ids);
  };
}
```

## Data Structure

### Source Interface

```typescript
interface Source {
  id: string;              // Unique identifier (e.g., "SRC 1")
  type: SourceType;        // LAPTOP, CAM, SERVER, PLAYBACK, GRAPHICS, PTZ, ROBO, OTHER
  name: string;            // Display name
  hRes?: number;           // Horizontal resolution (optional)
  vRes?: number;           // Vertical resolution (optional)
  rate: number;            // Frame rate (e.g., 59.94, 60, 50, 30)
  standard?: string;       // Video standard (optional)
  note?: string;           // Additional notes
  secondaryDevice?: string; // Secondary equipment (e.g., "HDMI > FIBER")
  output: ConnectorType;   // HDMI, SDI, DP, FIBER, NDI, USB-C
}
```

### Send Interface

```typescript
interface Send {
  id: string;              // Unique identifier (e.g., "DST 1")
  type: SendType;          // VIDEO SWITCH, ROUTER, LED PROCESSOR, PROJECTOR, MONITOR, RECORD, STREAM, OTHER
  name: string;            // Display name
  hRes?: number;           // Horizontal resolution (optional)
  vRes?: number;           // Vertical resolution (optional)
  rate: number;            // Frame rate
  standard?: string;       // Video standard (optional)
  note?: string;           // Additional notes
  secondaryDevice?: string; // Secondary equipment
  output: ConnectorType;   // Connector type
}
```

## CRUD Operations

### Create (Add)

```typescript
// Option 1: Using service to auto-generate ID
const newSource = SourceService.createNew(existingSources, 'LAPTOP', 'My Laptop');
addSource(newSource);

// Option 2: Manual creation
const source = Source.create('SRC 99', 'CAM', 'Camera 1');
addSource(source.toJSON());
```

### Read (Query)

```typescript
// Get all sources
const allSources = useProductionStore(state => state.sources);

// Filter by type using selector
const cameras = useSourcesByType('CAM');

// Search using service
const searchResults = SourceService.search(sources, 'camera');

// Get statistics
const stats = SourceService.getStatistics(sources);
```

### Update

```typescript
// Partial update
updateSource('SRC 1', { 
  name: 'New Name',
  rate: 60,
  note: 'Updated note'
});

// Full update using model
const source = Source.fromJSON(existingSource);
const updated = source.update({ name: 'New Name' });
updateSource(source.id, updated.toJSON());
```

### Delete

```typescript
// Single delete
deleteSource('SRC 1');

// Bulk delete
bulkDeleteSources(['SRC 1', 'SRC 2', 'SRC 3']);
```

### Additional Operations

```typescript
// Duplicate
duplicateSource('SRC 1'); // Creates "SRC X (Copy)"

// Export to JSON file
const json = SourceService.exportToJSON(sources);
// Save to file or send to backend

// Import from JSON
const { sources: imported, errors } = SourceService.importFromJSON(jsonString);
if (errors.length === 0) {
  imported.forEach(source => addSource(source.toJSON()));
}
```

## Validation

All models include built-in validation:

```typescript
// Validation happens automatically in constructor
try {
  const source = new Source({
    id: '',  // Invalid!
    type: 'LAPTOP',
    name: '',  // Invalid!
    rate: -1,  // Invalid!
    output: 'HDMI'
  });
} catch (error) {
  console.error(error.message); // "Source ID is required"
}

// Or validate before creating
const { valid, errors } = SourceService.validate(sourceData);
if (!valid) {
  console.error('Validation errors:', errors);
}
```

## Usage Examples

### Example 1: Add New Camera Source

```typescript
const handleAddCamera = () => {
  const sources = useProductionStore.getState().sources;
  const camera = SourceService.createNew(sources, 'CAM', 'Camera 5');
  
  // Set camera-specific properties
  const configured = camera.update({
    hRes: 1920,
    vRes: 1080,
    rate: 59.94,
    output: 'SDI',
    note: 'Audience wide shot',
    secondaryDevice: 'SMPTE FIBER > CCU'
  });
  
  useProductionStore.getState().addSource(configured.toJSON());
};
```

### Example 2: Batch Import Sources

```typescript
const handleImport = (jsonFile: string) => {
  const { sources, errors } = SourceService.importFromJSON(jsonFile);
  
  if (errors.length > 0) {
    alert(`Import errors:\n${errors.join('\n')}`);
    return;
  }
  
  const store = useProductionStore.getState();
  sources.forEach(source => {
    // Check for ID conflicts
    if (SourceService.idExists(source.id, store.sources)) {
      // Generate new ID
      const newId = SourceService.generateId(store.sources);
      const updated = source.update({ id: newId });
      store.addSource(updated.toJSON());
    } else {
      store.addSource(source.toJSON());
    }
  });
  
  alert(`Successfully imported ${sources.length} sources`);
};
```

### Example 3: Find Compatible Sends for a Source

```typescript
const findCompatibleOutputs = (sourceId: string) => {
  const store = useProductionStore.getState();
  const source = store.sources.find(s => s.id === sourceId);
  
  if (!source) return [];
  
  const compatible = SendService.findCompatible(
    store.sends,
    source.hRes,
    source.vRes
  );
  
  return compatible;
};
```

## Future Enhancements

The current implementation provides a foundation for:

1. **Data Persistence**: Store data in localStorage (already handled by Zustand persist)
2. **Show Management**: Wrap sources/sends in a "Show" entity
3. **Export/Import**: Full show export with all associated data
4. **Backend Integration**: Easy serialization for API communication
5. **Multi-user Collaboration**: Foundation for real-time sync
6. **Validation Rules**: Extendable validation system
7. **Relationship Mapping**: Track which sources connect to which sends

## API Reference

### Source Class Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `validate()` | Validates source data | `void` (throws on error) |
| `getResolutionString()` | Get resolution as "WxH" | `string` |
| `getFormatString()` | Get format as "WxH@rate" | `string` |
| `getAspectRatio()` | Get numeric aspect ratio | `number \| null` |
| `getAspectRatioString()` | Get aspect ratio as "16:9" | `string` |
| `getTotalPixels()` | Get total pixel count | `number \| null` |
| `isHD()` | Check if HD (≥720p) | `boolean` |
| `is4K()` | Check if 4K (≥2160p) | `boolean` |
| `update()` | Create updated copy | `Source` |
| `duplicate()` | Create duplicate | `Source` |
| `toJSON()` | Serialize to plain object | `ISource` |

### SourceService Static Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `generateId()` | Generate unique ID | `string` |
| `createNew()` | Create with auto-ID | `Source` |
| `validate()` | Validate data | `{ valid, errors }` |
| `idExists()` | Check ID collision | `boolean` |
| `filterByType()` | Filter by type | `ISource[]` |
| `filterByConnector()` | Filter by connector | `ISource[]` |
| `search()` | Search by text | `ISource[]` |
| `sort()` | Sort by field | `ISource[]` |
| `exportToJSON()` | Export to JSON string | `string` |
| `importFromJSON()` | Import from JSON | `{ sources, errors }` |
| `getStatistics()` | Get analytics | `object` |

## Notes

- All data is automatically persisted to localStorage via Zustand persist middleware
- IDs follow the pattern "SRC #" for sources and "DST #" for sends
- Frame rates are stored as decimals (e.g., 59.94, 60, 50, 30, 25)
- Resolution is optional - some devices may not specify it
- The store supports undo/redo capability (can be added in future)
- All methods are type-safe with full TypeScript support
