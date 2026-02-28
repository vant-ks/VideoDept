# Relationships & Signal Flow Planning Session
**Date:** February 28, 2026  
**Status:** PLANNING - Session Started  
**Purpose:** Map out current relationships and plan signal flow architecture

---

## 🏗️ ARCHITECTURE CLARIFICATION

### BaseEntity Pattern (TypeScript Only - NOT Database Inheritance)

**Important:** We are **NOT** using class/subclass database inheritance. Instead:
- `BaseEntity` = TypeScript interface for code consistency
- Each entity type = Separate Prisma table (Single Table Per Entity pattern)
- No polymorphic base table, no table inheritance

**Entity Hierarchy (Conceptual):**
```
BaseEntity (TypeScript interface)
  |
  ├── Sources (Production category)
  │     ├── Computer (equipment: laptop, desktop)
  │     ├── Media Server (equipment: media servers)
  │     ├── Camera (equipment: camera bodies)
  │     ├── CCU (equipment: camera control units)
  │     └── Camera Switcher (equipment: camera feed switcher, NOT vision switcher)
  |
  ├── Sends (Destination category)
  │     ├── Monitor (equipment: displays)
  │     ├── Recorder (equipment: recording devices)
  │     ├── Projector (equipment: projectors)
  │     └── LED Tile (equipment: LED walls)
  |
  └── Signal Flow (Routing category)
        ├── Switcher (equipment: video switchers)
        ├── Router (equipment: routers/matrices)
        ├── LED Processor (equipment: LED processors)
        └── Converter (equipment: signal converters)
```

**Database Reality:**
- Each category = Separate table: `computers`, `media_servers`, `cameras`, `ccus`, `camera_switchers`, `sends`, etc.
- `sources` is a **parent label only** — each child entity has its own dedicated table
- No shared base table
- Relationships via foreign keys, not inheritance

### Why NOT Use Database Inheritance?

**Considered Patterns (Rejected):**

1. **Single Table Inheritance (STI)**
   - One `entities` table with `entity_type` discriminator
   - ❌ Rejected: Too many nullable columns for entity-specific fields
   - ❌ Rejected: Prisma doesn't support STI well
   - ❌ Rejected: Complex queries, hard to add entity-specific indexes

2. **Class Table Inheritance (CTI)**
   - Base `entities` table + specific tables (computers, routers, etc.)
   - ❌ Rejected: Requires joins for every query
   - ❌ Rejected: More complex migrations
   - ❌ Rejected: Prisma doesn't have native support

3. **Concrete Table Inheritance**
   - Separate tables with duplicated base fields
   - ✅ **CHOSEN**: This is what we're doing
   - ✅ Pro: Simple queries, no joins needed
   - ✅ Pro: Easy to add entity-specific fields
   - ✅ Pro: Prisma-friendly
   - ✅ Pro: Each table can have optimized indexes
   - ⚠️ Con: Base fields duplicated (but TypeScript enforces consistency)

**Our Approach:**
- TypeScript `BaseEntity` interface ensures consistency at code level
- Each Prisma model includes base fields: `id`, `production_id`, `created_at`, `updated_at`, `version`, `is_deleted`
- No runtime inheritance, just compile-time typing
- API/Frontend can treat them polymorphically via TypeScript

---

## 🔍 CURRENT STATE ANALYSIS

### Source Types & Categories

#### Current Implementation
```typescript
// Database: source_types table (settings) - WRONG DATA CURRENTLY
// Current (incorrect): ['LAPTOP', 'CAM', 'SERVER', 'PLAYBACK', 'GRAPHICS', 'PTZ', 'ROBO', 'OTHER']
// These are equipment categories, NOT computer types!

// Correct Computer Types (from settings.ts restore-defaults):
[
  'Laptop - PC MISC', 'Laptop - PC GFX', 'Laptop - PC WIDE',
  'Laptop - MAC MISC', 'Laptop - MAC GFX',
  'Desktop - PC MISC', 'Desktop - PC GFX', 'Desktop - PC SERVER',
  'Desktop - MAC MISC', 'Desktop - MAC GFX', 'Desktop - MAC SERVER'
]

// Entity Categories (from equipment_specs.category):
type EquipmentCategory = 'COMPUTER' | 'MEDIA_SERVER' | 'CAMERA' | 'CCU' | 'CAMERA_SWITCHER'
  | 'SWITCHER' | 'ROUTER' | 'LED_PROCESSOR' | 'CONVERTER'
  | 'MONITOR' | 'RECORDER' | 'PROJECTOR' | 'LED_TILE';
// Functional Categorization (Signal Path Roles):
// - SOURCES: computer, media_server, camera, ccu, camera_switcher (generate signals)
// - SIGNAL_FLOW: switcher, router, led_processor, converter (route/process signals)
// - SENDS: monitor, recorder, projector, led_tile (receive/display signals)
//
// Note: Equipment can have loop-through ports (source device with send capability,
// or send device with source capability). These are managed in signal flow via
// connections table, not as separate entity types.
// Schema: sources table (generic container, NOT inheritance base)
model sources {
  uuid                   String   @id
  id                     String            // "SRC 1"
  production_id          String            // ← FIELD: FK column (stores the string)
  category               String?           // Base category
  type                   String            // Settings-defined type
  name                   String
  // ... format fields
  connections            connections[]
  source_outputs         source_outputs[]
  productions            productions @relation // ← RELATION: Prisma accessor
  //                     ^^^^^^^^^^^
  //                     This lets you query: await prisma.sources.findUnique({
  //                       where: { uuid },
  //                       include: { productions: true } // ← Gets full production object
  //                     });
}
```

