-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_replies table
CREATE TABLE public.ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT[],
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Hotel admins can view their tickets"
  ON public.support_tickets FOR SELECT
  USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Hotel admins can update their tickets"
  ON public.support_tickets FOR UPDATE
  USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Super admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all tickets"
  ON public.support_tickets FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS policies for ticket_replies
CREATE POLICY "Hotel admins can view replies to their tickets"
  ON public.ticket_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_replies.ticket_id
      AND hotel_id = get_user_hotel_id(auth.uid())
    )
  );

CREATE POLICY "Hotel admins can create replies"
  ON public.ticket_replies FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_replies.ticket_id
      AND hotel_id = get_user_hotel_id(auth.uid())
    )
  );

CREATE POLICY "Super admins can view all replies"
  ON public.ticket_replies FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can create replies"
  ON public.ticket_replies FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) AND user_id = auth.uid());

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ticket attachments
CREATE POLICY "Authenticated users can upload ticket attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their ticket attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ticket-attachments' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] OR
      has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to send email notification for new ticket reply
CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_hotel_email TEXT;
  v_recipient_email TEXT;
  v_subject TEXT;
  v_html_content TEXT;
BEGIN
  -- Get ticket and hotel details
  SELECT st.*, h.name as hotel_name, h.email as hotel_email
  INTO v_ticket
  FROM support_tickets st
  JOIN hotels h ON h.id = st.hotel_id
  WHERE st.id = NEW.ticket_id;
  
  -- Determine recipient based on who replied
  IF NEW.is_admin_reply THEN
    -- Admin replied, notify hotel
    v_recipient_email := v_ticket.hotel_email;
    v_subject := 'New Reply on Your Support Ticket #' || substring(v_ticket.id::text, 1, 8);
    v_html_content := '<h2>Support Ticket Update</h2>' ||
                     '<p>An admin has replied to your support ticket:</p>' ||
                     '<ul>' ||
                     '<li><strong>Ticket:</strong> ' || v_ticket.subject || '</li>' ||
                     '<li><strong>Status:</strong> ' || v_ticket.status || '</li>' ||
                     '<li><strong>Reply:</strong> ' || NEW.message || '</li>' ||
                     '</ul>' ||
                     '<p>Please log in to your dashboard to view the full conversation.</p>';
  ELSE
    -- Hotel replied, notify admin (we'll get the first super admin email)
    SELECT u.email INTO v_recipient_email
    FROM auth.users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.role = 'super_admin'
    LIMIT 1;
    
    IF v_recipient_email IS NOT NULL THEN
      v_subject := 'New Reply on Support Ticket from ' || v_ticket.hotel_name;
      v_html_content := '<h2>Support Ticket Update</h2>' ||
                       '<p>A hotel has replied to their support ticket:</p>' ||
                       '<ul>' ||
                       '<li><strong>Hotel:</strong> ' || v_ticket.hotel_name || '</li>' ||
                       '<li><strong>Ticket:</strong> ' || v_ticket.subject || '</li>' ||
                       '<li><strong>Status:</strong> ' || v_ticket.status || '</li>' ||
                       '<li><strong>Reply:</strong> ' || NEW.message || '</li>' ||
                       '</ul>' ||
                       '<p>Please log in to your dashboard to view the full conversation.</p>';
    END IF;
  END IF;
  
  -- Send email if recipient exists
  IF v_recipient_email IS NOT NULL THEN
    PERFORM send_email_notification(
      v_ticket.hotel_id,
      v_recipient_email,
      v_subject,
      v_html_content,
      'ticket_reply'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for ticket reply notifications
CREATE TRIGGER notify_on_ticket_reply
  AFTER INSERT ON public.ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_reply();