# Schema & Route Consistency Audit

## Entity Schema Analysis

### ✅ Standard Pattern (Consistent across all entities)
- `id` (String, @id) - PRIMARY KEY
- `production_id` (String) - FOREIGN KEY
- `created_at` (DateTime, @default(now()))
- `updated_at` (DateTime) - **REQUIRES MANUAL SETTING**
- `synced_at` (DateTime?) - Optional
- `last_modified_by` (String?) - Optional
- `version` (Int, @default(1))
- `is_deleted` (Boolean, @default(false))

### Entity-Specific Field Mappings

#### ✅ sources
- **Schema**: `id`, `production_id`, `type`, `name`, `h_res`, `v_res`, `rate`, `standard`, `note`, `secondary_device`, `blanking`, `created_at`, `updated_at`, `synced_at`, `last_modified_by`, `version`, `is_deleted`, `format_assignment_mode`
- **Relation**: `source_outputs[]` (one-to-many)
- **Route**: `/api/sources`
- **Issues Fixed**:
  - ✅ Changed `outputs` → `source_outputs` in create
  - ✅ Added `updated_at: new Date()` to create
  - ✅ Added `updated_at: new Date()` to update

#### ⚠️ source_outputs (Child table)
- **Schema**: `id`, `source_id`, `connector`, `output_index`, `created_at`, `version`, `h_res`, `rate`, `standard`, `v_res`
- **NO `updated_at` field!** Only `created_at`
- **Issues Fixed**:
  - ✅ Removed `updated_at` from create
  - ✅ Added `id` field generation

#### ✅ cameras
- **Schema**: `id`, `production_id`, `name`, `model`, `format_mode`, `lens_type`, `max_zoom`, `shooting_distance`, `calculated_zoom`, `has_tripod`, `has_short_tripod`, `has_dolly`, `has_jib`, `ccu_id`, `smpte_cable_length`, `note`, `created_at`, `updated_at`, `synced_at`, `last_modified_by`, `version`, `is_deleted`
- **Route**: `/api/cameras`
- **Status**: Need to verify route has `updated_at`

#### ✅ ccus
- **Schema**: `id`, `production_id`, `name`, `manufacturer`, `model`, `format_mode`, `fiber_input`, `reference_input`, `outputs` (Json), `note`, `created_at`, `updated_at`, `synced_at`, `last_modified_by`, `version`, `is_deleted`
- **Route**: `/api/ccus`
- **Status**: Need to verify route has `updated_at`

#### ✅ sends
- **Schema**: `id`, `production_id`, `type`, `name`, `h_res`, `v_res`, `rate`, `standard`, `note`, `secondary_device`, `output_connector`, `created_at`, `updated_at`, `synced_at`, `last_modified_by`, `version`, `is_deleted`
- **Route**: `/api/sends`
- **Status**: Need to verify route has `updated_at`

#### ✅ checklist_items
- **Schema**: `id`, `production_id`, `title`, `category`, `completed`, `more_info`, `completion_note`, `assigned_to`, `due_date`, `completion_date`, `completed_at` (BigInt), `reference`, `days_before_show`, `sort_order`, `created_at`, `updated_at`, `last_modified_by`, `version`
- **Route**: `/api/checklist-items`
- **Status**: ✅ Already sets `updated_at` correctly

#### ✅ connections
- **Schema**: `id`, `production_id`, `source_id`, `source_output_id`, `intermediate_type`, `intermediate_id`, `intermediate_input`, `intermediate_output`, `destination_type`, `destination_id`, `signal_path` (Json), `note`, `created_at`, `updated_at`, `synced_at`, `last_modified_by`, `version`, `is_deleted`
- **Route**: `/api/connections`
- **Status**: Need to verify route has `updated_at`

#### ✅ ip_addresses
- **Schema**: `id`, `production_id`, `ip`, `device_name`, `category`, `subnet`, `gateway`, `note`, `created_at`, `updated_at`, `last_modified_by`, `version`
- **Route**: `/api/ip-addresses`
- **Status**: Need to verify route has `updated_at`