**Note on Prisma Syntax:**
- `production_id String` = Database column (holds the FK value)
- `productions productions @relation(...)` = Prisma relation (lets you query related object)
- In code: `source.production_id` = string like "prod-123"
- With include: `source.productions` = full object `{ id: "prod-123", client: "ABC", ... }`

#### Relationships Currently in Sources
1. **Production Relationship** ✅
   - FK: `production_id` → `productions.id`
   - Cascade delete enabled
   - Indexed

2. **Source Outputs** ✅ (Child relationship)
   - One-to-many: `sources` → `source_outputs`
   - FK: `source_outputs.source_uuid` → `sources.uuid`
   - Cascade delete enabled

3. **Connections** ✅ (Referenced by)
   - One-to-many: `sources` → `connections`
   - FK: `connections.source_uuid` → `sources.uuid`
   - Dual storage: stores both `source_uuid` AND `source_id` for display

#### Planned Relationships for Sources
- [ ] **Equipment Specs** (NOT YET IMPLEMENTED)
  - Sources should reference Equipment for make/model
  - Pattern: Store `equipment_uuid` + `equipment_id` (manufacturer + model)
  - Example: Computer source → Equipment (manufacturer: "Apple", model: "MacBook Pro")

- [ ] **Category-Specific Types** (PARTIAL)
  - Computer → computerType (from settings)
  - Media Server → software (from settings)
  - Camera → reference to equipment_specs
  - CCU → reference to equipment_specs
  - Camera Switcher → reference to equipment_specs

#### Output Architecture (DECISION MADE)

**Universal I/O Pattern: Direct + Optional Card-Based**

**Core Principle:**
- **EVERY device has direct I/O** (at minimum for IP control, reference, primary outputs)
- **Card-based I/O capability is defined at the equipment_specs level** — if a device references the equipment library, its card-based I/O configuration is inherited from there
- **Exceptions (no equipment_specs required):** Computers and Media Servers are configured directly by the user without admin/equipment-library involvement — they may not exist in the equipment library at all
- Enables modular expansion and custom configurations

**I/O Structure:**

1. **Direct I/O** (always available)
   - Built into device hardware
   - Examples: Reference in/out, control ports, primary outputs
   - Tables: `{entity}_outputs`, `{entity}_inputs`
   - Simple relationship: device → direct I/O

2. **Card-Based I/O** (optional, defined per equipment type)
   - Removable expansion cards
   - **For equipment-library devices** (cameras, CCUs, switchers, routers, LED processors, converters): card capability is defined in `equipment_specs` — users cannot override this
   - **For non-library devices** (computers, media servers): user defines I/O directly, no admin privilege required
   - Hierarchy: device → cards → card I/O
   - Tables: `{entity}_cards` → `{entity}_card_outputs` / `{entity}_card_inputs`

**I/O Properties (ALL inputs/outputs have these):**
- `connector` (String) - Connector type (HDMI, SDI, DP, etc.)
- `h_res` (Int) - Horizontal resolution
- `v_res` (Int) - Vertical resolution  
- `rate` (Float) - Frame rate
- `id` (String) - Display label ("OUT 1", "IN 3")
- `uuid` (String) - Unique identifier
- `is_card_based` (Boolean) - False for direct I/O, True for card-based
- `card_uuid` (String?) - NULL for direct I/O, references parent card if card-based

**Current Implementation:**
- ✅ `source_outputs` table exists for direct I/O
- ❌ Need card enablement configuration (device settings)
- ❌ Need card management tables
- ❌ Need to extend to all device types

### Sends Category

#### Current Implementation
```typescript
// Database: sends table
model sends {
  uuid         String   @id
  id           String            // "SEND 1"
  production_id    String
  type             String        // SendType from settings
  name             String
  // ... format fields
  output_connector String?
  productions      productions @relation
  
  @@index([production_id, is_deleted])
  @@index([type])
}

// Types
type SendType = 
  | 'VIDEO SWITCH' 
  | 'ROUTER' 
  | 'LED PROCESSOR' 
  | 'PROJECTOR'
  | 'MONITOR'
  | 'RECORD'
  | 'STREAM'
  | 'OTHER';
```

#### Relationships Currently in Sends
1. **Production Relationship** ✅
   - FK: `production_id` → `productions.id`
   - Cascade delete enabled
   - Indexed

#### Missing Relationships for Sends
- [ ] **Send Inputs** (NOT YET IMPLEMENTED)
  - Pattern should mirror `source_outputs`
  - Schema needed: `send_inputs` table
  - One-to-many: `sends` → `send_inputs`
  - Each input has: id, connector, format, feed

