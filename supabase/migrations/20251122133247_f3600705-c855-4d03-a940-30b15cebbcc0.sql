-- Enable realtime updates for rooms table so calendar sees status changes without refresh
ALTER TABLE public.rooms REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;