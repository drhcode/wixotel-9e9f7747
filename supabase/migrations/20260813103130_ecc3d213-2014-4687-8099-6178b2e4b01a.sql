-- Booking requests fired notify_new_lead() three times -> 3 duplicate guest emails.
DROP TRIGGER IF EXISTS on_new_lead ON public.leads;
DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
-- keeps: on_lead_created (email) and trg_notification_new_lead (in-app notification)

-- Remove the obsolete overload without confirmation number
DROP FUNCTION IF EXISTS public.send_booking_confirmation_email(uuid, text, text, date, date, text, numeric);