- [ ] **Connections** (PARTIALLY IMPLEMENTED)
  - Sends should be destinations in connections table
  - Current: `connections.destination_type` + `destination_id`
  - Need: `destination_uuid` FK to various send entities

- [ ] **Equipment Specs** (NOT YET IMPLEMENTED)
  - Routers, switchers, LED processors → Equipment
  - Pattern: `equipment_uuid` + `equipment_id`

#### Input Architecture (DECISION MADE)

**All devices can have definable inputs (not just sends):**

**Input Format Inheritance (DECISION MADE):**
- ✅ **Inputs inherit format from their connected output**
- Inputs accept what they receive - no format conversion at input
- Format conversion happens INSIDE the device, AFTER input
- Converted format appears on device outputs, not inputs
- Example signal chain:
  - Camera outputs 4K (3840x2160@60) → Input receives 4K
  - Scaler device processes internally → Output sends 1080p (1920x1080@60)
  - LED input receives 1080p

**Input Properties (ALL inputs have these):**
- `connector` (String) - Connector type (HDMI, SDI, DP, etc.)
- `h_res` (Int) - Horizontal resolution (inherited from connected output)
- `v_res` (Int) - Vertical resolution (inherited from connected output)
- `rate` (Float) - Frame rate (inherited from connected output)
- `feed` (String?) - Display label of connected output ("CAM 1 OUT 1")
- `id` (String) - Display label ("IN 1", "IN 2")
- `uuid` (String) - Unique identifier
- `is_card_based` (Boolean) - Direct I/O vs card-based
- `card_uuid` (String?) - Parent card reference if card-based

### Signal Flow (Connections)

#### Current Implementation
```typescript
// Database: connections table
model connections {
  uuid         String   @id
  id           String
  production_id       String
  
  // Source side (dual storage)
  source_uuid         String?
  source_id           String?
  source_output_id    String?
  
  // Intermediate device (for multi-hop)
  intermediate_type   String?
  intermediate_id     String?
  intermediate_input  String?
  intermediate_output String?
  
  // Destination side
  destination_type    String      // Type of destination
  destination_id      String?
  
  signal_path         Json?       // Complex routing paths
  note                String?
  
  productions         productions @relation
  sources             sources? @relation    // Only sources have FK
  
  @@index([production_id])
  @@index([source_uuid])
}
```

#### Connection Relationships Currently
1. **Source FK** ✅
   - FK: `source_uuid` → `sources.uuid`
   - Dual storage with `source_id` for display

2. **Production FK** ✅
   - FK: `production_id` → `productions.id`

#### Missing Connection Relationships
- [ ] **Destination FK** (NOT YET IMPLEMENTED)
  - Need polymorphic relationship to sends
  - Options:
    1. Multiple FK columns: `router_uuid`, `led_uuid`, `projector_uuid`
    2. Single FK + type discriminator
    3. Keep as string reference (current, but weak)

- [ ] **Intermediate Device FK** (NOT YET IMPLEMENTED)
  - For multi-hop connections (Source → Router → Switcher → LED)
  - Similar pattern to destination

---

## 🎯 PLANNING: RELATIONSHIP ARCHITECTURE

### Signal Flow Fundamentals (DECISION MADE)

**Core Principle: Outputs Connect to Inputs via Cables**

All connections follow the pattern: `OUTPUT → CABLE → INPUT`

**Important Notes:**
- Connections are made via physical cables (to be defined later with types and lengths)
- Sources CAN have send capabilities (loop-through ports)
- Sends CAN have source capabilities (loop-through ports)
- These loop-through capabilities are managed in I/O definitions, not as separate entity types

**Entity I/O Patterns:**

1. **Sources** (signal generators)
   - Primarily: OUTPUTS
   - Optional: INPUTS (for loop-through)
   - Examples: computers, media servers, cameras, CCUs, camera switchers
   - Tables: `{entity}_outputs` per child type (e.g. `camera_outputs`, `ccu_outputs`)

2. **Sends** (signal receivers/displays)
   - Primarily: INPUTS
   - Optional: OUTPUTS (for loop-through)
   - Examples: monitors, recorders, projectors, LED tiles
   - Tables: `send_inputs`, `send_outputs` (optional)

3. **Signal Flow Devices** (signal processors/routers)
   - Have: BOTH inputs AND outputs
   - Examples: switchers, routers, converters, LED processors
   - Tables: 
     - `switcher_inputs` + `switcher_outputs`
     - `router_inputs` + `router_outputs`
     - `converter_inputs` + `converter_outputs`
     - `led_processor_inputs` + `led_processor_outputs`

**Signal Path Example:**
```
Camera (source)
  OUT 1 →
        Router (signal flow)
          IN 3 → [internal routing] → OUT 12 →
                                              Switcher (signal flow)
                                                IN 5 → [switching] → PGM OUT →
                                                                               LED Processor (signal flow)
                                                                                 IN 1 → [processing] → OUT 1 →
                                                                                                             LED Wall (send)
                                                                                                               IN 1
```

