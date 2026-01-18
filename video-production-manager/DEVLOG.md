# Development Log - Video Production Manager

## January 18, 2026

### Centralized Settings Management
- **Removed** `secondaryDevices` from Settings - replaced with connector types from equipment converters
- **Added** Connector Types section to Settings
  - Initialized with: HDMI, SDI, DP, FIBER, NDI, USB-C
  - Drag-and-drop reordering with GripVertical handles
  - Add/remove capabilities with validation
  
- **Added** Frame Rates section to Settings
  - Initialized with: 60, 59.94, 50, 30, 29.97, 25, 24, 23.98
  - Drag-and-drop reordering
  - Add/remove capabilities
  
- **Added** Resolutions section to Settings
  - Initialized with: 1080i, 1080p, 720p, 4K, 8K, SD
  - Drag-and-drop reordering
  - Add/remove capabilities

### Site-Wide Integration
- Updated all dropdown references to use centralized settings
- Equipment FORMAT_OPTIONS now dynamically built from resolutions × frameRates
- SourceFormModal uses centralized connectorTypes
- EquipmentFormModal uses centralized resolutions and frameRates
- Added safety checks for undefined arrays

### Bug Fixes
- Fixed blank window issue (Cameras page was de-referenced)
- Restored Cameras page with all original customizations intact
- Added cache clearing guidance

### Infrastructure
- Server restart protocol established for large alterations
- All 4 settings lists (Source Types, Connector Types, Frame Rates, Resolutions) support drag-and-drop reordering
- Changes in Settings automatically propagate throughout application

---

## Previous Work

### Equipment Management System
- 10 equipment categories with modal-based CRUD operations
- Card-based architecture with direct I/O specifications
- Multi-output source support
- Equipment modal redesign with format assignment
- Simplified card model (removed manufacturer/model fields)

### Core Features
- Production planning and management
- Source and send tracking
- LED screen configuration
- IP address management
- Checklist system
- Video switcher integration
- Media server allocation
- CCU and camera management
