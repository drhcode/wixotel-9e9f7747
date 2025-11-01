-- Add about_us field to hotels table
ALTER TABLE public.hotels 
ADD COLUMN IF NOT EXISTS about_us TEXT;