**Connection Model Simplified:**
```prisma
model connections {
  uuid              String @id
  production_id     String
  
  // Simple output→cable→input pattern
  from_output_uuid  String   // ANY device's output
  from_output_id    String   // Display: "CAM 1 OUT 1"
  
  cable_uuid        String?  // Reference to cable (to be implemented)
  cable_id          String?  // Display: "CABLE 42" (dual storage)
  
  to_input_uuid     String   // ANY device's input  
  to_input_id       String   // Display: "LED 1 IN 1"
  
  // Signal path is just a chain of connections
  // Multi-hop = multiple connection records
}

model cables {
  uuid              String @id
  id                String   // Display: "CABLE 1"
  production_id     String
  cable_type        String   // HDMI, SDI, DP, etc.
  length_feet       Float?
  note              String?
  
  connections       connections[]
}
```

---

### Design Questions to Answer

#### 1. Source-to-Equipment Relationship
**Current:** Sources use string `type` field  
**Desired:** Sources reference Equipment specs

**Options:**
- **A)** Add `equipment_uuid` + `equipment_id` to sources table
  - Pro: Clean FK relationship, can query equipment details
  - Con: Not all sources have equipment (e.g., NDI, software)
  
- **B)** Keep type as string, use Equipment as optional reference
  - Pro: Flexibility for software sources
  - Con: Inconsistent data model
  
- **C)** Create category-specific tables (computers, media_servers)
  - Pro: Proper normalization for each category
  - Con: More complex schema, need migrations

**Recommendation:** TBD - needs discussion

---

#### 2. Send Inputs Architecture
**Current:** Sends have no input tracking  
**Desired:** Track inputs like sources track outputs

**Pattern to Follow:**
```typescript
// Mirror source_outputs pattern
model send_inputs {
  uuid         String   @id
  id           String            // "IN 1", "IN 2"
  send_uuid    String
  send_id      String            // Redundant for display
  connector    String
  input_index  Int      @default(1)
  h_res        Int?
  v_res        Int?
  rate         Float?
  feed         String?           // What's connected
  created_at   DateTime @default(now())
  version      Int      @default(1)
  sends        sends @relation(fields: [send_uuid], references: [uuid], onDelete: Cascade)

  @@index([send_uuid])
}
```

**Questions:**
- Should inputs inherit format from connected source?
- Track format per input or per send?
- How to handle routers with 16+ inputs?

---

#### 3. Polymorphic Connections (Biggest Design Decision)
**Current:** String-based destination with no FK  
**Desired:** Type-safe relationships

**Challenge:** Prisma doesn't natively support polymorphic relations

**Options:**

##### Option A: Multiple FK Columns (Explicit)
```prisma
model connections {
  // ... existing fields
  
  // Destination polymorphism
  destination_type    String
  router_uuid         String?
  switcher_uuid       String?
  led_processor_uuid  String?
  projector_uuid      String?
  monitor_uuid        String?
  
  routers         routers? @relation(fields: [router_uuid], references: [uuid])
  switchers       switchers? @relation(fields: [switcher_uuid], references: [uuid])
  // ... more relations
}
```
**Pros:**
- ✅ True FK constraints
- ✅ Type-safe at database level
- ✅ Clear relationships in schema

**Cons:**
- ❌ Many nullable columns
- ❌ Need to add column for each new entity type
- ❌ Complex queries (OR across multiple columns)

##### Option B: JSON Reference (Current + Enhanced)
```prisma
model connections {
  // ... existing fields
  destination_type    String
  destination_uuid    String?   // No FK constraint
  destination_id      String?
  
  destination_meta    Json?     // Store entity details snapshot
}
```
**Pros:**
- ✅ Flexible schema
- ✅ Easy to add new entity types
- ✅ Simple queries

**Cons:**
- ❌ No database-level integrity
- ❌ Can't cascade deletes
- ❌ Need application-level referential integrity

##### Option C: Intermediary Join Table
```prisma
model connection_destinations {
  uuid            String @id
  connection_uuid String
  entity_type     String    // 'router' | 'switcher' | etc.
  entity_uuid     String
  entity_id       String
  input_id        String?
  
  connection      connections @relation
  
  @@index([entity_uuid])
}
```
**Pros:**
- ✅ Normalized structure
- ✅ Easy to query by entity
- ✅ Can add metadata per destination

**Cons:**
- ❌ Extra join required
- ❌ More complex queries
- ❌ Still no true FK to polymorphic targets

**Recommendation:** TBD - needs discussion

---

#### 4. Multi-Hop Signal Paths
**Current:** Single intermediate device fields  
**Desired:** Track full signal path (Source → Router → Switcher → LED)

**Options:**

##### Option A: Array of Hops (JSON)
```typescript
signal_path: [
  {
    hop: 1,
    entityType: 'router',
    entityUuid: 'uuid-1',
    entityId: 'RTR 1',
    inputId: 'IN 3',
    outputId: 'OUT 12'
  },
  {
    hop: 2,
    entityType: 'switcher',
    entityUuid: 'uuid-2',
    entityId: 'SW 1',
    inputId: 'IN 1',
    outputId: 'PGM'
  }
]
```