## Critical Pattern: `updated_at` Field

### ⚠️ IMPORTANT
**None of the entity tables use `@updatedAt` decorator in Prisma.**
This means `updated_at` must be **manually set** in routes:

```typescript
// CREATE
const entity = await prisma.entities.create({
  data: {
    ...data,
    updated_at: new Date()
  }
});

// UPDATE
const entity = await prisma.entities.update({
  where: { id },
  data: {
    ...data,
    updated_at: new Date(),
    version: { increment: 1 }
  }
});
```

### Tables WITHOUT `updated_at`
- `source_outputs` - Only has `created_at`
- `equipment_io_ports` - Has `updated_at`
- `equipment_cards` - Has `updated_at`
- `equipment_card_io` - Has `updated_at`

## Action Items

### High Priority - Verify Routes Have `updated_at`
1. ⚠️ Check `/api/cameras` - create & update
2. ⚠️ Check `/api/ccus` - create & update
3. ⚠️ Check `/api/sends` - create & update
4. ⚠️ Check `/api/connections` - create & update
5. ⚠️ Check `/api/ip-addresses` - create & update

### Medium Priority - Verify Signal Flow Routes
Check if these entity routes exist and have proper field handling:
- `/api/records`
- `/api/streams`
- `/api/routers`
- `/api/media-servers`
- `/api/cam-switchers`
- `/api/vision-switchers`
- `/api/cable-snakes`
- `/api/projection-screens`
- `/api/led-screens`

### Low Priority - Equipment Routes
- `/api/equipment` - Already seeding correctly

## Case Conversion Rules

### Frontend → Backend (camelCase → snake_case)
- `productionId` → `production_id`
- `hRes` → `h_res`
- `vRes` → `v_res`
- `updatedAt` → `updated_at`
- `createdAt` → `created_at`
- `lastModifiedBy` → `last_modified_by`

### Backend → Frontend (snake_case → camelCase)
- All responses should be converted via `toCamelCase()`
- Ensure WebSocket broadcasts also convert case

## Common Patterns to Follow

### 1. Create Route Pattern
```typescript
router.post('/', async (req: Request, res: Response) => {
  try {
    const { productionId, userId, userName, ...entityData } = req.body;
    const snakeCaseData = toSnakeCase(entityData);
    
    const entity = await prisma.entities.create({
      data: {
        ...snakeCaseData,
        production_id: productionId,
        updated_at: new Date()
      }
    });
    
    res.json(toCamelCase(entity));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create' });
  }
});
```

### 2. Update Route Pattern
```typescript
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName, version: clientVersion, ...updates } = req.body;
    
    // Version conflict check
    const current = await prisma.entities.findUnique({ where: { id: req.params.id } });
    if (clientVersion && current.version !== clientVersion) {
      return res.status(409).json({ error: 'Version conflict' });
    }
    
    const snakeCaseData = toSnakeCase(updates);
    const entity = await prisma.entities.update({
      where: { id: req.params.id },
      data: {
        ...snakeCaseData,
        updated_at: new Date(),
        version: { increment: 1 },
        last_modified_by: userId || 'system'
      }
    });
    
    res.json(toCamelCase(entity));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});
```

### 3. Frontend API Hook Pattern
```typescript
const createEntity = useCallback(async (input: EntityInput): Promise<Entity> => {
  const { userId, userName } = getUserInfo();
  
  // Explicitly list all fields - NO SPREAD OPERATOR
  const requestData = {
    productionId: input.productionId,
    name: input.name,
    // ... all other fields
    userId,
    userName
  };
  
  return await apiClient.post('/entities', requestData);
}, []);
```

## Next Steps
1. Run audit script to check all routes
2. Fix any missing `updated_at` fields
3. Verify case conversion in all routes
4. Add integration tests for create/update operations
