-- Update send_booking_confirmation_email function to include confirmation number
CREATE OR REPLACE FUNCTION public.send_booking_confirmation_email(
  p_hotel_id uuid,
  p_guest_email text,
  p_guest_name text,
  p_check_in date,
  p_check_out date,
  p_room_name text,
  p_total_amount numeric,
  p_confirmation_number text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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