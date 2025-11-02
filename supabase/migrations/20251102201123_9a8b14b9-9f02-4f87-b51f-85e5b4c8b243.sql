-- Create earnings table to track commission from bookings
CREATE TABLE public.earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 8.0,
  commission_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

-- Super admins can view all earnings
CREATE POLICY "Super admins can view all earnings"
ON public.earnings
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can manage all earnings
CREATE POLICY "Super admins can manage all earnings"
ON public.earnings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Hotel admins can view their earnings
CREATE POLICY "Hotel admins can view their earnings"
ON public.earnings
FOR SELECT
USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_earnings_updated_at
BEFORE UPDATE ON public.earnings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_earnings_hotel_id ON public.earnings(hotel_id);
CREATE INDEX idx_earnings_status ON public.earnings(status);
CREATE INDEX idx_earnings_created_at ON public.earnings(created_at DESC);