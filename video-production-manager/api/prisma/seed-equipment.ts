import { PrismaClient, EquipmentCategory, IoArchitecture } from '@prisma/client';
import equipmentDataJson from './equipment-data.json';

const prisma = new PrismaClient();

interface IOPort {
  id: string;
  type: string;
  label: string;
  format?: string;
}

interface Card {
  slot_number: number;
  inputs?: IOPort[];
  outputs?: IOPort[];
}

interface EquipmentSpec {
  id: string;
  category: string;
  manufacturer: string;
  model: string;
  io_architecture: 'direct' | 'card-based';
  cardSlots?: number;
  cards?: Card[];
  inputs?: IOPort[];
  outputs?: IOPort[];
  deviceFormats?: string[];
  formatByIO?: boolean;
  isSecondaryDevice?: boolean;
}

function loadEquipmentData(): EquipmentSpec[] {
  return equipmentDataJson as EquipmentSpec[];
}

async function seedEquipment() {
  console.log('🌱 Seeding equipment database...');
  
  try {
    // Delete existing equipment specs (cascade will handle related records)
    await prisma.equipment_specs.deleteMany({});
    console.log('✅ Cleared existing equipment specs');
    
    // Load equipment data from JSON file
    const equipmentSpecs = loadEquipmentData();
    
    if (equipmentSpecs.length === 0) {
      console.warn('⚠️  No equipment data found in equipment-data.json');
      console.warn('   Please run the export script to generate equipment data');
      return;
    }
    
    console.log(`📦 Loaded ${equipmentSpecs.length} equipment specs from JSON file`);
    
    // Process each equipment spec
    for (const spec of equipmentSpecs) {
      const {
        id,
        category,
        manufacturer,
        model,
        ioArchitecture,
        cardSlots,
        cards,
        inputs,
        outputs,
        deviceFormats,
        formatByIO,
        isSecondaryDevice
      } = spec;
      
      // Map category names to enum values
      const categoryMap: Record<string, EquipmentCategory> = {
        'ccu': EquipmentCategory.CCU,
        'camera': EquipmentCategory.CAMERA,
        'cam-switcher': EquipmentCategory.CAM_SWITCHER,
        'vision-switcher': EquipmentCategory.VISION_SWITCHER,
        'router': EquipmentCategory.ROUTER,
        'led-processor': EquipmentCategory.LED_PROCESSOR,
        'led-tile': EquipmentCategory.LED_TILE,
        'projector': EquipmentCategory.PROJECTOR,
        'recorder': EquipmentCategory.RECORDER,
        'monitor': EquipmentCategory.MONITOR,
        'converter': EquipmentCategory.CONVERTER
      };
      
      // Map ioArchitecture to enum values
      const ioArchitectureMap: Record<string, IoArchitecture> = {
        'direct': IoArchitecture.DIRECT,
        'card-based': IoArchitecture.CARD_BASED
      };
      
      // Create equipment spec
      const equipment = await prisma.equipment_specs.create({
        data: {
          id,
          category: categoryMap[category],
          manufacturer,
          model,
          io_architecture: ioArchitectureMap[ioArchitecture],
          card_slots: cardSlots || null,
          format_by_io: formatByIO !== false,
          is_secondary_device: isSecondaryDevice || false,
          device_formats: deviceFormats || [],
          created_at: new Date(),
          updated_at: new Date(),
        }
      });
      
      // Create IO ports for direct architecture
      if (ioArchitecture === 'direct' && (inputs || outputs)) {
        if (inputs) {
          for (const [index, input] of inputs.entries()) {
            await prisma.equipment_io_ports.create({
              data: {
                equipment_id: equipment.id,
                port_type: 'INPUT',
                io_type: input.type,
                label: input.label || `Input ${index + 1}`,
                format: input.format || null,
                port_index: index
              }
            });
          }
        }
        
        if (outputs) {
          for (const [index, output] of outputs.entries()) {
            await prisma.equipment_io_ports.create({
              data: {
                equipment_id: equipment.id,
                port_type: 'OUTPUT',
                io_type: output.type,
                label: output.label || `Output ${index + 1}`,
                format: output.format || null,
                port_index: index
              }
            });
          }
        }
      }
      
      // Create cards for card-based architecture
      if (ioArchitecture === 'card-based' && cards && cards.length > 0) {
        for (const card of cards) {
          const dbCard = await prisma.equipment_cards.create({
            data: {
              equipment_id: equipment.id,
              slot_number: card.slotNumber
            }
          });
          
          // Create IO ports for the card
          if (card.inputs) {
            for (const [index, input] of card.inputs.entries()) {
              await prisma.equipment_cardsIo.create({
                data: {
                  card_id: dbCard.id,
                  port_type: 'INPUT',
                  io_type: input.type,
                  label: input.label || `Input ${index + 1}`,
                  format: input.format || null,
                  port_index: index
                }
              });
            }
          }
          
          if (card.outputs) {
            for (const [index, output] of card.outputs.entries()) {
              await prisma.equipment_cardsIo.create({
                data: {
                  card_id: dbCard.id,
                  port_type: 'OUTPUT',
                  io_type: output.type,
                  label: output.label || `Output ${index + 1}`,
                  format: output.format || null,
                  port_index: index
                }
              });
            }
          }
        }
      }
      
      console.log(`  ✓ ${manufacturer} ${model}`);
    }
    
    console.log(`\n✅ Successfully seeded ${equipmentSpecs.length} equipment specs!`);
    
    // Display summary by category
    const categoryCounts = await prisma.equipment_specs.groupBy({
      by: ['category'],
      _count: true
    });
    
    console.log('\n📊 Equipment Summary by Category:');
    for (const { category, _count } of categoryCounts) {
      console.log(`  ${category}: ${_count} models`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding equipment:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedEquipment();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
