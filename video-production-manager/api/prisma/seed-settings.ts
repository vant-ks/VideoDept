import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSettings() {
  console.log('Seeding settings tables...');

  // Connector Types (from your specification - 17 total)
  const connectorTypes = [
    'HDMI', 'SDI', 'DP', 'NDI', 'USB-C', 'ETH',
    'OPTICON DUO', 'OPTICON QUAD',
    'SMPTE FIBER',
    'LC - FIBER (SM)', 'ST - FIBER (SM)', 'SC - FIBER (SM)',
    'LC - FIBER (MM)', 'ST - FIBER (MM)', 'SC - FIBER (MM)',
    'XLR', 'DMX'
  ];
  
  for (let i = 0; i < connectorTypes.length; i++) {
    await prisma.connector_types.upsert({
      where: { name: connectorTypes[i] },
      create: {
        name: connectorTypes[i],
        sort_order: i,
        is_active: true
      },
      update: {}
    });
  }
  console.log(`✓ Seeded ${connectorTypes.length} connector types`);

  // Source Types (current values from store)
  const sourceTypes = ['LAPTOP', 'CAM', 'SERVER', 'PLAYBACK', 'GRAPHICS', 'PTZ', 'ROBO', 'OTHER'];
  
  for (let i = 0; i < sourceTypes.length; i++) {
    await prisma.source_types.upsert({
      where: { name: sourceTypes[i] },
      create: {
        name: sourceTypes[i],
        sort_order: i,
        is_active: true
      },
      update: {}
    });
  }
  console.log(`✓ Seeded ${sourceTypes.length} source types`);

  // Frame Rates (current values from store)
  const frameRates = ['60', '59.94', '50', '30', '29.97', '25', '24', '23.98'];
  
  for (let i = 0; i < frameRates.length; i++) {
    await prisma.frame_rates.upsert({
      where: { rate: frameRates[i] },
      create: {
        rate: frameRates[i],
        sortOrder: i,
        isActive: true
      },
      update: {}
    });
  }
  console.log(`✓ Seeded ${frameRates.length} frame rates`);

  // Resolutions (from your earlier specification)
  const resolutions = [
    '8192 x 1080',
    '7680 x 1080',
    '4096 x 2160',
    '3840 x 2160',
    '3840 x 1080',
    '3240 x 1080',
    '1920 x 1200',
    '1920 x 1080',
    '1280 x 720'
  ];
  
  for (let i = 0; i < resolutions.length; i++) {
    await prisma.resolutionPreset.upsert({
      where: { name: resolutions[i] },
      create: {
        name: resolutions[i],
        sortOrder: i,
        isActive: true
      },
      update: {}
    });
  }
  console.log(`✓ Seeded ${resolutions.length} resolutions`);

  console.log('Settings seeding complete!');
}

seedSettings()
  .catch((e) => {
    console.error('Error seeding settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
