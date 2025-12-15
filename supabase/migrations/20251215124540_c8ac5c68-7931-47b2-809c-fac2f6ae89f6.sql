-- Add failed_attempts column to booking_otps table for rate limiting
ALTER TABLE public.booking_otps 
ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;