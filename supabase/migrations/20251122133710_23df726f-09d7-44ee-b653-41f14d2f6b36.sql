-- Expand allowed room statuses to include 'maintenance'
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;

ALTER TABLE public.rooms
ADD CONSTRAINT rooms_status_check
CHECK ((status = ANY (ARRAY['ready'::text, 'cleanup'::text, 'dirty'::text, 'occupied'::text, 'maintenance'::text])));