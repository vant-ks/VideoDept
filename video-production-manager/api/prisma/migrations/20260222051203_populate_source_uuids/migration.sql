-- Step 1.2: Populate UUID for all existing sources
UPDATE sources 
SET uuid = gen_random_uuid() 
WHERE uuid IS NULL;
