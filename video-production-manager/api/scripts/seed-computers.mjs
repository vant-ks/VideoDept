import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const p = new PrismaClient();

const computers = [
  { manufacturer: 'PC',  model: 'Laptop - PC MISC'     },
  { manufacturer: 'PC',  model: 'Laptop - PC GFX'      },
  { manufacturer: 'PC',  model: 'Laptop - PC WIDE'     },
  { manufacturer: 'Mac', model: 'Laptop - Mac MISC'    },
  { manufacturer: 'Mac', model: 'Laptop - Mac GFX'     },
  { manufacturer: 'PC',  model: 'Desktop - PC MISC'    },
  { manufacturer: 'PC',  model: 'Desktop - PC GFX'     },
  { manufacturer: 'PC',  model: 'Desktop - PC SERVER'  },
  { manufacturer: 'Mac', model: 'Desktop - Mac MISC'   },
  { manufacturer: 'Mac', model: 'Desktop - Mac GFX'    },
  { manufacturer: 'Mac', model: 'Desktop - Mac SERVER' },
];

async function seed() {
  const now = new Date();
  let created = 0;

  for (const c of computers) {
    const exists = await p.equipment_specs.findFirst({
      where: { manufacturer: c.manufacturer, model: c.model, is_deleted: false }
    });
    if (exists) {
      console.log('Skip (exists):', c.manufacturer, c.model);
      continue;
    }
    await p.equipment_specs.create({
      data: {
        id: crypto.randomUUID(),
        category: 'COMPUTER',
        manufacturer: c.manufacturer,
        model: c.model,
        io_architecture: 'DIRECT',
        format_by_io: true,
        is_secondary_device: false,
        updated_at: now,
      }
    });
    console.log('Created:', c.manufacturer, c.model);
    created++;
  }

  console.log(`\nDone. Created ${created} records.`);
  await p.$disconnect();
}

seed().catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
