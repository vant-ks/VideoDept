# Format Assignment Architecture

## Overview
This document describes the architecture for managing video format assignment in the Video Department system, supporting both system-wide and per-I/O format configurations.

## Database Architecture

### Source Model
```prisma
model Source {
  id                   String   @id @default(uuid())
  productionId         String   @map("production_id")
  type                 String
  name                 String
  formatAssignmentMode String?  @default("system-wide") @map("format_assignment_mode")
  
  // System-wide format fields (used when formatAssignmentMode is "system-wide")
  hRes                 Int?     @map("h_res")
  vRes                 Int?     @map("v_res")
  rate                 Float?
  standard             String?
  
  // Relationships
  outputs              SourceOutput[]
  ...
}
```

### SourceOutput Model
```prisma
model SourceOutput {
  id          String   @id @default(uuid())
  sourceId    String   @map("source_id")
  connector   String
  outputIndex Int      @default(1) @map("output_index")
  
  // Per-I/O format fields (used when parent Source.formatAssignmentMode is "per-io")
  hRes        Int?     @map("h_res")
  vRes        Int?     @map("v_res")
  rate        Float?
  standard    String?
  ...
}
```

## Format Assignment Modes

### System-Wide Format Assignment
- **Mode Value**: `"system-wide"`
- **Behavior**: All outputs from the source use the same format
- **Data Storage**: Format fields stored on the `Source` model (`hRes`, `vRes`, `rate`, `standard`)
- **Use Case**: Typical for computers, laptops, and devices with consistent output formats

### Per-I/O Format Assignment
- **Mode Value**: `"per-io"`
- **Behavior**: Each output can have its own independent format
- **Data Storage**: Format fields stored on each `SourceOutput` record
- **Use Case**: Advanced scenarios like:
  - Computers with different resolution outputs for different displays
  - Media servers with mixed format outputs
  - Devices with format conversion per output

## Frontend Implementation

### Type Definitions
```typescript
export interface SourceOutput {
  id: string;
  connector: ConnectorType;
  // Per-I/O format fields
  hRes?: number;
  vRes?: number;
  rate?: number;
  standard?: string;
}

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  formatAssignmentMode?: 'system-wide' | 'per-io';
  // System-wide format fields
  hRes?: number;
  vRes?: number;
  rate: number;
  standard?: string;
  outputs: SourceOutput[];
  ...
}
```

### UI Components

#### SourceFormModal
The source form modal now includes:

1. **Format Assignment Mode Selector** (next to Name field)
   - Dropdown with options: "System Wide" or "Per I/O"
   - Default: "System Wide"

2. **System-Wide Format Fields** (shown when mode is "system-wide")
   - Resolution Preset dropdown
   - Frame Rate dropdown
   - Horizontal Resolution input
   - Vertical Resolution input
   - Fields displayed once, apply to all outputs

3. **Per-I/O Format Fields** (shown when mode is "per-io")
   - Each output gets its own set of format fields:
     - Resolution Preset dropdown
     - Frame Rate dropdown
     - Horizontal Resolution input
     - Vertical Resolution input
   - Fields displayed within each output's card

## Data Reusability & Extensibility

### Current Reusable Patterns

1. **I/O Port Architecture**: Both `Source` and `EquipmentSpec` use similar I/O port patterns with IDs
2. **Format Field Sets**: The format field pattern (hRes, vRes, rate, standard) is reused across:
   - Source (system-wide)
   - SourceOutput (per-I/O)
   - Send
   - CCU

### Future Extensions

This architecture supports future enhancements:

1. **Sends Per-I/O Format**: The same pattern can be applied to `Send` model
2. **Equipment I/O Format**: Equipment specs already have `EquipmentIoPort` table that can be extended with format fields
3. **Connection Validation**: With format stored at I/O level, can validate format compatibility between connected ports
4. **Format Conversion Tracking**: Can track where format conversions occur in signal path

### Recommended Next Steps

1. **Extend Send Model**: Add `formatAssignmentMode` and create `SendOutput` table similar to `SourceOutput`
2. **Equipment Format Support**: Add format fields to `EquipmentIoPort` for equipment with format-specific I/O
3. **Connection Service**: Build service to validate format compatibility and identify conversion points
4. **Signal Flow Analysis**: Use per-I/O format data to generate signal flow diagrams with format indicators

## Migration Strategy

### Backward Compatibility
- Default `formatAssignmentMode` is `"system-wide"` to maintain compatibility with existing data
- Existing sources without mode specified will behave as system-wide
- Frontend gracefully handles sources with or without format assignment mode

### Data Migration
If needed, existing sources can be migrated:
```sql
-- Set all existing sources to system-wide mode
UPDATE sources 
SET format_assignment_mode = 'system-wide' 
WHERE format_assignment_mode IS NULL;

-- For sources that need per-I/O:
-- 1. Set formatAssignmentMode to 'per-io'
-- 2. Copy format from Source to each SourceOutput
-- 3. Clear format from Source level
```

## Best Practices

1. **Choose System-Wide by Default**: Most devices have consistent output formats
2. **Use Per-I/O When Needed**: Only for devices with genuinely different output formats
3. **Document Format Decisions**: Use notes field to explain why per-I/O mode was chosen
4. **Validate Connections**: When connecting I/O, check format compatibility at the I/O level
5. **Consider Equipment Capability**: Match format assignment mode to equipment's actual capabilities

## Database Indexing

Current indexes support efficient queries:
- `sources` table: Indexed on `productionId` and `type`
- `source_outputs` table: Indexed on `sourceId` for fast output lookups

Consider adding if performance issues arise:
```sql
CREATE INDEX idx_sources_format_mode ON sources(format_assignment_mode);
CREATE INDEX idx_source_outputs_format ON source_outputs(h_res, v_res, rate);
```
