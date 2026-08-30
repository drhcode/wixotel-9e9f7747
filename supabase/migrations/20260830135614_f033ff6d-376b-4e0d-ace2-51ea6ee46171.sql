GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_booking_for_review(uuid, text) TO anon, authenticated;