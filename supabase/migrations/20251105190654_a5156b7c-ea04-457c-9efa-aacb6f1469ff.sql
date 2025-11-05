-- Create ical_sync_conflicts table to store detailed conflict information
CREATE TABLE IF NOT EXISTS public.ical_sync_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES public.room_ical_feeds(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL,
  room_id UUID NOT NULL,
  platform TEXT NOT NULL,
  external_check_in DATE NOT NULL,
  external_check_out DATE NOT NULL,
  external_summary TEXT,
  external_uid TEXT,
  external_description TEXT,
  conflicting_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  resolution_status TEXT NOT NULL DEFAULT 'unresolved',
  resolution_notes TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_ical_sync_conflicts_hotel_id ON public.ical_sync_conflicts(hotel_id);
CREATE INDEX idx_ical_sync_conflicts_room_id ON public.ical_sync_conflicts(room_id);
CREATE INDEX idx_ical_sync_conflicts_feed_id ON public.ical_sync_conflicts(feed_id);
CREATE INDEX idx_ical_sync_conflicts_status ON public.ical_sync_conflicts(resolution_status);
CREATE INDEX idx_ical_sync_conflicts_detected_at ON public.ical_sync_conflicts(detected_at DESC);

-- Enable RLS
ALTER TABLE public.ical_sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Hotel admins can view their conflicts
CREATE POLICY "Hotel admins can view their conflicts"
  ON public.ical_sync_conflicts
  FOR SELECT
  USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Hotel admins can update their conflicts (for resolution)
CREATE POLICY "Hotel admins can update their conflicts"
  ON public.ical_sync_conflicts
  FOR UPDATE
  USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Super admins can view all conflicts
CREATE POLICY "Super admins can view all conflicts"
  ON public.ical_sync_conflicts
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_ical_sync_conflicts_updated_at
  BEFORE UPDATE ON public.ical_sync_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add notification_id column to link conflicts to notifications
ALTER TABLE public.ical_sync_conflicts 
ADD COLUMN notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL;