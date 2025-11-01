
-- Create analytics table for tracking public page visits
CREATE TABLE public.page_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL,
  page_path TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (public page tracking)
CREATE POLICY "Anyone can insert analytics"
  ON public.page_analytics
  FOR INSERT
  WITH CHECK (true);

-- Hotel admins can view their analytics
CREATE POLICY "Hotel admins can view their analytics"
  ON public.page_analytics
  FOR SELECT
  USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Super admins can view all analytics
CREATE POLICY "Super admins can view all analytics"
  ON public.page_analytics
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Create indexes for better query performance
CREATE INDEX idx_page_analytics_hotel_id ON public.page_analytics(hotel_id);
CREATE INDEX idx_page_analytics_created_at ON public.page_analytics(created_at);
CREATE INDEX idx_page_analytics_visitor_id ON public.page_analytics(visitor_id);
