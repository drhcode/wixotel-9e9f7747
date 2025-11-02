-- Update send_email_notification function to use hardcoded values
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