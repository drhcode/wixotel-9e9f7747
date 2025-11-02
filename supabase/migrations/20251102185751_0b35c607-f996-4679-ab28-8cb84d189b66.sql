-- Update trigger to send email to both hotel and guest when lead is created
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_hotel_email TEXT;
  v_hotel_name TEXT;
  v_html_content TEXT;
BEGIN
  -- Get hotel details
  SELECT email, name INTO v_hotel_email, v_hotel_name
  FROM hotels
  WHERE id = NEW.hotel_id;
  
  IF v_hotel_email IS NOT NULL THEN
    -- Build email content for hotel
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
    
    -- Send email to hotel
    PERFORM send_email_notification(
      NEW.hotel_id,
      v_hotel_email,
      'New Booking Inquiry - ' || NEW.full_name,
      v_html_content,
      'new_lead'
    );
  END IF;
  
  -- Send confirmation email to guest
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to send lead approval email
CREATE OR REPLACE FUNCTION send_lead_approved_email(
  p_hotel_id uuid,
  p_guest_email text,
  p_guest_name text,
  p_check_in date,
  p_check_out date,
  p_guests integer
)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to send lead rejection email
CREATE OR REPLACE FUNCTION send_lead_rejected_email(
  p_hotel_id uuid,
  p_guest_email text,
  p_guest_name text,
  p_check_in date,
  p_check_out date
)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;