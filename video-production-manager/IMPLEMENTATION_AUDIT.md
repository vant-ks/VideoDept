# Implementation Audit - API Routes & UI Status

## Executive Summary

**Current State**: Most entity types have API routes but need UI pages and proper BaseEntity implementation.

## API Routes Status ✅

All major entity types have CRUD API routes:

### Sources Category
- ✅ **sources** - `/api/sources` (GET, POST, PUT, DELETE)
- ✅ **cameras** - `/api/cameras` (GET, POST, PUT, DELETE)
- ✅ **ccus** - `/api/ccus` (GET, POST, PUT, DELETE)
- ✅ **media-servers** - `/api/media-servers` (GET, POST, PUT, DELETE)

### Sends Category  
- ✅ **sends** - `/api/sends` (GET, POST, PUT, DELETE)
- ✅ **led-screens** - `/api/led-screens` (GET, POST, PUT, DELETE)
- ✅ **projection-screens** - `/api/projection-screens` (GET, POST, PUT, DELETE)
- ✅ **records** - `/api/records` (GET, POST, PUT, DELETE)
- ✅ **streams** - `/api/streams` (GET, POST, PUT, DELETE)

### Signal Flow Category
- ✅ **routers** - `/api/routers` (GET, POST, PUT, DELETE)
- ✅ **vision-switchers** - `/api/vision-switchers` (GET, POST, PUT, DELETE)
- ✅ **cam-switchers** - `/api/cam-switchers` (GET, POST, PUT, DELETE)

### Other
- ✅ **equipment** - `/api/equipment` (GET, POST, PUT, DELETE)
- ✅ **settings** - `/api/settings` (connector-types, source-types, frame-rates, resolutions)
- ✅ **cable-snakes** - `/api/cable-snakes` (GET, POST, PUT, DELETE)
- ✅ **checklist-items** - `/api/checklist-items` (GET, POST, PUT, DELETE)
- ✅ **connections** - `/api/connections`
- ✅ **ip-addresses** - `/api/ip-addresses` (GET, POST, PUT, DELETE)

---

## UI Pages Status

### ✅ Fully Functional Pages
- **Computers** (Computers.tsx) - Has modal, API integration, WebSocket sync
- **Sources** (Sources.tsx) - Has modal, API integration, WebSocket sync
- **Sends** (Sends.tsx) - Has tabs (Sends/Projection/LED), API integration, WebSocket sync
- **Equipment** (Equipment.tsx) - Full CRUD, card management UI
- **Settings** (Settings.tsx) - Manages connector types, source types, frame rates, resolutions

### ⚠️ Partially Functional Pages
- **Records** (Records.tsx) - Basic page exists, needs full modal and WebSocket
- **Streams** (Streams.tsx) - Basic page exists, needs full modal and WebSocket
- **Cam Switcher** (CamSwitcher.tsx) - Basic page exists, needs full modal and WebSocket
- **Snakes** (Snakes.tsx) - Basic page, NOT connected to API/database

### ❌ Missing or Placeholder Pages
- **Media Servers** - No dedicated UI page (should be subcategory of Sources)
- **Cameras** - No dedicated UI page (should be subcategory of Sources)
- **CCUs** - No dedicated UI page (should be subcategory of Sources)
- **Monitors** - No UI page (should be subcategory of Sends)
- **Vision Switcher** - In OtherPages.tsx but non-functional
- **Routers** - No UI page (should be subcategory of Signal Flow)

---

## BaseEntity Implementation Gap

### ✅ New Architecture Defined (Types)
- `BaseEntity` interface created
- `Computer`, `MediaServer`, `CCU`, `Camera` interfaces extend BaseEntity
- `Output`, `Input`, `Card`, `Slot`, `IOPort` interfaces defined
- `IOMode` type defined (direct, card-based, direct+card)

### ❌ Not Yet Implemented in Code
1. **Database Schema** - Still uses old field names (`type` instead of `category`)
2. **API Routes** - Still use old Source interface
3. **UI Components** - Still use old Source interface
4. **Data Migration** - No migration script to convert old data to new structure

---

## Equipment & Source Relationships

