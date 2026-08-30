-- 1. Cancellation requests: remove tautological INSERT policy
DROP POLICY IF EXISTS "Guests can create cancellation requests for existing booking" ON public.cancellation_requests;

CREATE POLICY "Hotel admins can create cancellation requests for own bookings"
ON public.cancellation_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      hotel_id = public.get_user_hotel_id(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = cancellation_requests.booking_id
          AND b.hotel_id = cancellation_requests.hotel_id
          AND b.status <> 'cancelled'::booking_status
      )
    )
  )
);

-- 2. Ticket attachments: scope hotel admin access to their own tickets' attachments
DROP POLICY IF EXISTS "Users can view ticket attachments" ON storage.objects;

CREATE POLICY "Users can view ticket attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.ticket_replies tr
      JOIN public.support_tickets st ON st.id = tr.ticket_id
      WHERE st.hotel_id = public.get_user_hotel_id(auth.uid())
        AND tr.attachments IS NOT NULL
        AND objects.name = ANY (tr.attachments)
    )
  )
);

-- 3. Revoke public/authenticated EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.auto_checkout_overdue_bookings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_referral_earnings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_email_notification(uuid, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_booking_confirmation_email(uuid, text, text, date, date, text, numeric, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_lead_approved_email(uuid, text, text, date, date, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_lead_rejected_email(uuid, text, text, date, date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hotel_protected_fields_unchanged(uuid, hotel_status, boolean, boolean, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_booking_for_review(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_booking_overlap(uuid, date, date, uuid) FROM anon;

-- Trigger functions must never be callable directly
REVOKE EXECUTE ON FUNCTION public.cancel_earnings_on_booking_delete() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_earnings_on_checkout() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification_on_new_booking() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification_on_new_lead() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification_on_ticket_reply() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_room_ical_token() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_deleted() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_cancelled_booking() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_booking() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_lead() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_reply() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_hotel_admin_fields() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_earnings_on_checkout() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_room_status_on_booking_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;