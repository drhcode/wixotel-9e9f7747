-- Remove email sending from database triggers, keep only notifications
-- The frontend already handles emails via RPC calls

-- Update notify_new_lead to only handle guest confirmation (will be called from frontend via RPC)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hotel_email TEXT;
  v_hotel_name TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel details
  SELECT email, name INTO v_hotel_email, v_hotel_name
  FROM hotels
  WHERE id = NEW.hotel_id;
  
  -- Only send guest confirmation email
  v_html_content := '<h2>Booking Request Received</h2>' ||
                   '<p>Dear ' || NEW.full_name || ',</p>' ||
                   '<p>Thank you for your booking inquiry at <strong>' || COALESCE(v_hotel_name, 'our hotel') || '</strong>.</p>' ||
                   '<p>We have received your request with the following details:</p>' ||
                   '<ul>' ||
                   '<li><strong>Check-in:</strong> ' || NEW.check_in || '</li>' ||
                   '<li><strong>Check-out:</strong> ' || NEW.check_out || '</li>' ||
                   '<li><strong>Guests:</strong> ' || NEW.guests || '</li>' ||
                   '</ul>' ||
                   '<p>Our team will review your request and get back to you shortly.</p>' ||
                   '<p>Best regards,<br>' || COALESCE(v_hotel_name, 'The Hotel Team') || '</p>';
  
  PERFORM send_email_notification(
    NEW.hotel_id,
    NEW.email,
    'Booking Request Received - ' || COALESCE(v_hotel_name, 'Hotel'),
    v_html_content,
    'lead_confirmation'
  );
  
  RETURN NEW;
END;
$$;

-- Remove email sending from notify_new_booking
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Email will be sent from frontend, this trigger just returns
  RETURN NEW;
END;
$$;

-- Remove email sending from notify_cancelled_booking
CREATE OR REPLACE FUNCTION public.notify_cancelled_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Email will be sent from frontend, this trigger just returns
  RETURN NEW;
END;
$$;

-- Remove email sending from notify_ticket_reply
CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Email will be sent from frontend, this trigger just returns
  RETURN NEW;
END;
$$;