### ✅ Equipment Database Exists
- Equipment can be added/edited through Equipment page
- Equipment specs stored in `equipment_specs` table
- Equipment has cards, inputs, outputs

### ❌ Equipment-Source Relationships Missing
According to new BaseEntity architecture:
- **CCU** should link to Equipment via `manufacturer` and `makeModel`
- **Camera** should link to Equipment via `manufacturer` and `makeModel`
- **Camera** should link to CCU via `connectedCCU` field
- **CCU** should link to Camera via `connectedCamera` field

**Current State**: Sources don't read from Equipment database. The `type` field is a free-text string, not a relationship.

---

## Critical Implementation Steps

### 1. Database Schema Migration ⚠️ BLOCKING
**Priority**: HIGH  
**Status**: Not Started

Create migration to:
- Add `category` field to all entity tables
- Add `category_member` field to all entity tables  
- Keep old `type` field for backward compatibility
- Add equipment relationship fields (`manufacturer`, `make_model`)
- Add card/slot tables for signal flow devices

### 2. Update API Routes
**Priority**: HIGH  
**Status**: Not Started

Update routes to:
- Accept new BaseEntity fields
- Map between old and new field names
- Support equipment relationships
- Validate equipment references

### 3. Create Missing UI Pages
**Priority**: MEDIUM  
**Status**: Not Started

Need pages for:
- Media Servers (Sources submenu)
- Cameras (Sources submenu)
- CCUs (Sources submenu)
- Monitors (Sends submenu)
- Routers (Signal Flow submenu)

Each page should:
- Extend the pattern from Computers.tsx
- Include `useProductionEvents` hook
- Have proper form modals
- Connect to equipment database for dropdowns

### 4. Update Existing Pages
**Priority**: MEDIUM  
**Status**: Not Started

- **Computers**: Add equipment relationship dropdown
- **Sources**: Migrate to use category field
- **Sends**: Add Monitors tab
- **Records/Streams**: Add full modals and WebSocket
- **Vision Switcher/Routers**: Move to proper pages with card support

### 5. Equipment Integration
**Priority**: MEDIUM  
**Status**: Not Started

- Add dropdown in CCU form to select from Equipment
- Add dropdown in Camera form to select from Equipment
- Populate manufacturer/model from Equipment selection
- Show equipment specs when selected

---

## WebSocket Sync Status

### ✅ Hook Implemented
- `useProductionEvents` fixed and working
- `useProductionListEvents` fixed and working

### ✅ Currently Using WebSocket
- Computers
- Sources
- Sends

### ❌ Need to Add WebSocket
- Media Servers
- Cameras
- CCUs
- Monitors
- Records (partially done)
- Streams (partially done)
- Vision Switcher
- Cam Switcher
- Routers
- Snakes

---

## Recommended Implementation Order

1. **Database Migration** - Add new BaseEntity fields (breaking change, do first)
2. **Update Sources API** - Support both old and new interfaces during transition
3. **Create CCU UI Page** - First new BaseEntity page
4. **Create Camera UI Page** - Second new BaseEntity page (with CCU relationship)
5. **Create Media Server UI Page** - Third new BaseEntity page
6. **Equipment Dropdown Integration** - Add to CCU/Camera forms
7. **Update Computers Page** - Migrate to new architecture
8. **Create Monitors Page** - First Send subcategory
9. **Create Routers Page** - First Signal Flow with card support
10. **Card Management UI** - Reusable component for card-based devices

---

## Technical Debt

1. **Inconsistent Store Usage** - Mix of old Zustand store and new project store
2. **Legacy Interfaces** - Source, Send, Router interfaces need migration
3. **Missing Validation** - Equipment relationships not validated
4. **No Type Safety** - Equipment fields are strings, not references
5. **Snakes Not Connected** - Local state only, no database persistence

---

## Next Steps

**Before building new features:**
1. ✅ Socket connection fix (DONE)
2. ⚠️ Fix Computer source save bug (IN PROGRESS)
3. ❌ Database schema migration to BaseEntity
4. ❌ Update existing pages to use new architecture

**Then proceed with:**
- Building CCU, Camera, Media Server pages
- Adding equipment relationships
- Implementing card-based I/O UI
