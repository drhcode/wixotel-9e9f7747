-- Create trigger for booking status change notifications
CREATE OR REPLACE TRIGGER trigger_notify_booking_status_change
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_booking_status_change();

-- Create trigger for new booking notifications  
CREATE OR REPLACE TRIGGER trigger_notify_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_on_new_booking();