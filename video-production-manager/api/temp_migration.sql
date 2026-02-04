-- Drop the old primary key constraint
ALTER TABLE sources DROP CONSTRAINT sources_pkey;

-- Add composite unique constraint
ALTER TABLE sources ADD CONSTRAINT sources_id_production_id_key UNIQUE (id, production_id);

-- Make id the primary key again (even though not unique alone, Prisma wants it)
ALTER TABLE sources ADD PRIMARY KEY (id);
