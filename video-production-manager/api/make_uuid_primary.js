const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Tables to migrate
const tablesToMigrate = [
  'cameras', 'ccus', 'cable_snakes', 'cam_switchers', 'vision_switchers',
  'led_screens', 'media_servers', 'projection_screens', 'records', 'routers', 'streams',
  'checklist_items', 'connections', 'equipment_card_io', 'equipment_cards',
  'equipment_io_ports', 'equipment_specs', 'events', 'ip_addresses', 'sends'
];

tablesToMigrate.forEach(tableName => {
  // Replace: uuid String? → uuid String @id @default(dbgenerated("gen_random_uuid()"))
  //          id String @id → id String
  const modelRegex = new RegExp(
    `(model ${tableName} \\{\\n)(  uuid\\s+String\\?\\n)(  id\\s+String\\s+@id)`,
    'g'
  );
  schema = schema.replace(modelRegex, `$1  uuid         String   @id @default(dbgenerated("gen_random_uuid()"))\\n  id           String`);
});

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('✅ Updated schema.prisma to use uuid as PRIMARY KEY for all 20 tables');
