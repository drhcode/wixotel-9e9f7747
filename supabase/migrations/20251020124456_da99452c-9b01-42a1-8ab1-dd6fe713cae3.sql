-- Add deletion password to profiles table
ALTER TABLE public.profiles
ADD COLUMN deletion_password TEXT;