##### Option B: Separate Hops Table
```prisma
model connection_hops {
  uuid            String @id
  connection_uuid String
  hop_number      Int
  entity_type     String
  entity_uuid     String
  entity_id       String
  input_id        String?
  output_id       String?
  
  connection      connections @relation
  
  @@index([connection_uuid, hop_number])
}
```

**Questions:**
- How common are multi-hop paths?
- Performance vs normalization trade-off?
- UI complexity for editing multi-hop paths?

---

## �️ EDID ARCHITECTURE (DECISION MADE)

### What is an EDID?

**EDID (Extended Display Identification Data)** is a metadata standard that inputs use to advertise their capabilities to the connected output device. In production environments, EDIDs are used to control what resolution, frame rate, and connector type a source outputs to a particular destination.

### Where EDIDs Live

- **Signal Flow Device Inputs** — each input has an EDID definition
- **Send Device Inputs** — each input has an EDID definition
- _(Source outputs do NOT have EDIDs — they generate signal, inputs receive it)_

### EDID Definition Options (per input)

Each input offers two ways to define its EDID:

**Option A: Custom User-Defined EDID**
- User manually enters: resolution (h_res × v_res), frame rate, connector type
- Stored directly on the input record
- Maximum flexibility for non-standard configurations

**Option B: Select from EDID Library**
- Admin-maintained table of named EDID presets (e.g. "1080p60 HDMI", "4K30 SDI")
- User picks from a list; all properties auto-populated from the preset
- `edid_preset_uuid` stored on the input record (dual storage with resolved values)

### EDID Schema (on every input record)

```typescript
model {entity}_inputs {
  uuid              String  @id
  // ... existing fields ...

  // EDID configuration
  edid_mode         String  @default("inherit")  // "inherit" | "custom" | "preset"
  edid_preset_uuid  String?                       // FK → edid_presets.uuid (when mode = "preset")
  edid_connector    String?                       // Connector type override (HDMI, SDI, DP, etc.)
  edid_h_res        Int?                          // Override horizontal resolution
  edid_v_res        Int?                          // Override vertical resolution
  edid_rate         Float?                        // Override frame rate

  edid_presets      edid_presets? @relation(fields: [edid_preset_uuid], references: [uuid])
}

model edid_presets {
  uuid        String   @id
  name        String                // e.g. "1080p60 HDMI", "4K30 SDI"
  connector   String                // HDMI | SDI | DP | FIBER | USB-C | etc.
  h_res       Int
  v_res       Int
  rate        Float
  note        String?
  created_at  DateTime @default(now())
}
```

### EDID Resolution Chain (Signal Tracing)

When `edid_mode = "inherit"`, the system traces the connection chain **back to the source** to determine the effective format for that input:

```
Source Output (defines format: connector, h_res, v_res, rate)
  → Cable
    → Signal Flow Device Input (EDID: inherit → reads from source output)
      → [internal processing]
      → Signal Flow Device Output (may convert format)
        → Cable
          → Send Device Input (EDID: inherit → reads from upstream output)
```

**Trace logic:**
1. Look at the input's connected output (`from_output_uuid`)
2. Read that output's `connector`, `h_res`, `v_res`, `rate`
3. If the upstream output belongs to a signal flow device, it may have a different format than what entered the device (conversion happened internally)
4. Follow chain until source output is reached
5. Populate inherited EDID values for display purposes (stored as resolved cache, refreshed on connection change)

### Connection Validation Rules

When a connection is created (`from_output_uuid → to_input_uuid`), apply these checks:

**Rule 1: Connector Compatibility**
- The output's `connector` type must be compatible with the input's defined connector
- Hard block (error) if connectors are physically incompatible (e.g. SDI output → HDMI input)
- Warn (soft warning) if adapters are typically required (e.g. DP → HDMI)
- Define a compatibility matrix in settings or constants

**Rule 2: Resolution Validity**
- If the input has a custom or preset EDID, the source output's resolution must match or be within the input's accepted range
- Warn if formats differ (e.g. source outputs 4K but input EDID is 1080p) — the device may scale, but user should be aware

**Rule 3: Frame Rate Match**
- If the input specifies a frame rate via EDID, the connection should match
- Warn on mismatch (e.g. source outputs 59.94 but input EDID is 50)

**Rule 4: Signal Format Chain Continuity**
- On multi-hop paths, validate format at each hop
- If a signal flow device's output format differs from its input format (conversion), flag this in the signal path UI so operators know where conversions occur

**Validation Response Pattern:**
```typescript
type ConnectionValidationResult = {
  valid: boolean;
  errors: ConnectionError[];    // Hard blocks — prevent connection
  warnings: ConnectionWarning[]; // Soft warnings — allow but inform
}

type ConnectionError = {
  code: 'CONNECTOR_INCOMPATIBLE' | 'FORMAT_MISMATCH_HARD';
  message: string;
  from: { uuid: string; id: string; connector: string; format: string };
  to:   { uuid: string; id: string; connector: string; format: string };
}

type ConnectionWarning = {
  code: 'CONNECTOR_ADAPTER_NEEDED' | 'RESOLUTION_MISMATCH' | 'FRAMERATE_MISMATCH' | 'FORMAT_CONVERSION_PRESENT';
  message: string;
}
```

