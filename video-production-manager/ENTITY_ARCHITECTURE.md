# Entity Architecture - BaseEntity Pattern

## Overview

All production entities now follow a proper OOP inheritance pattern with `BaseEntity` as the base interface. Each entity has:
- **id** (string) - Unique identifier
- **name** (string) - Display name
- **category** (string) - Subcategory from sidebar navigation
- **categoryMember** ('source' | 'send' | 'signal-flow') - Top-level category

## Sources Category

### Computer
**Category**: "Computers"  
**Fields**:
- `computerType` (string) - From Settings (renamed from "Source Type")
- `outputs` (SourceOutput[]) - Max 4 outputs

**Output Fields**:
- `connector` - HDMI, SDI, DP, etc.
- `hRes` - Horizontal resolution
- `vRes` - Vertical resolution
- `rate` - Frame rate
- `reducedBlanking` - 'none' | 'RBv1' | 'RBv2' | 'RBv3'
- `secondaryDevice` - Optional secondary device identifier

**UX Note**: Preset dropdown is a UX helper only (not stored). Sets itself to "Custom..." if user manually enters values.

---

### Media Server
**Category**: "Media Servers"  
**Fields**:
- `software` (string) - From Settings group (like Computer Type)
- `outputs` (SourceOutput[]) - Max 8 outputs

**Output Fields**: Same as Computer

**UX Note**: Preset dropdown is a UX helper only (not stored).

---

### CCU (Camera Control Unit)
**Category**: "CCUs"  
**Fields**:
- `manufacturer` (string) - From Equipment database
- `makeModel` (string) - From Equipment database
- `connectedCamera` (string) - Camera ID (optional)
- `outputs` (SourceOutput[]) - Max 8 outputs
- `smpteCableLength` (number) - In feet (optional)

**Output Fields**: Same as Computer (no secondary device for CCU)

**UX Note**: Preset dropdown is a UX helper only (not stored).

---

### Camera
**Category**: "Cameras"  
**Fields**:
- `manufacturer` (string) - From Equipment database
- `makeModel` (string) - From Equipment database
- `connectedCCU` (string) - CCU ID (optional)
- `lens` (CameraLens) - Lens specifications
- `accessories` (CameraAccessories) - Accessory checkboxes
- `smpteCableLength` (number) - In feet (optional)

**Lens Fields**:
- `minFactor` (number) - Default 8.5 (float)
- `zoomFactor` (number) - Integer
- `maxDistance` (number) - In feet (integer)

**Accessories** (boolean flags):
- `tripod`
- `dolly`
- `jib`
- `steadicam`
- `wirelessTX`

---

## Sends Category
**TODO**: Refactor when building Sends pages

Planned subcategories:
- **LED** extends BaseEntity (category: "LED")
- **Projection** extends BaseEntity (category: "Projection")
- **Monitors** extends BaseEntity (category: "Monitors")

---

## Signal Flow Category
**TODO**: Refactor when building Signal Flow pages

Planned subcategories:
- **VisionSwitcher** extends BaseEntity (category: "Vision Switcher")
- **CamSwitcher** extends BaseEntity (category: "Cam Switcher")
- **Router** extends BaseEntity (category: "Routers")

---

## Migration Notes

### Legacy Interfaces
The following legacy interfaces remain for backward compatibility:
- `Source` - Old sources interface
- `LegacyCCU` - Old CCU interface
- `Send` - Current sends interface (to be refactored)
- `Router`, `VideoSwitcher` - Current signal flow interfaces (to be refactored)

**TODO**: Remove legacy interfaces once migration is complete.

### Database Schema
The database schema will need updates to match this new structure:
- Add `category` field to all entity tables
- Add `category_member` field to all entity tables
- Rename `type` fields to align with new structure
- Update foreign key relationships (e.g., `connectedCamera`, `connectedCCU`)

### Settings Groups Required
- **Computer Type** - Dropdown values for computers (already exists as "Source Type")
- **Media Server Software** - Dropdown values for media server software packages

---

## Benefits of This Architecture

1. **Consistency** - All entities share common base fields (id, name, category)
2. **Type Safety** - TypeScript enforces proper structure through inheritance
3. **Scalability** - Easy to add new subcategories by extending BaseEntity
4. **Navigation Alignment** - `category` field matches sidebar subcategory names exactly
5. **DRY Principle** - No repeated field definitions across entities
6. **Clear Hierarchy** - categoryMember groups entities into logical top-level categories
