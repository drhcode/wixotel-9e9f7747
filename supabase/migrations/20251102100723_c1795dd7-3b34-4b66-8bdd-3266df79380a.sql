-- Fix support tickets RLS policies

-- Add DELETE policy for super admins
CREATE POLICY "Super admins can delete all tickets"
  ON public.support_tickets FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add DELETE policy for ticket replies
CREATE POLICY "Super admins can delete all replies"
  ON public.ticket_replies FOR DELETE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix storage policy for super admins to view all attachments
DROP POLICY IF EXISTS "Users can view their ticket attachments" ON storage.objects;

CREATE POLICY "Users can view ticket attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ticket-attachments' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.hotel_id = get_user_hotel_id(auth.uid())
        AND (storage.foldername(name))[1] IS NOT NULL
      )
    )
  );

-- Add policy for super admins to upload attachments on behalf of users
CREATE POLICY "Super admins can upload ticket attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-attachments' AND
    has_role(auth.uid(), 'super_admin'::app_role)
  );