### EDID Presets Table (Admin-Managed)

Sample presets to seed the EDID library:

| Name | Connector | Resolution | Frame Rate |
|---|---|---|---|
| 1080p60 HDMI | HDMI | 1920×1080 | 60 |
| 1080p59.94 HDMI | HDMI | 1920×1080 | 59.94 |
| 1080i59.94 SDI | SDI | 1920×1080i | 59.94 |
| 1080p50 SDI | SDI | 1920×1080 | 50 |
| 4K30 HDMI | HDMI | 3840×2160 | 30 |
| 4K60 DP | DP | 3840×2160 | 60 |
| 1080p60 NDI | NDI | 1920×1080 | 60 |

**Date:** February 28, 2026  
**Decision:** EDID system for signal flow and send device inputs  
**Details:**
- Every input on a signal flow or send device has an EDID configuration
- Three modes: `inherit` (trace from source), `custom` (manual override), `preset` (from EDID library)
- Admin manages EDID preset library (name + connector + resolution + frame rate)
- Connection creation triggers validation: connector compatibility, resolution match, frame rate match
- Validation: hard errors block connection; soft warnings allow but inform
- Multi-hop format trace follows the full signal chain back to source output
**Rationale:** Reflects real-world AV production workflow. EDIDs are critical for ensuring signals are accepted by receiving devices. Validation prevents misconfigured signal paths.

---

## �📋 IMPLEMENTATION PRIORITIES

### Phase 1: Foundation (Sources & Outputs)
- [ ] Ensure `source_outputs` table fully functional for direct I/O
- [ ] Add card-based output support for media servers
- [ ] Implement output duplication feature (UX)
- [ ] Add "Save & Duplicate" for source creation forms
- [ ] Test connections from sources
- [ ] Decide on source-to-equipment relationship pattern

### Phase 2: Signal Flow Outputs & Inputs
- [x] **DECIDED:** Use separate tables per device type (Option A)
- [x] **DECIDED:** All devices have direct I/O; card-based I/O capability defined at equipment_specs level
- [x] **DECIDED:** EDID system on all signal flow device inputs
- [ ] Create paired input/output tables for each signal flow device:
  - `switcher_inputs` + `switcher_outputs`
  - `router_inputs` + `router_outputs`
  - `converter_inputs` + `converter_outputs`
  - `led_processor_inputs` + `led_processor_outputs`
- [ ] Add EDID fields to all signal flow device input tables:
  - `edid_mode` (inherit | custom | preset)
  - `edid_preset_uuid` (FK → edid_presets)
  - `edid_connector`, `edid_h_res`, `edid_v_res`, `edid_rate` (override values)
- [ ] Add `card_io_enabled` + card configuration to `equipment_specs` (admin-managed equipment library)
  - When a device references equipment_specs, card capability is read from there
  - No per-device-instance card toggle — capability comes from equipment definition
- [ ] Create card management tables when device's equipment_specs declares card I/O:
  - `{entity}_cards` (parent)
  - `{entity}_card_outputs` / `{entity}_card_inputs` (children)
- [ ] Computers & Media Servers: user defines I/O directly (no equipment_specs required, no admin privilege)
- [ ] Implement output duplication for signal flow devices (direct & card-based)
- [ ] Implement input duplication for signal flow devices (direct & card-based)
- [ ] Add drag-and-drop capability to move inputs/outputs between devices of same type

### Phase 3: Sends & Inputs Structure
- [x] **DECIDED:** Inputs inherit format from connected output
- [x] **DECIDED:** EDID system on all send device inputs
- [ ] Create `send_inputs` table (mirror `source_outputs` pattern) with EDID fields
- [ ] Add optional `send_outputs` table (for loop-through capability)
- [ ] Add CRUD API for send inputs and optional outputs
- [ ] Update sends UI to manage inputs and outputs
- [ ] Implement input duplication feature
- [ ] Add "Save & Duplicate" for send creation forms
- [ ] Input format auto-populated from connected output (via connection)

### Phase 4: Connections & Cables
- [x] **DECIDED:** Connections are always OUTPUT → CABLE → INPUT
- [x] **DECIDED:** Connection creation triggers EDID validation (connector + format compatibility)
- [ ] Create `edid_presets` table (admin-managed EDID library, seed with common presets)
- [ ] Simplify connections table:
  - `from_output_uuid` + `from_output_id` (dual storage)
  - `cable_uuid` + `cable_id` (dual storage, optional for now)
  - `to_input_uuid` + `to_input_id` (dual storage)
  - Remove polymorphic FK complexity
- [ ] Implement connection validation service:
  - Hard error: connector incompatibility (e.g. SDI → HDMI)
  - Soft warning: resolution mismatch, frame rate mismatch
  - Soft warning: adapter required (e.g. DP → HDMI)
  - Format chain trace: walk multi-hop path back to source
