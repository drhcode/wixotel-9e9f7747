-- Add guest_count column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN guest_count integer DEFAULT 1 NOT NULL;