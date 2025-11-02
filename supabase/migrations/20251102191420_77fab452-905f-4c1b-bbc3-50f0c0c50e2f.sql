-- Ensure pg_net extension exists for HTTP calls from the database
create extension if not exists pg_net;

-- Attach trigger to send emails on new lead insert
DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.leads;
CREATE TRIGGER trg_notify_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_lead();