- [ ] Create `cables` table (cable types, lengths - to be implemented later)
- [ ] Multi-hop paths = multiple connection records (not single record with hops)
- [ ] Add CRUD API for connections
- [ ] Test cascade deletes (when device deleted, connections should handle gracefully)
- [ ] Add validation: output can only connect to one input at a time
- [ ] Add conflict detection: input already has connection from another output
- [ ] Format inheritance: when connection made, input EDID (if inherit mode) auto-resolves from source

### Phase 5: Signal Flow UI
- [ ] Visualize source → destination paths
- [ ] Add connection creation UI
- [ ] Support multi-hop routing
- [ ] Display signal formats throughout path
- [ ] Show format conversions/scaling along path

---

## 🤔 QUESTIONS FOR DISCUSSION

### Core Architecture
1. Should we stick with string-based `type` fields or migrate to FK relationships for equipment?
2. ~~Are we willing to accept the trade-offs of polymorphic relationships?~~ **ANSWERED:** Avoided with OUTPUT→INPUT model
3. How critical is database-level referential integrity vs application-level?

### Sends & Inputs
4. ~~Should send inputs track format independently or inherit from source?~~ **ANSWERED:** Inherit from source
5. How do we handle routers with 32+ inputs - bulk operations?
6. ~~Should we create separate tables per send type (routers, switchers, etc.)?~~ **ANSWERED:** Yes, separate tables per device type

### Signal Flow
7. What's the maximum number of hops we expect in a signal path?
8. ~~Should connections be bidirectional (can sends output to other sends)?~~ **ANSWERED:** Yes, via loop-through outputs on sends
9. ~~How do we handle format conversion along the signal path?~~ **ANSWERED:** Conversion happens inside device, affects outputs not inputs

### EDID & Format Validation
16. ~~Should inputs have EDID definitions?~~ **ANSWERED:** Yes, on all signal flow and send device inputs (3 modes: inherit, custom, preset)
17. ~~How does format follow the signal chain?~~ **ANSWERED:** Trace connection chain back to source output for inherited format
18. ~~Should connector type be validated on connection creation?~~ **ANSWERED:** Yes — hard errors for incompatible connectors, soft warnings for mismatched formats/frame rates

### Cables (Future Implementation)
10. What cable types do we need to track? (HDMI, SDI, DisplayPort, Fiber, etc.)
11. Should cable lengths be required or optional?
12. Do we need cable health/status tracking?

### Performance & Scale
13. What's the expected number of connections per production?
14. Are we read-heavy or write-heavy on connections?
15. Do we need real-time signal path validation?

---

## 📊 ENTITY RELATIONSHIP DIAGRAM (Current)

```
productions (id: text PK)
    ↓
    ├── sources (uuid: text PK, production_id FK)
    │       ↓
    │       └── source_outputs (uuid PK, source_uuid FK)
    │
    ├── sends (uuid: text PK, production_id FK)
    │       [NO INPUTS YET]
    │
    └── connections (uuid: text PK, production_id FK)
            ├── source_uuid FK → sources (strong)
            └── destination_* (weak, string only)
```

## 📊 PROPOSED RELATIONSHIP DIAGRAM

```
productions
    ↓
    ├── equipment_specs (equipment library)
    │
    ├── edid_presets (admin-managed EDID library)
    │
    ├── sources [parent label] (children: computers, media_servers, cameras, ccus, camera_switchers)
    │   ├── → equipment_specs (optional FK — required for cameras, CCUs, camera switchers; optional for computers & media servers)
    │   │       └── card_io_enabled + card_config defined here for equipment-library devices
    │   └── → {entity}_outputs (1:many, connector + format defined here)
    │
    ├── signal_flow (children: switchers, routers, led_processors, converters)
    │   ├── → equipment_specs (optional FK)
    │   ├── → {entity}_inputs (1:many, each input has EDID config)
    │   │       └── → edid_presets (optional FK via edid_preset_uuid)
    │   └── → {entity}_outputs (1:many, connector + format defined here)
    │
    ├── sends (children: monitors, recorders, projectors, led_tiles)
    │   ├── → equipment_specs (optional FK)
    │   └── → send_inputs (1:many, each input has EDID config)
    │           └── → edid_presets (optional FK via edid_preset_uuid)
    │
    └── connections (OUTPUT → CABLE → INPUT)
        ├── from_output_uuid → any device output
        ├── cable_uuid → cables (optional)
        ├── to_input_uuid → any device input
        └── [validation: connector + format compatibility checked on create]
```

---

## 🎬 NEXT STEPS

1. **Review this document together**
   - Answer the key questions
   - Choose patterns for each decision point

2. **Create detailed schema designs**
   - Write Prisma schema updates
   - Plan migration strategy

3. **Prototype critical features**
   - Test polymorphic pattern with sample data
   - Validate performance assumptions

4. **Implementation order**
   - Start with send_inputs (mirrors existing pattern)
   - Then tackle polymorphic connections
   - Finally add multi-hop support

---

## 📝 NOTES & DECISIONS

*(Use this section during discussion to record choices)*

### Decision Log

**Date:** February 28, 2026  
**Decision:** Clarified BaseEntity is TypeScript-only, not database inheritance  
**Rationale:** Single Table Per Entity pattern is simpler, more flexible, and avoids polymorphic complexity in Prisma

