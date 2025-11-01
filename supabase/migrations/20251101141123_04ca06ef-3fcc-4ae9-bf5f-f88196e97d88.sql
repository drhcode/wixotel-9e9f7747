-- Add room_id to leads table for booking requests
ALTER TABLE public.leads ADD COLUMN room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_leads_room_id ON public.leads(room_id);