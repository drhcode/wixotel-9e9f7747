import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify PayPal webhook signature
async function verifyWebhookSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID not configured");
    return false;
  }

  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const transmissionSig = req.headers.get("paypal-transmission-sig");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");

  // Check all required headers are present
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    console.error("Missing required PayPal webhook headers");
    return false;
  }

  // Validate cert URL is from PayPal
  const validCertDomains = [
    "api.paypal.com",
    "api.sandbox.paypal.com"
  ];
  
  try {
    const certUrlParsed = new URL(certUrl);
    if (!validCertDomains.includes(certUrlParsed.hostname)) {
      console.error("Invalid PayPal cert URL domain:", certUrlParsed.hostname);
      return false;
    }
  } catch {
    console.error("Invalid cert URL format");
    return false;
  }

  // Get PayPal access token for verification API
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    console.error("PayPal credentials not configured");
    return false;
  }

  const isProduction = Deno.env.get("PAYPAL_MODE") === "live";
  const baseUrl = isProduction 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";

  try {
    // Get access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) {
      console.error("Failed to get PayPal access token");
      return false;
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Verify webhook signature using PayPal's API
    const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error("Webhook verification API error:", errorText);
      return false;
    }

    const verifyData = await verifyResponse.json();
    const isValid = verifyData.verification_status === "SUCCESS";
    
    if (!isValid) {
      console.error("Webhook signature verification failed:", verifyData.verification_status);
    }
    
    return isValid;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read body as text first for signature verification
    const bodyText = await req.text();
    
    // Verify webhook signature before processing
    const isValid = await verifyWebhookSignature(req, bodyText);
    if (!isValid) {
      console.error("Invalid webhook signature - rejecting request");
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload = JSON.parse(bodyText);
    console.log("PayPal webhook verified and received:", payload.event_type);

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
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
