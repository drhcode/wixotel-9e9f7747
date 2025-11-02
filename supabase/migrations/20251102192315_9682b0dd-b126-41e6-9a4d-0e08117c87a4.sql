-- Safe migration: only create triggers where tables exist
create extension if not exists pg_net;

-- Functions to create notifications
CREATE OR REPLACE FUNCTION public.create_notification_on_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    NEW.hotel_id,
    'new_booking',
    'New Reservation',
    'New reservation for ' || NEW.full_name || ' from ' || NEW.check_in || ' to ' || NEW_check_out,
    false
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    NEW.hotel_id,
    'new_lead',
    'New Booking Inquiry',
    'Lead from ' || NEW.full_name || COALESCE(' (' || NEW.email || ')', ''),
    false
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification_on_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket record;
  v_actor text;
BEGIN
  SELECT st.*, h.name as hotel_name
  INTO v_ticket
  FROM support_tickets st
  JOIN hotels h ON h.id = st.hotel_id
  WHERE st.id = NEW.ticket_id;

  v_actor := CASE WHEN NEW.is_admin_reply THEN 'Admin' ELSE 'Hotel' END;

  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    v_ticket.hotel_id,
    'ticket_reply',
    'Support Ticket Reply',
    v_actor || ' replied to ticket: ' || v_ticket.subject,
    false
  );
  RETURN NEW;
END;
$$;

-- Leads triggers (table exists)
DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
CREATE TRIGGER trg_notify_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

DROP TRIGGER IF EXISTS trg_notification_new_lead ON public.leads;
CREATE TRIGGER trg_notification_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.create_notification_on_new_lead();

-- Bookings triggers (table exists)
DROP TRIGGER IF EXISTS trg_notify_new_booking ON public.bookings;
CREATE TRIGGER trg_notify_new_booking
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_new_booking();

DROP TRIGGER IF EXISTS trg_notification_new_booking ON public.bookings;
CREATE TRIGGER trg_notification_new_booking
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.create_notification_on_new_booking();

DROP TRIGGER IF EXISTS trg_booking_status_change ON public.bookings;
CREATE TRIGGER trg_booking_status_change
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

DROP TRIGGER IF EXISTS trg_notify_cancelled_booking ON public.bookings;
CREATE TRIGGER trg_notify_cancelled_booking
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_cancelled_booking();

DROP TRIGGER IF EXISTS trg_notify_booking_deleted ON public.bookings;
CREATE TRIGGER trg_notify_booking_deleted
AFTER DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_deleted();

-- Support ticket reply triggers: only if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND c.relname = 'support_ticket_replies'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_ticket_reply ON public.support_ticket_replies';
    EXECUTE 'CREATE TRIGGER trg_notify_ticket_reply AFTER INSERT ON public.support_ticket_replies FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_reply()';

    EXECUTE 'DROP TRIGGER IF EXISTS trg_notification_ticket_reply ON public.support_ticket_replies';
    EXECUTE 'CREATE TRIGGER trg_notification_ticket_reply AFTER INSERT ON public.support_ticket_replies FOR EACH ROW EXECUTE FUNCTION public.create_notification_on_ticket_reply()';
  END IF;
END$$;