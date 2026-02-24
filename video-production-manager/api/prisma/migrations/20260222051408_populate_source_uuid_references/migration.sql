-- Step 1.4: Populate source_uuid in referencing tables

-- Update connections table
UPDATE connections 
SET source_uuid = sources.uuid 
FROM sources 
WHERE connections.source_id = sources.id 
AND connections.source_uuid IS NULL;

-- Update source_outputs table
UPDATE source_outputs 
SET source_uuid = sources.uuid 
FROM sources 
WHERE source_outputs.source_id = sources.id 
AND source_outputs.source_uuid IS NULL;
