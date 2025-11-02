-- Create function to send booking confirmation email to guest
CREATE OR REPLACE FUNCTION public.send_booking_confirmation_email(
  p_hotel_id uuid,
  p_guest_email text,
  p_guest_name text,
  p_check_in date,
  p_check_out date,
  p_room_name text,
  p_total_amount numeric
)
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
  
  -- Build confirmation email content
  v_html_content := '<h2>Booking Confirmation ✓</h2>' ||
                   '<p>Dear ' || p_guest_name || ',</p>' ||
                   '<p>Your reservation at <strong>' || COALESCE(v_hotel_name, 'our hotel') || '</strong> has been confirmed!</p>' ||
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
$$;