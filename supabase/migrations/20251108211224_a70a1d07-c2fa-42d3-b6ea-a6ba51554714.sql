-- Create table for OTP verification
CREATE TABLE public.booking_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_otps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert OTPs (for generating codes)
CREATE POLICY "Anyone can request OTP"
ON public.booking_otps
FOR INSERT
WITH CHECK (true);

-- Create policy to allow anyone to verify OTP (for checking codes)
CREATE POLICY "Anyone can verify OTP"
ON public.booking_otps
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_booking_otps_email_hotel ON public.booking_otps(email, hotel_id, expires_at);

-- Function to clean up expired OTPs (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.booking_otps
  WHERE expires_at < now();
END;
$$;