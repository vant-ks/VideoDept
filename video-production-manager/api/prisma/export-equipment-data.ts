#!/usr/bin/env tsx
/**
 * Export equipment data from TypeScript to JSON format for database seeding
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Import equipment data from frontend
import { defaultEquipmentSpecs } from '../../src/data/equipmentData';

const outputPath = resolve(__dirname, 'equipment-data.json');

console.log('📤 Exporting equipment data to JSON...');
console.log(`   Source: ${defaultEquipmentSpecs.length} equipment specs`);

try {
  // Write JSON file with pretty formatting
  writeFileSync(
    outputPath,
    JSON.stringify(defaultEquipmentSpecs, null, 2),
    'utf-8'
  );
  
  console.log(`✅ Successfully exported to: ${outputPath}`);
  console.log(`   ${defaultEquipmentSpecs.length} equipment specs written`);
} catch (error) {
  console.error('❌ Error exporting equipment data:', error);
  process.exit(1);
}
