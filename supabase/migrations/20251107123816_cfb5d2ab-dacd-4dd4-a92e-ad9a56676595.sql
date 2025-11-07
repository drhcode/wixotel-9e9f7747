-- Fix function search_path security issue by adding SET search_path = public to all functions
-- This prevents search path injection attacks

-- Update update_earnings_on_checkout
CREATE OR REPLACE FUNCTION public.update_earnings_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- When a booking changes to 'checked_out' status, update related earnings to 'completed'
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    UPDATE earnings
    SET status = 'completed', updated_at = now()
    WHERE booking_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update cancel_earnings_on_booking_delete
CREATE OR REPLACE FUNCTION public.cancel_earnings_on_booking_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- When a booking is deleted, set related earnings to 'cancelled'
  UPDATE earnings
  SET status = 'cancelled', updated_at = now()
  WHERE booking_id = OLD.id;
  
  RETURN OLD;
END;
$function$;

-- Update notify_booking_deleted
CREATE OR REPLACE FUNCTION public.notify_booking_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    OLD.hotel_id,
    'booking_deleted',
    'Reservation Deleted',
    'Reservation for ' || OLD.full_name || ' has been deleted',
    false
  );
  RETURN OLD;
END;
$function$;

-- Update create_earnings_on_checkout
CREATE OR REPLACE FUNCTION public.create_earnings_on_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only create earnings when status changes to 'checked_out'
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    -- Create earnings record with 8% commission
    INSERT INTO earnings (
      hotel_id,
      booking_id,
      total_amount,
      commission_rate,
      commission_amount,
      status
    ) VALUES (
      NEW.hotel_id,
      NEW.id,
      NEW.total_amount,
      8.0,
      NEW.total_amount * 0.08,
      'completed'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update auto_checkout_overdue_bookings
CREATE OR REPLACE FUNCTION public.auto_checkout_overdue_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update bookings to checked_out if checkout date + 24 hours has passed
  UPDATE bookings
  SET 
    status = 'checked_out',
    updated_at = now()
  WHERE 
    status IN ('reserved', 'checked_in')
    AND check_out < (CURRENT_DATE - INTERVAL '1 day')
    AND check_out IS NOT NULL;
END;
$function$;

-- Update notify_booking_status_change
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only create notification if status changed to checked_in or checked_out
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'checked_in' THEN
      INSERT INTO notifications (hotel_id, type, title, message, is_read)
      VALUES (
        NEW.hotel_id,
        'booking_checked_in',
        'Guest Checked In',
        'Guest ' || NEW.full_name || ' has checked in',
        false
      );
    ELSIF NEW.status = 'checked_out' THEN
      INSERT INTO notifications (hotel_id, type, title, message, is_read)
      VALUES (
        NEW.hotel_id,
        'booking_checked_out',
        'Guest Checked Out',
        'Guest ' || NEW.full_name || ' has checked out',
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update get_available_rooms
CREATE OR REPLACE FUNCTION public.get_available_rooms(p_hotel_id uuid, p_check_in date, p_check_out date, p_booking_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, name text, room_number text, room_type text, price numeric, capacity integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.room_number,
    r.room_type,
    r.price,
    r.capacity
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_available = true
    AND NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.room_id = r.id
        AND b.status NOT IN ('cancelled', 'checked_out')
        AND (p_booking_id IS NULL OR b.id != p_booking_id)
        AND p_check_in < b.check_out
        AND b.check_in < p_check_out
    );
END;
$function$;

-- Update notify_new_booking
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Email will be sent from frontend, this trigger just returns
  RETURN NEW;
END;
$function$;

-- Update notify_cancelled_booking
CREATE OR REPLACE FUNCTION public.notify_cancelled_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Email will be sent from frontend, this trigger just returns
  RETURN NEW;
END;
$function$;

-- Update send_email_notification
CREATE OR REPLACE FUNCTION public.send_email_notification(p_hotel_id uuid, p_recipient_email text, p_subject text, p_html_content text, p_email_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Call edge function to send email using pg_net extension
  PERFORM net.http_post(
    url := 'https://vzxviibhpbzuiucgodiw.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6eHZpaWJocGJ6dWl1Y2dvZGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDA1OTYsImV4cCI6MjA3NjQ3NjU5Nn0.DcD_N5tuNkDfynhZTRPS_jiHJ7WPm_h1gdfS61JDLZQ'
    ),
    body := jsonb_build_object(
      'hotel_id', p_hotel_id,
      'recipient_email', p_recipient_email,
      'subject', p_subject,
      'html_content', p_html_content,
      'email_type', p_email_type
    )::text
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send email notification: %', SQLERRM;
END;
$function$;

-- Update generate_invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_year TEXT;
  current_month TEXT;
  count_invoices INT;
  invoice_num TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  current_month := TO_CHAR(CURRENT_DATE, 'MM');
  
  SELECT COUNT(*) INTO count_invoices
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || current_year || current_month || '%';
  
  invoice_num := 'INV-' || current_year || current_month || LPAD((count_invoices + 1)::TEXT, 4, '0');
  
  RETURN invoice_num;
END;
$function$;

-- Update notify_ticket_reply
CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Email will be sent from frontend, this trigger just returns
  RETURN NEW;
END;
$function$;

-- Update notify_new_lead
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update send_lead_approved_email
CREATE OR REPLACE FUNCTION public.send_lead_approved_email(p_hotel_id uuid, p_guest_email text, p_guest_name text, p_check_in date, p_check_out date, p_guests integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_hotel_name TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel name
  SELECT name INTO v_hotel_name
  FROM hotels
  WHERE id = p_hotel_id;
  
  -- Build approval email content
  v_html_content := '<h2>Booking Request Approved ✓</h2>' ||
                   '<p>Dear ' || p_guest_name || ',</p>' ||
                   '<p>Great news! Your booking request at <strong>' || COALESCE(v_hotel_name, 'our hotel') || '</strong> has been approved.</p>' ||
                   '<p><strong>Reservation Details:</strong></p>' ||
                   '<ul>' ||
                   '<li><strong>Check-in:</strong> ' || p_check_in || '</li>' ||
                   '<li><strong>Check-out:</strong> ' || p_check_out || '</li>' ||
                   '<li><strong>Guests:</strong> ' || p_guests || '</li>' ||
                   '</ul>' ||
                   '<p>We look forward to welcoming you!</p>' ||
                   '<p>If you have any questions, please don''t hesitate to contact us.</p>' ||
                   '<p>Best regards,<br>' || COALESCE(v_hotel_name, 'The Hotel Team') || '</p>';
  
  -- Send approval email
  PERFORM send_email_notification(
    p_hotel_id,
    p_guest_email,
    'Booking Request Approved - ' || COALESCE(v_hotel_name, 'Hotel'),
    v_html_content,
    'lead_approved'
  );
END;
$function$;

-- Update send_lead_rejected_email
CREATE OR REPLACE FUNCTION public.send_lead_rejected_email(p_hotel_id uuid, p_guest_email text, p_guest_name text, p_check_in date, p_check_out date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  
  -- Build rejection email content
  v_html_content := '<h2>Booking Request Update</h2>' ||
                   '<p>Dear ' || p_guest_name || ',</p>' ||
                   '<p>Thank you for your interest in <strong>' || COALESCE(v_hotel_name, 'our hotel') || '</strong>.</p>' ||
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
                   CASE WHEN v_hotel_email IS NOT NULL THEN '<p><strong>Email:</strong> ' || v_hotel_email || '</p>' ELSE '' END ||
                   CASE WHEN v_hotel_phone IS NOT NULL THEN '<p><strong>Phone:</strong> ' || v_hotel_phone || '</p>' ELSE '' END ||
                   '<p>We hope to have the opportunity to serve you in the future.</p>' ||
                   '<p>Best regards,<br>' || COALESCE(v_hotel_name, 'The Hotel Team') || '</p>';
  
  -- Send rejection email
  PERFORM send_email_notification(
    p_hotel_id,
    p_guest_email,
    'Booking Request Update - ' || COALESCE(v_hotel_name, 'Hotel'),
    v_html_content,
    'lead_rejected'
  );
END;
$function$;

-- Update create_notification_on_new_lead
CREATE OR REPLACE FUNCTION public.create_notification_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update create_notification_on_ticket_reply
CREATE OR REPLACE FUNCTION public.create_notification_on_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Update create_notification_on_new_booking
CREATE OR REPLACE FUNCTION public.create_notification_on_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    NEW.hotel_id,
    'new_booking',
    'New Reservation',
    'New reservation for ' || NEW.full_name || ' from ' || NEW.check_in || ' to ' || NEW.check_out,
    false
  );
  RETURN NEW;
END;
$function$;

-- Update send_booking_confirmation_email (both versions)
CREATE OR REPLACE FUNCTION public.send_booking_confirmation_email(p_hotel_id uuid, p_guest_email text, p_guest_name text, p_check_in date, p_check_out date, p_room_name text, p_total_amount numeric, p_confirmation_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_hotel_name TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel name
  SELECT name INTO v_hotel_name
  FROM hotels
  WHERE id = p_hotel_id;
  
  -- Build confirmation email content with confirmation number
  v_html_content := '<h2>Booking Confirmation ✓</h2>' ||
                   '<p>Dear ' || p_guest_name || ',</p>' ||
                   '<p>Your reservation at <strong>' || COALESCE(v_hotel_name, 'our hotel') || '</strong> has been confirmed!</p>' ||
                   '<div style="background:#f0fdf4;padding:20px;border-radius:8px;border:2px solid #10b981;margin:25px 0;text-align:center;">' ||
                   '<p style="margin:0 0 8px 0;font-weight:600;">Your Confirmation Number</p>' ||
                   '<p style="margin:0;font-size:24px;font-weight:700;font-family:monospace;letter-spacing:2px;">' || p_confirmation_number || '</p>' ||
                   '<p style="margin:8px 0 0 0;font-size:12px;">Save this number for check-in and review submission</p>' ||
                   '</div>' ||
                   '<p><strong>Reservation Details:</strong></p>' ||
                   '<ul>' ||
                   '<li><strong>Check-in:</strong> ' || p_check_in || '</li>' ||
                   '<li><strong>Check-out:</strong> ' || p_check_out || '</li>' ||
                   '<li><strong>Room:</strong> ' || p_room_name || '</li>' ||
                   '<li><strong>Total Amount:</strong> €' || p_total_amount || '</li>' ||
                   '</ul>' ||
                   '<p>We look forward to welcoming you!</p>' ||
                   '<p>If you have any questions, please don''t hesitate to contact us.</p>' ||
                   '<p>Best regards,<br>' || COALESCE(v_hotel_name, 'The Hotel Team') || '</p>';
  
  -- Send confirmation email
  PERFORM send_email_notification(
    p_hotel_id,
    p_guest_email,
    'Booking Confirmation - ' || COALESCE(v_hotel_name, 'Hotel'),
    v_html_content,
    'booking_confirmation'
  );
END;
$function$;

-- Update create_review_with_validation
CREATE OR REPLACE FUNCTION public.create_review_with_validation(p_hotel_id uuid, p_confirmation_number text, p_title text, p_rating integer, p_review text, p_photo_url text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_booking_id uuid;
  v_review_id uuid;
  v_guest_email text;
BEGIN
  SELECT public.verify_booking_for_review(p_hotel_id, p_confirmation_number) INTO v_booking_id;
  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'no_booking_for_confirmation';
  END IF;

  -- Get guest email from booking
  SELECT guest_email INTO v_guest_email FROM bookings WHERE id = v_booking_id;

  INSERT INTO public.reviews (hotel_id, guest_email, title, rating, review_text, photo_url, booking_id, status)
  VALUES (
    p_hotel_id,
    v_guest_email,
    p_title,
    p_rating,
    p_review,
    NULLIF(p_photo_url, ''),
    v_booking_id,
    'pending'
  ) RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$function$;

-- Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Default to hotel_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'hotel_admin');
  
  RETURN NEW;
END;
$function$;

-- Update check_booking_overlap
CREATE OR REPLACE FUNCTION public.check_booking_overlap(p_room_id uuid, p_check_in date, p_check_out date, p_booking_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM bookings
    WHERE room_id = p_room_id
      AND status NOT IN ('cancelled')
      AND (p_booking_id IS NULL OR id != p_booking_id)
      AND p_check_in < check_out
      AND check_in < p_check_out
  );
END;
$function$;