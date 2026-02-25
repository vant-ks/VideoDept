const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Parse entity tables (exclude lookup/system tables and already migrated)
const excludeTables = ['productions', 'source_types', 'connector_types', 'frame_rates', 'resolution_presets', 'settings', 'server_registry', 'sync_conflicts', 'sync_log', 'sources', 'source_outputs'];

const models = schema.match(/model \w+ \{[\s\S]*?\n\}/g) || [];
const entityTables = [];

models.forEach(model => {
  const nameMatch = model.match(/model (\w+) \{/);
  if (!nameMatch) return;
  const name = nameMatch[1];
  
  // Check if it has id as PRIMARY KEY
  const hasIdPK = /id\s+String\s+@id/.test(model);
  const hasUuidPK = /uuid\s+String\s+@id/.test(model);
  
  if (!excludeTables.includes(name) && hasIdPK && !hasUuidPK) {
    // Check for FK references
    const fkMatches = model.match(/@relation\(fields: \[(\w+)\]/g) || [];
    const foreignKeys = fkMatches.map(fk => fk.match(/\[(\w+)\]/)[1]);
    
    entityTables.push({ name, foreignKeys });
  }
});

console.log('Entity tables needing uuid migration:');
entityTables.forEach(table => {
  console.log(`  - ${table.name} (FKs: ${table.foreignKeys.join(', ') || 'none'})`);
});
console.log(`\nTotal: ${entityTables.length} tables`);
