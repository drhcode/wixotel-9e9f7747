-- Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Remove public SELECT policy on booking_otps to prevent OTP code exposure
DROP POLICY IF EXISTS "Anyone can verify OTP" ON public.booking_otps;