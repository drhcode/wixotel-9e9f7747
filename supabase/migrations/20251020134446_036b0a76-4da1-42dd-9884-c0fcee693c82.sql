-- Remove the insecure deletion_password field
ALTER TABLE public.profiles DROP COLUMN IF EXISTS deletion_password;