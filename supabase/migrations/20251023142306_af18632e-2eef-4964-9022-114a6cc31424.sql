-- Add feature flag for clear data functionality
ALTER TABLE public.hotels 
ADD COLUMN allow_data_clear boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hotels.allow_data_clear IS 'Controls whether hotel admins can clear all their bookings and guests data. Managed by super admin only.';