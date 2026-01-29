# Equipment Database

The equipment database stores all default equipment specifications that users can select when configuring their productions.

## Overview

All equipment data from `src/data/equipmentData.ts` is stored in the PostgreSQL database for:
- Faster queries and filtering
- Future admin editing capabilities
- Consistency across all users
- Better scalability

## Database Schema

### EquipmentSpec
Main equipment specification table:
- `id`: Unique identifier (matches frontend IDs)
- `category`: Equipment category (CCU, CAMERA, CAM_SWITCHER, VISION_SWITCHER, ROUTER, LED_PROCESSOR, LED_TILE, PROJECTOR, RECORDER, MONITOR, CONVERTER)
- `manufacturer`: Equipment manufacturer
- `model`: Equipment model name
- `ioArchitecture`: DIRECT (fixed I/O) or CARD_BASED (expandable)
- `cardSlots`: Number of card slots (for card-based equipment)
- `formatByIo`: Whether format is assigned per I/O port
- `isSecondaryDevice`: If this is a secondary device type
- `deviceFormats`: JSON array of supported formats
- `specs`: JSON object for additional specifications

### EquipmentIoPort
I/O ports for direct architecture equipment:
- `equipmentId`: Foreign key to EquipmentSpec
- `portType`: INPUT or OUTPUT
- `ioType`: Type of connector (SDI, HDMI, DisplayPort, etc.)
- `label`: Human-readable label
- `format`: Specific format for this port (optional)
- `portIndex`: Order of the port

### EquipmentCard & EquipmentCardIo
For card-based equipment:
- Cards are inserted into specific slots
- Each card has its own I/O ports
- Allows for expandable/configurable equipment

## Seeding Process

1. **Export to JSON**: `npm run equipment:export`
   - Reads `src/data/equipmentData.ts`
   - Exports to `api/prisma/equipment-data.json`

2. **Seed Database**: `npm run equipment:seed`
   - Runs export first
   - Then seeds database from JSON

3. **All-in-One**: `npm run seed:all`
   - Exports equipment
   - Seeds settings
   - Seeds equipment

## Updating Equipment Data

When adding new equipment models:

1. Add to `src/data/equipmentData.ts`
2. Run `npm run equipment:export` from `/api` directory
3. Run `npm run equipment:seed` to update database
4. Frontend and backend will both use the new data

## API Endpoints

- `GET /api/equipment` - Get all equipment specs
- `GET /api/equipment/:id` - Get single equipment spec
- `POST /api/equipment` - Create new equipment (future: admin only)
- `PUT /api/equipment/:id` - Update equipment (future: admin only)
- `DELETE /api/equipment/:id` - Delete equipment (future: admin only)

## Future Enhancements

- **Admin Panel**: Allow admins to add/edit/delete equipment through UI
- **Custom Equipment**: Users can add custom equipment to their libraries
- **Equipment Presets**: Save common equipment configurations
- **Import/Export**: Share equipment libraries between installations