**Date:** February 28, 2026  
**Decision:** Fixed Computer Types seed data (was using equipment categories by mistake)  
**Rationale:** Computer Types should be specific like "Laptop - PC GFX", not generic like "LAPTOP". Settings restored to defaults.

**Date:** February 28, 2026  
**Decision:** Entity categorization clarified:  
- **Sources** _(parent label, each is its own table)_: Computer, Media Server, Camera, CCU, Camera Switcher  
  - Note: Camera Switcher = device that switches between camera feeds (NOT a vision switcher)  
  - Note: CCU = Camera Control Unit (rack unit for camera exposure/color control)  
- **Signal Flow:** Switcher (Vision Switcher), Router, LED Processor, Converter  
- **Sends:** Monitor, Recorder, Projector, LED Tile  
**Rationale:** Reflects actual signal path roles in production workflow

**Date:** February 28, 2026  
**Decision:** Output Architecture - Direct I/O vs Card-Based  
**Details:**
- Card-based I/O capability is defined at the `equipment_specs` level for all equipment-library devices
- Equipment-library devices (cameras, CCUs, camera switchers, switchers, routers, LED processors, converters): card config comes from equipment_specs
- Non-library devices (computers, media servers): user defines I/O directly, no admin privilege or equipment_specs entry required
- Devices that support card-based I/O: media servers, switchers, LED processors, streaming devices (and any equipment_specs entry that declares card support)
- All outputs have: connector, h_res, v_res, rate, id, uuid
**Rationale:** Equipment library is the source of truth for physical device capabilities. Computers and media servers are production-specific and don't require a library entry.

**Date:** February 28, 2026  
**Decision:** UX Requirements for Outputs and Entity Creation  
**Requirements:**
1. Outputs must have "Duplicate" button for efficient configuration
2. Source/Send forms need "Save & Duplicate" option
3. Reduces repetitive data entry for similar devices
**Rationale:** Improves workflow efficiency when configuring multiple similar devices

**Date:** February 28, 2026  
**Decision:** Signal Flow Architecture - Outputs Connect to Inputs  
**Details:**
- Sources have outputs only (signal generators)
- Sends have inputs only (signal receivers)
- Signal flow devices have BOTH inputs and outputs (processors/routers)
- Connection model: `from_output_uuid` → `to_input_uuid`
- Multi-hop paths = chain of connection records (not single record with embedded hops)
**Rationale:** Matches real-world signal flow. Simplifies connection logic. Any output can connect to any input. Avoids polymorphic FK complexity.

**Date:** February 28, 2026  
**Decision:** Separate tables per device type for I/O (Option A)  
**Details:**
- Each device type gets dedicated input/output tables
- Examples: `switcher_inputs`, `switcher_outputs`, `router_inputs`, `router_outputs`
- Enables drag-and-drop between devices of same type (future feature)
- Signal flow devices have paired tables (both inputs AND outputs)
**Rationale:** Type-safe, allows device-specific features, clearer schema, better than generic table with discriminator

**Date:** February 28, 2026  
**Decision:** Connections via Cables (Physical Layer)  
**Details:**
- Connections model: OUTPUT → CABLE → INPUT
- Cable entity to be defined later with types (HDMI, SDI, DP) and lengths
- Connection table references cable_uuid + cable_id (dual storage)
- Sources CAN have send capabilities (loop-through)
- Sends CAN have source capabilities (loop-through)
**Rationale:** Reflects physical reality of production environments. Cable management is critical for troubleshooting.

**Date:** February 28, 2026  
**Decision:** Universal Direct I/O + Equipment-Level Card-Based I/O  
**Details:**
- ALL devices have direct I/O (minimum for control, reference, primary outputs)
- Card-based I/O capability is defined at the `equipment_specs` level by admins
- When a production device references `equipment_specs`, card config is inherited from the equipment definition
- **Exception — Computers & Media Servers:** Not required to have an equipment_specs entry; users define their I/O directly with no admin privilege required
- Cards are children of devices: device → cards → card I/O
- Both direct and card-based I/O use the same property schema
**Rationale:** Equipment library is the authoritative source for what a physical device is capable of. Computers and media servers are often production-specific configurations that don't map cleanly to a single library entry, so they bypass this constraint.

**Date:** February 28, 2026  
**Decision:** Input Format Inheritance (Option A)  
**Details:**
- Inputs inherit format from connected output
- Inputs passively receive signal format - no conversion at input
- Format conversion happens INSIDE the device, AFTER input is received
- Device outputs reflect converted format, not inputs
- Example: 4K input → scaler → 1080p output
**Rationale:** Matches physical reality. Inputs accept what they're given. Conversion is an internal device function that affects outputs.

---

**Status:** Planning complete - All major architecture decisions made!  
**Updated:** February 28, 2026 - Added EDID architecture, corrected entity hierarchy (CCU restored, Camera Switcher added as separate entity, Server→Media Server), added Streaming to card-based I/O, fixed proposed diagram (signal flow devices correctly separated from sends), card-based I/O now defined at equipment_specs level (computers & media servers exempt)  
**Next Action:** Phase 2 implementation — signal flow device input/output tables + EDID fields
