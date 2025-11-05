-- Clean up duplicate booking triggers that cause multiple notifications
DO $$
BEGIN
  -- Status change notifications
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings' AND t.tgname='on_booking_status_change'
  ) THEN
    DROP TRIGGER on_booking_status_change ON public.bookings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings' AND t.tgname='trg_booking_status_change'
  ) THEN
    DROP TRIGGER trg_booking_status_change ON public.bookings;
  END IF;
  -- Keep ONLY trigger_notify_booking_status_change

  -- New booking notifications
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings' AND t.tgname='on_new_booking'
  ) THEN
    DROP TRIGGER on_new_booking ON public.bookings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings' AND t.tgname='trg_notify_new_booking'
  ) THEN
    DROP TRIGGER trg_notify_new_booking ON public.bookings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings' AND t.tgname='trg_notification_new_booking'
  ) THEN
    DROP TRIGGER trg_notification_new_booking ON public.bookings;
  END IF;
  -- Keep ONLY trigger_notify_new_booking

  -- Deleted booking notifications
  -- Keep only 'on_booking_deleted'
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings' AND t.tgname='trg_notify_booking_deleted'
  ) THEN
    DROP TRIGGER trg_notify_booking_deleted ON public.bookings;
  END IF;

  -- Cancelled booking notifications (duplicates)
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings' AND t.tgname='trg_notify_cancelled_booking'
  ) THEN
    DROP TRIGGER trg_notify_cancelled_booking ON public.bookings;
  END IF;
  -- Keep only 'on_cancelled_booking'
END $$;
