-- Add square_meters field to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS square_meters numeric;

-- Add main_photo_url field to store the main photo URL
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS main_photo_url text;