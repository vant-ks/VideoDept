const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Fix the escaped newlines
schema = schema.replace(/uuid         String   @id @default\(uuid\(\)\)\\n  id           String/g, 
                        'uuid         String   @id @default(uuid())\n  id           String');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('✅ Fixed schema.prisma newlines');
