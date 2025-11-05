-- Add foreign key constraint for room_id in ical_sync_conflicts
ALTER TABLE public.ical_sync_conflicts
  ADD CONSTRAINT fk_ical_sync_conflicts_room
  FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;