import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("PayPal webhook received:", payload.event_type);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different webhook events
    switch (payload.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const captureData = payload.resource;
        const invoiceId = captureData.custom_id || captureData.invoice_id;
        
        if (invoiceId) {
          console.log("Processing completed payment for invoice:", invoiceId);
          
          const { error } = await supabase
            .from("invoices")
            .update({
              status: "paid",
              payment_date: new Date().toISOString(),
              notes: `Paid via PayPal. Transaction ID: ${captureData.id}`,
            })
            .eq("id", invoiceId);

          if (error) {
            console.error("Error updating invoice:", error);
          } else {
            console.log("Invoice updated to paid:", invoiceId);
          }
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED": {
        const captureData = payload.resource;
        const invoiceId = captureData.custom_id || captureData.invoice_id;
        
        if (invoiceId) {
          console.log("Payment denied for invoice:", invoiceId);
        }
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        const refundData = payload.resource;
        console.log("Payment refunded:", refundData.id);
        // Could update invoice status to refunded if needed
        break;
      }

      default:
        console.log("Unhandled webhook event:", payload.event_type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
