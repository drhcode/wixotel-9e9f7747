-- Add is_read column to leads table to track which leads have been viewed
ALTER TABLE leads ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_leads_is_read ON leads(hotel_id, is_read) WHERE is_read = false;

-- Update trigger to ensure email is sent for new leads
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS on_lead_created ON leads;
CREATE TRIGGER on_lead_created
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();