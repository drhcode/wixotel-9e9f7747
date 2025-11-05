-- Create table to store external iCal feed URLs for rooms
CREATE TABLE public.room_ical_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'booking', 'airbnb', 'vrbo', 'other'
  feed_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'error'
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, feed_url)
);

-- Create table to log iCal sync operations
CREATE TABLE public.ical_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES public.room_ical_feeds(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'success', 'error'
  events_processed INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_ical_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ical_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for room_ical_feeds
CREATE POLICY "Hotel admins can manage their iCal feeds"
  ON public.room_ical_feeds
  FOR ALL
  USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Super admins can view all iCal feeds"
  ON public.room_ical_feeds
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for ical_sync_logs
CREATE POLICY "Hotel admins can view their sync logs"
  ON public.ical_sync_logs
  FOR SELECT
  USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Super admins can view all sync logs"
  ON public.ical_sync_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Add trigger to update updated_at
CREATE TRIGGER update_room_ical_feeds_updated_at
  BEFORE UPDATE ON public.room_ical_feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_room_ical_feeds_room_id ON public.room_ical_feeds(room_id);
CREATE INDEX idx_room_ical_feeds_hotel_id ON public.room_ical_feeds(hotel_id);
CREATE INDEX idx_room_ical_feeds_is_active ON public.room_ical_feeds(is_active);
CREATE INDEX idx_ical_sync_logs_feed_id ON public.ical_sync_logs(feed_id);
CREATE INDEX idx_ical_sync_logs_created_at ON public.ical_sync_logs(created_at DESC);