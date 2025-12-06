import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET_KEY = Deno.env.get("PAYPAL_SECRET_KEY");
const PAYPAL_API_URL = "https://api-m.paypal.com"; // Use https://api-m.sandbox.paypal.com for sandbox

interface CaptureOrderRequest {
  order_id: string;
  invoice_id: string;
}

const getPayPalAccessToken = async (): Promise<string> => {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`);
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("PayPal auth error:", data);
    throw new Error("Failed to get PayPal access token");
  }

  return data.access_token;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, invoice_id }: CaptureOrderRequest = await req.json();

    if (!order_id || !invoice_id) {
      return new Response(
        JSON.stringify({ error: "Order ID and Invoice ID are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Capture the PayPal order
    const captureResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error("PayPal capture error:", captureData);
      return new Response(
        JSON.stringify({ error: "Failed to capture PayPal order", details: captureData }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("PayPal order captured:", captureData);

    // Check if payment was successful
    if (captureData.status === "COMPLETED") {
      // Update invoice status to paid
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          payment_date: new Date().toISOString(),
          notes: `Paid via PayPal. Transaction ID: ${captureData.id}`,
        })
        .eq("id", invoice_id);

      if (updateError) {
        console.error("Error updating invoice:", updateError);
        return new Response(
          JSON.stringify({ error: "Payment captured but failed to update invoice" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Invoice marked as paid:", invoice_id);

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: captureData.id,
          status: captureData.status,
          payer: captureData.payer,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: captureData.status,
          message: "Payment not completed" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error capturing PayPal order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
