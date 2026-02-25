const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Tables to migrate (exclude lookup/system tables and already migrated)
const tablesToMigrate = [
  'cameras', 'ccus', 'cable_snakes', 'cam_switchers', 'vision_switchers',
  'led_screens', 'media_servers', 'projection_screens', 'records', 'routers', 'streams',
  'checklist_items', 'connections', 'equipment_card_io', 'equipment_cards',
  'equipment_io_ports', 'equipment_specs', 'events', 'ip_addresses', 'sends'
];

tablesToMigrate.forEach(tableName => {
  // Find the model and add uuid after the model declaration
  const modelRegex = new RegExp(`(model ${tableName} \\{\\n)(  id\\s+String\\s+@id)`, 'g');
  schema = schema.replace(modelRegex, `$1  uuid         String?\n$2`);
});

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('✅ Updated schema.prisma with uuid fields for all 20 tables');
