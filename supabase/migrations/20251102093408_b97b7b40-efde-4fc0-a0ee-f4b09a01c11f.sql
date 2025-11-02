-- Create function to send email notification
CREATE OR REPLACE FUNCTION public.send_email_notification(
  p_hotel_id UUID,
  p_recipient_email TEXT,
  p_subject TEXT,
  p_html_content TEXT,
  p_email_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
BEGIN
  -- Get Supabase credentials from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- Call edge function to send email (will be handled by edge function)
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_anon_key
    ),
    body := jsonb_build_object(
      'hotel_id', p_hotel_id,
      'recipient_email', p_recipient_email,
      'subject', p_subject,
      'html_content', p_html_content,
      'email_type', p_email_type
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send email notification: %', SQLERRM;
END;
$function$;

-- Create trigger function for new leads
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hotel_email TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel email
  SELECT email INTO v_hotel_email
  FROM hotels
  WHERE id = NEW.hotel_id;
  
  IF v_hotel_email IS NOT NULL THEN
    -- Build email content
    v_html_content := '<h2>New Booking Inquiry</h2>' ||
                     '<p>You have received a new booking inquiry:</p>' ||
                     '<ul>' ||
                     '<li><strong>Name:</strong> ' || NEW.full_name || '</li>' ||
                     '<li><strong>Email:</strong> ' || NEW.email || '</li>' ||
                     '<li><strong>Phone:</strong> ' || NEW.phone || '</li>' ||
                     '<li><strong>Check-in:</strong> ' || NEW.check_in || '</li>' ||
                     '<li><strong>Check-out:</strong> ' || NEW.check_out || '</li>' ||
                     '<li><strong>Guests:</strong> ' || NEW.guests || '</li>' ||
                     CASE WHEN NEW.message IS NOT NULL THEN '<li><strong>Message:</strong> ' || NEW.message || '</li>' ELSE '' END ||
                     '</ul>' ||
                     '<p>Please log in to your dashboard to review and respond to this inquiry.</p>';
    
    -- Send email notification
    PERFORM send_email_notification(
      NEW.hotel_id,
      v_hotel_email,
      'New Booking Inquiry - ' || NEW.full_name,
      v_html_content,
      'new_lead'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger function for new bookings
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hotel_email TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel email
  SELECT email INTO v_hotel_email
  FROM hotels
  WHERE id = NEW.hotel_id;
  
  IF v_hotel_email IS NOT NULL THEN
    -- Build email content
    v_html_content := '<h2>New Reservation Created</h2>' ||
                     '<p>A new reservation has been created:</p>' ||
                     '<ul>' ||
                     '<li><strong>Guest:</strong> ' || NEW.full_name || '</li>' ||
                     '<li><strong>Email:</strong> ' || COALESCE(NEW.guest_email, 'N/A') || '</li>' ||
                     '<li><strong>Phone:</strong> ' || NEW.guest_phone || '</li>' ||
                     '<li><strong>Check-in:</strong> ' || NEW.check_in || '</li>' ||
                     '<li><strong>Check-out:</strong> ' || NEW.check_out || '</li>' ||
                     '<li><strong>Guests:</strong> ' || NEW.guest_count || '</li>' ||
                     '<li><strong>Total Amount:</strong> €' || NEW.total_amount || '</li>' ||
                     '<li><strong>Status:</strong> ' || NEW.status || '</li>' ||
                     '</ul>';
    
    -- Send email notification
    PERFORM send_email_notification(
      NEW.hotel_id,
      v_hotel_email,
      'New Reservation - ' || NEW.full_name,
      v_html_content,
      'new_booking'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger function for cancelled bookings
CREATE OR REPLACE FUNCTION public.notify_cancelled_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hotel_email TEXT;
  v_html_content TEXT;
BEGIN
  -- Only send email if status changed to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Get hotel email
    SELECT email INTO v_hotel_email
    FROM hotels
    WHERE id = NEW.hotel_id;
    
    IF v_hotel_email IS NOT NULL THEN
      -- Build email content
      v_html_content := '<h2>Reservation Cancelled</h2>' ||
                       '<p>A reservation has been cancelled:</p>' ||
                       '<ul>' ||
                       '<li><strong>Guest:</strong> ' || NEW.full_name || '</li>' ||
                       '<li><strong>Email:</strong> ' || COALESCE(NEW.guest_email, 'N/A') || '</li>' ||
                       '<li><strong>Phone:</strong> ' || NEW.guest_phone || '</li>' ||
                       '<li><strong>Check-in:</strong> ' || NEW.check_in || '</li>' ||
                       '<li><strong>Check-out:</strong> ' || NEW.check_out || '</li>' ||
                       '<li><strong>Total Amount:</strong> €' || NEW.total_amount || '</li>' ||
                       '</ul>';
      
      -- Send email notification
      PERFORM send_email_notification(
        NEW.hotel_id,
        v_hotel_email,
        'Reservation Cancelled - ' || NEW.full_name,
        v_html_content,
        'cancelled_booking'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create triggers
DROP TRIGGER IF EXISTS on_new_lead ON public.leads;
CREATE TRIGGER on_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_lead();

DROP TRIGGER IF EXISTS on_new_booking ON public.bookings;
CREATE TRIGGER on_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_booking();

DROP TRIGGER IF EXISTS on_cancelled_booking ON public.bookings;
CREATE TRIGGER on_cancelled_booking
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_cancelled_booking();