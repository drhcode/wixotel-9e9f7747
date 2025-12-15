-- Fix the generate_room_ical_token function to use proper schema for gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_room_ical_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.ical_token IS NULL THEN
    NEW.ical_token := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;