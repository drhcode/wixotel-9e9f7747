-- Add new address fields to guests table
ALTER TABLE public.guests
ADD COLUMN country TEXT,
ADD COLUMN city TEXT,
ADD COLUMN address TEXT;