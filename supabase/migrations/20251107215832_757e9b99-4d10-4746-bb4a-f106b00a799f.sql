-- Clean up duplicate/legacy earnings triggers and ensure correct ones exist
BEGIN;

-- Drop legacy/duplicate triggers if present
DROP TRIGGER IF EXISTS on_booking_checkout_create_earnings ON public.bookings;
DROP TRIGGER IF EXISTS trigger_update_earnings_on_checkout ON public.bookings;

-- Ensure the correct CHECK-IN trigger exists (creates pending earnings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'create_earnings_on_checkin_trigger'
      AND tgrelid = 'public.bookings'::regclass
  ) THEN
    CREATE TRIGGER create_earnings_on_checkin_trigger
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION create_earnings_on_checkout();
  END IF;
END$$;

-- Ensure the correct CHECK-OUT trigger exists (marks earnings completed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_earnings_on_checkout_trigger'
      AND tgrelid = 'public.bookings'::regclass
  ) THEN
    CREATE TRIGGER update_earnings_on_checkout_trigger
      AFTER UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_earnings_on_checkout();
  END IF;
END$$;

COMMIT;