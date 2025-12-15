-- Create HTML escape function to prevent XSS in email templates
CREATE OR REPLACE FUNCTION public.html_escape(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF input IS NULL THEN
    RETURN '';
  END IF;
  RETURN replace(replace(replace(replace(replace(
    input,
    '&', '&amp;'),
    '<', '&lt;'),
    '>', '&gt;'),
    '"', '&quot;'),
    '''', '&#39;');
END;
$$;

-- Update notify_new_lead to escape user input
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
  
  -- Only send guest confirmation email with escaped user input
  v_html_content := '<h2>Booking Request Received</h2>' ||
                   '<p>Dear ' || html_escape(NEW.full_name) || ',</p>' ||
                   '<p>Thank you for your booking inquiry at <strong>' || html_escape(COALESCE(v_hotel_name, 'our hotel')) || '</strong>.</p>' ||
                   '<p>We have received your request with the following details:</p>' ||
                   '<ul>' ||
                   '<li><strong>Check-in:</strong> ' || NEW.check_in || '</li>' ||
                   '<li><strong>Check-out:</strong> ' || NEW.check_out || '</li>' ||
                   '<li><strong>Guests:</strong> ' || NEW.guests || '</li>' ||
                   '</ul>' ||
                   '<p>Our team will review your request and get back to you shortly.</p>' ||
                   '<p>Best regards,<br>' || html_escape(COALESCE(v_hotel_name, 'The Hotel Team')) || '</p>';
  
  PERFORM send_email_notification(
    NEW.hotel_id,
    NEW.email,
    'Booking Request Received - ' || html_escape(COALESCE(v_hotel_name, 'Hotel')),
    v_html_content,
    'lead_confirmation'
  );
  
  RETURN NEW;
END;
$$;

-- Update send_lead_approved_email to escape user input
CREATE OR REPLACE FUNCTION public.send_lead_approved_email(p_hotel_id uuid, p_guest_email text, p_guest_name text, p_check_in date, p_check_out date, p_guests integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hotel_name TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel name
  SELECT name INTO v_hotel_name
  FROM hotels
  WHERE id = p_hotel_id;
  
  -- Build approval email content with escaped user input
  v_html_content := '<h2>Booking Request Approved ✓</h2>' ||
                   '<p>Dear ' || html_escape(p_guest_name) || ',</p>' ||
                   '<p>Great news! Your booking request at <strong>' || html_escape(COALESCE(v_hotel_name, 'our hotel')) || '</strong> has been approved.</p>' ||
                   '<p><strong>Reservation Details:</strong></p>' ||
                   '<ul>' ||
                   '<li><strong>Check-in:</strong> ' || p_check_in || '</li>' ||
                   '<li><strong>Check-out:</strong> ' || p_check_out || '</li>' ||
                   '<li><strong>Guests:</strong> ' || p_guests || '</li>' ||
                   '</ul>' ||
                   '<p>We look forward to welcoming you!</p>' ||
                   '<p>If you have any questions, please don''t hesitate to contact us.</p>' ||
                   '<p>Best regards,<br>' || html_escape(COALESCE(v_hotel_name, 'The Hotel Team')) || '</p>';
  
  -- Send approval email
  PERFORM send_email_notification(
    p_hotel_id,
    p_guest_email,
    'Booking Request Approved - ' || html_escape(COALESCE(v_hotel_name, 'Hotel')),
    v_html_content,
    'lead_approved'
  );
END;
$$;

-- Update send_lead_rejected_email to escape user input
CREATE OR REPLACE FUNCTION public.send_lead_rejected_email(p_hotel_id uuid, p_guest_email text, p_guest_name text, p_check_in date, p_check_out date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hotel_name TEXT;
  v_hotel_email TEXT;
  v_hotel_phone TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel details
  SELECT name, email, phone INTO v_hotel_name, v_hotel_email, v_hotel_phone
  FROM hotels
  WHERE id = p_hotel_id;
  
  -- Build rejection email content with escaped user input
  v_html_content := '<h2>Booking Request Update</h2>' ||
                   '<p>Dear ' || html_escape(p_guest_name) || ',</p>' ||
                   '<p>Thank you for your interest in <strong>' || html_escape(COALESCE(v_hotel_name, 'our hotel')) || '</strong>.</p>' ||
                   '<p>Unfortunately, we are unable to accommodate your booking request for the following dates:</p>' ||
                   '<ul>' ||
                   '<li><strong>Check-in:</strong> ' || p_check_in || '</li>' ||
                   '<li><strong>Check-out:</strong> ' || p_check_out || '</li>' ||
                   '</ul>' ||
                   '<p>This could be due to availability constraints or other factors.</p>' ||
                   '<p>We encourage you to:</p>' ||
                   '<ul>' ||
                   '<li>Try different dates for your stay</li>' ||
                   '<li>Contact us directly for alternative options</li>' ||
                   '</ul>' ||
                   CASE WHEN v_hotel_email IS NOT NULL THEN '<p><strong>Email:</strong> ' || html_escape(v_hotel_email) || '</p>' ELSE '' END ||
                   CASE WHEN v_hotel_phone IS NOT NULL THEN '<p><strong>Phone:</strong> ' || html_escape(v_hotel_phone) || '</p>' ELSE '' END ||
                   '<p>We hope to have the opportunity to serve you in the future.</p>' ||
                   '<p>Best regards,<br>' || html_escape(COALESCE(v_hotel_name, 'The Hotel Team')) || '</p>';
  
  -- Send rejection email
  PERFORM send_email_notification(
    p_hotel_id,
    p_guest_email,
    'Booking Request Update - ' || html_escape(COALESCE(v_hotel_name, 'Hotel')),
    v_html_content,
    'lead_rejected'
  );
END;
$$;

-- Update send_booking_confirmation_email (version with confirmation number) to escape user input
CREATE OR REPLACE FUNCTION public.send_booking_confirmation_email(p_hotel_id uuid, p_guest_email text, p_guest_name text, p_check_in date, p_check_out date, p_room_name text, p_total_amount numeric, p_confirmation_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hotel_name TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel name
  SELECT name INTO v_hotel_name
  FROM hotels
  WHERE id = p_hotel_id;
  
  -- Build confirmation email content with escaped user input
  v_html_content := '<h2>Booking Confirmation ✓</h2>' ||
                   '<p>Dear ' || html_escape(p_guest_name) || ',</p>' ||
                   '<p>Your reservation at <strong>' || html_escape(COALESCE(v_hotel_name, 'our hotel')) || '</strong> has been confirmed!</p>' ||
                   '<div style="background:#f0fdf4;padding:20px;border-radius:8px;border:2px solid #10b981;margin:25px 0;text-align:center;">' ||
                   '<p style="margin:0 0 8px 0;font-weight:600;">Your Confirmation Number</p>' ||
                   '<p style="margin:0;font-size:24px;font-weight:700;font-family:monospace;letter-spacing:2px;">' || html_escape(p_confirmation_number) || '</p>' ||
                   '<p style="margin:8px 0 0 0;font-size:12px;">Save this number for check-in and review submission</p>' ||
                   '</div>' ||
                   '<p><strong>Reservation Details:</strong></p>' ||
                   '<ul>' ||
                   '<li><strong>Check-in:</strong> ' || p_check_in || '</li>' ||
                   '<li><strong>Check-out:</strong> ' || p_check_out || '</li>' ||
                   '<li><strong>Room:</strong> ' || html_escape(p_room_name) || '</li>' ||
                   '<li><strong>Total Amount:</strong> €' || p_total_amount || '</li>' ||
                   '</ul>' ||
                   '<p>We look forward to welcoming you!</p>' ||
                   '<p>If you have any questions, please don''t hesitate to contact us.</p>' ||
                   '<p>Best regards,<br>' || html_escape(COALESCE(v_hotel_name, 'The Hotel Team')) || '</p>';
  
  -- Send confirmation email
  PERFORM send_email_notification(
    p_hotel_id,
    p_guest_email,
    'Booking Confirmation - ' || html_escape(COALESCE(v_hotel_name, 'Hotel')),
    v_html_content,
    'booking_confirmation'
  );
END;
$$;

-- Update send_booking_confirmation_email (version without confirmation number) to escape user input
CREATE OR REPLACE FUNCTION public.send_booking_confirmation_email(p_hotel_id uuid, p_guest_email text, p_guest_name text, p_check_in date, p_check_out date, p_room_name text, p_total_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hotel_name TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel name
  SELECT name INTO v_hotel_name
  FROM hotels
  WHERE id = p_hotel_id;
  
  -- Build confirmation email content with escaped user input
  v_html_content := '<h2>Booking Confirmation ✓</h2>' ||
                   '<p>Dear ' || html_escape(p_guest_name) || ',</p>' ||
                   '<p>Your reservation at <strong>' || html_escape(COALESCE(v_hotel_name, 'our hotel')) || '</strong> has been confirmed!</p>' ||
                   '<p><strong>Reservation Details:</strong></p>' ||
                   '<ul>' ||
                   '<li><strong>Check-in:</strong> ' || p_check_in || '</li>' ||
                   '<li><strong>Check-out:</strong> ' || p_check_out || '</li>' ||
                   '<li><strong>Room:</strong> ' || html_escape(p_room_name) || '</li>' ||
                   '<li><strong>Total Amount:</strong> €' || p_total_amount || '</li>' ||
                   '</ul>' ||
                   '<p>We look forward to welcoming you!</p>' ||
                   '<p>If you have any questions, please don''t hesitate to contact us.</p>' ||
                   '<p>Best regards,<br>' || html_escape(COALESCE(v_hotel_name, 'The Hotel Team')) || '</p>';
  
  -- Send confirmation email
  PERFORM send_email_notification(
    p_hotel_id,
    p_guest_email,
    'Booking Confirmation - ' || html_escape(COALESCE(v_hotel_name, 'Hotel')),
    v_html_content,
    'booking_confirmation'
  );
END;
$$;

-- Update create_notification_on_ticket_reply to escape user input
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
    v_actor || ' replied to ticket: ' || html_escape(v_ticket.subject),
    false
  );
  RETURN NEW;
END;
$$;

-- Update create_notification_on_new_lead to escape user input
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
    'Lead from ' || html_escape(NEW.full_name) || COALESCE(' (' || html_escape(NEW.email) || ')', ''),
    false
  );
  RETURN NEW;
END;
$$;

-- Update create_notification_on_new_booking to escape user input
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
    'New reservation for ' || html_escape(NEW.full_name) || ' from ' || NEW.check_in || ' to ' || NEW.check_out,
    false
  );
  RETURN NEW;
END;
$$;

-- Update notify_booking_deleted to escape user input
CREATE OR REPLACE FUNCTION public.notify_booking_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    OLD.hotel_id,
    'booking_deleted',
    'Reservation Deleted',
    'Reservation for ' || html_escape(OLD.full_name) || ' has been deleted',
    false
  );
  RETURN OLD;
END;
$$;

-- Update notify_booking_status_change to escape user input
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create notification if status changed to checked_in or checked_out
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'checked_in' THEN
      INSERT INTO notifications (hotel_id, type, title, message, is_read)
      VALUES (
        NEW.hotel_id,
        'booking_checked_in',
        'Guest Checked In',
        'Guest ' || html_escape(NEW.full_name) || ' has checked in',
        false
      );
    ELSIF NEW.status = 'checked_out' THEN
      INSERT INTO notifications (hotel_id, type, title, message, is_read)
      VALUES (
        NEW.hotel_id,
        'booking_checked_out',
        'Guest Checked Out',
        'Guest ' || html_escape(NEW.full_name) || ' has checked out',
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;