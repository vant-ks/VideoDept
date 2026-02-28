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
  │     ├── Server (equipment: media servers)
  │     ├── Camera (equipment: camera bodies)
  │     └── CCU (equipment: camera control units)
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
- Each category = Separate table: `sources`, `sends`, `cameras`, `ccus`, `media_servers`, etc.
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
type EquipmentCategory = 'COMPUTER' | 'SERVER' | 'CAMERA' | 'CCU' 
  | 'SWITCHER' | 'ROUTER' | 'LED_PROCESSOR' | 'CONVERTER'
  | 'MONITOR' | 'RECORDER' | 'PROJECTOR' | 'LED_TILE';
// Functional Categorization (Signal Path Roles):
// - SOURCES: computer, server, camera, ccu (generate signals)
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

#### Output Architecture (DECISION MADE)

**Universal I/O Pattern: Direct + Optional Card-Based**

**Core Principle:**
- **EVERY device has direct I/O** (at minimum for IP control, reference, multiviewer)
- **Card-based I/O is OPTIONAL** and admin-configurable
- Enables modular expansion and custom configurations

**I/O Structure:**

1. **Direct I/O** (always available)
   - Built into device hardware
   - Examples: Reference in/out, control ports, primary outputs
   - Tables: `{entity}_outputs`, `{entity}_inputs`
   - Simple relationship: device → direct I/O

2. **Card-Based I/O** (optional, admin-enabled)
   - Removable expansion cards
   - Admin can enable/disable card capability per device
   - Used by: media servers, switchers, LED processors, some routers
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
   - Examples: computers, cameras, CCUs
   - Tables: `source_outputs`, `source_inputs` (optional)

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

## 📋 IMPLEMENTATION PRIORITIES

### Phase 1: Foundation (Sources & Outputs)
- [ ] Ensure `source_outputs` table fully functional for direct I/O
- [ ] Add card-based output support for media servers
- [ ] Implement output duplication feature (UX)
- [ ] Add "Save & Duplicate" for source creation forms
- [ ] Test connections from sources
- [ ] Decide on source-to-equipment relationship pattern

### Phase 2: Signal Flow Outputs & Inputs
- [x] **DECIDED:** Use separate tables per device type (Option A)
- [x] **DECIDED:** All devices have direct I/O, card-based is optional/admin-enabled
- [ ] Create paired input/output tables for each signal flow device:
  - `switcher_inputs` + `switcher_outputs`
  - `router_inputs` + `router_outputs`
  - `converter_inputs` + `converter_outputs`
  - `led_processor_inputs` + `led_processor_outputs`
- [ ] Add device setting: `card_io_enabled` (Boolean, default false)
- [ ] Create card management tables when card I/O enabled:
  - `{entity}_cards` (parent)
  - `{entity}_card_outputs` / `{entity}_card_inputs` (children)
- [ ] Implement output duplication for signal flow devices (direct & card-based)
- [ ] Implement input duplication for signal flow devices (direct & card-based)
- [ ] Add drag-and-drop capability to move inputs/outputs between devices of same type
- [ ] Admin UI to enable/disable card-based I/O per device

### Phase 3: Sends & Inputs Structure
- [x] **DECIDED:** Inputs inherit format from connected output
- [ ] Create `send_inputs` table (mirror `source_outputs` pattern)
- [ ] Add optional `send_outputs` table (for loop-through capability)
- [ ] Add CRUD API for send inputs and optional outputs
- [ ] Update sends UI to manage inputs and outputs
- [ ] Implement input duplication feature
- [ ] Add "Save & Duplicate" for send creation forms
- [ ] Input format auto-populated from connected output (via connection)

### Phase 4: Connections & Cables
- [x] **DECIDED:** Connections are always OUTPUT → CABLE → INPUT
- [ ] Simplify connections table:
  - `from_output_uuid` + `from_output_id` (dual storage)
  - `cable_uuid` + `cable_id` (dual storage, optional for now)
  - `to_input_uuid` + `to_input_id` (dual storage)
  - Remove polymorphic FK complexity
- [ ] Create `cables` table (cable types, lengths - to be implemented later)
- [ ] Multi-hop paths = multiple connection records (not single record with hops)
- [ ] Add CRUD API for connections
- [ ] Test cascade deletes (when device deleted, connections should handle gracefully)
- [ ] Add validation: output can only connect to one input at a time
- [ ] Add conflict detection: input already has connection from another output
- [ ] Format inheritance: when connection made, input format auto-updates from output

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
    ├── sources
    │   ├── → equipment_specs (optional FK)
    │   └── → source_outputs (1:many)
    │
    ├── sends (broken into subtypes?)
    │   ├── routers
    │   ├── switchers
    │   ├── led_processors
    │   └── projectors
    │   │
    │   ├── → equipment_specs (optional FK)
    │   └── → send_inputs (1:many)
    │
    └── connections
        ├── → sources (strong FK)
        ├── → source_outputs (reference)
        ├── → [destination entity] (FK pattern TBD)
        └── → connection_hops (multi-hop paths)
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
- **Sources:** computer, server, camera, ccu  
- **Signal Flow:** switcher, router, led processor, converter  
- **Sends:** monitor, recorder, projector, LED tile  
**Rationale:** Reflects actual signal path roles in production workflow

**Date:** February 28, 2026  
**Decision:** Output Architecture - Direct I/O vs Card-Based  
**Details:**
- Direct I/O: computers, cameras, CCUs, routers, converters
- Card-Based: media servers, switchers, LED processors
- All outputs have: connector, h_res, v_res, rate, id, uuid
**Rationale:** Matches real-world equipment configurations

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
**Decision:** Universal Direct I/O + Optional Card-Based I/O  
**Details:**
- ALL devices have direct I/O (minimum for control, reference, primary outputs)
- Card-based I/O is OPTIONAL and ADMIN-CONFIGURABLE per device
- Cards are children of devices: device → cards → card I/O
- Admin can enable/disable card capability in device settings
- Both direct and card-based I/O use same property schema
**Rationale:** Flexible architecture supports both simple devices (cameras, monitors) and complex modular devices (switchers, media servers). Admin control prevents UI complexity for simple setups.

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
**Next Action:** Begin Phase 1 implementation (source outputs + duplication UX)
